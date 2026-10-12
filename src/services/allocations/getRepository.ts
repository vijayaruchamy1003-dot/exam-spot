import { getAppMode } from '@/config/env';
import { getDemoRepository } from '@/services/demo/demoRepository';
import { getFirestoreRepository } from '@/services/firebase/repository';
import type { AllocationRepository } from '@/services/allocations/repository';
import { AppError } from '@/utils/errors';

export function getAllocationRepository(): AllocationRepository {
  const mode = getAppMode();
  if (mode === 'demo') return getDemoRepository();
  if (mode === 'firebase') return getFirestoreRepository();
  throw new AppError('Firebase configuration is missing. Allocation data is unavailable.', 'unconfigured');
}
