/**
 * Global fetch interceptor that detects 401/403 responses from our backend
 * and uniformly logs the user out of every page that consumes the unified
 * auth session.
 *
 * Strategy:
 *  - Patch `window.fetch` once at app bootstrap.
 *  - Only react to 401/403 responses for requests that carry an `Authorization`
 *    header (i.e. our authenticated API calls). This avoids logging users out
 *    when third-party endpoints return 401 for unrelated reasons.
 *  - On unauthorized response → clear the unified token, dispatch
 *    `quizSharedAuthUpdated` (already done by `clearSharedAuthToken`), and
 *    redirect to "/" so every page re-evaluates its guard state.
 */

import { clearSharedAuthToken, getSharedAuthToken } from "./sharedAuth";

const HANDLED_FLAG = "__quizAuthInterceptorInstalled";

let suppressRedirect = false;

/**
 * Briefly suppress the auto-redirect (used by the explicit logout flow that
 * already navigates the user itself).
 */
export function suppressNextUnauthorizedRedirect(durationMs = 1000): void {
  suppressRedirect = true;
  window.setTimeout(() => {
    suppressRedirect = false;
  }, Math.max(0, durationMs));
}

function hasAuthorizationHeader(init?: RequestInit, request?: Request): boolean {
  try {
    if (request && request.headers && request.headers.get("authorization")) return true;
  } catch {}
  if (!init || !init.headers) return false;
  if (init.headers instanceof Headers) {
    return Boolean(init.headers.get("authorization"));
  }
  if (Array.isArray(init.headers)) {
    return init.headers.some(([k]) => String(k || "").toLowerCase() === "authorization");
  }
  if (typeof init.headers === "object") {
    return Object.keys(init.headers as Record<string, unknown>).some(
      (k) => k.toLowerCase() === "authorization"
    );
  }
  return false;
}

function isAuthRefreshUrl(url: string): boolean {
  return /\/api\/auth\/(refresh|exchange|oauth)/i.test(url);
}

export const SESSION_EXPIRED_FLAG_KEY = "quizSessionExpiredNotice";

function handleUnauthorized(): void {
  // Only act if we currently have a token to clear — otherwise this is a
  // benign 401 (already-logged-out, unrelated endpoint, etc.).
  if (!getSharedAuthToken()) return;
  clearSharedAuthToken();
  if (suppressRedirect) return;
  // Drop a one-shot flag so the landing page can show a "session expired"
  // banner after the redirect lands.
  try {
    sessionStorage.setItem(SESSION_EXPIRED_FLAG_KEY, String(Date.now()));
  } catch {}
  const currentPath = String(window.location.pathname || "/");
  // Already on landing/auth page — dispatch event so the banner mounts in place.
  if (currentPath === "/" || currentPath.startsWith("/auth/")) {
    try {
      window.dispatchEvent(new Event("quizSessionExpired"));
    } catch {}
    return;
  }
  // Use a soft full reload to guarantee every guard re-evaluates fresh.
  try {
    window.location.replace("/");
  } catch {
    window.location.href = "/";
  }
}

export function installAuthInterceptor(): void {
  if (typeof window === "undefined") return;
  const win = window as unknown as Record<string, unknown>;
  if (win[HANDLED_FLAG]) return;
  win[HANDLED_FLAG] = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    const request = input instanceof Request ? (input as Request) : undefined;

    // Skip the auth-token endpoints themselves so we don't infinite-loop
    // when refresh / exchange returns 401 (sharedAuth handles that path).
    const skip = isAuthRefreshUrl(url);

    const response = await originalFetch(input as RequestInfo, init);

    if (
      !skip &&
      (response.status === 401 || response.status === 403) &&
      hasAuthorizationHeader(init, request)
    ) {
      handleUnauthorized();
    }

    return response;
  };
}
