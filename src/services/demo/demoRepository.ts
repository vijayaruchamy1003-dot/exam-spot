import { MemoryAllocationRepository } from '@/services/allocations/memoryRepository';
import { runImport } from '@/services/allocations/workflow';
import { SAMPLE_STUDENTS } from '@/services/demo/sampleData';

let repository: MemoryAllocationRepository | null = null;
let ready: Promise<void> | null = null;

async function seed(repo: MemoryAllocationRepository): Promise<void> {
  await runImport(repo, {
    records: SAMPLE_STUDENTS,
    sourceFileName: 'sample-allocation.xlsx',
    actorId: 'demo-admin',
    duplicatePolicy: 'reject',
    createId: () => 'samplev1',
  });
}

export function getDemoRepository(): MemoryAllocationRepository {
  if (!repository) {
    repository = new MemoryAllocationRepository();
    ready = seed(repository);
  }
  return repository;
}

export function whenDemoReady(): Promise<void> {
  getDemoRepository();
  return ready ?? Promise.resolve();
}
