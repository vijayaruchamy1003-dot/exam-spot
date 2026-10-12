import { planActivation } from '@/services/allocations/activation';
import type { AllocationRepository } from '@/services/allocations/repository';
import { studentDocumentId } from '@/utils/documentId';
import type { AllocationMetadata, AllocationVersionRecord, StudentAllocation } from '@/types/allocation';
import { AppError } from '@/utils/errors';

type Listener = (metadata: AllocationMetadata | null, error: Error | null) => void;

export class MemoryAllocationRepository implements AllocationRepository {
  private versions = new Map<string, AllocationVersionRecord>();
  private students = new Map<string, Map<string, StudentAllocation>>();
  private metadata: AllocationMetadata | null = null;
  private listeners = new Set<Listener>();

  async getMetadata(): Promise<AllocationMetadata | null> {
    return this.metadata ? { ...this.metadata } : null;
  }

  subscribeMetadata(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.metadata ? { ...this.metadata } : null, null);
    return () => this.listeners.delete(listener);
  }

  async createVersion(version: AllocationVersionRecord): Promise<void> {
    if (this.versions.has(version.id)) {
      throw new AppError('This import version already exists.', 'version-exists');
    }
    this.versions.set(version.id, { ...version });
    this.students.set(version.id, new Map());
  }

  async writeStudents(versionId: string, students: StudentAllocation[]): Promise<void> {
    const bucket = this.students.get(versionId);
    if (!bucket) throw new AppError('The import version is missing.', 'version-missing');
    for (const student of students) {
      bucket.set(studentDocumentId(student.studentId), { ...student, extras: student.extras ? { ...student.extras } : undefined });
    }
  }

  async updateVersion(versionId: string, patch: Partial<AllocationVersionRecord>): Promise<void> {
    const current = this.versions.get(versionId);
    if (!current) throw new AppError('The import version is missing.', 'version-missing');
    this.versions.set(versionId, { ...current, ...patch, id: current.id });
  }

  async countStudents(versionId: string): Promise<number> {
    return this.students.get(versionId)?.size ?? 0;
  }

  async activateVersion(versionId: string, actorId: string, nowIso: string): Promise<AllocationMetadata> {
    const version = this.versions.get(versionId);
    if (!version) throw new AppError('The import version is missing.', 'version-missing');
    const serverCount = await this.countStudents(versionId);
    const plan = planActivation({
      version,
      serverCount,
      current: this.metadata,
      actorId,
      nowIso,
    });
    if (plan.archiveVersionId) {
      const previous = this.versions.get(plan.archiveVersionId);
      if (previous) this.versions.set(plan.archiveVersionId, { ...previous, status: 'archived' });
    }
    this.versions.set(versionId, { ...version, ...plan.versionUpdate });
    this.metadata = plan.metadata;
    this.emit();
    return { ...plan.metadata };
  }

  async getStudent(versionId: string, studentId: string): Promise<StudentAllocation | null> {
    const bucket = this.students.get(versionId);
    if (!bucket) return null;
    const record = bucket.get(studentDocumentId(studentId));
    return record ? { ...record, extras: record.extras ? { ...record.extras } : undefined } : null;
  }

  async listVersions(): Promise<AllocationVersionRecord[]> {
    return [...this.versions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async deleteVersion(versionId: string): Promise<void> {
    const version = this.versions.get(versionId);
    if (!version) return;
    if (version.status === 'active' || this.metadata?.activeVersionId === versionId || this.metadata?.previousVersionId === versionId) {
      throw new AppError('The active allocation and the previous allocation are kept.', 'protected-version');
    }
    this.versions.delete(versionId);
    this.students.delete(versionId);
  }

  private emit(): void {
    const snapshot = this.metadata ? { ...this.metadata } : null;
    for (const listener of this.listeners) listener(snapshot, null);
  }
}
