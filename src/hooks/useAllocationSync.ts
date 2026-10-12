import { useEffect, useState } from 'react';
import { getAppMode } from '@/config/env';
import { appCache } from '@/services/allocations/appCache';
import { getAllocationRepository } from '@/services/allocations/getRepository';
import { whenDemoReady } from '@/services/demo/demoRepository';
import type { AllocationMetadata } from '@/types/allocation';
import { toUserMessage } from '@/utils/errors';

export type SyncState = 'loading' | 'live' | 'offline' | 'error';

export function useAllocationSync(online: boolean) {
  const [metadata, setMetadata] = useState<AllocationMetadata | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const [lastSynchronizedAt, setLastSynchronizedAt] = useState<string | null>(null);
  const [usingCachedMetadata, setUsingCachedMetadata] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const localOnly = getAppMode() === 'demo';

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    const repo = getAllocationRepository();

    (async () => {
      if (localOnly) await whenDemoReady();
      const cached = await appCache.load();
      if (cancelled) return;
      if (cached.metadata) {
        setMetadata(cached.metadata);
        setLastSynchronizedAt(cached.synchronizedAt);
        setUsingCachedMetadata(true);
        setSyncState(online ? 'loading' : 'offline');
      }
      unsubscribe = repo.subscribeMetadata((next, error) => {
        if (cancelled) return;
        if (error) {
          setSyncState(online ? 'error' : 'offline');
          setErrorMessage(toUserMessage(error, 'Synchronization failed. Showing the last confirmed allocation.'));
          setUsingCachedMetadata(true);
          return;
        }
        const stamp = new Date().toISOString();
        setMetadata(next);
        setLastSynchronizedAt(stamp);
        setUsingCachedMetadata(!online);
        setSyncState(online ? 'live' : 'offline');
        setErrorMessage(online ? null : 'You are offline. This allocation may be out of date.');
        void appCache.saveMetadata(next, stamp);
      });
    })().catch((error: unknown) => {
      if (cancelled) return;
      setSyncState('error');
      setErrorMessage(toUserMessage(error, 'Synchronization failed.'));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [localOnly, online]);

  return { metadata, syncState, lastSynchronizedAt, usingCachedMetadata, errorMessage, localOnly };
}
