import * as XLSX from 'xlsx';
import { MAX_IMPORT_ROWS } from '@/config/limits';
import { cellToText } from '@/services/import/cellText';
import type { ParsedSheet, ParsedWorkbook } from '@/types/import';
import { AppError } from '@/utils/errors';

export function parseWorkbook(bytes: ArrayBuffer): ParsedWorkbook {
  assertSpreadsheet(bytes);
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: 'array', cellDates: false });
  } catch {
    throw new AppError('This file could not be read. Choose an Excel workbook (.xlsx or .xls).', 'unsupported-file');
  }

  if (!workbook.SheetNames.length) {
    throw new AppError('The workbook has no worksheets.', 'empty-workbook');
  }

  return {
    sheets: workbook.SheetNames.map((name) => sheetToTable(name, workbook.Sheets[name])),
  };
}

function assertSpreadsheet(bytes: ArrayBuffer): void {
  const view = new Uint8Array(bytes);
  const zip = view.length >= 4 && view[0] === 0x50 && view[1] === 0x4b;
  const ole = view.length >= 8 && view[0] === 0xd0 && view[1] === 0xcf && view[2] === 0x11 && view[3] === 0xe0;
  if (!zip && !ole) {
    throw new AppError('This file could not be read. Choose an Excel workbook (.xlsx or .xls).', 'unsupported-file');
  }
}

function sheetToTable(name: string, sheet: XLSX.WorkSheet | undefined): ParsedSheet {
  if (!sheet || !sheet['!ref']) {
    return { name, headers: [], rows: [] };
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const headers: string[] = [];
  const seen = new Map<string, number>();

  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const raw = cellToText(sheet[XLSX.utils.encode_cell({ r: range.s.r, c: column })]);
    const base = raw || `Column ${column - range.s.c + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    headers.push(count === 1 ? base : `${base} (${count})`);
  }

  const rows: ParsedSheet['rows'] = [];
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const values: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      const text = cellToText(sheet[XLSX.utils.encode_cell({ r: row, c: range.s.c + index })]);
      values[header] = text;
      if (text) hasValue = true;
    });
    if (!hasValue) continue;
    rows.push({ rowNumber: row + 1, values });
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new AppError(
        `This worksheet has more than ${MAX_IMPORT_ROWS.toLocaleString()} data rows. Split the file and import again.`,
        'too-many-rows',
      );
    }
  }

  return { name, headers, rows };
}

export function workbookFromRows(headers: string[], rows: string[][], sheetName = 'Allocations'): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  return toArrayBuffer(XLSX.write(book, { bookType: 'xlsx', type: 'array' }));
}

export function toArrayBuffer(bytes: ArrayBuffer | Uint8Array | number[]): ArrayBuffer {
  if (bytes instanceof ArrayBuffer) return bytes;
  if (ArrayBuffer.isView(bytes)) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
  return Uint8Array.from(bytes).buffer;
}
