export type VersionStatus = 'uploading' | 'ready' | 'active' | 'failed' | 'archived';

export type DuplicatePolicy = 'reject' | 'keep-first' | 'keep-last';

export interface StudentAllocation {
  studentId: string;
  studentName?: string;
  registerNumber?: string;
  department?: string;
  examSession?: string;
  building?: string;
  roomNumber?: string;
  floor?: string;
  seatNumber?: string;
  extras?: Record<string, string>;
}

export interface AllocationVersionRecord {
  id: string;
  status: VersionStatus;
  expectedCount: number;
  uploadedCount: number;
  sourceFileName: string;
  createdBy: string;
  createdAt: string;
  activatedAt?: string;
  errorMessage?: string;
  duplicatePolicy: DuplicatePolicy;
}

export interface AllocationMetadata {
  activeVersionId: string | null;
  previousVersionId: string | null;
  lastSuccessfulImportAt: string | null;
  recordCount: number;
  sourceFileName: string | null;
  activatedBy: string | null;
}
