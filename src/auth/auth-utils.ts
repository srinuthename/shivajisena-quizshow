/**
 * Low-level JWT helpers — works with the access token stored in localStorage.
 * Refresh token is an HttpOnly cookie managed by the auth service.
 */

const TOKEN_KEY = "quizUiStateToken";
const USER_KEY  = "quizCurrentUser";
const AUTH_REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = AUTH_REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...(init || {}), signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// JWT decode / expiry helpers
// ---------------------------------------------------------------------------

export interface DecodedToken {
  type: string;
  userId: string;
  userEmail: string;
  userName: string;
  tenantId: string;
  applicationId: string;
  applicationName: string;
  audience: string;
  roles: string[];
  scopes: string[];
  authProvider: string;
  youtubeChannelId?: string | null;
  youtubeChannelTitle?: string | null;
  youtubeChannelThumbnail?: string | null;
  profilePicture?: string | null;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const d = decodeToken(token);
  if (!d?.exp) return true;
  return d.exp * 1000 < Date.now();
}

export function willExpireSoon(token: string, thresholdMs = 60_000): boolean {
  const d = decodeToken(token);
  if (!d?.exp) return true;
  return d.exp * 1000 - Date.now() < thresholdMs;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function getAccessToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function storeAccessToken(token: string): void {
  const t = String(token || "").trim();
  if (!t) return;
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
  try { sessionStorage.setItem(TOKEN_KEY, t); } catch {}
  // Notify same-tab listeners (HostRouteGuard, chat-sender) that the unified session was updated.
  try {
    window.dispatchEvent(new Event("quizSharedAuthUpdated"));
  } catch {}
}

export function clearTokens(): void {
  for (const s of [localStorage, sessionStorage]) {
    try { s.removeItem(TOKEN_KEY); } catch {}
    try { s.removeItem(USER_KEY); } catch {}
  }
  // Notify same-tab listeners (HostRouteGuard, chat-sender, etc.) that the unified session is gone.
  try {
    window.dispatchEvent(new Event("quizSharedAuthUpdated"));
  } catch {}
}

// ---------------------------------------------------------------------------
// Refresh access token via HttpOnly refresh-token cookie
// ---------------------------------------------------------------------------

export interface RefreshResult {
  accessToken: string;
  expiresIn: string;
  refreshExpiresAt?: string | null;
}

/**
 * Calls POST /api/auth/revoke with `credentials: "include"` so the browser
 * sends the HttpOnly refreshToken cookie automatically, revoking it server-side
 * and clearing the cookie. Best-effort — never throws.
 */
export async function revokeSession(): Promise<void> {
  try {
    await fetchWithTimeout("/api/auth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}",
    });
  } catch {
    // Ignore network errors — local tokens are cleared regardless.
  }
}

/**
 * Calls POST /api/auth/refresh with `credentials: "include"` so the browser
 * sends the HttpOnly refreshToken cookie automatically.
 * The Vite proxy (dev) or reverse-proxy (prod) routes this to the auth service.
 */
export async function refreshAccessToken(): Promise<RefreshResult | null> {
  try {
    const res = await fetchWithTimeout("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data?.accessToken) return null;
    return {
      accessToken: data.accessToken,
      expiresIn: data.expiresIn ?? "15m",
      refreshExpiresAt: data.refreshExpiresAt ?? null,
    };
  } catch {
    return null;
  }
}
