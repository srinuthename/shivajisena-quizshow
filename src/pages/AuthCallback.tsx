import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { exchangeSharedOauthCode, notifySharedAuthComplete, storeSharedAuthToken } from "@/lib/sharedAuth";

const consumedOauthExchangeCodes = new Set<string>();

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const handledRef = useRef(false);

  const code = useMemo(() => String(searchParams.get("code") || "").trim(), [searchParams]);
  const redirectPath = useMemo(() => String(searchParams.get("redirect") || "/admin").trim() || "/admin", [searchParams]);
  const popupMode = searchParams.get("popup") === "1";

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    const safeRedirectPath = redirectPath.startsWith("/") ? redirectPath : "/admin";
    const watchdogId = window.setTimeout(() => {
      // Fail-safe: never remain stuck on callback route.
      if (window.location.pathname === "/auth/callback") {
        window.location.replace(safeRedirectPath);
      }
    }, 12000);

    async function finishSignIn() {
      if (!code) {
        window.location.replace("/");
        return;
      }
      if (consumedOauthExchangeCodes.has(code)) {
        if (!popupMode) {
          window.location.replace(safeRedirectPath);
        }
        return;
      }
      consumedOauthExchangeCodes.add(code);

      try {
        // Clear the explicit-logout flag so future RequireAuth guards work normally.
        try { sessionStorage.removeItem("quizExplicitLogout"); } catch {}
        if (popupMode && window.opener) {
          const exchanged = await exchangeSharedOauthCode(code);
          storeSharedAuthToken(exchanged.token);
          // Clear the flag in the opener window too.
          try { window.opener.sessionStorage?.removeItem("quizExplicitLogout"); } catch {}
          notifySharedAuthComplete("quiz-app", "", exchanged.token);
          const targetUrl = new URL(redirectPath || "/admin", window.location.origin);
          try {
            window.opener.location.replace(targetUrl.toString());
          } catch {}
          try {
            window.opener.focus();
          } catch {}
          try {
            window.close();
          } catch {}
          try {
            window.open("", "_self");
            window.close();
          } catch {}
          return;
        }

        const exchanged = await exchangeSharedOauthCode(code);
        storeSharedAuthToken(exchanged.token);
        notifySharedAuthComplete("quiz-app", "", exchanged.token);
        // Use a hard redirect so AuthProvider re-initializes from a clean app boot.
        // This avoids edge cases where fresh-browser callback state races can leave
        // protected routes stuck in a pending guard/loading state.
        window.location.replace(safeRedirectPath);
      } catch (error) {
        console.error("[AuthCallback] Failed to complete OAuth exchange", error);
        consumedOauthExchangeCodes.delete(code);
        window.location.replace("/");
      }
    }

    void finishSignIn();
    return () => window.clearTimeout(watchdogId);
  }, [code, popupMode, redirectPath]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-5 py-4 shadow-lg">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Completing sign-in…</span>
      </div>
    </div>
  );
}
