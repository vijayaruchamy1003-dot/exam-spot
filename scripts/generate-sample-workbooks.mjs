import { mkdirSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const headers = [
  'Student ID',
  'Student Name',
  'Register Number',
  'Department',
  'Examination',
  'Building',
  'Room Number',
  'Floor',
  'Seat Number',
  'Hall Ticket',
];

const sample = [
  ['0010245', 'Sample Student', 'REG001', 'Sample Department', 'Morning session', 'Block A', 'A-204', '2', '24', 'HT-0010245'],
  ['0010246', 'Sample Student Two', 'REG002', 'Sample Department', 'Morning session', 'Block A', 'A-204', '2', '25', ''],
  ['000007', 'Sample Student Three', 'REG007', 'Sample Science', 'Afternoon session', 'Block B', 'B-010', 'Ground', '03', ''],
  ['0011001', 'Sample Student Four', 'REG110', 'Sample Commerce', 'Morning session', 'Block C', 'C-12', '1', '01', ''],
  ['009900', 'Sample Student Five', 'REG990', '', 'Afternoon session', 'Block B', 'B-101', '1', '', ''],
];

const issues = [
  ['0010245', 'Sample Student', 'REG001', 'Sample Department', 'Morning session', 'Block A', 'A-204', '2', '24', ''],
  ['', 'Missing ID', 'REG000', 'Sample Department', 'Morning session', 'Block A', 'A-100', '1', '1', ''],
  ['0010245', 'Duplicate Row', 'REG001B', 'Sample Department', 'Morning session', 'Block B', 'B-200', '2', '8', ''],
  ['000007', 'Sample Student Three', 'REG007', 'Sample Science', 'Afternoon session', 'Block B', 'B-010', 'Ground', '03', ''],
];

function workbook(rows, sheetName) {
  const sheet = {};
  const write = (row, column, value) => {
    sheet[XLSX.utils.encode_cell({ r: row, c: column })] = { t: 's', v: value };
  };
  headers.forEach((header, column) => write(0, column, header));
  rows.forEach((row, index) => row.forEach((value, column) => write(index + 1, column, value)));
  sheet['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: headers.length - 1 },
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  return book;
}

mkdirSync('assets/sample', { recursive: true });
writeFileSync('assets/sample/sample-allocation.xlsx', XLSX.write(workbook(sample, 'Allocations'), { bookType: 'xlsx', type: 'buffer' }));
writeFileSync('assets/sample/sample-allocation-with-issues.xlsx', XLSX.write(workbook(issues, 'Allocations'), { bookType: 'xlsx', type: 'buffer' }));
writeFileSync('assets/sample/sample-allocation.xls', XLSX.write(workbook(sample, 'Allocations'), { bookType: 'xls', type: 'buffer' }));
console.log('Wrote sample workbooks to assets/sample');
