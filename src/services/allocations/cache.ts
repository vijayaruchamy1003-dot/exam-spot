import { LOOKUP_CACHE_LIMIT } from '@/config/limits';
import type { AllocationMetadata, StudentAllocation } from '@/types/allocation';

export interface CachedLookup {
  versionId: string;
  studentId: string;
  found: boolean;
  student: StudentAllocation | null;
  cachedAt: string;
}

export interface LookupCacheState {
  metadata: AllocationMetadata | null;
  synchronizedAt: string | null;
  lookups: CachedLookup[];
}

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const CACHE_STORAGE_KEY = 'erf.cache.v1';

export function emptyCache(): LookupCacheState {
  return { metadata: null, synchronizedAt: null, lookups: [] };
}

export function rememberLookup(state: LookupCacheState, entry: CachedLookup, limit = LOOKUP_CACHE_LIMIT): LookupCacheState {
  const lookups = state.lookups.filter(
    (item) => !(item.versionId === entry.versionId && item.studentId === entry.studentId),
  );
  lookups.unshift(entry);
  return {
    ...state,
    lookups: lookups.filter((item) => item.versionId === (state.metadata?.activeVersionId ?? entry.versionId)).slice(0, limit),
  };
}

export function findLookup(state: LookupCacheState, versionId: string, studentId: string): CachedLookup | null {
  if (!versionId || state.metadata?.activeVersionId !== versionId) return null;
  return state.lookups.find((item) => item.versionId === versionId && item.studentId === studentId) ?? null;
}

export function cacheWithMetadata(
  state: LookupCacheState,
  metadata: AllocationMetadata | null,
  synchronizedAt: string | null,
): LookupCacheState {
  const activeVersionId = metadata?.activeVersionId ?? null;
  return {
    metadata,
    synchronizedAt,
    lookups: state.lookups.filter((item) => item.versionId === activeVersionId),
  };
}

function isMetadata(value: unknown): value is AllocationMetadata {
  if (!value || typeof value !== 'object') return false;
  const record = value as AllocationMetadata;
  return (
    (record.activeVersionId === null || typeof record.activeVersionId === 'string') &&
    typeof record.recordCount === 'number'
  );
}

export function parseCache(raw: string | null): LookupCacheState {
  if (!raw) return emptyCache();
  try {
    const parsed = JSON.parse(raw) as Partial<LookupCacheState>;
    const metadata = isMetadata(parsed.metadata) ? parsed.metadata : null;
    const lookups = Array.isArray(parsed.lookups)
      ? parsed.lookups.filter((item): item is CachedLookup => {
          return Boolean(item && typeof item.versionId === 'string' && typeof item.studentId === 'string' && typeof item.found === 'boolean');
        })
      : [];
    return cacheWithMetadata(
      { metadata, synchronizedAt: typeof parsed.synchronizedAt === 'string' ? parsed.synchronizedAt : null, lookups },
      metadata,
      typeof parsed.synchronizedAt === 'string' ? parsed.synchronizedAt : null,
    );
  } catch {
    return emptyCache();
  }
}

export class AllocationCache {
  private state: LookupCacheState = emptyCache();
  private loaded = false;

  constructor(private readonly storage: KeyValueStore) {}

  async load(): Promise<LookupCacheState> {
    if (this.loaded) return this.state;
    this.state = parseCache(await this.storage.getItem(CACHE_STORAGE_KEY));
    this.loaded = true;
    return this.state;
  }

  snapshot(): LookupCacheState {
    return this.state;
  }

  async saveMetadata(metadata: AllocationMetadata | null, synchronizedAt: string | null): Promise<void> {
    await this.load();
    this.state = cacheWithMetadata(this.state, metadata, synchronizedAt);
    await this.persist();
  }

  async remember(entry: CachedLookup): Promise<void> {
    await this.load();
    this.state = rememberLookup(this.state, entry);
    await this.persist();
  }

  find(versionId: string, studentId: string): CachedLookup | null {
    return findLookup(this.state, versionId, studentId);
  }

  private async persist(): Promise<void> {
    await this.storage.setItem(CACHE_STORAGE_KEY, JSON.stringify(this.state));
  }
}
