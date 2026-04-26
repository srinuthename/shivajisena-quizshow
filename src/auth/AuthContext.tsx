import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getAccessToken,
  decodeToken,
  willExpireSoon,
  storeAccessToken,
  clearTokens,
  refreshAccessToken,
  revokeSession,
  type DecodedToken,
} from "./auth-utils";
import { useSessionManager } from "./useSessionManager";
import { HOST_PRODUCT_KEY } from "@/config/hostProduct";
import {
  buildQuizAuthStartUrl,
  getAuthServiceBaseUrl,
  getSharedAuthCompleteSignalKey,
} from "@/lib/sharedAuth";
import { suppressNextUnauthorizedRedirect } from "@/lib/authInterceptor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  userId: string;
  userEmail: string;
  userName: string;
  tenantId: string;
  applicationId: string;
  applicationName: string;
  roles: string[];
  scopes: string[];
  authProvider: string;
  youtubeChannelId: string | null;
  youtubeChannelTitle: string | null;
  youtubeChannelThumbnail: string | null;
  profilePicture: string | null;
}

export interface AuthContextValue {
  /** Current authenticated user (null while loading or if not signed in). */
  user: AuthUser | null;
  /** True during initial session resolution. */
  loading: boolean;
  /** Start Google OAuth (full-page redirect). */
  loginWithGoogle: (returnUrl?: string) => void;
  /** Log out — clears tokens, reloads to "/". */
  logout: () => void;
  /** Check if current user has a specific role. */
  hasRole: (role: string) => boolean;
  /** Check if current user has a specific scope. */
  hasScope: (scope: string) => boolean;
  /** Force re-read user from stored token. */
  refreshUser: () => void;
  /** Whether the user has linked a YouTube channel. */
  connectedToYouTube: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tokenToUser(decoded: DecodedToken): AuthUser {
  return {
    userId: decoded.userId,
    userEmail: decoded.userEmail,
    userName: decoded.userName,
    tenantId: decoded.tenantId,
    applicationId: decoded.applicationId,
    applicationName: decoded.applicationName,
    roles: Array.isArray(decoded.roles) ? decoded.roles : [],
    scopes: Array.isArray(decoded.scopes) ? decoded.scopes : [],
    authProvider: decoded.authProvider ?? "local",
    youtubeChannelId: decoded.youtubeChannelId ?? null,
    youtubeChannelTitle: decoded.youtubeChannelTitle ?? null,
    youtubeChannelThumbnail: decoded.youtubeChannelThumbnail ?? null,
    profilePicture: decoded.profilePicture ?? null,
  };
}

function readCurrentUser(): AuthUser | null {
  const token = getAccessToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.userId) return null;
  return tokenToUser(decoded);
}

