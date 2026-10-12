import { useCallback, useEffect, useRef, useState } from 'react';
import { LOOKUP_TIMEOUT_MS, MIN_TYPEAHEAD_LENGTH, SEARCH_DEBOUNCE_MS } from '@/config/limits';
import { appCache } from '@/services/allocations/appCache';
import { getAllocationRepository } from '@/services/allocations/getRepository';
import { cacheFallback, decideLookup } from '@/services/allocations/lookup';
import type { AllocationMetadata, StudentAllocation } from '@/types/allocation';
import { AppError, toUserMessage } from '@/utils/errors';
import { withTimeout } from '@/utils/text';
import { normalizeStudentId } from '@/utils/studentId';

export type SearchPhase = 'idle' | 'searching' | 'found' | 'not-found' | 'no-allocation' | 'offline' | 'error';

export function useStudentSearch(input: {
  metadata: AllocationMetadata | null;
  online: boolean;
  localOnly: boolean;
}) {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [student, setStudent] = useState<StudentAllocation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [matchedId, setMatchedId] = useState<string | null>(null);
  const requestRef = useRef(0);
  const lastSearched = useRef<string | null>(null);
  const versionId = input.metadata?.activeVersionId ?? null;

  const applyCached = useCallback((version: string, studentId: string) => {
    const cached = cacheFallback(appCache.snapshot(), version, studentId);
    if (!cached) return false;
    setStudent(cached.student);
    setMatchedId(studentId);
    setStale(true);
    setPhase(cached.found ? 'found' : 'not-found');
    setMessage(
      cached.found
        ? 'Showing a saved result from the last synchronization. It may be out of date.'
        : 'This ID was not in the allocation at the last synchronization. That result may be out of date.',
    );
    return true;
  }, []);

  const run = useCallback(
    async (raw: string) => {
      const decision = decideLookup({
        rawId: raw,
        online: input.online,
        localOnly: input.localOnly,
        activeVersionId: versionId,
        cache: appCache.snapshot(),
      });
      const requestId = ++requestRef.current;
      if (decision.type === 'need-id') {
        setPhase('idle');
        setStudent(null);
        setMessage('Enter a student ID.');
        setStale(false);
        return;
      }
      if (decision.type === 'no-allocation') {
        setPhase('no-allocation');
        setStudent(null);
        setStale(false);
        setMessage('No allocation has been published yet.');
        return;
      }
      if (decision.type === 'offline-unavailable') {
        setPhase('offline');
        setStudent(null);
        setStale(true);
        setMessage('You are offline, and this student ID is not in the saved results on this phone.');
        return;
      }
      if (decision.type === 'use-cache') {
        applyCached(versionId as string, normalizeStudentId(raw));
        return;
      }

      lastSearched.current = decision.studentId;
      setPhase('searching');
      setStudent(null);
      setMessage(null);
      setStale(false);
      try {
        const repo = getAllocationRepository();
        const found = await withTimeout(
          repo.getStudent(decision.versionId, decision.studentId),
          LOOKUP_TIMEOUT_MS,
          'The lookup took too long. Check the connection and try again.',
        );
        if (requestId !== requestRef.current) return;
        if (versionId !== decision.versionId) return;
        await appCache.remember({
          versionId: decision.versionId,
          studentId: decision.studentId,
          found: Boolean(found),
          student: found,
          cachedAt: new Date().toISOString(),
        });
        setStudent(found);
        setMatchedId(decision.studentId);
        setStale(false);
        setPhase(found ? 'found' : 'not-found');
        setMessage(found ? null : 'Student not found');
      } catch (error) {
        if (requestId !== requestRef.current) return;
        if (applyCached(decision.versionId, decision.studentId)) return;
        setStudent(null);
        setPhase('error');
        setStale(false);
        setMessage(error instanceof AppError ? error.message : toUserMessage(error, 'The student lookup failed.'));
      }
    },
    [applyCached, input.localOnly, input.online, versionId],
  );

  useEffect(() => {
    if (normalizeStudentId(query).length < MIN_TYPEAHEAD_LENGTH) return;
    const timer = setTimeout(() => {
      void run(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, run]);

  useEffect(() => {
    if (!lastSearched.current) return;
    void run(lastSearched.current);
  }, [versionId, input.online, run]);

  function clear() {
    requestRef.current += 1;
    lastSearched.current = null;
    setQuery('');
    setPhase('idle');
    setStudent(null);
    setMessage(null);
    setStale(false);
    setMatchedId(null);
  }

  return {
    query,
    setQuery,
    phase,
    student,
    message,
    stale,
    matchedId,
    search: () => run(query),
    clear,
  };
}
