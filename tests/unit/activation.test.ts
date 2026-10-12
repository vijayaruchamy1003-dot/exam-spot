import { describe, expect, it } from 'vitest';
import { planActivation } from '@/services/allocations/activation';
import { versionsEligibleForCleanup } from '@/services/allocations/cleanup';
import { MemoryAllocationRepository } from '@/services/allocations/memoryRepository';
import type { AllocationMetadata, AllocationVersionRecord } from '@/types/allocation';

function version(overrides: Partial<AllocationVersionRecord> = {}): AllocationVersionRecord {
  return {
    id: 'vnext',
    status: 'ready',
    expectedCount: 2,
    uploadedCount: 2,
    sourceFileName: 'next.xlsx',
    createdBy: 'admin',
    createdAt: '2026-10-12T09:00:00.000Z',
    duplicatePolicy: 'reject',
    ...overrides,
  };
}

const current: AllocationMetadata = {
  activeVersionId: 'vcurrent',
  previousVersionId: 'volder',
  lastSuccessfulImportAt: '2026-10-11T09:00:00.000Z',
  recordCount: 2,
  sourceFileName: 'current.xlsx',
  activatedBy: 'admin',
};

describe('allocation activation', () => {
  it('publishes a verified version and keeps the previous active version', () => {
    const plan = planActivation({
      version: version(),
      serverCount: 2,
      current,
      actorId: 'admin',
      nowIso: '2026-10-12T10:00:00.000Z',
    });
    expect(plan.metadata.activeVersionId).toBe('vnext');
    expect(plan.metadata.previousVersionId).toBe('vcurrent');
    expect(plan.archiveVersionId).toBe('vcurrent');
    expect(plan.versionUpdate.status).toBe('active');
  });

  it('refuses to activate an upload that is not ready', () => {
    expect(() =>
      planActivation({
        version: version({ status: 'uploading' }),
        serverCount: 2,
        current,
        actorId: 'admin',
        nowIso: '2026-10-12T10:00:00.000Z',
      }),
    ).toThrow(/left unchanged/);
  });

  it('refuses to activate when the stored count does not match', () => {
    expect(() =>
      planActivation({
        version: version(),
        serverCount: 1,
        current,
        actorId: 'admin',
        nowIso: '2026-10-12T10:00:00.000Z',
      }),
    ).toThrow(/do not match/);
  });

  it('does not change the current allocation when activation is rejected', async () => {
    const repo = new MemoryAllocationRepository();
    await repo.createVersion(version({ id: 'vcurrent', status: 'active', expectedCount: 1, uploadedCount: 1 }));
    await repo.writeStudents('vcurrent', [{ studentId: '0010245', roomNumber: 'A-204' }]);
    await repo.updateVersion('vcurrent', { status: 'ready' });
    await repo.activateVersion('vcurrent', 'admin', '2026-10-11T09:00:00.000Z');
    await repo.createVersion(version({ id: 'vbroken', status: 'uploading', expectedCount: 1, uploadedCount: 0 }));
    await expect(repo.activateVersion('vbroken', 'admin', '2026-10-12T10:00:00.000Z')).rejects.toThrow(/left unchanged/);
    expect((await repo.getMetadata())?.activeVersionId).toBe('vcurrent');
  });

  it('keeps the active and previous versions during cleanup', () => {
    const removable = versionsEligibleForCleanup(
      [
        version({ id: 'vnext', status: 'active' }),
        version({ id: 'vcurrent', status: 'archived' }),
        version({ id: 'volder', status: 'archived' }),
        version({ id: 'vfailed', status: 'failed' }),
      ],
      { ...current, activeVersionId: 'vnext', previousVersionId: 'vcurrent' },
    );
    expect(removable).toEqual(['volder', 'vfailed']);
  });
});
