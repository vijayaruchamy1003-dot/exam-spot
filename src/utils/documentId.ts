import type { SearchBy, StudentAllocation } from '@/types/allocation';
import { normalizeRegisterNumber, normalizeStudentId } from '@/utils/studentId';

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
  return safeDocumentId(normalized, 'This student ID cannot be stored safely.');
}

export function registerDocumentId(registerNumber: string): string {
  const normalized = normalizeRegisterNumber(registerNumber);
  if (!normalized) {
    throw new Error('A registration number is required to store an allocation.');
  }
  return safeDocumentId(normalized, 'This registration number cannot be stored safely.');
}

export function storedStudentDocumentId(student: Pick<StudentAllocation, 'studentId' | 'registerNumber'>): string {
  if (student.studentId) return studentDocumentId(student.studentId);
  if (student.registerNumber) return registerDocumentId(student.registerNumber);
  throw new Error('A student ID or registration number is required to store an allocation.');
}

export function lookupDocumentId(by: SearchBy, value: string): string {
  const encoded = by === 'registerNumber' ? registerDocumentId(value) : studentDocumentId(value);
  return `${by === 'registerNumber' ? 'reg' : 'id'}~${encoded}`;
}

function safeDocumentId(normalized: string, invalidMessage: string): string {
  const encoded = encodeURIComponent(normalized);
  if (encoded === '.' || encoded === '..' || encoded.length > MAX_DOCUMENT_ID_LENGTH) {
    throw new Error(invalidMessage);
  }
  return encoded;
}

export function createVersionId(now = Date.now(), random = Math.random()): string {
  const suffix = Math.floor(random * 1e8).toString(36);
  return `v${now.toString(36)}${suffix}`;
}
