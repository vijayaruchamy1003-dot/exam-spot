import type { AllocationMetadata, AllocationVersionRecord } from '@/types/allocation';
import { AppError } from '@/utils/errors';

export interface ActivationPlan {
  metadata: AllocationMetadata;
  versionUpdate: { status: 'active'; activatedAt: string };
  archiveVersionId: string | null;
}

/**
 * Pure activation decision. The previous active version stays in place until this plan is applied.
 * A failed check throws and must not change the current metadata.
 */
export function planActivation(input: {
  version: AllocationVersionRecord;
  serverCount: number;
  current: AllocationMetadata | null;
  actorId: string;
  nowIso: string;
}): ActivationPlan {
  const { version, serverCount, current, actorId, nowIso } = input;

  if (version.status !== 'ready') {
    throw new AppError(
      'The new allocation is not ready to publish, so the current allocation was left unchanged.',
      'not-ready',
    );
  }

  const countMatches = version.expectedCount > 0 && version.uploadedCount === version.expectedCount && serverCount === version.expectedCount;
  if (!countMatches) {
    throw new AppError(
      'The uploaded records do not match the spreadsheet, so the current allocation was left unchanged.',
      'count-mismatch',
    );
  }

  const previousVersionId = current?.activeVersionId && current.activeVersionId !== version.id ? current.activeVersionId : null;

  return {
    archiveVersionId: previousVersionId,
    versionUpdate: { status: 'active', activatedAt: nowIso },
    metadata: {
      activeVersionId: version.id,
      previousVersionId,
      lastSuccessfulImportAt: nowIso,
      recordCount: version.expectedCount,
      sourceFileName: version.sourceFileName,
      activatedBy: actorId,
    },
  };
}
