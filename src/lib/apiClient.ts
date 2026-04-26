/**
 * Unified API client for all backend service calls.
 *
 * Centralizes:
 *  - Base URL resolution (single VITE_BACKEND_BASE_URL backend)
 *  - Auth + product headers (via getAppAccessHeaders)
 *  - JSON serialization + safe parsing
 *  - Offline-mode short-circuiting
 *  - Consistent { success, data, error } envelope
 *
 * The global authInterceptor (installed in main.tsx) automatically reacts to
 * 401/403 responses on requests that include an Authorization header and
 * triggers a unified logout — so no per-call 401 handling is needed.
 */

import { getQuizDomainApiBaseUrl, getAppMode } from '@/config/appMode';
import { getAppAccessHeaders, ensureRemoteAppAccessSession } from '@/config/hostProduct';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

const resolveBaseUrl = (): string => {
  if (getAppMode() === 'offline') return '';
  return (getQuizDomainApiBaseUrl() || '').replace(/\/+$/, '');
};

const isAbsoluteUrl = (path: string): boolean => /^https?:\/\//i.test(path);

const buildUrl = (path: string): string => {
  if (isAbsoluteUrl(path)) return path;
  const base = resolveBaseUrl();
  if (!base) throw new Error('Backend unavailable');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(new DOMException('Request timeout', 'AbortError')),
    timeoutMs
  );
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseJsonSafe = async (response: Response): Promise<unknown> => {
  const ct = (response.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
};

interface RequestOptions {
  headers?: HeadersInit;
  timeoutMs?: number;
  /** When true, do NOT attach auth headers (e.g. public endpoints). */
  skipAuth?: boolean;
  /** Skip the offline mode short-circuit. */
  allowOffline?: boolean;
}

const apiRequest = async <T>(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  if (!options.allowOffline && getAppMode() === 'offline') {
    return { success: false, error: 'Offline mode' };
  }

  let url: string;
  try {
    url = buildUrl(path);
  } catch (e) {
    return { success: false, error: (e as Error).message || 'Invalid request' };
  }

  const headers: HeadersInit = options.skipAuth
    ? options.headers || {}
    : getAppAccessHeaders(
        body !== undefined && !(body instanceof FormData)
          ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
          : options.headers
      );

  const init: RequestInit = {
    method,
    credentials: 'include',
    headers,
  };

  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  if (!options.skipAuth) {
    try {
      await ensureRemoteAppAccessSession(new URL(url, window.location.origin).origin);
    } catch {
      // Ignore — let the actual request surface the real error.
    }
  }

  try {
    const response = await fetchWithTimeout(url, init, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const payload = (await parseJsonSafe(response)) as
      | (Partial<ApiResponse<T>> & Record<string, unknown>)
      | null;

    if (!response.ok) {
      const errMsg =
        (payload && typeof payload.error === 'string' && payload.error) ||
        (payload && typeof payload.message === 'string' && payload.message) ||
        `HTTP ${response.status}`;
      return {
        success: false,
        error: errMsg,
        status: response.status,
        data: (payload?.data as T) ?? undefined,
      };
    }

    // Backend already returns { success, data, ... } envelope — pass through.
    if (payload && typeof payload.success === 'boolean') {
      return {
        success: payload.success,
        data: payload.data as T | undefined,
        error: payload.error,
        status: response.status,
      };
    }
    return { success: true, data: (payload as T) ?? undefined, status: response.status };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === 'AbortError'
        ? 'Request timeout'
        : error instanceof Error
          ? error.message
          : 'Network error';
    return { success: false, error: message };
  }
};

export const apiGet = <T>(path: string, options?: RequestOptions) =>
  apiRequest<T>('GET', path, undefined, options);

export const apiPost = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>('POST', path, body, options);

export const apiPut = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>('PUT', path, body, options);

export const apiPatch = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>('PATCH', path, body, options);

export const apiDelete = <T>(path: string, options?: RequestOptions) =>
  apiRequest<T>('DELETE', path, undefined, options);

export const getApiBaseUrl = (): string => resolveBaseUrl();
