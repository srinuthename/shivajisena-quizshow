import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import { getBackendBaseUrl, getBackendTarget } from "@/config/appMode";
import { ensureRemoteAppAccessSession } from "@/config/hostProduct";
import {
  getYouTubeChatSenderStatus,
  type YouTubeChatSenderStatus,
} from "@/services/youtubeChatSenderApi";
import { Loader2, LockKeyhole, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { saveQuizHostChannel } from "@/lib/quizHostChannel";
import {
  buildQuizAuthStartUrl,
  exchangeSharedOauthCode,
  getSharedAuthCompleteSignalKey,
  getSharedAuthSession,
  type SharedAuthSession,
  storeSharedAuthToken,
} from "@/lib/sharedAuth";

const getHostChannelSnapshot = (session: SharedAuthSession | null) => {
  const channelId = String(session?.youtubeChannelId || "").trim();
  if (!channelId) return null;
  return {
    quizHostChannelId: channelId,
    quizHostChannelTitle: String(session?.youtubeChannelTitle || "").trim(),
    quizHostChannelHandle: String(session?.youtubeChannelTitle || "").trim(),
  };
};

export const HostRouteGuard = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { applicationId, applicationIdLoading } = useApp();
  const [backendBaseUrl, setBackendBaseUrl] = useState<string>(() => getBackendBaseUrl());
  const [backendTarget, setBackendTargetState] = useState(() => getBackendTarget());
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<YouTubeChatSenderStatus | null>(null);
  const [sharedSession, setSharedSession] = useState<SharedAuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const authCompleteSignalKey = getSharedAuthCompleteSignalKey();
  const consumedOauthCodesRef = useRef<Set<string>>(new Set());

  const requiresHostLogin =
    backendTarget !== "none" && Boolean(String(backendBaseUrl || "").trim());

  const completeSharedAuth = async (
    oauthCode: string,
    hintedApplicationId?: string
  ) => {
    const normalizedCode = String(oauthCode || "").trim();
    if (!normalizedCode) return;
    if (consumedOauthCodesRef.current.has(normalizedCode)) return;
    consumedOauthCodesRef.current.add(normalizedCode);
    const exchanged = await exchangeSharedOauthCode(oauthCode);
    storeSharedAuthToken(exchanged.token);
    const authSession = await getSharedAuthSession();
    const nextSharedSession = authSession?.session || null;
    setSharedSession(nextSharedSession);
    saveQuizHostChannel(getHostChannelSnapshot(nextSharedSession));
    await refreshHostStatus(hintedApplicationId);
  };

  const completeSharedAuthWithToken = async (
    token: string,
    hintedApplicationId?: string
  ) => {
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) return;
    storeSharedAuthToken(normalizedToken);
    const authSession = await getSharedAuthSession();
    const nextSharedSession = authSession?.session || null;
    setSharedSession(nextSharedSession);
    saveQuizHostChannel(getHostChannelSnapshot(nextSharedSession));
    await refreshHostStatus(hintedApplicationId);
  };

  const refreshHostStatus = async (hintedApplicationId?: string) => {
    const nextApplicationId = String(hintedApplicationId || applicationId || "").trim();
    if (!nextApplicationId) return;
    const next = await getYouTubeChatSenderStatus(nextApplicationId);
    const sharedChannel = getHostChannelSnapshot(sharedSession);
    saveQuizHostChannel(
      next.success && next.connected && next.channelId
        ? {
            quizHostChannelId: next.channelId || null,
            quizHostChannelTitle: next.channelTitle || "",
            quizHostChannelHandle: next.channelHandle || "",
          }
        : sharedChannel
    );
    setStatus(next);
    setError(next.success ? null : next.error || null);
  };

  useEffect(() => {
    const syncBackendTarget = () => {
      setBackendBaseUrl(getBackendBaseUrl());
      setBackendTargetState(getBackendTarget());
    };
    window.addEventListener("backendTargetChanged", syncBackendTarget as EventListener);
    window.addEventListener("apiServerUrlChanged", syncBackendTarget as EventListener);
    window.addEventListener("storage", syncBackendTarget);
    return () => {
      window.removeEventListener("backendTargetChanged", syncBackendTarget as EventListener);
      window.removeEventListener("apiServerUrlChanged", syncBackendTarget as EventListener);
      window.removeEventListener("storage", syncBackendTarget);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!requiresHostLogin) {
        saveQuizHostChannel(null);
        if (!active) return;
        setStatus(null);
        setError(null);
        setLoading(false);
        return;
      }
      if (applicationIdLoading) return;
      if (!applicationId) {
        if (!active) return;
        setStatus(null);
        setError("Application ID is not ready yet.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const authSession = await getSharedAuthSession();
        if (!authSession?.session) {
          if (!active) return;
          saveQuizHostChannel(null);
          setSharedSession(null);
          setStatus(null);
          setError(null);
          return;
        }
        setSharedSession(authSession.session);
        saveQuizHostChannel(getHostChannelSnapshot(authSession.session));
        if (active) {
          // A valid shared auth session with a resolved YouTube channel is enough
          // to unlock host pages. Backend status can hydrate afterward.
          setLoading(false);
        }
        void (async () => {
          try {
            await ensureRemoteAppAccessSession(backendBaseUrl);
            const next = await getYouTubeChatSenderStatus(applicationId);
            if (!active) return;
            saveQuizHostChannel(
              next.success && next.connected && next.channelId
                ? {
                    quizHostChannelId: next.channelId || null,
                    quizHostChannelTitle: next.channelTitle || "",
                    quizHostChannelHandle: next.channelHandle || "",
                  }
                : getHostChannelSnapshot(authSession.session)
            );
            setStatus(next);
            setError(next.success ? null : next.error || null);
          } catch (err) {
            if (!active) return;
            console.error("[HostRouteGuard] failed to load backend YouTube status", err);
            setStatus(null);
            setError(null);
          }
        })();
        return;
      } catch (err) {
        if (!active) return;
        console.error("[HostRouteGuard] failed to load YouTube auth status", err);
        setStatus(null);
        setError("Failed to verify YouTube login.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [applicationId, applicationIdLoading, location.pathname, requiresHostLogin]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "shared-auth-complete") return;
      const hintedApplicationId = String(event.data?.applicationId || applicationId || "").trim();
      if (!hintedApplicationId) return;
      const token = String(event.data?.token || "").trim();
      if (token) {
        void completeSharedAuthWithToken(token, hintedApplicationId).catch((err) => {
          console.error("[HostRouteGuard] failed to complete shared auth with token", err);
          setError("Failed to complete YouTube login.");
        });
        return;
      }
      const oauthCode = String(event.data?.code || "").trim();
      if (oauthCode) {
        void completeSharedAuth(oauthCode, hintedApplicationId).catch((err) => {
          console.error("[HostRouteGuard] failed to complete shared auth", err);
          setError("Failed to complete YouTube login.");
        });
        return;
      }
      void refreshHostStatus(hintedApplicationId);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== authCompleteSignalKey || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed?.type !== "shared-auth-complete") return;
        const hintedApplicationId = String(parsed.applicationId || applicationId || "").trim();
        const token = String(parsed.token || "").trim();
        if (token) {
          void completeSharedAuthWithToken(token, hintedApplicationId).catch((err) => {
            console.error("[HostRouteGuard] failed to complete shared auth from storage token", err);
            setError("Failed to complete YouTube login.");
          });
          return;
        }
        const oauthCode = String(parsed.code || "").trim();
        if (oauthCode) {
          void completeSharedAuth(oauthCode, hintedApplicationId).catch((err) => {
            console.error("[HostRouteGuard] failed to complete shared auth from storage", err);
            setError("Failed to complete YouTube login.");
          });
          return;
        }
        void refreshHostStatus(hintedApplicationId);
      } catch {
        void refreshHostStatus(applicationId || undefined);
      }
    };
    const onSameTabAuthUpdate = () => {
      void refreshHostStatus(applicationId || undefined);
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    window.addEventListener("quizSharedAuthUpdated", onSameTabAuthUpdate);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("quizSharedAuthUpdated", onSameTabAuthUpdate);
    };
  }, [applicationId, authCompleteSignalKey]);

  const handleConnect = async () => {
    if (!applicationId) return;
    setConnecting(true);
    try {
      const authUrl = buildQuizAuthStartUrl(location.pathname + location.search);
      window.open(authUrl, "youtube-host-auth", "width=720,height=780");
    } catch (err) {
      console.error("[HostRouteGuard] failed to start YouTube auth", err);
      setError("Failed to start YouTube login.");
    } finally {
      setConnecting(false);
    }
  };

  if (loading || applicationIdLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Checking host access…</span>
        </div>
      </div>
    );
  }

  if (!requiresHostLogin) return <>{children}</>;

  const hasConnectedHost =
    (
      Boolean(status?.success) &&
      status?.sessionAuthenticated === true &&
      status?.connected === true &&
      Boolean(String(status?.channelId || "").trim())
    ) ||
    Boolean(String(sharedSession?.youtubeChannelId || "").trim());
  const oauthMisconfigured = status?.oauthConfigured === false;

  if (hasConnectedHost) return <>{children}</>;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_38%),linear-gradient(135deg,hsl(var(--accent)/0.12),transparent_45%)] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden border-primary/20 bg-card/80 shadow-2xl backdrop-blur-sm">
          <div className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-transparent to-accent/15 px-6 py-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Host Access</Badge>
                  <Badge variant="secondary">Protected</Badge>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">YouTube login required</h1>
                <p className="text-sm text-muted-foreground">
                  We now protect every host workspace outside the main home page with your connected YouTube host account.
                </p>
              </div>
            </div>
          </div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="h-5 w-5 text-rose-500" />
              Connect the host channel to continue
            </CardTitle>
            <CardDescription>
                  This keeps admin, quiz setup, prizing, analytics, and stream operations behind the host’s shared cloud YouTube identity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Host-only workspaces
                </div>
                <p className="text-xs text-muted-foreground">Admin, quizzes, prizing, and advanced tools stay behind the channel login.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Radio className="h-4 w-4 text-rose-500" />
                  Stream discovery
                </div>
                <p className="text-xs text-muted-foreground">Current lives and outbound posting stay tied to the connected host channel.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Cleaner host flow
                </div>
                <p className="text-xs text-muted-foreground">One login unlocks the full host dashboard experience across the app.</p>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConnect} disabled={connecting || oauthMisconfigured} className="min-w-44">
                {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                {connecting ? "Opening YouTube login…" : "Connect YouTube"}
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Back to Home</Link>
              </Button>
            </div>

            {oauthMisconfigured ? (
              <p className="text-xs text-muted-foreground">
                OAuth is not configured on the backend yet. Configure YouTube OAuth in the host admin backend first.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HostRouteGuard;
