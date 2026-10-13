import { tidyText } from '@/utils/text';

/** Every student ID is stored and searched with this prefix. */
export const STUDENT_ID_PREFIX = 'Z';

/**
 * Student IDs stay strings so leading zeros are preserved.
 * Leading and trailing whitespace is removed. A leading Z is added when it is missing.
 * The value is never parsed as a number.
 */
export function normalizeStudentId(value: string): string {
  const trimmed = tidyText(value);
  if (!trimmed) return '';
  if (trimmed.startsWith(STUDENT_ID_PREFIX) || trimmed.startsWith(STUDENT_ID_PREFIX.toLowerCase())) {
    return STUDENT_ID_PREFIX + trimmed.slice(1);
  }
  return STUDENT_ID_PREFIX + trimmed;
}

/** Registration numbers stay as text. They do not receive the student ID prefix. */
export function normalizeRegisterNumber(value: string): string {
  return tidyText(value);
}

export function assertStudentIdString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Student ID must stay a string and cannot be converted from a number.');
  }
  return normalizeStudentId(value);
}
