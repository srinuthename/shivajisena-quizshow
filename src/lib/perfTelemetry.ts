/**
 * Lightweight runtime telemetry for front-end metrics.
 * Records metrics in-memory and flushes via sendBeacon or console/localStorage.
 * Optimized to minimize CPU overhead through batching and throttling.
 */
type Metric = { name: string; value: number; ts: number };

const buffer: Metric[] = [];
const FLUSH_INTERVAL_MS = 10000; // Increased from 5s to 10s to reduce overhead
const MAX_BUFFER_SIZE = 100; // Limit buffer size to prevent memory issues
let flushHandle: number | null = null;
let lastRecordTime = 0;
const THROTTLE_MS = 50; // Minimum time between metric recordings

export const recordMetric = (name: string, value: number) => {
  const now = Date.now();
  
  // Throttle rapid metric recordings
  if (now - lastRecordTime < THROTTLE_MS) {
    return;
  }
  lastRecordTime = now;
  
  // Prevent buffer from growing too large
  if (buffer.length >= MAX_BUFFER_SIZE) {
    buffer.shift(); // Remove oldest entry
  }
  
  buffer.push({ name, value, ts: now });
  
  if (!flushHandle) {
    flushHandle = window.setTimeout(flushMetrics, FLUSH_INTERVAL_MS) as unknown as number;
  }
};

export const flushMetrics = () => {
  if (buffer.length === 0) {
    if (flushHandle) { clearTimeout(flushHandle); flushHandle = null; }
    return;
  }
  
  const payload = JSON.stringify({ metrics: buffer.splice(0), clientTs: Date.now() });
  
  // Try navigator.sendBeacon for best-effort background send
  try {
    if (navigator && (navigator as any).sendBeacon) {
      const endpoint = (window as any).__PERF_TELEMETRY_ENDPOINT__ as string | undefined;
      if (endpoint) {
        (navigator as any).sendBeacon(endpoint, payload);
        if (flushHandle) { clearTimeout(flushHandle); flushHandle = null; }
        return;
      }
    }
  } catch {
    // noop
  }

  // Fallback: store to localStorage (limited to prevent bloat)
  try {
    const existing = localStorage.getItem('perfTelemetry') || '[]';
    const arr = JSON.parse(existing);
    arr.push(...JSON.parse(payload).metrics);
    // Keep only last 500 entries to prevent localStorage bloat
    localStorage.setItem('perfTelemetry', JSON.stringify(arr.slice(-500)));
  } catch {
    // ignore
  }

  if (flushHandle) { clearTimeout(flushHandle); flushHandle = null; }
};

// Ensure flush on unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => flushMetrics());
}

export const getBufferedMetrics = (): Metric[] => buffer.slice();

export default { recordMetric, flushMetrics, getBufferedMetrics };
