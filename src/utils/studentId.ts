import { tidyText } from '@/utils/text';

/**
 * Student IDs stay strings so leading zeros are preserved.
 * Only leading and trailing whitespace is removed. The value is never parsed as a number.
 */
export function normalizeStudentId(value: string): string {
  return tidyText(value);
}

export function assertStudentIdString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Student ID must stay a string and cannot be converted from a number.');
  }
  return normalizeStudentId(value);
}
