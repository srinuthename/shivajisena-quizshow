import { useCallback } from "react";
import { getAppMode, modeSupportsViewers } from "@/config/appMode";
import { getApproxServerNow } from "@/lib/clockSync";

interface UseServerNowOptions {
  enabled?: boolean;
}

export const useServerNow = (options: UseServerNowOptions = {}) => {
  const { enabled = true } = options;

  return useCallback(() => {
    const mode = getAppMode();
    // Only use server time sync in modes that support viewers (non-offline)
    if (!enabled || !modeSupportsViewers(mode)) {
      return Date.now();
    }
    return getApproxServerNow();
  }, [enabled]);
};
