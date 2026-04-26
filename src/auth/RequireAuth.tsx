import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route guard: renders children only if the user is authenticated.
 * Redirects to "/" (landing/login page) otherwise.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, loginWithGoogle } = useAuth();
  const location = useLocation();
  const startedLoginRef = useRef(false);
  const loginErrorRef = useRef<string | null>(null);
  const authWatchdogRef = useRef<number | null>(null);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  // Detect whether the user just explicitly logged out.
  let explicitLogout = false;
  try {
    explicitLogout = sessionStorage.getItem("quizExplicitLogout") === "1";
  } catch {}

  useEffect(() => {
    if (!loading) {
      setAuthTimedOut(false);
      if (authWatchdogRef.current) {
        window.clearTimeout(authWatchdogRef.current);
        authWatchdogRef.current = null;
      }
      return;
    }
    authWatchdogRef.current = window.setTimeout(() => {
      setAuthTimedOut(true);
    }, 10000);
    return () => {
      if (authWatchdogRef.current) {
        window.clearTimeout(authWatchdogRef.current);
        authWatchdogRef.current = null;
      }
    };
  }, [loading]);

  useEffect(() => {
    if (loading || user || startedLoginRef.current) return;
    // If the user just logged out, send them to Home — do not auto-open Google OAuth.
    if (explicitLogout) return;
    startedLoginRef.current = true;
    const targetPath = `${location.pathname}${location.search}${location.hash}` || "/admin";
    try {
      loginWithGoogle(targetPath);
    } catch (error) {
      loginErrorRef.current = String(error instanceof Error ? error.message : error || "Failed to start sign-in");
    }
  }, [loading, user, loginWithGoogle, explicitLogout, location.pathname, location.search, location.hash]);

  if (loading) {
    if (authTimedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-lg text-center space-y-3">
            <div className="text-sm text-muted-foreground">Authentication check is taking longer than expected.</div>
            <Button
              onClick={() => {
                const targetPath = `${location.pathname}${location.search}${location.hash}` || "/admin";
                loginWithGoogle(targetPath);
              }}
            >
              Continue Sign-in
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // After an explicit logout redirect to Home so the user can choose to sign in again.
    if (explicitLogout) {
      return <Navigate to="/" replace />;
    }
    if (loginErrorRef.current) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="rounded-2xl border border-destructive/30 bg-card/90 p-6 text-sm text-destructive shadow-lg">
            {loginErrorRef.current}
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Redirecting to sign-in...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
