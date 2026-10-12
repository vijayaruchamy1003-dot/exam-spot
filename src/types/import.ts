import type { DuplicatePolicy, StudentAllocation } from '@/types/allocation';

export interface ParsedRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: ParsedRow[];
}

export interface ParsedWorkbook {
  sheets: ParsedSheet[];
}

export type ImportIssueCode = 'blank-id' | 'duplicate-id' | 'missing-column' | 'empty-sheet';

export interface ImportIssue {
  rowNumber: number;
  studentId?: string;
  code: ImportIssueCode;
  message: string;
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRecords: number;
}

export interface PreviewRow {
  rowNumber: number;
  studentId: string;
  studentName: string;
  roomNumber: string;
  seatNumber: string;
  status: 'valid' | 'blank-id' | 'duplicate';
}

export interface ValidatedImport {
  records: StudentAllocation[];
  issues: ImportIssue[];
  summary: ImportSummary;
  preview: PreviewRow[];
  canImport: boolean;
  blockingReason?: string;
  policy: DuplicatePolicy;
}

export interface ImportProgress {
  phase: 'creating' | 'uploading' | 'verifying' | 'activating';
  completed: number;
  total: number;
  message: string;
}

export interface ImportRunResult {
  ok: boolean;
  message: string;
  versionId?: string;
  importedRecords: number;
  activeVersionUnchanged: boolean;
}
