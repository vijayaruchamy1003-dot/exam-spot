import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8088';
  const [host, portText] = emulator.split(':');
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-exam-room-finder',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host,
      port: Number(portText),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/admin1'), { uid: 'admin1', email: 'admin@school.edu', role: 'admin' });
    await setDoc(doc(db, 'users/teacher1'), { uid: 'teacher1', email: 'teacher@school.edu', role: 'teacher' });
    await setDoc(doc(db, 'allocationMetadata/current'), {
      activeVersionId: 'vactive',
      previousVersionId: null,
      lastSuccessfulImportAt: '2026-10-12T09:00:00.000Z',
      recordCount: 1,
      sourceFileName: 'sample.xlsx',
      activatedBy: 'admin1',
    });
    await setDoc(doc(db, 'allocationVersions/vactive'), {
      id: 'vactive',
      status: 'active',
      expectedCount: 1,
      uploadedCount: 1,
      sourceFileName: 'sample.xlsx',
      createdBy: 'admin1',
      createdAt: '2026-10-12T09:00:00.000Z',
      duplicatePolicy: 'reject',
    });
    await setDoc(doc(db, 'allocationVersions/vactive/students/0010245'), {
      studentId: '0010245',
      roomNumber: 'A-204',
    });
    await setDoc(doc(db, 'allocationVersions/vupload'), {
      id: 'vupload',
      status: 'uploading',
      expectedCount: 1,
      uploadedCount: 0,
      sourceFileName: 'next.xlsx',
      createdBy: 'admin1',
      createdAt: '2026-10-12T10:00:00.000Z',
      duplicatePolicy: 'reject',
    });
    await setDoc(doc(db, 'allocationVersions/vupload/students/0010245'), {
      studentId: '0010245',
      roomNumber: 'B-1',
    });
  });
});

describe('Firestore security rules', () => {
  it('denies anonymous reads of student allocations', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'allocationVersions/vactive/students/0010245')));
    await assertFails(getDoc(doc(db, 'allocationMetadata/current')));
  });

  it('lets a teacher read the active allocation and not an in-progress import', async () => {
    const db = testEnv.authenticatedContext('teacher1').firestore();
    await assertSucceeds(getDoc(doc(db, 'allocationMetadata/current')));
    await assertSucceeds(getDoc(doc(db, 'allocationVersions/vactive/students/0010245')));
    await assertFails(getDoc(doc(db, 'allocationVersions/vupload/students/0010245')));
    await assertFails(setDoc(doc(db, 'allocationVersions/vactive/students/009900'), { studentId: '009900' }));
  });

  it('stops a teacher from granting themselves administrator access', async () => {
    const db = testEnv.authenticatedContext('teacher1').firestore();
    await assertFails(updateDoc(doc(db, 'users/teacher1'), { role: 'admin', uid: 'teacher1', email: 'teacher@school.edu' }));
    const stranger = testEnv.authenticatedContext('stranger').firestore();
    await assertFails(setDoc(doc(stranger, 'users/stranger'), { uid: 'stranger', email: 'stranger@school.edu', role: 'admin' }));
  });

  it('lets an administrator create an inactive import and blocks publishing a version directly', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'allocationVersions/vnew'), {
        id: 'vnew',
        status: 'uploading',
        expectedCount: 1,
        uploadedCount: 0,
        sourceFileName: 'next.xlsx',
        createdBy: 'admin1',
        createdAt: '2026-10-12T11:00:00.000Z',
        duplicatePolicy: 'reject',
      }),
    );
    await assertFails(
      setDoc(doc(db, 'allocationVersions/valready'), {
        status: 'active',
        expectedCount: 1,
        uploadedCount: 1,
        createdBy: 'admin1',
      }),
    );
    await assertFails(deleteDoc(doc(db, 'allocationVersions/vactive')));
    await assertSucceeds(setDoc(doc(db, 'allocationVersions/vupload/students/regonly'), { registerNumber: '9000000000000000001' }));
    await assertSucceeds(setDoc(doc(db, 'allocationVersions/vupload/lookups/reg~9000000000000000001'), { docId: 'regonly' }));
    await assertFails(setDoc(doc(db, 'allocationVersions/vupload/students/blank'), { studentName: 'No identifier' }));
  });

  it('denies access to unknown collections', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(getDoc(doc(db, 'secrets/credentials')));
  });
});
