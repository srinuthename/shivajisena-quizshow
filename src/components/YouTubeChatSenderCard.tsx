import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Radio, Loader2, Link2, Unlink, Save, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getAppMode } from '@/config/appMode';
import { useApp } from '@/context/AppContext';
import {
  disconnectSharedYouTubeAuth,
  getYouTubeCurrentLives,
  getYouTubeChatSenderStatus,
  updateYouTubeChatSenderSettings,
  type YouTubeCurrentLive,
  type YouTubeChatSenderStatus,
} from '@/services/youtubeChatSenderApi';
import { readMirroredAdminSetting, readMirroredAdminSettingSync, writeMirroredAdminSetting } from '@/lib/adminConfigPersistence';
import { buildQuizAuthStartUrl } from '@/lib/sharedAuth';
import { readQuizHostChannel, saveQuizHostChannel } from '@/lib/quizHostChannel';

const YOUTUBE_SENDER_SETTINGS_KEY = 'youtubeChatSenderSettings';

const DEFAULT_YOUTUBE_SENDER_SETTINGS = {
  enabled: true,
  retryCount: 0,
  retryDelayMs: 1500,
  minIntervalMs: 5000,
  rateLimitCooldownMs: 30000,
  template: '',
  questionClosedTemplate: '',
  quizStartedTemplate: '',
  quizEndedTemplate: '',
  topScorersTemplate: '',
  prizeWinnersTemplate: '',
  powerplayStartedTemplate: '',
  powerplayEndedTemplate: '',
};

const SAMPLE_QUESTION = {
  questionIndex: 7,
  questionText: 'Who built the ark?',
  optionA: 'Noah',
  optionB: 'Moses',
  optionC: 'David',
  optionD: 'Abraham',
};

const SAMPLE_EVENT_TOKENS = {
  quizTitle: 'Bible Quiz Night',
  questionIndex: 7,
  teamName: '#East',
  top1Name: 'Viewer One',
  top1Score: 980,
  top2Name: 'Viewer Two',
  top2Score: 940,
  top3Name: 'Viewer Three',
  top3Score: 910,
  prizeWinners: '🏆1 Viewer One | 🏆2 Viewer Two | 🏆3 Viewer Three',
};

const LEGACY_QUESTION_CLOSED_TEMPLATE =
  'Question {{questionIndex}} is now closed for answers. Please wait for the answer reveal.';
const CURRENT_QUESTION_CLOSED_TEMPLATE =
  'Question {{questionIndex}} is now closed for answers.';
const LEGACY_QUESTION_TEMPLATE =
  'Q{{questionIndex}}: {{questionText}}\\nA) {{optionA}}\\nB) {{optionB}}\\nC) {{optionC}}\\nD) {{optionD}}\\nAnswer only in YouTube live chat with A, B, C, or D.';
const CURRENT_QUESTION_TEMPLATE =
  'Q{{questionIndex}}: {{questionText}}\\nA) {{optionA}}\\nB) {{optionB}}\\nC) {{optionC}}\\nD) {{optionD}}\\nAnswer in YouTube live chat with A, B, C, or D only.';

const normalizeQuestionClosedTemplate = (template: string) =>
  String(template || '').trim() === LEGACY_QUESTION_CLOSED_TEMPLATE
    ? CURRENT_QUESTION_CLOSED_TEMPLATE
    : String(template || '');

const normalizeQuestionTemplate = (template: string) =>
  String(template || '').trim() === LEGACY_QUESTION_TEMPLATE
    ? CURRENT_QUESTION_TEMPLATE
    : String(template || '');

