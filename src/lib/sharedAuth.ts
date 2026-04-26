import { HOST_PRODUCT_KEY } from "@/config/hostProduct";

const TOKEN_STORAGE_KEY = "quizUiStateToken";
const CURRENT_USER_STORAGE_KEY = "quizCurrentUser";
const AUTH_COMPLETE_SIGNAL_KEY = "quizSharedAuthComplete";
const DEFAULT_AUDIENCE = String(import.meta.env.VITE_AUTH_AUDIENCE || "orchestrator-host").trim();
const DEFAULT_PLATFORM_TENANT_ID = String(
  import.meta.env.VITE_AUTH_PLATFORM_TENANT_ID ||
  import.meta.env.VITE_AUTH_TENANT_ID ||
  "default-org"
).trim();

export interface SharedAuthSession {
  tenantId: string;
  platformTenantId?: string;
  applicationId: string;
  applicationName?: string;
  audience?: string;
  authProvider?: string;
  userId: string;
  userEmail: string;
  userName: string;
  roles: string[];
  scopes: string[];
  role?: string;
  profilePicture?: string | null;
  youtubeChannelId?: string | null;
  youtubeChannelTitle?: string | null;
  youtubeChannelThumbnail?: string | null;
  tokenExpiresAt?: string | null;
  connectedToYouTube?: boolean;
}

export interface SharedAuthProfileResponse {
  session: SharedAuthSession;
  user?: {
    id: string;
    email: string;
    name: string;
    profilePicture?: string | null;
    locale?: string | null;
    authProvider?: string;
    youtubeChannel?: {
      id: string;
      title: string;
      description?: string | null;
      thumbnail?: string | null;
      subscriberCount?: number;
    } | null;
  };
}

export interface SharedOauthExchangeResponse {
  success?: boolean;
  token: string;
  fileToken?: string | null;
  tokenType?: string;
  expiresIn?: string;
  refreshExpiresAt?: string | null;
}

export const getAuthServiceBaseUrl = (): string =>
  String(
    import.meta.env.VITE_AUTH_BASE_URL ||
    ""
  ).trim().replace(/\/+$/, "");

export const getAuthPlatformTenantId = (): string => DEFAULT_PLATFORM_TENANT_ID;
export const getAuthTenantId = (): string => DEFAULT_PLATFORM_TENANT_ID;
export const getAuthAudience = (): string => DEFAULT_AUDIENCE;

export function storeSharedAuthToken(token: string): void {
  const value = String(token || "").trim();
  if (!value) return;
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, value);
  } catch {}
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, value);
  } catch {}
  // Notify same-tab listeners (AuthContext) that the unified token changed.
  try {
    window.dispatchEvent(new Event("quizSharedAuthUpdated"));
  } catch {}
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    const exp = Number(json?.exp);
    return Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  return exp * 1000 <= Date.now();
}

function willTokenExpireSoon(token: string, thresholdMs = 60_000): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  return exp * 1000 - Date.now() <= Math.max(0, Number(thresholdMs) || 0);
}

export function getSharedAuthToken(): string | null {
  const normalizeToken = (value: string | null | undefined): string => String(value || "").trim();

  let fromSession = "";
  let fromLocal = "";
  try {
    fromSession = normalizeToken(sessionStorage.getItem(TOKEN_STORAGE_KEY));
  } catch {}
  try {
    fromLocal = normalizeToken(localStorage.getItem(TOKEN_STORAGE_KEY));
  } catch {}

  if (fromSession && isTokenExpired(fromSession)) {
    fromSession = "";
  }
  if (fromLocal && isTokenExpired(fromLocal)) {
    fromLocal = "";
  }

  const preferred = fromSession || fromLocal;
  if (!preferred) return null;

  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, preferred);
  } catch {}
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, preferred);
  } catch {}

  return preferred;
}

export async function refreshSharedAuthToken(): Promise<string | null> {
  const authServiceUrl = getAuthServiceBaseUrl();
  if (!authServiceUrl) return null;

  const refreshUrl = `${authServiceUrl}/api/auth/refresh`;
  try {
    const response = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: "{}",
    });
    if (!response.ok) return null;
    const payload = await readJsonSafe<{ accessToken?: string; token?: string }>(response);
    const token = String(payload?.accessToken || payload?.token || "").trim();
    if (!token) return null;
    storeSharedAuthToken(token);
    return token;
  } catch {
    return null;
  }
}

export async function ensureSharedAuthToken(minTtlMs = 60_000): Promise<string | null> {
  const token = getSharedAuthToken();
  if (token && !willTokenExpireSoon(token, minTtlMs)) {
    return token;
  }
  const refreshed = await refreshSharedAuthToken();
  return refreshed || getSharedAuthToken();
}

