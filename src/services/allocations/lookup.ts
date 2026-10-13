import type { LookupCacheState } from '@/services/allocations/cache';
import { findLookup } from '@/services/allocations/cache';
import type { SearchBy } from '@/types/allocation';
import { normalizeRegisterNumber, normalizeStudentId } from '@/utils/studentId';

export type LookupDecision =
  | { type: 'need-id' }
  | { type: 'no-allocation' }
  | { type: 'offline-unavailable' }
  | { type: 'use-cache'; stale: true }
  | { type: 'fetch'; versionId: string; studentId: string; by: SearchBy };

export function lookupCacheKey(by: SearchBy, raw: string): string {
  const normalized = by === 'registerNumber' ? normalizeRegisterNumber(raw) : normalizeStudentId(raw);
  return normalized ? `${by}:${normalized}` : '';
}

export function decideLookup(input: {
  rawId: string;
  by?: SearchBy;
  online: boolean;
  localOnly: boolean;
  activeVersionId: string | null | undefined;
  cache: LookupCacheState;
}): LookupDecision {
  const by = input.by ?? 'studentId';
  const studentId = by === 'registerNumber' ? normalizeRegisterNumber(input.rawId) : normalizeStudentId(input.rawId);
  if (!studentId) return { type: 'need-id' };
  if (!input.activeVersionId) return { type: 'no-allocation' };
  if (input.localOnly || input.online) {
    return { type: 'fetch', versionId: input.activeVersionId, studentId, by };
  }
  const cached = findLookup(input.cache, input.activeVersionId, lookupCacheKey(by, input.rawId));
  if (cached) return { type: 'use-cache', stale: true };
  return { type: 'offline-unavailable' };
}

export function cacheFallback(cache: LookupCacheState, versionId: string, studentId: string) {
  return findLookup(cache, versionId, studentId);
}