const applyPreview = (template: string) =>
  String(template || '')
    .replace(/\{\{\s*questionIndex\s*\}\}/g, String(SAMPLE_QUESTION.questionIndex))
    .replace(/\{\{\s*questionText\s*\}\}/g, SAMPLE_QUESTION.questionText)
    .replace(/\{\{\s*optionA\s*\}\}/g, SAMPLE_QUESTION.optionA)
    .replace(/\{\{\s*optionB\s*\}\}/g, SAMPLE_QUESTION.optionB)
    .replace(/\{\{\s*optionC\s*\}\}/g, SAMPLE_QUESTION.optionC)
    .replace(/\{\{\s*optionD\s*\}\}/g, SAMPLE_QUESTION.optionD)
    .replace(/\{\{\s*quizTitle\s*\}\}/g, SAMPLE_EVENT_TOKENS.quizTitle)
    .replace(/\{\{\s*teamName\s*\}\}/g, SAMPLE_EVENT_TOKENS.teamName)
    .replace(/\{\{\s*top1Name\s*\}\}/g, SAMPLE_EVENT_TOKENS.top1Name)
    .replace(/\{\{\s*top1Score\s*\}\}/g, String(SAMPLE_EVENT_TOKENS.top1Score))
    .replace(/\{\{\s*top2Name\s*\}\}/g, SAMPLE_EVENT_TOKENS.top2Name)
    .replace(/\{\{\s*top2Score\s*\}\}/g, String(SAMPLE_EVENT_TOKENS.top2Score))
    .replace(/\{\{\s*top3Name\s*\}\}/g, SAMPLE_EVENT_TOKENS.top3Name)
    .replace(/\{\{\s*top3Score\s*\}\}/g, String(SAMPLE_EVENT_TOKENS.top3Score))
    .replace(/\{\{\s*prizeWinners\s*\}\}/g, SAMPLE_EVENT_TOKENS.prizeWinners);

