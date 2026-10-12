import { normalizeStudentId } from '@/utils/studentId';

const MAX_DOCUMENT_ID_LENGTH = 700;

/**
 * Firestore document IDs cannot contain "/" and cannot be "." or "..".
 * Encoding keeps the student ID recoverable and avoids path injection.
 */
export function studentDocumentId(studentId: string): string {
  const normalized = normalizeStudentId(studentId);
  if (!normalized) {
    throw new Error('A student ID is required to store an allocation.');
  }
  const encoded = encodeURIComponent(normalized);
  if (encoded === '.' || encoded === '..' || encoded.length > MAX_DOCUMENT_ID_LENGTH) {
    throw new Error('This student ID cannot be stored safely.');
  }
  return encoded;
}

export function createVersionId(now = Date.now(), random = Math.random()): string {
  const suffix = Math.floor(random * 1e8).toString(36);
  return `v${now.toString(36)}${suffix}`;
}
