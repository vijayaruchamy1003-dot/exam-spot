import { describe, expect, it } from 'vitest';
import { validateImport } from '@/services/import/validate';
import type { ParsedRow } from '@/types/import';

const headers = ['Student ID', 'Student Name', 'Room Number', 'Hall Ticket'];

function row(rowNumber: number, values: string[]): ParsedRow {
  return {
    rowNumber,
    values: {
      'Student ID': values[0] ?? '',
      'Student Name': values[1] ?? '',
      'Room Number': values[2] ?? '',
      'Hall Ticket': values[3] ?? '',
    },
  };
}

describe('import validation', () => {
  it('blocks an empty worksheet', () => {
    const result = validateImport({ rows: [], headers, policy: 'reject', preserveUnmapped: true });
    expect(result.canImport).toBe(false);
    expect(result.summary.totalRows).toBe(0);
    expect(result.blockingReason).toMatch(/no data rows/i);
  });

  it('reports blank IDs with row numbers and does not import them', () => {
    const result = validateImport({
      rows: [row(2, ['0010245', 'Sample Student', 'A-204', 'HT-1']), row(3, ['  ', 'Missing', 'A-205', ''])],
      headers,
      policy: 'reject',
      preserveUnmapped: true,
    });
    expect(result.canImport).toBe(false);
    expect(result.summary.invalidRows).toBe(1);
    expect(result.issues.some((issue) => issue.code === 'blank-id' && issue.rowNumber === 3)).toBe(true);
    expect(result.summary.importedRecords).toBe(0);
  });

  it('preserves leading zeros and extra columns on valid rows', () => {
    const result = validateImport({
      rows: [row(2, ['0010245', 'Sample Student', 'A-204', 'HT-0010245'])],
      headers,
      policy: 'reject',
      preserveUnmapped: true,
    });
    expect(result.canImport).toBe(true);
    expect(result.records[0]).toMatchObject({
      studentId: 'Z0010245',
      studentName: 'Sample Student',
      roomNumber: 'A-204',
      extras: { 'Hall Ticket': 'HT-0010245' },
    });
    expect(result.records[0]?.department).toBeUndefined();
  });

  it('stops on duplicate IDs until a policy is chosen', () => {
    const rows = [
      row(2, ['0010245', 'First', 'A-204', '']),
      row(4, ['0010245', 'Second', 'B-1', '']),
      row(5, ['000007', 'Other', 'C-1', '']),
    ];
    const blocked = validateImport({ rows, headers, policy: 'reject', preserveUnmapped: false });
    expect(blocked.canImport).toBe(false);
    expect(blocked.summary.duplicateRows).toBe(2);
    expect(blocked.issues.filter((issue) => issue.code === 'duplicate-id').map((issue) => issue.rowNumber)).toEqual([2, 4]);

    const keepFirst = validateImport({ rows, headers, policy: 'keep-first', preserveUnmapped: false });
    expect(keepFirst.canImport).toBe(true);
    expect(keepFirst.records.find((record) => record.studentId === 'Z0010245')?.studentName).toBe('First');
    expect(keepFirst.summary.importedRecords).toBe(2);

    const keepLast = validateImport({ rows, headers, policy: 'keep-last', preserveUnmapped: false });
    expect(keepLast.records.find((record) => record.studentId === 'Z0010245')?.roomNumber).toBe('B-1');
  });

  it('imports a seating sheet that has a registration number and no student ID', () => {
    const headers = ['Registration Number', 'Name', 'Seat Number', 'Room Number'];
    const result = validateImport({
      rows: [
        {
          rowNumber: 2,
          values: {
            'Registration Number': '\t9000000000000000001',
            Name: 'Sample Student',
            'Seat Number': '1',
            'Room Number': '1st Floor - Room 1',
          },
        },
      ],
      headers,
      policy: 'reject',
      preserveUnmapped: true,
    });
    expect(result.canImport).toBe(true);
    expect(result.records[0]).toMatchObject({
      studentId: '',
      registerNumber: '9000000000000000001',
      studentName: 'Sample Student',
      seatNumber: '1',
      roomNumber: '1st Floor - Room 1',
    });
  });

  it('requires a student ID column', () => {
    const result = validateImport({
      rows: [row(2, ['0010245', 'Sample Student', 'A-204', ''])],
      headers: ['Name only'],
      mapping: {},
      policy: 'reject',
      preserveUnmapped: false,
    });
    expect(result.canImport).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'missing-column')).toBe(true);
  });
});
