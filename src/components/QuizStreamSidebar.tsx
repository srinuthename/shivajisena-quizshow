import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useQuizGame } from "@/context/QuizGameContext";
import { useApp } from "@/context/AppContext";
import { toast } from "@/hooks/use-toast";
import { readQuizHostChannel } from "@/lib/quizHostChannel";
import { HOST_PRODUCT_KEY } from "@/config/hostProduct";
import {
  Youtube,
  Radio,
  RefreshCw,
  RotateCcw,
  Plus,
  Loader2,
  Pause,
  Play,
  Trash2,
  PanelRightOpen,
  PanelRightClose,
  Copy,
  Check,
} from "lucide-react";

const TRANSFORM_MODES = ["synthetic", "answers-only", "simulate", "filter", "random-raw", "raw", "dummy"] as const;
const LAUNCHER_WIDTH = 170;
const LAUNCHER_HEIGHT = 44;
const LAUNCHER_MARGIN = 12;

const normalizeYouTubeInput = (value: string): string => {
  const raw = value.trim();
  if (!raw) return "";

  // Already a URL
  if (/^https?:\/\//i.test(raw)) return raw;

  // Bare video ID style input (11 chars) -> convert to watch URL
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return `https://www.youtube.com/watch?v=${raw}`;
  }

  return raw;
};

const formatAgo = (iso?: string | null): string => {
  if (!iso) return "n/a";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "n/a";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
};

