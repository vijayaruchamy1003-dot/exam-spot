import { useCallback, useEffect, useRef, useState } from 'react';
import { searchSeatingAllotment, normalizeSearchQuery } from '@/services/api/seatingApi';
import { getCachedAllotment, getRecentSearches, saveCachedAllotment } from '@/services/api/seatingCache';
import type { SearchBy, SeatingAllotmentData } from '@/types/allocation';

export type SearchPhase =
  | 'idle'
  | 'searching'
  | 'found'
  | 'not-allotted'
  | 'not-found'
  | 'offline'
  | 'error';

export interface UseStudentSearchInput {
  online: boolean;
}

export function useStudentSearch({ online }: UseStudentSearchInput) {
  const [query, setQuery] = useState('');
  const [searchBy, setSearchBy] = useState<SearchBy>('studentId');
  const [testDate, setTestDate] = useState('');
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [student, setStudent] = useState<SeatingAllotmentData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [matchedId, setMatchedId] = useState<string | null>(null);
  const [recentList, setRecentList] = useState<SeatingAllotmentData[]>([]);

  const requestRef = useRef(0);

  // Load recent searches on mount
  useEffect(() => {
    getRecentSearches().then(setRecentList).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setPhase('idle');
    setStudent(null);
    setMessage(null);
    setIsCached(false);
    setMatchedId(null);
  }, []);

  const search = useCallback(
    async (overrideQuery?: string) => {
      const targetQuery = overrideQuery ?? query;
      const normalized = normalizeSearchQuery(targetQuery, searchBy);

      if (!normalized) {
        setPhase('idle');
        setStudent(null);
        setMessage(
          searchBy === 'studentId'
            ? 'Enter a Student ID (e.g. Z11586).'
            : 'Enter a Registration Number (e.g. 1102011081109260001).'
        );
        setIsCached(false);
        return;
      }

      const requestId = ++requestRef.current;
      setPhase('searching');
      setStudent(null);
      setMessage(null);
      setIsCached(false);
      setMatchedId(normalized);

      // If device is offline, attempt immediate cache lookup
      if (!online) {
        const cached = await getCachedAllotment(normalized);
        if (requestId !== requestRef.current) return;

        if (cached) {
          setStudent(cached);
          setIsCached(true);
          setPhase('found');
          setMessage('Showing saved result from offline cache. Seating may be out of date.');
        } else {
          setPhase('offline');
          setMessage(
            'You are currently offline, and this student has not been searched on this device yet.'
          );
        }
        return;
      }

      // Online search via backend API
      try {
        const response = await searchSeatingAllotment({
          query: normalized,
          searchBy,
          testDate: testDate.trim() || undefined,
        });

        if (requestId !== requestRef.current) return;

        if (response.success && response.data) {
          setStudent(response.data);
          setIsCached(false);
          setPhase('found');
          setMessage(response.message || 'Seating allotment found.');

          // Save to device cache asynchronously
          void saveCachedAllotment(response.data).then(() => {
            getRecentSearches().then(setRecentList).catch(() => {});
          });
        } else {
          // Check if message signifies not allotted vs not registered
          const msg = response.message || '';
          const isNotAllotted =
            msg.toLowerCase().includes('not been allotted') ||
            msg.toLowerCase().includes('not allotted') ||
            msg.toLowerCase().includes('not published');

          setStudent(null);
          setIsCached(false);
          if (isNotAllotted) {
            setPhase('not-allotted');
            setMessage(msg || 'Seating arrangement has not been allotted yet for this exam.');
          } else {
            setPhase('not-found');
            setMessage(msg || `No student found matching ${normalized}.`);
          }
        }
      } catch (err: unknown) {
        if (requestId !== requestRef.current) return;

        // Fallback to cache on network failure
        const fallback = await getCachedAllotment(normalized);
        if (fallback) {
          setStudent(fallback);
          setIsCached(true);
          setPhase('found');
          setMessage('Network error. Showing saved result from offline cache.');
        } else {
          setStudent(null);
          setPhase('error');
          setMessage('Unable to connect to the seating allotment server. Check your network connection.');
        }
      }
    },
    [online, query, searchBy, testDate]
  );

  return {
    query,
    setQuery,
    searchBy,
    setSearchBy,
    testDate,
    setTestDate,
    phase,
    student,
    message,
    isCached,
    matchedId,
    recentList,
    search,
    clear,
  };
}