const DEFAULT_AUDIENCE = String(import.meta.env.VITE_AUTH_AUDIENCE || "orchestrator-host").trim();
const DEFAULT_TENANT_ID = String(
  import.meta.env.VITE_AUTH_PLATFORM_TENANT_ID ||
  import.meta.env.VITE_AUTH_TENANT_ID ||
  "default-org"
).trim();

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Resolve user synchronously from local token first so protected routes
  // never block on async bootstrap after OAuth callback.
  const [user, setUser] = useState<AuthUser | null>(() => readCurrentUser());
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(() => {
    setUser(readCurrentUser());
  }, []);

  // Auto-refresh tokens while logged in
  useSessionManager({
    enabled: !!user,
    onRefresh: (accessToken) => {
      storeAccessToken(accessToken);
      refreshUser();
    },
    onExpired: () => {
      setUser(null);
      clearTokens();
    },
  });

  // Initialise session on mount.
  //
  // Critical rule: NEVER let async work (token refresh, network) block the
  // initial `loading=false` flip when we already have a usable user from the
  // local token. Every protected route gates rendering on `loading`, so if
  // this effect ever fails to flip `loading`, the whole app hangs on a
  // spinner — which is exactly the bug we hit on fresh-browser OAuth callback.
  useEffect(() => {
    let active = true;

    // Hard watchdog: no matter what happens below (network hangs, throws,
    // refresh service unreachable, etc.), `loading` is guaranteed to flip
    // to `false` within 3 seconds so RequireAuth never spins forever.
    const watchdog = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 3000);

    const init = async () => {
      try {
        // 1. Synchronous local-token path. If we can already decode a user,
        //    flip loading immediately and do any refresh in the background.
        const localUser = readCurrentUser();
        if (localUser) {
          if (!active) return;
          setUser(localUser);
          setLoading(false);

          // Background-only proactive refresh — never awaited by the UI.
          const tok = getAccessToken();
          if (tok && willExpireSoon(tok, 60_000)) {
            void refreshAccessToken()
              .then((result) => {
                if (!active || !result) return;
                storeAccessToken(result.accessToken);
                setUser(readCurrentUser());
              })
              .catch(() => {
                /* keep current user; useSessionManager will retry */
              });
          }
          return;
        }

        // 2. Stored token but undecodable → try refresh once, time-boxed by
        //    the watchdog above. If refresh fails, clear and surface
        //    logged-out state so RequireAuth can re-trigger sign-in.
        if (getAccessToken()) {
          try {
            const result = await refreshAccessToken();
            if (!active) return;
            if (result) {
              storeAccessToken(result.accessToken);
              setUser(readCurrentUser());
            } else {
              clearTokens();
              setUser(null);
            }
          } catch {
            if (!active) return;
            clearTokens();
            setUser(null);
          }
        } else if (active) {
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();
    return () => {
      active = false;
      window.clearTimeout(watchdog);
    };
  }, []);

  // Cross-tab: listen for storage changes to the token key OR shared-auth-complete signal
  useEffect(() => {
    const sharedSignalKey = getSharedAuthCompleteSignalKey();
    const handler = (e: StorageEvent) => {
      if (e.key === "quizUiStateToken" || e.key === sharedSignalKey) {
        refreshUser();
      }
    };
    // Same-tab notification (popups → opener uses storage; same-tab uses this custom event)
    const onSameTab = () => refreshUser();
    window.addEventListener("storage", handler);
    window.addEventListener("quizSharedAuthUpdated", onSameTab);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("quizSharedAuthUpdated", onSameTab);
    };
  }, [refreshUser]);

  const loginWithGoogle = useCallback(
    (returnPath = "/admin") => {
      // Use a full-page OAuth redirect for the main app auth flow. This avoids
      // fresh-browser timing races between popup storage propagation, opener
      // messaging, and protected-route guards on the first authenticated load.
      if (!getAuthServiceBaseUrl()) {
        throw new Error("VITE_AUTH_BASE_URL is not configured");
      }
      const popupUrl = buildQuizAuthStartUrl(returnPath);
      const url = new URL(popupUrl);
      url.searchParams.delete("popup");
      const innerReturnUrl = url.searchParams.get("returnUrl");
      if (innerReturnUrl) {
        try {
          const inner = new URL(innerReturnUrl);
          inner.searchParams.delete("popup");
          url.searchParams.set("returnUrl", inner.toString());
        } catch (_e) {
          // Malformed inner URL — leave as-is.
        }
      }
      window.location.href = url.toString();
    },
    []
  );

  const logout = useCallback(() => {
    // Suppress the global 401-interceptor redirect since we're navigating ourselves.
    suppressNextUnauthorizedRedirect(2000);
    // Mark that this was an explicit user logout so RequireAuth guards on
    // protected routes do not immediately re-trigger the Google sign-in flow.
    try { sessionStorage.setItem("quizExplicitLogout", "1"); } catch (_e) { /* storage unavailable */ }
    // Clear tokens immediately from local storage
    clearTokens();
    setUser(null);
    // Revoke the HttpOnly refresh token cookie server-side so it cannot be
    // silently re-established on the next page load, then reload the page.
    // The second clearTokens() inside .finally() is a defensive guard: if a
    // concurrent background token-refresh (useSessionManager) won the race and
    // re-wrote the access token to localStorage during the revokeSession()
    // network round-trip, this wipes it again before the hard reload so the
    // page always starts fresh with no stored credentials.
    void revokeSession().finally(() => {
      clearTokens();
      window.location.href = "/";
    });
  }, []);

  const hasRole = useCallback(
    (role: string) => user?.roles.includes(role) ?? false,
    [user]
  );

  const hasScope = useCallback(
    (scope: string) => user?.scopes.includes(scope) ?? false,
    [user]
  );

  const connectedToYouTube = Boolean(user?.youtubeChannelId);

  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithGoogle, logout, hasRole, hasScope, refreshUser, connectedToYouTube }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
