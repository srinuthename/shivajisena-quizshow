import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuizGame } from '@/context/QuizGameContext';
import { useApp } from '@/context/AppContext';
import { Youtube, Loader2, Trash2, Pause, Play, Plus, Radio, Copy, Check, Bot, Zap, Settings2, RotateCcw, ShieldCheck, PlayCircle, StopCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getYouTubeCurrentLives, type YouTubeCurrentLive } from '@/services/youtubeChatSenderApi';
import { readQuizHostChannel } from '@/lib/quizHostChannel';
import { HOST_PRODUCT_KEY } from '@/config/hostProduct';

// Storage keys for dummy answer settings
const DUMMY_ENABLED_KEY = 'dummyAnswersEnabled';
const DUMMY_RATE_KEY = 'dummyAnswersRate';
const DUMMY_CORRECT_PROB_KEY = 'dummyAnswersCorrectProb';
const TRANSFORM_MODES = [
  'synthetic',
  'answers-only',
  'simulate',
  'filter',
  'random-raw',
  'make-command-from-message',
  'raw',
  'dummy',
] as const;

const formatAgo = (iso?: string | null): string => {
  if (!iso) return 'n/a';
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return 'n/a';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
};

const formatLease = (iso?: string | null): string => {
  if (!iso) return 'n/a';
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return 'n/a';
  const diffSec = Math.floor((ts - Date.now()) / 1000);
  if (diffSec <= 0) return 'expired';
  if (diffSec < 60) return `in ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  return `in ${diffHr}h`;
};

const shortId = (value?: string | null): string => {
  const v = String(value || '').trim();
  if (!v) return 'n/a';
  if (v.length <= 12) return v;
  return `${v.slice(0, 6)}...${v.slice(-4)}`;
};

export interface DummyAnswerSettings {
  enabled: boolean;
  answersPerMinute: number;
  correctAnswerProbability: number;
}

interface AdminStreamManagerProps {
  onDummySettingsChange?: (settings: DummyAnswerSettings) => void;
}

export const AdminStreamManager = ({ onDummySettingsChange }: AdminStreamManagerProps) => {
  const { applicationId, frontendQuizGameId } = useApp();
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
    refreshStreams 
  } = useQuizGame();
  const effectiveQuizGameId = streamFrontendQuizGameId || frontendQuizGameId || null;
  
  const [videoUrl, setVideoUrl] = useState('');
  const [transformMode, setTransformMode] = useState<(typeof TRANSFORM_MODES)[number]>('answers-only');
  const [isAdding, setIsAdding] = useState(false);
  const [loadingCurrentLives, setLoadingCurrentLives] = useState(false);
  const [currentLives, setCurrentLives] = useState<YouTubeCurrentLive[]>([]);
  const [currentLivesError, setCurrentLivesError] = useState<string | null>(null);
  const [copiedGameId, setCopiedGameId] = useState(false);
  const [showDummySettings, setShowDummySettings] = useState(false);

  // Dummy answer settings
  const [dummyEnabled, setDummyEnabled] = useState(() => {
    try {
      return localStorage.getItem(DUMMY_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [answersPerMinute, setAnswersPerMinute] = useState(() => {
    try {
      return parseInt(localStorage.getItem(DUMMY_RATE_KEY) || '30', 10);
    } catch {
      return 30;
    }
  });

  const [correctProbability, setCorrectProbability] = useState(() => {
    try {
      return parseFloat(localStorage.getItem(DUMMY_CORRECT_PROB_KEY) || '0.4');
    } catch {
      return 0.4;
    }
  });

  // Persist and notify settings changes
  useEffect(() => {
    try {
      localStorage.setItem(DUMMY_ENABLED_KEY, dummyEnabled.toString());
      localStorage.setItem(DUMMY_RATE_KEY, answersPerMinute.toString());
      localStorage.setItem(DUMMY_CORRECT_PROB_KEY, correctProbability.toString());
    } catch (e) {
      console.error('Failed to persist dummy answer settings:', e);
    }

    onDummySettingsChange?.({
      enabled: dummyEnabled,
      answersPerMinute,
      correctAnswerProbability: correctProbability,
    });
  }, [dummyEnabled, answersPerMinute, correctProbability, onDummySettingsChange]);

  // Refresh streams on mount and when streamFrontendQuizGameId changes
  useEffect(() => {
    if (effectiveQuizGameId) {
      refreshStreams();
    }
  }, [effectiveQuizGameId, refreshStreams]);

  const loadCurrentLives = async () => {
    if (!applicationId) {
      setCurrentLives([]);
      setCurrentLivesError(null);
      return;
    }
    setLoadingCurrentLives(true);
    try {
      const result = await getYouTubeCurrentLives(applicationId);
      if (!result.success) {
        setCurrentLives([]);
        setCurrentLivesError(result.error || 'Connect your YouTube host channel to load current lives.');
        return;
      }
      setCurrentLives(result.currentLives || []);
      setCurrentLivesError(null);
    } catch (error) {
      console.error('Failed to load current YouTube lives:', error);
      setCurrentLives([]);
      setCurrentLivesError('Failed to load current lives from the connected YouTube channel.');
    } finally {
      setLoadingCurrentLives(false);
    }
  };

  useEffect(() => {
    void loadCurrentLives();
  }, [applicationId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'shared-auth-complete') {
        void loadCurrentLives();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [applicationId]);

  const handleAddStream = async () => {
    if (!effectiveQuizGameId) {
      toast({
        title: "Save Quiz First",
        description: "Save the quiz configuration to create the run ID before adding streams.",
        variant: "destructive",
      });
      return;
    }

    if (!videoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube video URL",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    const result = await addStream(videoUrl, transformMode);
    
    if (result.success) {
      toast({
        title: "Stream Added",
        description: "YouTube stream connected successfully",
      });
      setVideoUrl('');
    } else {
      toast({
        title: "Failed to Add Stream",
        description: result.error || "Could not connect to stream",
        variant: "destructive",
      });
    }
    setIsAdding(false);
  };

  const handleRemoveStream = async (videoId: string) => {
    const result = await removeStream(videoId);
    if (result.success) {
      toast({
        title: "Stream Removed",
        description: "YouTube stream disconnected",
      });
    }
  };

  const handleToggleStream = async (videoId: string) => {
    const result = await toggleStream(videoId);
    if (result.success) {
      toast({
        title: result.isStopped ? "Stream Paused" : "Stream Resumed",
        description: result.isStopped ? "Stream monitoring paused" : "Stream monitoring resumed",
      });
    }
  };

  const handleRestartStream = async (videoId: string) => {
    const result = await restartStream(videoId);
    if (result.success) {
      toast({ title: "Stream Restarted", description: `Stream ${videoId} restarted` });
    } else {
      toast({ title: "Restart Failed", description: result.error || "Could not restart stream", variant: "destructive" });
    }
  };

  const handleRevalidateStream = async (videoId: string) => {
    const result = await revalidateStream(videoId);
    if (result.success) {
      toast({ title: "Stream Revalidated", description: `Stream ${videoId} revalidated` });
    } else {
      toast({ title: "Revalidate Failed", description: result.error || "Could not revalidate stream", variant: "destructive" });
    }
  };

  const handleStartAll = async () => {
    const result = await startAllStreams();
    if (result.success) {
      toast({ title: "All Streams Started", description: "All streams are now active" });
    } else {
      toast({ title: "Start All Failed", description: result.error || "Could not start all streams", variant: "destructive" });
    }
  };

  const handleStopAll = async () => {
    const result = await stopAllStreams();
    if (result.success) {
      toast({ title: "All Streams Stopped", description: "All streams have been stopped" });
    } else {
      toast({ title: "Stop All Failed", description: result.error || "Could not stop all streams", variant: "destructive" });
    }
  };

  const handleRefreshAll = async () => {
    const result = await refreshAllStreamsBackend();
    if (result.success) {
      toast({ title: "Streams Refreshed", description: "All streams refreshed from backend" });
    } else {
      toast({ title: "Refresh Failed", description: result.error || "Could not refresh streams", variant: "destructive" });
    }
  };

  const copyGameId = () => {
    if (effectiveQuizGameId) {
      navigator.clipboard.writeText(effectiveQuizGameId);
      setCopiedGameId(true);
      setTimeout(() => setCopiedGameId(false), 2000);
    }
  };

  const handleDummyToggle = (checked: boolean) => {
    setDummyEnabled(checked);
    toast({
      title: checked ? "Dummy Answers Enabled" : "Dummy Answers Disabled",
      description: checked 
        ? `Generating ~${answersPerMinute} dummy answers per minute` 
        : "Dummy answer generation stopped",
    });
  };

  const activeStreamCount = connectedStreams.filter(s => !s.isStopped).length;
  const hostChannel = readQuizHostChannel();
  const tenantId = String(hostChannel.quizHostChannelId || 'default-org').trim() || 'default-org';
  const resourceId = String(effectiveQuizGameId || '').trim();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          <span className="font-medium">Stream Manager</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {connectedStreams.length} Stream{connectedStreams.length !== 1 ? 's' : ''}
          </span>
          {activeStreamCount > 0 && (
            <Badge variant="default" className="bg-green-500 text-white">
              <Radio className="h-3 w-3 mr-1 animate-pulse" />
              {activeStreamCount} Active
            </Badge>
          )}
        </div>
      </div>

      {/* Add Stream Input */}
      <div className="flex gap-2">
        <Input
          placeholder="YouTube video URL..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddStream()}
          disabled={isAdding || !effectiveQuizGameId}
        />
        <Button
          onClick={handleAddStream}
          disabled={isAdding || !videoUrl.trim() || !effectiveQuizGameId}
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Transform Mode</Label>
        <Select value={transformMode} onValueChange={(value) => setTransformMode(value as (typeof TRANSFORM_MODES)[number])}>
          <SelectTrigger className="h-9">
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

      {!effectiveQuizGameId && (
        <p className="text-xs text-muted-foreground italic">
          Save quiz settings first to enable stream management
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 rounded-lg border border-border/60 p-3 text-[11px] text-muted-foreground sm:grid-cols-2">
        <span>Tenant ID: {tenantId}</span>
        <span>Application ID: {HOST_PRODUCT_KEY}</span>
        <span>Resource ID: {resourceId || 'n/a'}</span>
        <span>Consumer: {HOST_PRODUCT_KEY}</span>
        <span>Connector: enabled</span>
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Current Lives from Your Channel</div>
            <div className="text-xs text-muted-foreground">
              Pulled from the YouTube account connected in the admin panel. You can still add any other live URL manually.
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadCurrentLives()} disabled={!applicationId || loadingCurrentLives}>
            {loadingCurrentLives ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        {currentLivesError ? (
          <div className="text-xs text-muted-foreground">{currentLivesError}</div>
        ) : currentLives.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No active live broadcasts found for the connected host channel right now.
          </div>
        ) : (
          <div className="space-y-2">
            {currentLives.map((live) => (
              <div key={live.videoId} className="flex items-center justify-between gap-3 rounded-md border border-border/50 p-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{live.title || live.videoId}</div>
                  <div className="truncate text-xs text-muted-foreground">{live.watchUrl}</div>
                </div>
                <Button variant="secondary" size="sm" disabled={!effectiveQuizGameId} onClick={() => setVideoUrl(live.watchUrl)}>
                  Use URL
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {connectedStreams.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleStartAll}>
            <PlayCircle className="h-3.5 w-3.5" /> Start All
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleStopAll}>
            <StopCircle className="h-3.5 w-3.5" /> Stop All
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRefreshAll}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh All
          </Button>
        </div>
      )}

      {/* Stream List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {isLoadingStreams ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading streams...
          </div>
        ) : connectedStreams.length === 0 ? (
          <div className="text-center py-3 text-muted-foreground text-sm bg-muted/50 rounded-lg">
            No streams connected
          </div>
        ) : (
          connectedStreams.map((stream) => (
            <div
              key={stream.streamId || stream.videoId}
              className="rounded-lg border border-border bg-muted/50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${stream.isStopped ? 'bg-muted-foreground' : 'bg-emerald-500 animate-pulse'}`} />
                    <Badge variant="outline" className="text-[10px]">
                      {stream.isStopped ? 'paused' : 'running'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      mode: {stream.transformMode || 'unknown'}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">
                    {stream.title || stream.videoId}
                  </p>
                  <div className="mt-1 flex items-center gap-2 min-w-0">
                    <p className="font-mono text-xs truncate text-muted-foreground">{stream.videoId}</p>
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
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggleStream(stream.streamId || stream.videoId)}
                    title={stream.isStopped ? 'Resume' : 'Pause'}
                  >
                    {stream.isStopped ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRestartStream(stream.streamId || stream.videoId)}
                    title="Restart"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRevalidateStream(stream.streamId || stream.videoId)}
                    title="Revalidate"
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveStream(stream.streamId || stream.videoId)}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {stream.error ? (
                <p className="mt-2 truncate text-[11px] text-destructive">{stream.error}</p>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* Dummy Answers Section */}
      <Collapsible open={showDummySettings} onOpenChange={setShowDummySettings}>
        <div className="border-t border-border pt-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Dummy Answers (Testing)</span>
                {dummyEnabled && (
                  <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600">
                    <Zap className="h-3 w-3 mr-1" />
                    {answersPerMinute}/min
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={dummyEnabled}
                  onCheckedChange={handleDummyToggle}
                  onClick={(e) => e.stopPropagation()}
                />
                <Settings2 className={`h-4 w-4 transition-transform ${showDummySettings ? 'rotate-90' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-4 space-y-4">
            {/* Answers per minute */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Answers per minute</Label>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{answersPerMinute}</span>
              </div>
              <Slider
                value={[answersPerMinute]}
                onValueChange={([val]) => setAnswersPerMinute(val)}
                min={5}
                max={120}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5</span>
                <span>120</span>
              </div>
            </div>

            {/* Correct answer probability */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Correct answer %</Label>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{Math.round(correctProbability * 100)}%</span>
              </div>
              <Slider
                value={[correctProbability * 100]}
                onValueChange={([val]) => setCorrectProbability(val / 100)}
                min={10}
                max={90}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10%</span>
                <span>90%</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Generates simulated viewer answers for testing. Works alongside real YouTube answers.
            </p>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Game ID Footer */}
      {effectiveQuizGameId && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Game ID:</span>
            <button
              onClick={copyGameId}
              className="flex items-center gap-1 font-mono hover:text-foreground transition-colors"
            >
              <span className="truncate max-w-[180px]">{effectiveQuizGameId}</span>
              {copiedGameId ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
