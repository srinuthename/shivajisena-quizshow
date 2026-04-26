// Lightweight clock sync helper for aligning client timestamps to server time.
// In public-origin deployments, we avoid polling /api/time and derive offset from
// SSE payload timestamps instead.

let lastOffsetMs = 0;
let lastSyncAt = 0;
let hasOffsetSample = false;

const DEFAULT_MAX_AGE_MS = 60_000;

interface SseTimeLike {
  serverTime?: number;
  serverTs?: number;
  sentTs?: number;
  clientTs?: number;
  stageTs?: {
    sse?: number;
    transform?: number;
    reader?: number;
  };
}

/**
 * Returns the cached clock offset (serverTime - clientTime).
 */
export const getClockOffsetMs = () => lastOffsetMs;

/**
 * Returns an approximate server timestamp using the cached offset.
 */
export const getApproxServerNow = () => Date.now() + lastOffsetMs;

const pickServerTimestamp = (payload: SseTimeLike): number | null => {
  const candidates = [
    payload.serverTime,
    payload.serverTs,
    payload.sentTs,
    payload.stageTs?.sse,
    payload.stageTs?.transform,
    payload.stageTs?.reader,
    payload.clientTs,
  ];
  for (const value of candidates) {
    if (Number.isFinite(value) && Number(value) > 0) {
      return Number(value);
    }
  }
  return null;
};

/**
 * Updates the cached offset using any SSE payload that contains server-side timestamps.
 */
export const ingestSseTimeSignal = (
  payload: unknown,
  clientReceivedAtMs: number = Date.now()
): number => {
  if (!payload || typeof payload !== "object") return lastOffsetMs;
  const serverTs = pickServerTimestamp(payload as SseTimeLike);
  if (!serverTs) return lastOffsetMs;

  const offset = serverTs - clientReceivedAtMs;
  if (Number.isFinite(offset)) {
    lastOffsetMs = offset;
    lastSyncAt = clientReceivedAtMs;
    hasOffsetSample = true;
  }
  return lastOffsetMs;
};

/**
 * Keeps the old API for callers. This no longer polls /api/time.
 * It returns the latest SSE-derived offset, or 0 if no sample was observed yet.
 */
export const syncClockWithServer = async (
  _baseUrl: string,
  { maxAgeMs = DEFAULT_MAX_AGE_MS }: { maxAgeMs?: number } = {}
): Promise<number> => {
  const now = Date.now();
  if (now - lastSyncAt < maxAgeMs && Number.isFinite(lastOffsetMs)) {
    return lastOffsetMs;
  }
  if (!hasOffsetSample) {
    lastOffsetMs = 0;
    lastSyncAt = now;
  }
  return lastOffsetMs;
};

