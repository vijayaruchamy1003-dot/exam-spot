export type SearchBy = 'registerNumber' | 'studentId';

export interface SeatingAllotmentData {
  registrationNumber: string;
  studentId: string;
  studentName: string;
  className?: string;
  testDate?: string;
  centerCode?: string;
  testCentreName?: string;
  testCentreCity?: string;
  roomNo?: string;
  seatNo?: number | string;
  programCode?: string;
  programName?: string;
  testMode?: string;
  allotmentStatus?: string;
  isAllotted?: boolean;
  otherAllotments?: SeatingAllotmentData[];

  // Compatibility aliases
  registerNumber?: string;
  roomNumber?: string;
  seatNumber?: string;
  department?: string;
  examSession?: string;
  building?: string;
  floor?: string;
}

export interface SeatingApiResponse {
  success: boolean;
  message: string;
  data: SeatingAllotmentData | null;
}

export interface StudentAllocation {
  studentId: string;
  studentName?: string;
  registerNumber?: string;
  registrationNumber?: string;
  roomNo?: string;
  seatNo?: number | string;
  roomNumber?: string;
  seatNumber?: string;
  className?: string;
  testDate?: string;
  centerCode?: string;
  testCentreName?: string;
  testCentreCity?: string;
  programCode?: string;
  programName?: string;
  testMode?: string;
  allotmentStatus?: string;
  isAllotted?: boolean;
  otherAllotments?: SeatingAllotmentData[];
  department?: string;
  examSession?: string;
  building?: string;
  floor?: string;
  extras?: Record<string, string>;
}

export type VersionStatus = 'uploading' | 'ready' | 'active' | 'failed' | 'archived';
export type DuplicatePolicy = 'reject' | 'keep-first' | 'keep-last';

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
