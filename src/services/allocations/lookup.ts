import type { LookupCacheState } from '@/services/allocations/cache';
import { findLookup } from '@/services/allocations/cache';
import { normalizeStudentId } from '@/utils/studentId';

export type LookupDecision =
  | { type: 'need-id' }
  | { type: 'no-allocation' }
  | { type: 'offline-unavailable' }
  | { type: 'use-cache'; stale: true }
  | { type: 'fetch'; versionId: string; studentId: string };

export function decideLookup(input: {
  rawId: string;
  online: boolean;
  localOnly: boolean;
  activeVersionId: string | null | undefined;
  cache: LookupCacheState;
}): LookupDecision {
  const studentId = normalizeStudentId(input.rawId);
  if (!studentId) return { type: 'need-id' };
  if (!input.activeVersionId) return { type: 'no-allocation' };
  if (input.localOnly || input.online) {
    return { type: 'fetch', versionId: input.activeVersionId, studentId };
  }
  const cached = findLookup(input.cache, input.activeVersionId, studentId);
  if (cached) return { type: 'use-cache', stale: true };
  return { type: 'offline-unavailable' };
}

export function cacheFallback(cache: LookupCacheState, versionId: string, studentId: string) {
  return findLookup(cache, versionId, studentId);
}
