import { describe, expect, it } from 'vitest';
import { normalizeSearchQuery } from '@/services/api/seatingApi';

describe('normalizeSearchQuery', () => {
  it('adds Z prefix to student IDs when missing', () => {
    expect(normalizeSearchQuery('11586', 'studentId')).toBe('Z11586');
    expect(normalizeSearchQuery('0010245', 'studentId')).toBe('Z0010245');
  });

  it('preserves existing Z prefix regardless of case', () => {
    expect(normalizeSearchQuery('Z11586', 'studentId')).toBe('Z11586');
    expect(normalizeSearchQuery('z11586', 'studentId')).toBe('Z11586');
  });

  it('keeps registration numbers as exact trimmed strings', () => {
    expect(normalizeSearchQuery(' 1102011081109260001 ', 'registerNumber')).toBe('1102011081109260001');
    expect(normalizeSearchQuery('REG-9901', 'registerNumber')).toBe('REG-9901');
  });

  it('returns empty string on whitespace or empty query', () => {
    expect(normalizeSearchQuery('', 'studentId')).toBe('');
    expect(normalizeSearchQuery('   ', 'registerNumber')).toBe('');
  });
});
