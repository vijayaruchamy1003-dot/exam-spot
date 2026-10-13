import { describe, expect, it } from 'vitest';
import { studentDocumentId } from '@/utils/documentId';
import { assertStudentIdString, normalizeStudentId } from '@/utils/studentId';

describe('student ID normalization', () => {
  it('keeps leading zeros and does not parse the ID as a number', () => {
    expect(normalizeStudentId('0010245')).toBe('Z0010245');
    expect(normalizeStudentId('  000007  ')).toBe('Z000007');
    expect(normalizeStudentId('Z0010245')).toBe('Z0010245');
    expect(normalizeStudentId('z0010245')).toBe('Z0010245');
    expect(normalizeStudentId('   ')).toBe('');
    expect(normalizeStudentId('0010245')).not.toBe(String(Number('0010245')));
  });

  it('rejects numeric values instead of converting them', () => {
    expect(() => assertStudentIdString(10245)).toThrow(/string/);
  });

  it('builds a safe document ID without dropping zeros', () => {
    expect(studentDocumentId('0010245')).toBe('Z0010245');
    expect(studentDocumentId('Z0010245')).toBe('Z0010245');
    expect(studentDocumentId('A/12')).toBe('ZA%2F12');
    expect(() => studentDocumentId('   ')).toThrow();
  });
});
