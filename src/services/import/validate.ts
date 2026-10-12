import { suggestColumnMapping } from '@/services/import/mapping';
import { STANDARD_FIELDS, type ColumnMapping, type FieldKey } from '@/services/import/fields';
import type { DuplicatePolicy, StudentAllocation } from '@/types/allocation';
import type { ImportIssue, ParsedRow, PreviewRow, ValidatedImport } from '@/types/import';
import { normalizeStudentId } from '@/utils/studentId';

const OPTIONAL_FIELDS = STANDARD_FIELDS.filter((field) => field.key !== 'studentId').map((field) => field.key);

export function validateImport(input: {
  rows: ParsedRow[];
  headers: string[];
  mapping?: ColumnMapping;
  policy: DuplicatePolicy;
  preserveUnmapped: boolean;
}): ValidatedImport {
  const mapping = input.mapping ?? suggestColumnMapping(input.headers);
  const issues: ImportIssue[] = [];
  const studentHeader = mapping.studentId;
  const headerKnown = Boolean(studentHeader && input.headers.includes(studentHeader));

  if (!input.rows.length) {
    issues.push({
      rowNumber: 1,
      code: 'empty-sheet',
      message: 'The selected worksheet has no data rows.',
    });
  }

  if (!headerKnown) {
    issues.push({
      rowNumber: 1,
      code: 'missing-column',
      message: 'Map a spreadsheet column to Student ID. The import cannot start without it.',
    });
  }

  const annotated = input.rows.map((row) => {
    const studentId = headerKnown ? normalizeStudentId(row.values[studentHeader as string] ?? '') : '';
    return { row, studentId };
  });

  const idCounts = new Map<string, number>();
  for (const item of annotated) {
    if (!item.studentId) continue;
    idCounts.set(item.studentId, (idCounts.get(item.studentId) ?? 0) + 1);
  }

  const blankRows = annotated.filter((item) => headerKnown && !item.studentId);
  for (const item of blankRows) {
    issues.push({
      rowNumber: item.row.rowNumber,
      code: 'blank-id',
      message: `Row ${item.row.rowNumber} has a blank student ID. Add the ID or remove the row, then import again.`,
    });
  }

  const duplicateIds = new Set(
    [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id),
  );

  for (const id of duplicateIds) {
    const rowNumbers = annotated.filter((item) => item.studentId === id).map((item) => item.row.rowNumber);
    for (const item of annotated.filter((entry) => entry.studentId === id)) {
      issues.push({
        rowNumber: item.row.rowNumber,
        studentId: id,
        code: 'duplicate-id',
        message: `Student ID ${id} is duplicated on rows ${rowNumbers.join(', ')}.`,
      });
    }
  }

  const records = headerKnown ? resolveRecords(annotated, mapping, input.policy, input.preserveUnmapped, duplicateIds) : [];
  const validRows = annotated.filter((item) => item.studentId).length;
  const duplicateRows = annotated.filter((item) => item.studentId && duplicateIds.has(item.studentId)).length;
  const invalidRows = blankRows.length;
  const blockedByDuplicates = duplicateIds.size > 0 && input.policy === 'reject';
  const blockedByBlanks = invalidRows > 0;
  const blockedByEmpty = input.rows.length === 0 || !headerKnown;
  const canImport = !blockedByDuplicates && !blockedByBlanks && !blockedByEmpty && records.length > 0;

  const reasons: string[] = [];
  if (!headerKnown) reasons.push('Map the Student ID column before importing.');
  if (!input.rows.length) reasons.push('The selected worksheet has no data rows.');
  if (blockedByBlanks) {
    reasons.push(
      `${invalidRows} row${invalidRows === 1 ? '' : 's'} ${invalidRows === 1 ? 'is' : 'are'} missing a student ID. Correct the spreadsheet. Invalid rows are not skipped.`,
    );
  }
  if (blockedByDuplicates) {
    reasons.push('Duplicate student IDs were found. Correct them, or explicitly choose keep first or keep last.');
  }

  return {
    records: canImport ? records : records,
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
      studentName: readMapped(item.row, mapping, 'studentName'),
      roomNumber: readMapped(item.row, mapping, 'roomNumber'),
      seatNumber: readMapped(item.row, mapping, 'seatNumber'),
      status: !item.studentId ? 'blank-id' : duplicateIds.has(item.studentId) ? 'duplicate' : 'valid',
    })),
    canImport,
    blockingReason: reasons.length ? reasons.join(' ') : undefined,
    policy: input.policy,
  };
}

function resolveRecords(
  annotated: { row: ParsedRow; studentId: string }[],
  mapping: ColumnMapping,
  policy: DuplicatePolicy,
  preserveUnmapped: boolean,
  duplicateIds: Set<string>,
): StudentAllocation[] {
  const groups = new Map<string, { row: ParsedRow; studentId: string }[]>();
  for (const item of annotated) {
    if (!item.studentId) continue;
    const group = groups.get(item.studentId) ?? [];
    group.push(item);
    groups.set(item.studentId, group);
  }

  const records: StudentAllocation[] = [];
  for (const [studentId, group] of groups) {
    if (duplicateIds.has(studentId) && policy === 'reject') continue;
    const chosen = policy === 'keep-last' ? group[group.length - 1] : group[0];
    records.push(toAllocation(chosen.row, studentId, mapping, preserveUnmapped));
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
  mapping: ColumnMapping,
  preserveUnmapped: boolean,
): StudentAllocation {
  const record: StudentAllocation = { studentId };
  for (const key of OPTIONAL_FIELDS) {
    const value = readMapped(row, mapping, key);
    if (value) record[key] = value;
  }
  if (preserveUnmapped) {
    const used = new Set(Object.values(mapping).filter((header): header is string => Boolean(header)));
    const extras: Record<string, string> = {};
    for (const [header, value] of Object.entries(row.values)) {
      if (!value || used.has(header)) continue;
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
