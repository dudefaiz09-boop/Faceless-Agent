import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ENV } from '../config/env';

interface NetworkStatus {
  isOffline: boolean;
  checking: boolean;
  lastCheckedAt: number | null;
  checkNow: () => Promise<boolean>;
}

function apiProbeUrl() {
  try {
    const url = new URL(ENV.API_BASE_URL);
    return url.origin;
  } catch {
    return ENV.API_BASE_URL;
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const mounted = useRef(true);

  const checkNow = useCallback(async () => {
    if (!ENV.API_BASE_URL) {
      setIsOffline(true);
      setLastCheckedAt(Date.now());
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    setChecking(true);
    try {
      await fetch(apiProbeUrl(), {
        method: 'HEAD',
        signal: controller.signal,
      });

      if (mounted.current) {
        setIsOffline(false);
        setLastCheckedAt(Date.now());
      }
      return true;
    } catch {
      if (mounted.current) {
        setIsOffline(true);
        setLastCheckedAt(Date.now());
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
      if (mounted.current) {
        setChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const initialCheckId = setTimeout(() => {
      void checkNow();
    }, 0);

    const intervalId = setInterval(() => {
      void checkNow();
    }, 30000);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkNow();
      }
    });

    return () => {
      mounted.current = false;
      clearTimeout(initialCheckId);
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [checkNow]);

  return { isOffline, checking, lastCheckedAt, checkNow };
}
