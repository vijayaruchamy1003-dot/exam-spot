import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { useEffect, useState } from 'react';

function isOnline(state: NetworkState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export function useNetworkStatus(): { online: boolean; checked: boolean } {
  const [online, setOnline] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    getNetworkStateAsync()
      .then((state) => {
        if (!mounted) return;
        setOnline(isOnline(state));
        setChecked(true);
      })
      .catch(() => {
        if (!mounted) return;
        setChecked(true);
      });
    const subscription = addNetworkStateListener((state) => {
      setOnline(isOnline(state));
      setChecked(true);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return { online, checked };
}
