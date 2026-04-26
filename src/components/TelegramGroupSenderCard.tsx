import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Loader2, Save, Copy, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { getAppMode } from '@/config/appMode';
import { useApp } from '@/context/AppContext';
import { useBranding } from '@/hooks/useBranding';
import {
  getTelegramSenderStatus,
  sendTelegramTestMessage,
  updateTelegramSenderSettings,
  type TelegramSenderStatus,
} from '@/services/telegramSenderApi';
import { readMirroredAdminSetting, readMirroredAdminSettingSync, writeMirroredAdminSetting } from '@/lib/adminConfigPersistence';

const TELEGRAM_SENDER_SETTINGS_KEY = 'telegramGroupSenderSettings';

const DEFAULT_TELEGRAM_SENDER_SETTINGS = {
  enabled: false,
  chatId: '',
  retryCount: 2,
  retryDelayMs: 1500,
  minIntervalMs: 1500,
  rateLimitCooldownMs: 15000,
  mirrorDelayMs: 5000,
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
  channelName: 'ThinMonk EduTech',
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

const LEGACY_QUIZ_STARTED_TEMPLATE =
  'Quiz started: {{quizTitle}}. Answer only in YouTube live chat with A, B, C, or D when each question appears.';
const CURRENT_QUIZ_STARTED_TEMPLATE =
  'Quiz started: {{quizTitle}}. Answers are accepted only in {{Channel Name}} YouTube Channel live chat with A, B, C, or D when each question appears.';

const normalizeQuizStartedTemplate = (template: string) =>
  [LEGACY_QUIZ_STARTED_TEMPLATE,
   'Quiz started: {{quizTitle}}. Answer are accepted only in {{Channel Name}} YouTube live chat with A, B, C, or D when each question appears.'
  ].includes(String(template || '').trim())
    ? CURRENT_QUIZ_STARTED_TEMPLATE
    : String(template || '');

const applyPreview = (
  template: string,
  overrides?: Partial<typeof SAMPLE_EVENT_TOKENS>
) =>
  String(template || '')
    .replace(/\{\{\s*questionIndex\s*\}\}/g, String(SAMPLE_QUESTION.questionIndex))
    .replace(/\{\{\s*questionText\s*\}\}/g, SAMPLE_QUESTION.questionText)
    .replace(/\{\{\s*optionA\s*\}\}/g, SAMPLE_QUESTION.optionA)
    .replace(/\{\{\s*optionB\s*\}\}/g, SAMPLE_QUESTION.optionB)
    .replace(/\{\{\s*optionC\s*\}\}/g, SAMPLE_QUESTION.optionC)
    .replace(/\{\{\s*optionD\s*\}\}/g, SAMPLE_QUESTION.optionD)
    .replace(/\{\{\s*quizTitle\s*\}\}/g, overrides?.quizTitle ?? SAMPLE_EVENT_TOKENS.quizTitle)
    .replace(/\{\{\s*channelName\s*\}\}/g, overrides?.channelName ?? SAMPLE_EVENT_TOKENS.channelName)
    .replace(/\{\{\s*Channel Name\s*\}\}/g, overrides?.channelName ?? SAMPLE_EVENT_TOKENS.channelName)
    .replace(/\{\{\s*teamName\s*\}\}/g, overrides?.teamName ?? SAMPLE_EVENT_TOKENS.teamName)
    .replace(/\{\{\s*top1Name\s*\}\}/g, overrides?.top1Name ?? SAMPLE_EVENT_TOKENS.top1Name)
    .replace(/\{\{\s*top1Score\s*\}\}/g, String(overrides?.top1Score ?? SAMPLE_EVENT_TOKENS.top1Score))
    .replace(/\{\{\s*top2Name\s*\}\}/g, overrides?.top2Name ?? SAMPLE_EVENT_TOKENS.top2Name)
    .replace(/\{\{\s*top2Score\s*\}\}/g, String(overrides?.top2Score ?? SAMPLE_EVENT_TOKENS.top2Score))
    .replace(/\{\{\s*top3Name\s*\}\}/g, overrides?.top3Name ?? SAMPLE_EVENT_TOKENS.top3Name)
    .replace(/\{\{\s*top3Score\s*\}\}/g, String(overrides?.top3Score ?? SAMPLE_EVENT_TOKENS.top3Score))
    .replace(/\{\{\s*prizeWinners\s*\}\}/g, overrides?.prizeWinners ?? SAMPLE_EVENT_TOKENS.prizeWinners);

export const TelegramGroupSenderCard = () => {
  const { applicationId, frontendQuizGameId } = useApp();
  const { branding, pageTitle } = useBranding();
  const cachedSettings = readMirroredAdminSettingSync(TELEGRAM_SENDER_SETTINGS_KEY, DEFAULT_TELEGRAM_SENDER_SETTINGS);
  const [status, setStatus] = useState<TelegramSenderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enabled, setEnabled] = useState(Boolean(cachedSettings.enabled));
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState(String(cachedSettings.chatId || ''));
  const [retryCount, setRetryCount] = useState(String(cachedSettings.retryCount ?? 2));
  const [retryDelayMs, setRetryDelayMs] = useState(String(cachedSettings.retryDelayMs ?? 1500));
  const [minIntervalMs, setMinIntervalMs] = useState(String(cachedSettings.minIntervalMs ?? 1500));
  const [rateLimitCooldownMs, setRateLimitCooldownMs] = useState(String(cachedSettings.rateLimitCooldownMs ?? 15000));
  const [mirrorDelayMs, setMirrorDelayMs] = useState(String(cachedSettings.mirrorDelayMs ?? 5000));
  const [template, setTemplate] = useState(String(cachedSettings.template || ''));
  const [questionClosedTemplate, setQuestionClosedTemplate] = useState(String(cachedSettings.questionClosedTemplate || ''));
  const [quizStartedTemplate, setQuizStartedTemplate] = useState(String(cachedSettings.quizStartedTemplate || ''));
  const [quizEndedTemplate, setQuizEndedTemplate] = useState(String(cachedSettings.quizEndedTemplate || ''));
  const [topScorersTemplate, setTopScorersTemplate] = useState(String(cachedSettings.topScorersTemplate || ''));
  const [prizeWinnersTemplate, setPrizeWinnersTemplate] = useState(String(cachedSettings.prizeWinnersTemplate || ''));
  const [powerplayStartedTemplate, setPowerplayStartedTemplate] = useState(String(cachedSettings.powerplayStartedTemplate || ''));
  const [powerplayEndedTemplate, setPowerplayEndedTemplate] = useState(String(cachedSettings.powerplayEndedTemplate || ''));

  const appMode = getAppMode();
  const isOffline = appMode === 'offline';

  useEffect(() => {
    void readMirroredAdminSetting(TELEGRAM_SENDER_SETTINGS_KEY, DEFAULT_TELEGRAM_SENDER_SETTINGS)
      .then((stored) => {
        setEnabled(Boolean(stored.enabled));
        setChatId(String(stored.chatId || ''));
        setRetryCount(String(stored.retryCount ?? 2));
        setRetryDelayMs(String(stored.retryDelayMs ?? 1500));
        setMinIntervalMs(String(stored.minIntervalMs ?? 1500));
        setRateLimitCooldownMs(String(stored.rateLimitCooldownMs ?? 15000));
        setMirrorDelayMs(String(stored.mirrorDelayMs ?? 5000));
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
        console.warn('Failed to hydrate Telegram sender settings cache', error);
      });
  }, []);

  const load = async () => {
    if (!applicationId || isOffline) return;
    setLoading(true);
    try {
      const next = await getTelegramSenderStatus(applicationId);
      setStatus(next);
      setEnabled(Boolean(next.settings?.enabled));
      setChatId(String(next.settings?.chatId || ''));
      setRetryCount(String(next.settings?.retryCount ?? 2));
      setRetryDelayMs(String(next.settings?.retryDelayMs ?? 1500));
      setMinIntervalMs(String(next.settings?.minIntervalMs ?? 1500));
      setRateLimitCooldownMs(String(next.settings?.rateLimitCooldownMs ?? 15000));
      setMirrorDelayMs(String(next.settings?.mirrorDelayMs ?? 5000));
      setTemplate(String(next.settings?.template || ''));
      setQuestionClosedTemplate(String(next.settings?.questionClosedTemplate || ''));
      setQuizStartedTemplate(normalizeQuizStartedTemplate(String(next.settings?.quizStartedTemplate || '')));
      setQuizEndedTemplate(String(next.settings?.quizEndedTemplate || ''));
      setTopScorersTemplate(String(next.settings?.topScorersTemplate || ''));
      setPrizeWinnersTemplate(String(next.settings?.prizeWinnersTemplate || ''));
      setPowerplayStartedTemplate(String(next.settings?.powerplayStartedTemplate || ''));
      setPowerplayEndedTemplate(String(next.settings?.powerplayEndedTemplate || ''));
      setBotToken('');
      await writeMirroredAdminSetting(TELEGRAM_SENDER_SETTINGS_KEY, {
        enabled: Boolean(next.settings?.enabled),
        chatId: String(next.settings?.chatId || ''),
        retryCount: Number(next.settings?.retryCount ?? 2),
        retryDelayMs: Number(next.settings?.retryDelayMs ?? 1500),
        minIntervalMs: Number(next.settings?.minIntervalMs ?? 1500),
        rateLimitCooldownMs: Number(next.settings?.rateLimitCooldownMs ?? 15000),
        mirrorDelayMs: Number(next.settings?.mirrorDelayMs ?? 5000),
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
      console.error('Failed to load Telegram sender status', error);
      toast.error('Failed to load Telegram sender status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [applicationId, isOffline]);

  const previews = useMemo(() => ({
    question: applyPreview(template, {
      quizTitle: pageTitle,
      channelName: branding.channelName,
    }),
    quizStarted: applyPreview(quizStartedTemplate, {
      quizTitle: pageTitle,
      channelName: branding.channelName,
    }),
    topScorers: applyPreview(topScorersTemplate, {
      quizTitle: pageTitle,
      channelName: branding.channelName,
    }),
  }), [template, quizStartedTemplate, topScorersTemplate, pageTitle, branding.channelName]);

  if (isOffline) return null;

  const handleSave = async () => {
    if (!applicationId) return;
    setSaving(true);
    try {
      const result = await updateTelegramSenderSettings(applicationId, {
        enabled,
        botToken: botToken.trim() || undefined,
        chatId,
        retryCount: Number(retryCount || 0),
        retryDelayMs: Number(retryDelayMs || 1500),
        minIntervalMs: Number(minIntervalMs || 1500),
        rateLimitCooldownMs: Number(rateLimitCooldownMs || 15000),
        mirrorDelayMs: Number(mirrorDelayMs || 5000),
        template,
        questionClosedTemplate,
        quizStartedTemplate: normalizeQuizStartedTemplate(quizStartedTemplate),
        quizEndedTemplate,
        topScorersTemplate,
        prizeWinnersTemplate,
        powerplayStartedTemplate,
        powerplayEndedTemplate,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to save Telegram sender settings');
        return;
      }
      setStatus(result);
      setBotToken('');
      await writeMirroredAdminSetting(TELEGRAM_SENDER_SETTINGS_KEY, {
        enabled,
        chatId,
        retryCount: Number(retryCount || 0),
        retryDelayMs: Number(retryDelayMs || 1500),
        minIntervalMs: Number(minIntervalMs || 1500),
        rateLimitCooldownMs: Number(rateLimitCooldownMs || 15000),
        mirrorDelayMs: Number(mirrorDelayMs || 5000),
        template,
        questionClosedTemplate,
        quizStartedTemplate: normalizeQuizStartedTemplate(quizStartedTemplate),
        quizEndedTemplate,
        topScorersTemplate,
        prizeWinnersTemplate,
        powerplayStartedTemplate,
        powerplayEndedTemplate,
      });
      toast.success('Telegram sender settings saved');
    } catch (error) {
      console.error('Failed to save Telegram sender settings', error);
      toast.error('Failed to save Telegram sender settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!applicationId) return;
    setTesting(true);
    try {
      const result = await sendTelegramTestMessage({
        applicationId,
        frontendQuizGameId: frontendQuizGameId || undefined,
        messageText: previews.question,
        messageLabel: 'Telegram Test',
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to queue Telegram test');
        return;
      }
      toast.success(`Telegram test queued${result.partCount ? ` (${result.partCount} part${result.partCount === 1 ? '' : 's'})` : ''}`);
      await load();
    } catch (error) {
      console.error('Failed to queue Telegram test', error);
      toast.error('Failed to queue Telegram test');
    } finally {
      setTesting(false);
    }
  };

  const handleCopyPreview = async () => {
    await navigator.clipboard.writeText(previews.question);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="border-sky-500/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-sky-500" />
          <CardTitle className="text-lg">Telegram Group Mirror</CardTitle>
          {status?.configured ? (
            <Badge className="bg-emerald-600 text-white">Configured</Badge>
          ) : (
            <Badge variant="secondary">Not Configured</Badge>
          )}
        </div>
        <CardDescription>
          Mirror the same quiz announcements into one Telegram group. Telegram is outbound-only; answers still count only from YouTube chat.
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
          <Button variant="outline" onClick={() => void handleTest()} disabled={testing || !status?.configured}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Test Message
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Bot Token</p>
            <p className="font-semibold">{status?.botTokenConfigured ? 'Configured' : 'Missing'}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Target Chat</p>
            <p className="font-semibold">{status?.chatIdConfigured ? chatId || `…${status?.chatIdPreview}` : 'Missing'}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Mirror Delay</p>
            <p className="font-semibold">{Number(mirrorDelayMs || 0)} ms</p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 text-sm">
          <p className="font-medium text-foreground">How to get the Telegram chat ID</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Create your bot with <span className="font-mono">@BotFather</span> and copy the bot token.</li>
            <li>Add the bot to your Telegram group and allow it to post messages.</li>
            <li>Send one message in that group after adding the bot.</li>
            <li>Open <span className="font-mono">https://api.telegram.org/bot&lt;YOUR_BOT_TOKEN&gt;/getUpdates</span> in the browser.</li>
            <li>Find the group entry and copy <span className="font-mono">message.chat.id</span>. Group chat IDs usually start with <span className="font-mono">-100</span>.</li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            If <span className="font-mono">getUpdates</span> is empty, send another message in the group and refresh once.
          </p>
        </div>

        {status?.latestDelivery ? (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  status.latestDelivery.status === 'sent'
                    ? 'default'
                    : status.latestDelivery.status === 'failed'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                Last delivery: {status.latestDelivery.status}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {status.latestDelivery.questionIndex !== null ? `Q${status.latestDelivery.questionIndex + 1}` : 'Event'}
              </span>
              {status.latestDelivery.sentAt ? (
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(status.latestDelivery.sentAt), { addSuffix: true })}
                </span>
              ) : null}
              <span className="text-[11px] text-muted-foreground">
                attempts: {status.latestDelivery.attemptCount}
              </span>
            </div>
            {status.latestDelivery.frontendQuizGameId ? (
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                run: {status.latestDelivery.frontendQuizGameId}
              </p>
            ) : null}
            {status.latestDelivery.error ? (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-300">{status.latestDelivery.error}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">No Telegram delivery attempts recorded yet.</p>
        )}

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="telegram-sender-enabled">Enable Telegram Mirror</Label>
            <p className="text-xs text-muted-foreground">Telegram messages are queued after YouTube using the mirror delay.</p>
          </div>
          <Switch id="telegram-sender-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telegram-bot-token">Bot Token</Label>
            <Input id="telegram-bot-token" type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder={status?.botTokenConfigured ? 'Configured - enter only to replace' : '123456:ABC...'} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-chat-id">Target Chat ID</Label>
            <Input id="telegram-chat-id" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-retry-count">Retry Count</Label>
            <Input id="telegram-retry-count" value={retryCount} onChange={(e) => setRetryCount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-retry-delay">Retry Delay (ms)</Label>
            <Input id="telegram-retry-delay" value={retryDelayMs} onChange={(e) => setRetryDelayMs(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-min-interval">Min Gap Between Posts (ms)</Label>
            <Input id="telegram-min-interval" value={minIntervalMs} onChange={(e) => setMinIntervalMs(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-rate-cooldown">Rate Limit Cooldown (ms)</Label>
            <Input id="telegram-rate-cooldown" value={rateLimitCooldownMs} onChange={(e) => setRateLimitCooldownMs(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-mirror-delay">Mirror Delay After YouTube (ms)</Label>
            <Input id="telegram-mirror-delay" value={mirrorDelayMs} onChange={(e) => setMirrorDelayMs(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="telegram-template">Question Template</Label>
          <Textarea id="telegram-template" rows={6} value={template} onChange={(e) => setTemplate(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Placeholders: {'{{questionIndex}}'}, {'{{questionText}}'}, {'{{optionA}}'}, {'{{optionB}}'}, {'{{optionC}}'}, {'{{optionD}}'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telegram-question-closed-template">Question Closed Template</Label>
            <Textarea id="telegram-question-closed-template" rows={3} value={questionClosedTemplate} onChange={(e) => setQuestionClosedTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-quiz-started-template">Quiz Started Template</Label>
            <Textarea id="telegram-quiz-started-template" rows={3} value={quizStartedTemplate} onChange={(e) => setQuizStartedTemplate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Placeholders: {'{{quizTitle}}'}, {'{{Channel Name}}'}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-powerplay-started-template">Power Play Started Template</Label>
            <Textarea id="telegram-powerplay-started-template" rows={3} value={powerplayStartedTemplate} onChange={(e) => setPowerplayStartedTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-powerplay-ended-template">Power Play Ended Template</Label>
            <Textarea id="telegram-powerplay-ended-template" rows={3} value={powerplayEndedTemplate} onChange={(e) => setPowerplayEndedTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-quiz-ended-template">Quiz Ended Template</Label>
            <Textarea id="telegram-quiz-ended-template" rows={3} value={quizEndedTemplate} onChange={(e) => setQuizEndedTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-top-scorers-template">Top Scorers Template</Label>
            <Textarea id="telegram-top-scorers-template" rows={3} value={topScorersTemplate} onChange={(e) => setTopScorersTemplate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-prize-winners-template">Prize Winners Template</Label>
            <Textarea id="telegram-prize-winners-template" rows={3} value={prizeWinnersTemplate} onChange={(e) => setPrizeWinnersTemplate(e.target.value)} />
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

        <Button onClick={() => void handleSave()} disabled={saving || !applicationId}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Telegram Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default TelegramGroupSenderCard;
