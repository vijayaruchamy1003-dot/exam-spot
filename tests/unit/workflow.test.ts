import { describe, expect, it } from 'vitest';
import { MemoryAllocationRepository } from '@/services/allocations/memoryRepository';
import { runImport } from '@/services/allocations/workflow';
import type { StudentAllocation } from '@/types/allocation';

const records: StudentAllocation[] = [
  { studentId: '0010245', studentName: 'Sample Student', roomNumber: 'A-204', seatNumber: '24' },
  { studentId: '000007', studentName: 'Sample Student Three', roomNumber: 'B-010', seatNumber: '03' },
];

class BoomRepository extends MemoryAllocationRepository {
  failWrites = false;

  override async writeStudents(versionId: string, students: StudentAllocation[]): Promise<void> {
    if (this.failWrites) throw new Error('network down');
    return super.writeStudents(versionId, students);
  }
}

class MismatchRepository extends MemoryAllocationRepository {
  override async countStudents(): Promise<number> {
    return 0;
  }
}

describe('import workflow', () => {
  it('publishes records that can be looked up by the original student ID', async () => {
    const repo = new MemoryAllocationRepository();
    const result = await runImport(repo, {
      records,
      sourceFileName: 'sample.xlsx',
      actorId: 'admin',
      duplicatePolicy: 'reject',
      createId: () => 'vone',
    });
    expect(result.ok).toBe(true);
    expect(result.activeVersionUnchanged).toBe(false);
    expect(await repo.getStudent('vone', '0010245')).toMatchObject({ roomNumber: 'A-204' });
    expect(await repo.getStudent('vone', '10245')).toBeNull();
  });

  it('finds a student by registration number or student ID', async () => {
    const repo = new MemoryAllocationRepository();
    const result = await runImport(repo, {
      records: [
        { studentId: '', registerNumber: '9000000000000000001', studentName: 'Sample Student', roomNumber: '1st Floor - Room 1', seatNumber: '1' },
        { studentId: '0010245', registerNumber: 'REG001', studentName: 'Sample Student Two', roomNumber: 'A-204', seatNumber: '24' },
      ],
      sourceFileName: 'seating.csv',
      actorId: 'admin',
      duplicatePolicy: 'reject',
      createId: () => 'vseat',
    });
    expect(result.ok).toBe(true);
    expect(await repo.getStudent('vseat', '9000000000000000001', 'registerNumber')).toMatchObject({ roomNumber: '1st Floor - Room 1', studentId: '' });
    expect(await repo.getStudent('vseat', '9000000000000000001', 'studentId')).toBeNull();
    expect(await repo.getStudent('vseat', '0010245', 'studentId')).toMatchObject({ roomNumber: 'A-204' });
    expect(await repo.getStudent('vseat', 'REG001', 'registerNumber')).toMatchObject({ studentId: 'Z0010245', roomNumber: 'A-204' });
  });

  it('leaves the active allocation unchanged when an upload fails', async () => {
    const failing = new BoomRepository();
    const first = await runImport(failing, {
      records: [records[0]!],
      sourceFileName: 'first.xlsx',
      actorId: 'admin',
      duplicatePolicy: 'reject',
      createId: () => 'vcurrent',
    });
    expect(first.ok).toBe(true);
    failing.failWrites = true;

    const result = await runImport(failing, {
      records,
      sourceFileName: 'broken.xlsx',
      actorId: 'admin',
      duplicatePolicy: 'reject',
      createId: () => 'vbroken',
    });
    expect(result.ok).toBe(false);
    expect(result.activeVersionUnchanged).toBe(true);
    expect((await failing.getMetadata())?.activeVersionId).toBe('vcurrent');
    expect(await failing.getStudent('vcurrent', '0010245')).toMatchObject({ roomNumber: 'A-204' });
    const versions = await failing.listVersions();
    expect(versions.find((version) => version.id === 'vbroken')?.status).toBe('failed');
  });

  it('does not publish when verification count does not match', async () => {
    const repo = new MismatchRepository();
    const result = await runImport(repo, {
      records,
      sourceFileName: 'mismatch.xlsx',
      actorId: 'admin',
      duplicatePolicy: 'reject',
      createId: () => 'vmismatch',
    });
    expect(result.ok).toBe(false);
    expect(result.activeVersionUnchanged).toBe(true);
    expect(await repo.getMetadata()).toBeNull();
    expect((await repo.listVersions()).find((version) => version.id === 'vmismatch')?.status).toBe('failed');
  });
});
