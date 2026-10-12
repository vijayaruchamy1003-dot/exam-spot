import type { AllocationMetadata, AllocationVersionRecord } from '@/types/allocation';

/**
 * Keep the active allocation and the previous one. Older archived, failed,
 * or unpublished versions can be removed by an administrator.
 */
export function versionsEligibleForCleanup(
  versions: AllocationVersionRecord[],
  metadata: AllocationMetadata | null,
): string[] {
  const keep = new Set(
    [metadata?.activeVersionId, metadata?.previousVersionId].filter((id): id is string => Boolean(id)),
  );
  return versions
    .filter((version) => version.status !== 'active' && !keep.has(version.id))
    .map((version) => version.id);
}
