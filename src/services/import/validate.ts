import { suggestColumnMapping } from '@/services/import/mapping';
import { STANDARD_FIELDS, type ColumnMapping, type FieldKey } from '@/services/import/fields';
import type { DuplicatePolicy, StudentAllocation } from '@/types/allocation';
import type { ImportIssue, ParsedRow, PreviewRow, ValidatedImport } from '@/types/import';
import { isPrivateContactField } from '@/utils/contactField';
import { normalizeRegisterNumber, normalizeStudentId } from '@/utils/studentId';

const DETAIL_FIELDS = STANDARD_FIELDS.filter((field) => field.key !== 'studentId' && field.key !== 'registerNumber').map((field) => field.key);

type Annotated = { row: ParsedRow; studentId: string; registerNumber: string };

export function validateImport(input: {
  rows: ParsedRow[];
  headers: string[];
  mapping?: ColumnMapping;
  policy: DuplicatePolicy;
  preserveUnmapped: boolean;
}): ValidatedImport {
  const mapping = input.mapping ?? suggestColumnMapping(input.headers);
  const issues: ImportIssue[] = [];
  const studentMapped = mapped(mapping.studentId, input.headers);
  const registerMapped = mapped(mapping.registerNumber, input.headers);
  const identityMapped = studentMapped || registerMapped;

  if (!input.rows.length) {
    issues.push({
      rowNumber: 1,
      code: 'empty-sheet',
      message: 'The selected worksheet has no data rows.',
    });
  }

  if (!identityMapped) {
    issues.push({
      rowNumber: 1,
      code: 'missing-column',
      message: 'Map a spreadsheet column to Student ID or Registration number. The import needs at least one of them.',
    });
  }

  const annotated = input.rows.map((row) => ({
    row,
    studentId: studentMapped ? normalizeStudentId(row.values[mapping.studentId as string] ?? '') : '',
    registerNumber: registerMapped ? normalizeRegisterNumber(row.values[mapping.registerNumber as string] ?? '') : '',
  }));

  const keyCounts = new Map<string, number>();
  for (const item of annotated) {
    for (const key of identityKeys(item)) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  const duplicateKeys = new Set([...keyCounts.entries()].filter(([, count]) => count > 1).map(([key]) => key));

  const blankRows = annotated.filter((item) => identityMapped && identityKeys(item).length === 0);
  for (const item of blankRows) {
    issues.push({
      rowNumber: item.row.rowNumber,
      code: 'blank-id',
      message: `Row ${item.row.rowNumber} has no student ID or registration number. Add one of them or remove the row, then import again.`,
    });
  }

  for (const item of annotated) {
    const keys = identityKeys(item).filter((key) => duplicateKeys.has(key));
    if (!keys.length) continue;
    const labels = keys.map((key) => (key.startsWith('id:') ? `Student ID ${key.slice(3)}` : `Registration number ${key.slice(4)}`));
    issues.push({
      rowNumber: item.row.rowNumber,
      studentId: item.studentId || undefined,
      code: 'duplicate-id',
      message: `${labels.join(' and ')} on row ${item.row.rowNumber} is duplicated.`,
    });
  }

  const records = identityMapped ? resolveRecords(annotated, mapping, input.policy, input.preserveUnmapped, duplicateKeys) : [];
  const validRows = annotated.filter((item) => identityKeys(item).length > 0).length;
  const duplicateRows = annotated.filter((item) => identityKeys(item).some((key) => duplicateKeys.has(key))).length;
  const invalidRows = blankRows.length;
  const blockedByDuplicates = duplicateKeys.size > 0 && input.policy === 'reject';
  const blockedByBlanks = invalidRows > 0;
  const blockedByEmpty = input.rows.length === 0 || !identityMapped;
  const canImport = !blockedByDuplicates && !blockedByBlanks && !blockedByEmpty && records.length > 0;

  const reasons: string[] = [];
  if (!identityMapped) reasons.push('Map the Student ID or Registration number column before importing.');
  if (!input.rows.length) reasons.push('The selected worksheet has no data rows.');
  if (blockedByBlanks) {
    reasons.push(
      `${invalidRows} row${invalidRows === 1 ? '' : 's'} ${invalidRows === 1 ? 'is' : 'are'} missing both a student ID and a registration number. Correct the spreadsheet. Invalid rows are not skipped.`,
    );
  }
  if (blockedByDuplicates) {
    reasons.push('Duplicate student IDs or registration numbers were found. Correct them, or explicitly choose keep first or keep last.');
  }

  return {
    records,
    issues: issues.sort((a, b) => a.rowNumber - b.rowNumber || a.code.localeCompare(b.code)),
    summary: {
      totalRows: input.rows.length,
      validRows,
      invalidRows,
      duplicateRows,
      importedRecords: canImport ? records.length : 0,
    },
    preview: annotated.slice(0, 5).map((item) => ({
      rowNumber: item.row.rowNumber,
      studentId: item.studentId,
      registerNumber: item.registerNumber,
      studentName: readMapped(item.row, mapping, 'studentName'),
      roomNumber: readMapped(item.row, mapping, 'roomNumber'),
      seatNumber: readMapped(item.row, mapping, 'seatNumber'),
      status: identityKeys(item).length === 0 ? 'blank-id' : identityKeys(item).some((key) => duplicateKeys.has(key)) ? 'duplicate' : 'valid',
    })),
    canImport,
    blockingReason: reasons.length ? reasons.join(' ') : undefined,
    policy: input.policy,
  };
}

function mapped(header: string | undefined, headers: string[]): boolean {
  return Boolean(header && headers.includes(header));
}

function identityKeys(item: Annotated): string[] {
  const keys: string[] = [];
  if (item.studentId) keys.push(`id:${item.studentId}`);
  if (item.registerNumber) keys.push(`reg:${item.registerNumber}`);
  return keys;
}

function resolveRecords(
  annotated: Annotated[],
  mapping: ColumnMapping,
  policy: DuplicatePolicy,
  preserveUnmapped: boolean,
  duplicateKeys: Set<string>,
): StudentAllocation[] {
  const winners = new Map<string, Annotated>();
  for (const item of annotated) {
    for (const key of identityKeys(item)) {
      if (policy === 'keep-last' || !winners.has(key)) winners.set(key, item);
    }
  }

  const records: StudentAllocation[] = [];
  const seenRows = new Set<number>();
  for (const item of annotated) {
    const keys = identityKeys(item);
    if (!keys.length || seenRows.has(item.row.rowNumber)) continue;
    if (policy === 'reject' && keys.some((key) => duplicateKeys.has(key))) continue;
    if (policy !== 'reject' && keys.some((key) => winners.get(key)?.row.rowNumber !== item.row.rowNumber)) continue;
    seenRows.add(item.row.rowNumber);
    records.push(toAllocation(item.row, item.studentId, item.registerNumber, mapping, preserveUnmapped));
  }
  return records;
}

function readMapped(row: ParsedRow, mapping: ColumnMapping, key: FieldKey): string {
  const header = mapping[key];
  if (!header) return '';
  return row.values[header] ?? '';
}

function toAllocation(
  row: ParsedRow,
  studentId: string,
  registerNumber: string,
  mapping: ColumnMapping,
  preserveUnmapped: boolean,
): StudentAllocation {
  const record: StudentAllocation = { studentId };
  if (registerNumber) record.registerNumber = registerNumber;
  for (const key of DETAIL_FIELDS) {
    const value = readMapped(row, mapping, key);
    if (value) record[key] = value;
  }
  if (preserveUnmapped) {
    const used = new Set(Object.values(mapping).filter((header): header is string => Boolean(header)));
    const extras: Record<string, string> = {};
    for (const [header, value] of Object.entries(row.values)) {
      if (!value || used.has(header) || isPrivateContactField(header)) continue;
      const key = firestoreMapKey(header, extras);
      extras[key] = value;
    }
    if (Object.keys(extras).length) record.extras = extras;
  }
  return record;
}

export function firestoreMapKey(header: string, existing: Record<string, string>): string {
  const cleaned = header.replace(/[.[\]*/]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Field';
  if (!(cleaned in existing)) return cleaned;
  let suffix = 2;
  while (`${cleaned} ${suffix}` in existing) suffix += 1;
  return `${cleaned} ${suffix}`;
}

export type { PreviewRow };
