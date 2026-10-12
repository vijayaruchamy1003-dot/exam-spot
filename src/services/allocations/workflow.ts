import { FIRESTORE_BATCH_SIZE } from '@/config/limits';
import type { AllocationRepository } from '@/services/allocations/repository';
import type { DuplicatePolicy, StudentAllocation } from '@/types/allocation';
import type { ImportProgress, ImportRunResult } from '@/types/import';
import { createVersionId } from '@/utils/documentId';
import { AppError, toUserMessage } from '@/utils/errors';

export async function runImport(
  repo: AllocationRepository,
  input: {
    records: StudentAllocation[];
    sourceFileName: string;
    actorId: string;
    duplicatePolicy: DuplicatePolicy;
    now?: () => string;
    createId?: () => string;
  },
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportRunResult> {
  const before = await repo.getMetadata();
  const beforeVersion = before?.activeVersionId ?? null;

  if (!input.records.length) {
    return {
      ok: false,
      message: 'Nothing to import. Correct the spreadsheet and try again.',
      importedRecords: 0,
      activeVersionUnchanged: true,
    };
  }

  const now = input.now ?? (() => new Date().toISOString());
  const versionId = (input.createId ?? createVersionId)();
  const createdAt = now();

  try {
    onProgress?.({
      phase: 'creating',
      completed: 0,
      total: input.records.length,
      message: 'Preparing a new allocation version.',
    });
    await repo.createVersion({
      id: versionId,
      status: 'uploading',
      expectedCount: input.records.length,
      uploadedCount: 0,
      sourceFileName: input.sourceFileName,
      createdBy: input.actorId,
      createdAt,
      duplicatePolicy: input.duplicatePolicy,
    });

    let uploaded = 0;
    for (let index = 0; index < input.records.length; index += FIRESTORE_BATCH_SIZE) {
      const batch = input.records.slice(index, index + FIRESTORE_BATCH_SIZE);
      await repo.writeStudents(versionId, batch);
      uploaded += batch.length;
      await repo.updateVersion(versionId, { uploadedCount: uploaded, status: 'uploading' });
      onProgress?.({
        phase: 'uploading',
        completed: uploaded,
        total: input.records.length,
        message: `Uploaded ${uploaded} of ${input.records.length} records.`,
      });
    }

    onProgress?.({
      phase: 'verifying',
      completed: uploaded,
      total: input.records.length,
      message: 'Checking that every record was stored.',
    });
    const serverCount = await repo.countStudents(versionId);
    if (serverCount !== input.records.length) {
      throw new AppError(
        'The uploaded records do not match the spreadsheet, so the current allocation was left unchanged.',
        'count-mismatch',
      );
    }

    await repo.updateVersion(versionId, { status: 'ready', uploadedCount: serverCount });
    onProgress?.({
      phase: 'activating',
      completed: serverCount,
      total: input.records.length,
      message: 'Publishing the new allocation.',
    });
    await repo.activateVersion(versionId, input.actorId, now());
    const after = await repo.getMetadata();
    if (after?.activeVersionId !== versionId) {
      return {
        ok: false,
        message: 'The new allocation could not be published, so the current allocation was left unchanged.',
        versionId,
        importedRecords: 0,
        activeVersionUnchanged: (after?.activeVersionId ?? null) === beforeVersion,
      };
    }
    return {
      ok: true,
      message: `Imported ${serverCount} records. Teachers will see this allocation after synchronization.`,
      versionId,
      importedRecords: serverCount,
      activeVersionUnchanged: false,
    };
  } catch (error) {
    await repo.updateVersion(versionId, {
      status: 'failed',
      errorMessage: 'Import failed before the allocation was published.',
    }).catch(() => undefined);
    const after = await repo.getMetadata();
    return {
      ok: false,
      message: toUserMessage(error, 'The upload did not finish, so the current allocation was left unchanged.'),
      versionId,
      importedRecords: 0,
      activeVersionUnchanged: (after?.activeVersionId ?? null) === beforeVersion,
    };
  }
}
