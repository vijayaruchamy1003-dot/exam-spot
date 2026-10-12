import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { planActivation } from '@/services/allocations/activation';
import type { AllocationRepository } from '@/services/allocations/repository';
import { studentFromFirestore, studentToFirestore } from '@/services/allocations/studentRecord';
import { getDb } from '@/services/firebase/client';
import { mapFirestoreError } from '@/services/firebase/errors';
import type { AllocationMetadata, AllocationVersionRecord, DuplicatePolicy, StudentAllocation, VersionStatus } from '@/types/allocation';
import { studentDocumentId } from '@/utils/documentId';
import { AppError } from '@/utils/errors';

const VERSIONS = 'allocationVersions';
const STUDENTS = 'students';
const METADATA = 'allocationMetadata';
const CURRENT = 'current';

function metadataFromData(data: DocumentData): AllocationMetadata {
  return {
    activeVersionId: typeof data.activeVersionId === 'string' ? data.activeVersionId : null,
    previousVersionId: typeof data.previousVersionId === 'string' ? data.previousVersionId : null,
    lastSuccessfulImportAt: typeof data.lastSuccessfulImportAt === 'string' ? data.lastSuccessfulImportAt : null,
    recordCount: typeof data.recordCount === 'number' ? data.recordCount : 0,
    sourceFileName: typeof data.sourceFileName === 'string' ? data.sourceFileName : null,
    activatedBy: typeof data.activatedBy === 'string' ? data.activatedBy : null,
  };
}

function versionFromData(id: string, data: DocumentData): AllocationVersionRecord {
  const status = data.status;
  const safeStatus: VersionStatus =
    status === 'uploading' || status === 'ready' || status === 'active' || status === 'failed' || status === 'archived'
      ? status
      : 'failed';
  const policy = data.duplicatePolicy;
  const duplicatePolicy: DuplicatePolicy = policy === 'keep-first' || policy === 'keep-last' ? policy : 'reject';
  return {
    id,
    status: safeStatus,
    expectedCount: typeof data.expectedCount === 'number' ? data.expectedCount : 0,
    uploadedCount: typeof data.uploadedCount === 'number' ? data.uploadedCount : 0,
    sourceFileName: typeof data.sourceFileName === 'string' ? data.sourceFileName : 'allocation.xlsx',
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
    activatedAt: typeof data.activatedAt === 'string' ? data.activatedAt : undefined,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    duplicatePolicy,
  };
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export function createFirestoreRepository(): AllocationRepository {
  const db = getDb();

  return {
    async getMetadata() {
      const snapshot = await getDoc(doc(db, METADATA, CURRENT));
      return snapshot.exists() ? metadataFromData(snapshot.data()) : null;
    },

    subscribeMetadata(listener) {
      return onSnapshot(
        doc(db, METADATA, CURRENT),
        (snapshot) => listener(snapshot.exists() ? metadataFromData(snapshot.data()) : null, null),
        (error) => listener(null, new AppError(mapFirestoreError(error), 'sync')),
      );
    },

    async createVersion(version) {
      await setDoc(doc(db, VERSIONS, version.id), withoutUndefined({ ...version }));
    },

    async writeStudents(versionId, students: StudentAllocation[]) {
      const batch = writeBatch(db);
      for (const student of students) {
        const id = studentDocumentId(student.studentId);
        batch.set(doc(db, VERSIONS, versionId, STUDENTS, id), studentToFirestore(student));
      }
      await batch.commit();
    },

    async updateVersion(versionId, patch) {
      await updateDoc(doc(db, VERSIONS, versionId), withoutUndefined({ ...patch }));
    },

    async countStudents(versionId) {
      const snapshot = await getCountFromServer(collection(db, VERSIONS, versionId, STUDENTS));
      return snapshot.data().count;
    },

    async activateVersion(versionId, actorId, nowIso) {
      const serverCount = await this.countStudents(versionId);
      const versionRef = doc(db, VERSIONS, versionId);
      const metaRef = doc(db, METADATA, CURRENT);
      try {
        return await runTransaction(db, async (transaction) => {
          const versionSnap = await transaction.get(versionRef);
          const metaSnap = await transaction.get(metaRef);
          if (!versionSnap.exists()) throw new AppError('The import version is missing.', 'version-missing');
          const version = versionFromData(versionId, versionSnap.data());
          const current = metaSnap.exists() ? metadataFromData(metaSnap.data()) : null;
          const plan = planActivation({ version, serverCount, current, actorId, nowIso });
          if (plan.archiveVersionId) {
            const previousRef = doc(db, VERSIONS, plan.archiveVersionId);
            const previousSnap = await transaction.get(previousRef);
            if (previousSnap.exists()) transaction.update(previousRef, { status: 'archived' });
          }
          transaction.update(versionRef, plan.versionUpdate);
          transaction.set(metaRef, plan.metadata);
          return plan.metadata;
        });
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          'The new allocation could not be published, so the current allocation was left unchanged.',
          'activate-failed',
        );
      }
    },

    async getStudent(versionId, studentId) {
      try {
        const snapshot = await getDoc(doc(db, VERSIONS, versionId, STUDENTS, studentDocumentId(studentId)));
        if (!snapshot.exists()) return null;
        return studentFromFirestore(snapshot.data());
      } catch (error) {
        throw new AppError(mapFirestoreError(error), 'lookup');
      }
    },

    async listVersions() {
      const snapshot = await getDocs(query(collection(db, VERSIONS), orderBy('createdAt', 'desc'), limit(20)));
      return snapshot.docs.map((item) => versionFromData(item.id, item.data()));
    },

    async deleteVersion(versionId) {
      const versionSnap = await getDoc(doc(db, VERSIONS, versionId));
      if (!versionSnap.exists()) return;
      const version = versionFromData(versionId, versionSnap.data());
      const metadata = await this.getMetadata();
      if (version.status === 'active' || metadata?.activeVersionId === versionId || metadata?.previousVersionId === versionId) {
        throw new AppError('The active allocation and the previous allocation are kept.', 'protected-version');
      }
      while (true) {
        const page = await getDocs(query(collection(db, VERSIONS, versionId, STUDENTS), limit(400)));
        if (page.empty) break;
        const batch = writeBatch(db);
        page.docs.forEach((item) => batch.delete(item.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, VERSIONS, versionId));
    },
  };
}

let repository: AllocationRepository | null = null;

export function getFirestoreRepository(): AllocationRepository {
  if (!repository) repository = createFirestoreRepository();
  return repository;
}
