import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SeatingAllotmentData } from '@/types/allocation';
import { normalizeRegisterNumber, normalizeStudentId } from '@/utils/studentId';

const STORAGE_KEY = '@exam_room_finder/seating_cache_v2';
const MAX_CACHE_ENTRIES = 100;

export interface CachedSeatingEntry {
  studentId: string;
  registrationNumber: string;
  data: SeatingAllotmentData;
  cachedAt: string;
}

async function loadEntries(): Promise<CachedSeatingEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveEntries(entries: CachedSeatingEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_CACHE_ENTRIES)));
  } catch {
    // Ignore storage write errors in low-storage conditions
  }
}

/**
 * Searches the local cache by studentId or registrationNumber.
 */
export async function getCachedAllotment(query: string): Promise<SeatingAllotmentData | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const asStudentId = normalizeStudentId(trimmed).toUpperCase();
  const asReg = normalizeRegisterNumber(trimmed).toUpperCase();

  const entries = await loadEntries();
  const found = entries.find((e) => {
    const sId = (e.studentId || '').toUpperCase();
    const rNo = (e.registrationNumber || '').toUpperCase();
    return sId === asStudentId || rNo === asReg || sId === trimmed.toUpperCase() || rNo === trimmed.toUpperCase();
  });

  return found ? found.data : null;
}

/**
 * Stores a successful allotment into local device cache.
 */
export async function saveCachedAllotment(data: SeatingAllotmentData): Promise<void> {
  if (!data) return;
  const entries = await loadEntries();

  const studentId = normalizeStudentId(data.studentId || '');
  const registrationNumber = normalizeRegisterNumber(data.registrationNumber || '');

  // Filter out any existing entry for this student
  const filtered = entries.filter((e) => {
    const matchId = studentId && (e.studentId || '').toUpperCase() === studentId.toUpperCase();
    const matchReg = registrationNumber && (e.registrationNumber || '').toUpperCase() === registrationNumber.toUpperCase();
    return !matchId && !matchReg;
  });

  const nextEntry: CachedSeatingEntry = {
    studentId,
    registrationNumber,
    data,
    cachedAt: new Date().toISOString(),
  };

  filtered.unshift(nextEntry);
  await saveEntries(filtered);
}

/**
 * Retrieves recently saved student allotments for quick recall.
 */
export async function getRecentSearches(): Promise<SeatingAllotmentData[]> {
  const entries = await loadEntries();
  return entries.map((e) => e.data);
}

export async function clearSeatingCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
