import { describe, expect, it } from 'vitest';
import { cacheWithMetadata, emptyCache, findLookup, rememberLookup } from '@/services/allocations/cache';
import { decideLookup } from '@/services/allocations/lookup';
import type { AllocationMetadata } from '@/types/allocation';

const metadata: AllocationMetadata = {
  activeVersionId: 'vcurrent',
  previousVersionId: null,
  lastSuccessfulImportAt: '2026-10-12T09:00:00.000Z',
  recordCount: 1,
  sourceFileName: 'sample.xlsx',
  activatedBy: 'admin',
};

describe('student lookup decisions', () => {
  it('fetches the active version directly when online', () => {
    const decision = decideLookup({
      rawId: ' 0010245 ',
      online: true,
      localOnly: false,
      activeVersionId: 'vcurrent',
      cache: emptyCache(),
    });
    expect(decision).toEqual({ type: 'fetch', versionId: 'vcurrent', studentId: '0010245' });
  });

  it('uses a cached record only when it belongs to the active version', () => {
    const saved = rememberLookup(cacheWithMetadata(emptyCache(), metadata, '2026-10-12T09:30:00.000Z'), {
      versionId: 'vcurrent',
      studentId: '0010245',
      found: true,
      student: { studentId: '0010245', roomNumber: 'A-204' },
      cachedAt: '2026-10-12T09:30:00.000Z',
    });
    const otherVersion = rememberLookup(saved, {
      versionId: 'vother',
      studentId: '0010245',
      found: true,
      student: { studentId: '0010245', roomNumber: 'Z-9' },
      cachedAt: '2026-10-12T09:40:00.000Z',
    });
    expect(findLookup(otherVersion, 'vcurrent', '0010245')?.student?.roomNumber).toBe('A-204');
    expect(findLookup(otherVersion, 'vother', '0010245')).toBeNull();

    const offline = decideLookup({
      rawId: '0010245',
      online: false,
      localOnly: false,
      activeVersionId: 'vcurrent',
      cache: otherVersion,
    });
    expect(offline.type).toBe('use-cache');
  });

  it('does not invent a result when offline and the ID was never saved', () => {
    const decision = decideLookup({
      rawId: '009900',
      online: false,
      localOnly: false,
      activeVersionId: 'vcurrent',
      cache: cacheWithMetadata(emptyCache(), metadata, '2026-10-12T09:30:00.000Z'),
    });
    expect(decision.type).toBe('offline-unavailable');
  });

  it('asks for an ID and reports a missing allocation', () => {
    expect(decideLookup({ rawId: '   ', online: true, localOnly: false, activeVersionId: 'vcurrent', cache: emptyCache() }).type).toBe('need-id');
    expect(decideLookup({ rawId: '0010245', online: true, localOnly: false, activeVersionId: null, cache: emptyCache() }).type).toBe('no-allocation');
  });
});