const formatLease = (iso?: string | null): string => {
  if (!iso) return "n/a";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "n/a";
  const diffSec = Math.floor((ts - Date.now()) / 1000);
  if (diffSec <= 0) return "expired";
  if (diffSec < 60) return `in ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  return `in ${diffHr}h`;
};

const shortId = (value?: string | null): string => {
  const v = String(value || "").trim();
  if (!v) return "n/a";
  if (v.length <= 12) return v;
  return `${v.slice(0, 6)}...${v.slice(-4)}`;
};

export const QuizStreamSidebar = () => {
  const {
    frontendQuizGameId: streamFrontendQuizGameId,
    connectedStreams,
    isLoadingStreams,
    addStream,
    removeStream,
    toggleStream,
    restartStream,
    revalidateStream,
    startAllStreams,
    stopAllStreams,
    refreshAllStreamsBackend,
  } = useQuizGame();
  const { frontendQuizGameId } = useApp();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [transformMode, setTransformMode] = useState<(typeof TRANSFORM_MODES)[number]>("answers-only");
  const [adding, setAdding] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [launcherPos, setLauncherPos] = useState(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    return {
      x: window.innerWidth - LAUNCHER_WIDTH - LAUNCHER_MARGIN,
      y: window.innerHeight - LAUNCHER_HEIGHT - LAUNCHER_MARGIN,
    };
  });
  const [isDraggingLauncher, setIsDraggingLauncher] = useState(false);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  const activeCount = useMemo(
    () => connectedStreams.filter((stream) => !stream.isStopped).length,
    [connectedStreams]
  );
  const launcherStatus = useMemo(() => {
    if (connectedStreams.length === 0 || activeCount === 0) {
      return {
        label: "0/" + connectedStreams.length,
        className: "bg-rose-600 text-white",
      };
    }
    if (activeCount === connectedStreams.length) {
      return {
        label: `${activeCount}/${connectedStreams.length}`,
        className: "bg-emerald-600 text-white",
      };
    }
    return {
      label: `${activeCount}/${connectedStreams.length}`,
      className: "bg-amber-500 text-black",
    };
  }, [activeCount, connectedStreams.length]);
  const effectiveQuizGameId = streamFrontendQuizGameId || frontendQuizGameId || null;
  const hostChannel = readQuizHostChannel();
  const tenantId = String(hostChannel.quizHostChannelId || "default-org").trim() || "default-org";
  const resourceId = String(effectiveQuizGameId || "").trim();

  useEffect(() => {
    const handleResize = () => {
      setLauncherPos((prev) => ({
        x: Math.min(
          Math.max(LAUNCHER_MARGIN, prev.x),
          Math.max(LAUNCHER_MARGIN, window.innerWidth - LAUNCHER_WIDTH - LAUNCHER_MARGIN)
        ),
        y: Math.min(
          Math.max(LAUNCHER_MARGIN, prev.y),
          Math.max(LAUNCHER_MARGIN, window.innerHeight - LAUNCHER_HEIGHT - LAUNCHER_MARGIN)
        ),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLauncherPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragPointerIdRef.current = e.pointerId;
    didDragRef.current = false;
    dragOffsetRef.current = {
      x: e.clientX - launcherPos.x,
      y: e.clientY - launcherPos.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLauncherPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== e.pointerId) return;
    const nextX = e.clientX - dragOffsetRef.current.x;
    const nextY = e.clientY - dragOffsetRef.current.y;
    const clampedX = Math.min(
      Math.max(LAUNCHER_MARGIN, nextX),
      Math.max(LAUNCHER_MARGIN, window.innerWidth - LAUNCHER_WIDTH - LAUNCHER_MARGIN)
    );
    const clampedY = Math.min(
      Math.max(LAUNCHER_MARGIN, nextY),
      Math.max(LAUNCHER_MARGIN, window.innerHeight - LAUNCHER_HEIGHT - LAUNCHER_MARGIN)
    );
    if (Math.abs(clampedX - launcherPos.x) > 2 || Math.abs(clampedY - launcherPos.y) > 2) {
      didDragRef.current = true;
      setIsDraggingLauncher(true);
      setLauncherPos({ x: clampedX, y: clampedY });
    }
  };

  const handleLauncherPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== e.pointerId) return;
    dragPointerIdRef.current = null;
    setIsDraggingLauncher(false);

    const snapLeft = launcherPos.x < window.innerWidth / 2;
    const snappedX = snapLeft
      ? LAUNCHER_MARGIN
      : Math.max(LAUNCHER_MARGIN, window.innerWidth - LAUNCHER_WIDTH - LAUNCHER_MARGIN);
    setLauncherPos((prev) => ({ ...prev, x: snappedX }));

    if (!didDragRef.current) {
      setOpen(true);
    }
  };

  const handleAdd = async () => {
    const normalized = normalizeYouTubeInput(input);
    if (!normalized) {
      toast({
        title: "Invalid stream",
        description: "Enter YouTube URL or 11-character video ID.",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    const result = await addStream(normalized, transformMode);
    setAdding(false);

    if (!result.success) {
      toast({
        title: "Failed to add stream",
        description: result.error || "Could not add stream.",
        variant: "destructive",
      });
      return;
    }

    setInput("");
    toast({ title: "Stream added" });
  };

  const handleRemove = async (videoId: string) => {
    const result = await removeStream(videoId);
    if (!result.success) {
      toast({
        title: "Failed to remove stream",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Stream removed" });
  };

  const handleToggle = async (videoId: string) => {
    const result = await toggleStream(videoId);
    if (!result.success) {
      toast({
        title: "Action failed",
        variant: "destructive",
      });
      return;
    }
    toast({ title: result.isStopped ? "Stream paused" : "Stream resumed" });
  };

  const handleStartAll = async () => {
    setBulkBusy(true);
    const result = await startAllStreams();
    setBulkBusy(false);
    if (!result.success) {
      toast({ title: "Start all failed", description: result.error || "Could not start streams.", variant: "destructive" });
      return;
    }
    toast({ title: "Started all streams" });
  };

  const handleStopAll = async () => {
    setBulkBusy(true);
    const result = await stopAllStreams();
    setBulkBusy(false);
    if (!result.success) {
      toast({ title: "Stop all failed", description: result.error || "Could not stop streams.", variant: "destructive" });
      return;
    }
    toast({ title: "Stopped all streams" });
  };

  const handleBackendRefresh = async () => {
    setBulkBusy(true);
    const result = await refreshAllStreamsBackend();
    setBulkBusy(false);
    if (!result.success) {
      toast({ title: "Refresh failed", description: result.error || "Could not refresh streams.", variant: "destructive" });
      return;
    }
    toast({ title: "Streams refreshed" });
  };

  const handleRestart = async (videoId: string) => {
    setRowBusyId(videoId);
    const result = await restartStream(videoId);
    setRowBusyId(null);
    if (!result.success) {
      toast({ title: "Restart failed", description: result.error || "Could not restart stream.", variant: "destructive" });
      return;
    }
    toast({ title: "Stream restarted" });
  };

  const handleRevalidate = async (videoId: string) => {
    setRowBusyId(videoId);
    const result = await revalidateStream(videoId);
    setRowBusyId(null);
    if (!result.success) {
      toast({ title: "Revalidate failed", description: result.error || "Could not revalidate stream.", variant: "destructive" });
      return;
    }
    toast({ title: "Stream revalidated" });
  };

  const handleCopyGameId = async () => {
    if (!effectiveQuizGameId) return;
    await navigator.clipboard.writeText(effectiveQuizGameId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div
        className="fixed z-[70] touch-none"
        style={{ left: `${launcherPos.x}px`, top: `${launcherPos.y}px` }}
        onPointerDown={handleLauncherPointerDown}
        onPointerMove={handleLauncherPointerMove}
        onPointerUp={handleLauncherPointerUp}
      >
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            if (didDragRef.current) {
              e.preventDefault();
              return;
            }
            setOpen(true);
          }}
          className={`h-11 px-3 bg-background/95 backdrop-blur border-primary/30 shadow-lg ${
            isDraggingLauncher ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <PanelRightOpen className="h-4 w-4 mr-2" />
          <Youtube className="h-4 w-4 text-red-500 mr-1" />
          <span className="text-xs">{connectedStreams.length}</span>
          <Badge className={`ml-2 h-5 px-1.5 ${launcherStatus.className}`}>
            <Radio className={`h-3 w-3 mr-1 ${activeCount > 0 ? "animate-pulse" : ""}`} />
            {launcherStatus.label}
          </Badge>
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                <SheetTitle className="text-base">Stream Manager</SheetTitle>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
            <SheetDescription>
              Add and control orchestrator streams from quiz view.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 py-3 space-y-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="YouTube URL or video ID"
                disabled={adding || !effectiveQuizGameId}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
              />
              <Button onClick={() => void handleAdd()} disabled={adding || !effectiveQuizGameId || !input.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <span>Tenant ID: {tenantId}</span>
                <span>Application ID: {HOST_PRODUCT_KEY}</span>
                <span>Resource ID: {resourceId || "n/a"}</span>
                <span>Consumer: {HOST_PRODUCT_KEY}</span>
                <span>Connector: enabled</span>
              </div>
              <div>
                <p className="text-[11px] mb-1 text-muted-foreground">Transform Mode</p>
                <Select value={transformMode} onValueChange={(v) => setTransformMode(v as (typeof TRANSFORM_MODES)[number])}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFORM_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => void handleBackendRefresh()} disabled={isLoadingStreams || bulkBusy}>
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStreams ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleStartAll()} disabled={bulkBusy}>
                Start All
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleStopAll()} disabled={bulkBusy}>
                Stop All
              </Button>
            </div>

            {!effectiveQuizGameId && (
              <p className="text-xs text-muted-foreground">
                Save quiz settings and start a quiz to manage streams.
              </p>
            )}

            <Separator />

            <div className="max-h-[54vh] overflow-y-auto space-y-2 pr-1">
              {isLoadingStreams ? (
                <div className="text-sm text-muted-foreground flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading streams...
                </div>
              ) : connectedStreams.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8 border rounded-md bg-muted/30">
                  No streams connected
                </div>
              ) : (
                connectedStreams.map((stream) => (
                  <div key={stream.streamId || stream.videoId} className="border rounded-lg p-2.5 bg-card/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              stream.isStopped ? "bg-muted-foreground" : "bg-emerald-500 animate-pulse"
                            }`}
                          />
                          <Badge variant="outline" className="text-[10px]">
                            {stream.isStopped ? "paused" : "running"}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">
                          {stream.title || stream.videoId}
                        </p>
                        <div className="mt-1 flex items-center gap-2 min-w-0">
                          <p className="font-mono text-xs truncate text-muted-foreground">{stream.videoId}</p>
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0">
                            mode: {stream.transformMode || "unknown"}
                          </Badge>
                        </div>
                        {stream.channelTitle ? (
                          <p className="text-[11px] text-muted-foreground truncate">
                            channel: {stream.channelTitle}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground truncate">
                          heartbeat: {formatAgo(stream.lastHeartbeatAt)}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          last message: {formatAgo(stream.lastMessageAt)}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          owner: {shortId(stream.ownerClientId)} | lease: {formatLease(stream.ownerLeaseExpiresAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title={stream.isStopped ? "Start" : "Stop"}
                          onClick={() => void handleToggle(stream.streamId || stream.videoId)}
                          disabled={rowBusyId === (stream.streamId || stream.videoId)}
                        >
                          {stream.isStopped ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Restart"
                          onClick={() => void handleRestart(stream.streamId || stream.videoId)}
                          disabled={rowBusyId === (stream.streamId || stream.videoId)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Revalidate"
                          onClick={() => void handleRevalidate(stream.streamId || stream.videoId)}
                          disabled={rowBusyId === (stream.streamId || stream.videoId)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          title="Delete"
                          onClick={() => void handleRemove(stream.streamId || stream.videoId)}
                          disabled={rowBusyId === (stream.streamId || stream.videoId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {stream.error ? (
                      <p className="text-[11px] text-destructive mt-2 truncate">{stream.error}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Game ID</span>
              <button onClick={() => void handleCopyGameId()} className="font-mono flex items-center gap-1 hover:text-foreground">
                <span>{effectiveQuizGameId ? `${effectiveQuizGameId.slice(0, 6)}...${effectiveQuizGameId.slice(-6)}` : "n/a"}</span>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default QuizStreamSidebar;
