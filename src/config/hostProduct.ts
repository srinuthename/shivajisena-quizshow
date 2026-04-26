export const normalizeProductKey = (value: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';

export const HOST_PRODUCT_KEY = normalizeProductKey(import.meta.env.VITE_HOST_PRODUCT_KEY || 'quiz-app');
export const DEV_ORCHESTRATOR_APP_API_KEY = String(import.meta.env.VITE_ORCHESTRATOR_APP_API_KEY || '').trim();
const REMOTE_APP_ACCESS_PATH = '/api/app-access/session';
const remoteAccessPromises = new Map<string, Promise<boolean>>();
const SHARED_AUTH_TOKEN_STORAGE_KEY = 'quizUiStateToken';
const APP_ACCESS_BOOTSTRAP_CACHE_PREFIX = 'orchAppAccessBootstrap:';
const APP_ACCESS_BOOTSTRAP_TTL_MS = 10 * 60 * 1000;

export const normalizeApplicationId = (value?: string | null): string => {
  const normalized = normalizeProductKey(String(value || ''));
  if (!normalized) {
    return HOST_PRODUCT_KEY;
  }
  return HOST_PRODUCT_KEY;
};

export const getStoredApplicationId = (): string => {
  return HOST_PRODUCT_KEY;
};

export const isLocalBackendUrl = (value?: string | null): boolean => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const normalizeBaseUrl = (value?: string | null): string => String(value || '').trim().replace(/\/+$/, '');

const shouldSendOrchestratorAppKey = (): boolean => {
  return import.meta.env.DEV && Boolean(DEV_ORCHESTRATOR_APP_API_KEY);
};

const decodeJwtExp = (token: string): number | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    const exp = Number(json?.exp);
    return Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
};

const isExpiredToken = (token: string): boolean => {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  return exp * 1000 <= Date.now();
};

const readSharedAuthToken = (): string => {
  let fromSession = '';
  let fromLocal = '';
  try {
    fromSession = String(sessionStorage.getItem(SHARED_AUTH_TOKEN_STORAGE_KEY) || '').trim();
  } catch {}
  try {
    fromLocal = String(localStorage.getItem(SHARED_AUTH_TOKEN_STORAGE_KEY) || '').trim();
  } catch {
    fromLocal = '';
  }
  if (fromSession && isExpiredToken(fromSession)) fromSession = '';
  if (fromLocal && isExpiredToken(fromLocal)) fromLocal = '';

  const chosen = fromSession || fromLocal;
  if (!chosen) return '';
  try { sessionStorage.setItem(SHARED_AUTH_TOKEN_STORAGE_KEY, chosen); } catch {}
  try { localStorage.setItem(SHARED_AUTH_TOKEN_STORAGE_KEY, chosen); } catch {}
  return chosen;
};

const getBootstrapCacheKey = (baseUrl: string): string =>
  `${APP_ACCESS_BOOTSTRAP_CACHE_PREFIX}${baseUrl}`;

const hasFreshBootstrapCache = (baseUrl: string): boolean => {
  const key = getBootstrapCacheKey(baseUrl);
  try {
    const stamp = Number(sessionStorage.getItem(key) || '0');
    return Number.isFinite(stamp) && stamp > 0 && Date.now() - stamp <= APP_ACCESS_BOOTSTRAP_TTL_MS;
  } catch {
    return false;
  }
};

const markBootstrapCache = (baseUrl: string): void => {
  const key = getBootstrapCacheKey(baseUrl);
  try {
    sessionStorage.setItem(key, String(Date.now()));
  } catch {}
};

export const getAppAccessHeaders = (headers?: HeadersInit): Headers => {
  const next = new Headers(headers || {});
  next.set('X-Host-Product-Key', HOST_PRODUCT_KEY);
  if (shouldSendOrchestratorAppKey()) {
    next.set('X-Orchestrator-App-Key', DEV_ORCHESTRATOR_APP_API_KEY);
  }
  // Attach JWT from localStorage so every orchestrator call is authenticated
  const token = readSharedAuthToken();
  if (token) {
    next.set('Authorization', `Bearer ${token}`);
  }
  return next;
};

export const getHostProductHeaders = (headers?: HeadersInit): Headers => {
  return getAppAccessHeaders(headers);
};

/**
 * @deprecated No longer needed — the JWT bearer token on every request replaces
 * the old double-bootstrap session handshake. Kept as a no-op so existing call
 * sites compile without changes.
 */
export const ensureRemoteAppAccessSession = async (_baseUrl: string): Promise<boolean> => {
  return true;
};
