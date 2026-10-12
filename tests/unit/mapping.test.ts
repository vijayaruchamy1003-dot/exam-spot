import { describe, expect, it } from 'vitest';
import { cellToText } from '@/services/import/cellText';
import { suggestColumnMapping } from '@/services/import/mapping';
import { parseWorkbook, toArrayBuffer, workbookFromRows } from '@/services/import/parseWorkbook';
import * as XLSX from 'xlsx';

describe('column mapping and cell text', () => {
  it('maps common header names without requiring an exact template', () => {
    const mapping = suggestColumnMapping(['Roll No', 'Candidate Name', 'Room No', 'Seat']);
    expect(mapping.studentId).toBe('Roll No');
    expect(mapping.studentName).toBe('Candidate Name');
    expect(mapping.roomNumber).toBe('Room No');
    expect(mapping.seatNumber).toBe('Seat');
    expect(mapping.department).toBeUndefined();
  });

  it('prefers formatted text so displayed leading zeros survive', () => {
    expect(cellToText({ t: 'n', v: 10245, w: '0010245' })).toBe('0010245');
    expect(cellToText({ t: 's', v: '0010245' })).toBe('0010245');
    expect(cellToText({ t: 'n', v: 10245 })).toBe('10245');
  });

  it('reads string IDs back from a workbook', () => {
    const bytes = workbookFromRows(
      ['Student ID', 'Student Name', 'Room Number'],
      [
        ['0010245', 'Sample Student', 'A-204'],
        ['000007', 'Sample Student Three', 'B-010'],
      ],
    );
    const workbook = parseWorkbook(bytes);
    expect(workbook.sheets[0]?.rows[0]?.values['Student ID']).toBe('0010245');
    expect(workbook.sheets[0]?.rows[1]?.values['Student ID']).toBe('000007');
  });

  it('rejects a file that is not an Excel workbook', () => {
    expect(() => parseWorkbook(new ArrayBuffer(8))).toThrow(/could not be read/i);
  });

  it('reads an .xls workbook without turning a text ID into a number', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Student ID', 'Room Number'],
      ['0010245', 'A-204'],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Allocations');
    const bytes = toArrayBuffer(XLSX.write(book, { bookType: 'xls', type: 'array' }));
    const workbook = parseWorkbook(bytes);
    expect(workbook.sheets[0]?.rows[0]?.values['Student ID']).toBe('0010245');
  });
});