export function clearSharedAuthToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {}
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  } catch {}
  try {
    window.dispatchEvent(new Event("quizSharedAuthUpdated"));
  } catch {}
}

export function getSharedAuthHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers || {});
  const token = getSharedAuthToken();
  if (token) {
    next.set("Authorization", `Bearer ${token}`);
  }
  return next;
}

export function cacheCurrentAuthUser(data: Record<string, unknown>): void {
  try {
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(data || {}));
  } catch {}
}

export function notifySharedAuthComplete(
  applicationId = HOST_PRODUCT_KEY,
  code = "",
  token = ""
): void {
  const payload = JSON.stringify({
    type: "shared-auth-complete",
    applicationId: String(applicationId || HOST_PRODUCT_KEY).trim() || HOST_PRODUCT_KEY,
    code: String(code || "").trim() || undefined,
    token: String(token || "").trim() || undefined,
    completedAt: new Date().toISOString(),
  });
  try {
    localStorage.setItem(AUTH_COMPLETE_SIGNAL_KEY, payload);
  } catch {}
  // Notify the opener window via postMessage
  if (window.opener) {
    try {
      window.opener.postMessage(JSON.parse(payload), window.location.origin);
    } catch {}
  }
}

export const getSharedAuthCompleteSignalKey = (): string => AUTH_COMPLETE_SIGNAL_KEY;

export function buildQuizAuthStartUrl(returnPath = "/admin"): string {
  const authServiceUrl = getAuthServiceBaseUrl();
  if (!authServiceUrl) {
    throw new Error("Auth service URL is not configured");
  }
  const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
  callbackUrl.searchParams.set("redirect", returnPath);
  callbackUrl.searchParams.set("popup", "1");

  const oauthUrl = new URL(`${authServiceUrl}/auth/oauth/google`);
  oauthUrl.searchParams.set("tenantId", getAuthPlatformTenantId());
  oauthUrl.searchParams.set("applicationId", HOST_PRODUCT_KEY);
  oauthUrl.searchParams.set("audience", getAuthAudience());
  oauthUrl.searchParams.set("returnUrl", callbackUrl.toString());
  return oauthUrl.toString();
}

async function readJsonSafe<T>(response: Response): Promise<T> {
  return response.json().catch(() => ({} as T));
}

const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit, timeoutMs = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...(init || {}), signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export async function exchangeSharedOauthCode(code: string): Promise<SharedOauthExchangeResponse> {
  const authServiceUrl = getAuthServiceBaseUrl();
  const exchangeUrl = authServiceUrl
    ? `${authServiceUrl}/auth/oauth/exchange`
    : `/auth/oauth/exchange`;

  const response = await fetchWithTimeout(exchangeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ code: String(code || "").trim() }),
  });

  const payload = await readJsonSafe<SharedOauthExchangeResponse & { error?: string }>(response);
  if (!response.ok || !payload?.token) {
    throw new Error(String(payload?.error || `Failed to complete sign-in (${response.status})`));
  }
  return payload;
}

export async function getSharedAuthSession(): Promise<SharedAuthProfileResponse | null> {
  const token = getSharedAuthToken();
  if (!token) return null;

  const authServiceUrl = getAuthServiceBaseUrl();
  const sessionUrl = authServiceUrl
    ? `${authServiceUrl}/api/profile/session`
    : `/api/profile/session`;

  const response = await fetchWithTimeout(sessionUrl, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: getSharedAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearSharedAuthToken();
      return null;
    }
    const payload = await readJsonSafe<{ error?: string }>(response);
    throw new Error(String(payload?.error || `Failed to verify auth session (${response.status})`));
  }

  const payload = await readJsonSafe<SharedAuthProfileResponse>(response);
  if (payload?.user) {
    cacheCurrentAuthUser(payload.user as Record<string, unknown>);
  }
  return payload;
}

export async function disconnectSharedYouTubeConnection(): Promise<{ success: boolean; error?: string }> {
  const token = getSharedAuthToken();
  if (!token) return { success: false, error: "No active auth session" };

  const authServiceUrl = getAuthServiceBaseUrl();
  const disconnectUrl = authServiceUrl
    ? `${authServiceUrl}/api/profile/youtube-connection`
    : `/api/profile/youtube-connection`;

  const response = await fetchWithTimeout(disconnectUrl, {
    method: "DELETE",
    credentials: "include",
    headers: getSharedAuthHeaders(),
  });
  const payload = await readJsonSafe<{ success?: boolean; error?: string }>(response);
  if (!response.ok) {
    return { success: false, error: String(payload?.error || `Failed to disconnect YouTube (${response.status})`) };
  }
  return { success: true };
}
