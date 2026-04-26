import { useEffect, useRef, useState } from "react";
import {
  getAccessToken,
  isTokenExpired,
  willExpireSoon,
  refreshAccessToken,
  storeAccessToken,
  clearTokens,
} from "./auth-utils";

export interface UseSessionManagerOptions {
  /** Only run when true (set to !!user). */
  enabled?: boolean;
  /** Interval in ms to check expiry. @default 120000 */
  checkInterval?: number;
  /** Proactively refresh when < this many ms remain. @default 60000 */
  refreshThreshold?: number;
  /** Called after a successful silent refresh. */
  onRefresh?: (accessToken: string) => void;
  /** Called when refresh fails — user must re-authenticate. */
  onExpired?: () => void;
}

/**
 * Polls the stored JWT and silently refreshes it via the HttpOnly
 * refresh-token cookie before it expires.
 */
export function useSessionManager({
  enabled = true,
  checkInterval = 120_000,
  refreshThreshold = 60_000,
  onRefresh,
  onExpired,
}: UseSessionManagerOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    const attemptRefresh = async () => {
      busyRef.current = true;
      setIsRefreshing(true);
      try {
        const result = await refreshAccessToken();
        if (result) {
          storeAccessToken(result.accessToken);
          onRefresh?.(result.accessToken);
        } else {
          clearTokens();
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
          onExpired?.();
        }
      } catch {
        clearTokens();
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        onExpired?.();
      } finally {
        busyRef.current = false;
        setIsRefreshing(false);
      }
    };

    const tick = () => {
      if (busyRef.current) return;
      const token = getAccessToken();
      if (!token) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        onExpired?.();
        return;
      }
      if (isTokenExpired(token) || willExpireSoon(token, refreshThreshold)) {
        void attemptRefresh();
      }
    };

    // immediate check
    tick();
    intervalRef.current = setInterval(tick, checkInterval);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [enabled, checkInterval, refreshThreshold, onRefresh, onExpired]);

  return { isRefreshing };
}