export const YouTubeChatSenderCard = () => {
  const { applicationId, frontendQuizGameId } = useApp();
  const cachedSettings = readMirroredAdminSettingSync(YOUTUBE_SENDER_SETTINGS_KEY, DEFAULT_YOUTUBE_SENDER_SETTINGS);
  const [status, setStatus] = useState<YouTubeChatSenderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [fetchingLives, setFetchingLives] = useState(false);
  const [currentLives, setCurrentLives] = useState<YouTubeCurrentLive[]>([]);
  const [currentLivesError, setCurrentLivesError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(Boolean(cachedSettings.enabled));
  const [retryCount, setRetryCount] = useState(String(cachedSettings.retryCount ?? 0));
  const [retryDelayMs, setRetryDelayMs] = useState(String(cachedSettings.retryDelayMs ?? 1500));
  const [minIntervalMs, setMinIntervalMs] = useState(String(cachedSettings.minIntervalMs ?? 5000));
  const [rateLimitCooldownMs, setRateLimitCooldownMs] = useState(String(cachedSettings.rateLimitCooldownMs ?? 30000));
  const [template, setTemplate] = useState(String(cachedSettings.template || ''));
  const [questionClosedTemplate, setQuestionClosedTemplate] = useState(String(cachedSettings.questionClosedTemplate || ''));
  const [quizStartedTemplate, setQuizStartedTemplate] = useState(String(cachedSettings.quizStartedTemplate || ''));
  const [quizEndedTemplate, setQuizEndedTemplate] = useState(String(cachedSettings.quizEndedTemplate || ''));
  const [topScorersTemplate, setTopScorersTemplate] = useState(String(cachedSettings.topScorersTemplate || ''));
  const [prizeWinnersTemplate, setPrizeWinnersTemplate] = useState(String(cachedSettings.prizeWinnersTemplate || ''));
  const [powerplayStartedTemplate, setPowerplayStartedTemplate] = useState(String(cachedSettings.powerplayStartedTemplate || ''));
  const [powerplayEndedTemplate, setPowerplayEndedTemplate] = useState(String(cachedSettings.powerplayEndedTemplate || ''));
  const [copied, setCopied] = useState(false);

  const appMode = getAppMode();
  const isOffline = appMode === 'offline';

  useEffect(() => {
    void readMirroredAdminSetting(YOUTUBE_SENDER_SETTINGS_KEY, DEFAULT_YOUTUBE_SENDER_SETTINGS)
      .then((stored) => {
        setEnabled(Boolean(stored.enabled));
        setRetryCount(String(stored.retryCount ?? 0));
        setRetryDelayMs(String(stored.retryDelayMs ?? 1500));
        setMinIntervalMs(String(stored.minIntervalMs ?? 5000));
        setRateLimitCooldownMs(String(stored.rateLimitCooldownMs ?? 30000));
        setTemplate(String(stored.template || ''));
        setQuestionClosedTemplate(String(stored.questionClosedTemplate || ''));
        setQuizStartedTemplate(String(stored.quizStartedTemplate || ''));
        setQuizEndedTemplate(String(stored.quizEndedTemplate || ''));
        setTopScorersTemplate(String(stored.topScorersTemplate || ''));
        setPrizeWinnersTemplate(String(stored.prizeWinnersTemplate || ''));
        setPowerplayStartedTemplate(String(stored.powerplayStartedTemplate || ''));
        setPowerplayEndedTemplate(String(stored.powerplayEndedTemplate || ''));
      })
      .catch((error) => {
        console.warn('Failed to hydrate YouTube sender settings cache', error);
      });
  }, []);

  const load = async () => {
    if (!applicationId || isOffline) return;
    setLoading(true);
    try {
      const next = await getYouTubeChatSenderStatus(applicationId);
      setStatus(next);
      setEnabled(Boolean(next.settings?.enabled ?? true));
      setRetryCount(String(next.settings?.retryCount ?? 0));
      setRetryDelayMs(String(next.settings?.retryDelayMs ?? 1500));
      setMinIntervalMs(String(next.settings?.minIntervalMs ?? 5000));
      setRateLimitCooldownMs(String(next.settings?.rateLimitCooldownMs ?? 30000));
      setTemplate(normalizeQuestionTemplate(String(next.settings?.template || '')));
      setQuestionClosedTemplate(normalizeQuestionClosedTemplate(String(next.settings?.questionClosedTemplate || '')));
      setQuizStartedTemplate(String(next.settings?.quizStartedTemplate || ''));
      setQuizEndedTemplate(String(next.settings?.quizEndedTemplate || ''));
      setTopScorersTemplate(String(next.settings?.topScorersTemplate || ''));
      setPrizeWinnersTemplate(String(next.settings?.prizeWinnersTemplate || ''));
      setPowerplayStartedTemplate(String(next.settings?.powerplayStartedTemplate || ''));
      setPowerplayEndedTemplate(String(next.settings?.powerplayEndedTemplate || ''));
      await writeMirroredAdminSetting(YOUTUBE_SENDER_SETTINGS_KEY, {
        enabled: Boolean(next.settings?.enabled ?? true),
        retryCount: Number(next.settings?.retryCount ?? 0),
        retryDelayMs: Number(next.settings?.retryDelayMs ?? 1500),
        minIntervalMs: Number(next.settings?.minIntervalMs ?? 5000),
        rateLimitCooldownMs: Number(next.settings?.rateLimitCooldownMs ?? 30000),
        template: String(next.settings?.template || ''),
        questionClosedTemplate: String(next.settings?.questionClosedTemplate || ''),
        quizStartedTemplate: String(next.settings?.quizStartedTemplate || ''),
        quizEndedTemplate: String(next.settings?.quizEndedTemplate || ''),
        topScorersTemplate: String(next.settings?.topScorersTemplate || ''),
        prizeWinnersTemplate: String(next.settings?.prizeWinnersTemplate || ''),
        powerplayStartedTemplate: String(next.settings?.powerplayStartedTemplate || ''),
        powerplayEndedTemplate: String(next.settings?.powerplayEndedTemplate || ''),
      });
    } catch (error) {
      console.error('Failed to load YouTube chat sender status', error);
      toast.error('Failed to load YouTube chat sender status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [applicationId, isOffline]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'shared-auth-complete') {
        // Give backend time to update session with YouTube auth
        // Use longer delays to ensure database sync completes
        setTimeout(() => void load(), 1000);
        // Also retry after additional time to handle any async delays
        setTimeout(() => void load(), 2500);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [applicationId, isOffline]);

  const previews = useMemo(() => ({
    question: applyPreview(template),
    questionClosed: applyPreview(questionClosedTemplate),
    quizStarted: applyPreview(quizStartedTemplate),
    quizEnded: applyPreview(quizEndedTemplate),
    topScorers: applyPreview(topScorersTemplate),
    prizeWinners: applyPreview(prizeWinnersTemplate),
    powerplayStarted: applyPreview(powerplayStartedTemplate),
    powerplayEnded: applyPreview(powerplayEndedTemplate),
  }), [
    template,
    questionClosedTemplate,
    quizStartedTemplate,
    quizEndedTemplate,
    topScorersTemplate,
    prizeWinnersTemplate,
    powerplayStartedTemplate,
    powerplayEndedTemplate,
  ]);

  if (isOffline) return null;

  const handleConnect = async () => {
    if (!applicationId) return;
    setConnecting(true);
    try {
      const authUrl = buildQuizAuthStartUrl('/admin?workspace=backup');
      window.open(authUrl, 'shared-auth', 'width=720,height=780');
      toast.success('YouTube sign-in window opened');
    } catch (error) {
      console.error('Failed to start YouTube OAuth', error);
      toast.error('Failed to start YouTube OAuth');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!applicationId) return;
    try {
      const result = await disconnectSharedYouTubeAuth(applicationId);
      if (!result.success) {
        toast.error(result.error || 'Failed to disconnect YouTube account');
        return;
      }
      saveQuizHostChannel(null);
      setStatus((prev) => prev ? {
        ...prev,
        connected: false,
        channelId: '',
        channelTitle: '',
        channelHandle: '',
        sessionAuthenticated: false,
      } : prev);
      toast.success('YouTube account disconnected');
      await load();
    } catch (error) {
      console.error('Failed to disconnect YouTube account', error);
      toast.error('Failed to disconnect YouTube account');
    }
  };

  const handleSave = async () => {
    if (!applicationId) return;
    setSaving(true);
    try {
      const result = await updateYouTubeChatSenderSettings(applicationId, {
        enabled,
        retryCount: Number(retryCount || 0),
        retryDelayMs: Number(retryDelayMs || 1500),
        minIntervalMs: Number(minIntervalMs || 5000),
        rateLimitCooldownMs: Number(rateLimitCooldownMs || 30000),
        template: normalizeQuestionTemplate(template),
        questionClosedTemplate: normalizeQuestionClosedTemplate(questionClosedTemplate),
        quizStartedTemplate,
        quizEndedTemplate,
        topScorersTemplate,
        prizeWinnersTemplate,
        powerplayStartedTemplate,
        powerplayEndedTemplate,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to save YouTube chat sender settings');
        return;
      }
      await writeMirroredAdminSetting(YOUTUBE_SENDER_SETTINGS_KEY, {
        enabled,
        retryCount: Number(retryCount || 0),
        retryDelayMs: Number(retryDelayMs || 1500),
        minIntervalMs: Number(minIntervalMs || 5000),
        rateLimitCooldownMs: Number(rateLimitCooldownMs || 30000),
        template: normalizeQuestionTemplate(template),
        questionClosedTemplate: normalizeQuestionClosedTemplate(questionClosedTemplate),
        quizStartedTemplate,
        quizEndedTemplate,
        topScorersTemplate,
        prizeWinnersTemplate,
        powerplayStartedTemplate,
        powerplayEndedTemplate,
      });
      toast.success('YouTube chat sender settings saved');
      setStatus(result);
    } catch (error) {
      console.error('Failed to save YouTube chat sender settings', error);
      toast.error('Failed to save YouTube chat sender settings');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchCurrentLives = async () => {
    if (!applicationId) return;
    setFetchingLives(true);
    setCurrentLivesError(null);
    try {
      const result = await getYouTubeCurrentLives(applicationId);
      if (!result.success) {
        setCurrentLives([]);
        setCurrentLivesError(result.error || 'Connect your YouTube host channel to load current lives.');
        return;
      }
      setCurrentLives(result.currentLives || []);
    } catch (error) {
      console.error('Failed to load current lives', error);
      setCurrentLives([]);
      setCurrentLivesError('Failed to load current lives from the connected YouTube channel.');
    } finally {
      setFetchingLives(false);
    }
  };

  const handleCopyPreview = async () => {
    await navigator.clipboard.writeText(previews.question);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const cachedHostChannel = readQuizHostChannel();
  const connected = Boolean(status?.connected || cachedHostChannel.quizHostChannelId);
  const channelTitle = status?.channelTitle || cachedHostChannel.quizHostChannelTitle || '—';
  const channelId = status?.channelId || cachedHostChannel.quizHostChannelId || '';

  return (
    <Card className="border-rose-500/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-rose-500" />
          <CardTitle className="text-lg">YouTube Chat Auto-Post</CardTitle>
          {connected ? (
            <Badge className="bg-emerald-600 text-white">Connected</Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )}
        </div>
        <CardDescription>
          Backup outbound flow for posting quiz prompts into YouTube live chat. The main quiz run still depends on the primary live stream setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!frontendQuizGameId ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
            No active quiz run. A new run ID will be created when you click <strong>Start Quiz</strong>.
          </div>
        ) : null}

        {status?.lastError ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{status.lastError}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Refresh Status
          </Button>
          <Button variant="outline" onClick={() => void handleFetchCurrentLives()} disabled={fetchingLives || !connected}>
            {fetchingLives ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
            Fetch Current Lives
          </Button>
          {connected ? (
            <Button variant="destructive" onClick={handleDisconnect}>
              <Unlink className="mr-2 h-4 w-4" />
              Disconnect YouTube
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={connecting || !status?.oauthConfigured}>
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Connect YouTube
            </Button>
          )}
          {!status?.oauthConfigured ? (
            <Badge variant="outline">Missing shared auth service config</Badge>
          ) : null}
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <Label>Current Lives (Connected Channel)</Label>
          {currentLivesError ? (
            <div className="text-xs text-muted-foreground">{currentLivesError}</div>
          ) : currentLives.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No live broadcasts loaded yet. Click <strong>Fetch Current Lives</strong>.
            </div>
          ) : (
            <div className="space-y-2">
              {currentLives.map((live) => (
                <div key={live.videoId} className="rounded-md border bg-background/80 p-2">
                  <p className="truncate text-sm font-medium">{live.title || live.videoId}</p>
                  <p className="text-[11px] text-muted-foreground">{live.lifeCycleStatus || 'unknown'} · {live.privacyStatus || 'unknown'}</p>
                  {live.watchUrl ? (
                    <a href={live.watchUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline-offset-4 hover:underline">
                      Open Live
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Connected Channel</p>
            <p className="font-semibold">{channelTitle}</p>
            {channelId ? (
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{channelId}</p>
            ) : null}
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Active Streams</p>
            <p className="font-semibold">{status?.activeStreams ?? 0} / {status?.totalStreams ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Granted Scope</p>
            <p className="truncate text-sm font-medium">{status?.scope || '—'}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div>
            <Label>Expected Posting Targets</Label>
            <p className="text-xs text-muted-foreground">
              We post as the connected YouTube account. Streams marked eligible are the ones we will attempt; YouTube still decides final chat permission for that account.
            </p>
          </div>
          <div className="space-y-2">
            {(status?.targetStreams || []).length === 0 ? (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                No streams are configured yet.
              </div>
            ) : (
              status!.targetStreams.map((stream) => (
                <div key={stream.streamId} className="rounded-md border bg-background/80 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{stream.title || stream.streamId}</p>
                      <p className="text-xs text-muted-foreground">
                        {stream.channelTitle || 'Unknown channel'} · {stream.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={stream.targetStatus === 'eligible' ? 'default' : 'secondary'}>
                        {stream.targetStatus === 'eligible' ? 'Will Attempt' : 'Not Targeted'}
                      </Badge>
                      {stream.watchUrl ? (
                        <a
                          href={stream.watchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline-offset-4 hover:underline"
                        >
                          Open Stream
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{stream.targetReason}</p>
                  {stream.lastDelivery ? (
                    <div className="mt-3 rounded-md border bg-muted/30 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            stream.lastDelivery.status === 'sent'
                              ? 'default'
                              : stream.lastDelivery.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          Last delivery: {stream.lastDelivery.status}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {stream.lastDelivery.questionIndex !== null ? `Q${stream.lastDelivery.questionIndex + 1}` : 'Question unknown'}
                        </span>
                        {stream.lastDelivery.sentAt ? (
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(stream.lastDelivery.sentAt), { addSuffix: true })}
                          </span>
                        ) : null}
                        <span className="text-[11px] text-muted-foreground">
                          attempts: {stream.lastDelivery.attemptCount}
                        </span>
                      </div>
                      {stream.lastDelivery.frontendQuizGameId ? (
                        <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                          run: {stream.lastDelivery.frontendQuizGameId}
                        </p>
                      ) : null}
                      {stream.lastDelivery.error ? (
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-300">{stream.lastDelivery.error}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-muted-foreground">No delivery attempts recorded yet for this stream.</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="youtube-chat-sender-enabled">Enable YouTube Auto-Post</Label>
            <p className="text-xs text-muted-foreground">When enabled, question and event posts are sent to the active stream targets configured in the primary live integration section.</p>
          </div>
          <Switch id="youtube-chat-sender-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-retry-count">Retry Count</Label>
            <Input id="youtube-chat-retry-count" value={retryCount} onChange={(e) => setRetryCount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-retry-delay">Retry Delay (ms)</Label>
            <Input id="youtube-chat-retry-delay" value={retryDelayMs} onChange={(e) => setRetryDelayMs(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-min-interval">Min Gap Between Posts (ms)</Label>
            <Input id="youtube-chat-min-interval" value={minIntervalMs} onChange={(e) => setMinIntervalMs(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-rate-cooldown">Rate Limit Cooldown (ms)</Label>
            <Input id="youtube-chat-rate-cooldown" value={rateLimitCooldownMs} onChange={(e) => setRateLimitCooldownMs(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Messages are paced globally across all active streams. If YouTube signals a rate limit, the sender pauses for the cooldown before continuing queued parts.
        </p>

        <div className="space-y-2">
          <Label htmlFor="youtube-chat-template">Message Template</Label>
          <Textarea
            id="youtube-chat-template"
            rows={6}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Placeholders: {'{{questionIndex}}'}, {'{{questionText}}'}, {'{{optionA}}'}, {'{{optionB}}'}, {'{{optionC}}'}, {'{{optionD}}'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-question-closed-template">Question Closed Template</Label>
            <Textarea id="youtube-chat-question-closed-template" rows={3} value={questionClosedTemplate} onChange={(e) => setQuestionClosedTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-quiz-started-template">Quiz Started Template</Label>
            <Textarea id="youtube-chat-quiz-started-template" rows={3} value={quizStartedTemplate} onChange={(e) => setQuizStartedTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-powerplay-started-template">Power Play Started Template</Label>
            <Textarea id="youtube-chat-powerplay-started-template" rows={3} value={powerplayStartedTemplate} onChange={(e) => setPowerplayStartedTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-powerplay-ended-template">Power Play Ended Template</Label>
            <Textarea id="youtube-chat-powerplay-ended-template" rows={3} value={powerplayEndedTemplate} onChange={(e) => setPowerplayEndedTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-quiz-ended-template">Quiz Ended Template</Label>
            <Textarea id="youtube-chat-quiz-ended-template" rows={3} value={quizEndedTemplate} onChange={(e) => setQuizEndedTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-top-scorers-template">Top Scorers Template</Label>
            <Textarea id="youtube-chat-top-scorers-template" rows={3} value={topScorersTemplate} onChange={(e) => setTopScorersTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube-chat-prize-winners-template">Prize Winners Template</Label>
            <Textarea id="youtube-chat-prize-winners-template" rows={3} value={prizeWinnersTemplate} onChange={(e) => setPrizeWinnersTemplate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Preview</Label>
            <Button variant="outline" size="sm" onClick={handleCopyPreview}>
              {copied ? <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> : <Copy className="mr-2 h-4 w-4" />}
              Copy Preview
            </Button>
          </div>
          <div className="space-y-2">
            <pre className="whitespace-pre-wrap break-words rounded-md bg-background p-3 text-xs">{previews.question}</pre>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-background p-3 text-xs">{previews.quizStarted}</pre>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-background p-3 text-xs">{previews.topScorers}</pre>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || !applicationId}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Sender Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default YouTubeChatSenderCard;
