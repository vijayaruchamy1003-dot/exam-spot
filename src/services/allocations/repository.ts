import type { AllocationMetadata, AllocationVersionRecord, StudentAllocation } from '@/types/allocation';

export interface AllocationRepository {
  getMetadata(): Promise<AllocationMetadata | null>;
  subscribeMetadata(listener: (metadata: AllocationMetadata | null, error: Error | null) => void): () => void;
  createVersion(version: AllocationVersionRecord): Promise<void>;
  writeStudents(versionId: string, students: StudentAllocation[]): Promise<void>;
  updateVersion(versionId: string, patch: Partial<AllocationVersionRecord>): Promise<void>;
  countStudents(versionId: string): Promise<number>;
  activateVersion(versionId: string, actorId: string, nowIso: string): Promise<AllocationMetadata>;
  getStudent(versionId: string, studentId: string): Promise<StudentAllocation | null>;
  listVersions(): Promise<AllocationVersionRecord[]>;
  deleteVersion(versionId: string): Promise<void>;
}
