import { getApiServerUrl, getAppMode } from '@/config/appMode';
import { ensureRemoteAppAccessSession, HOST_PRODUCT_KEY, getHostProductHeaders } from '@/config/hostProduct';
import { readQuizHostChannel } from '@/lib/quizHostChannel';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';

export interface TelegramSenderSettings {
  enabled: boolean;
  botToken?: string;
  chatId: string;
  retryCount: number;
  retryDelayMs: number;
  minIntervalMs: number;
  rateLimitCooldownMs: number;
  mirrorDelayMs: number;
  template: string;
  questionClosedTemplate: string;
  quizStartedTemplate: string;
  quizEndedTemplate: string;
  topScorersTemplate: string;
  prizeWinnersTemplate: string;
  powerplayStartedTemplate: string;
  powerplayEndedTemplate: string;
}

export interface TelegramSenderStatus {
  success: boolean;
  applicationId: string;
  configured: boolean;
  botTokenConfigured: boolean;
  chatIdConfigured: boolean;
  chatIdPreview: string;
  settings: TelegramSenderSettings;
  latestDelivery: {
    frontendQuizGameId: string;
    questionId: string;
    questionIndex: number | null;
    status: 'sent' | 'failed' | 'skipped' | string;
    attemptCount: number;
    sentAt: string | null;
    error: string;
    chatId: string;
  } | null;
  lastError: string;
  error?: string;
}

export interface TelegramBroadcastResult {
  success: boolean;
  queued?: boolean;
  skipped?: boolean;
  reason?: string;
  messageText?: string;
  partCount?: number;
  status?: 'sent' | 'failed' | 'skipped' | string;
  attemptCount?: number;
  error?: string;
  chatId?: string;
}

const getBaseUrl = () => getApiServerUrl().replace(/\/+$/, '');
const isEnabled = () => getAppMode() !== 'offline';
const ensureAccess = async () => {
  await ensureSharedAuthToken(60_000).catch(() => null);
  await ensureRemoteAppAccessSession(getBaseUrl());
};
const getAuthorizedHeaders = (headers?: HeadersInit): Headers =>
  getHostProductHeaders(headers);
const getScopedHostChannelId = (): string => String(readQuizHostChannel().quizHostChannelId || '').trim();

async function readJsonSafe(response: Response) {
  return response.json().catch(() => ({}));
}

export async function getTelegramSenderStatus(applicationId: string): Promise<TelegramSenderStatus> {
  if (!isEnabled()) {
    return {
      success: false,
      applicationId,
      configured: false,
      botTokenConfigured: false,
      chatIdConfigured: false,
      chatIdPreview: '',
      settings: {
        enabled: false,
        chatId: '',
        retryCount: 0,
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
      },
      latestDelivery: null,
      lastError: 'offline_mode',
      error: 'Offline mode',
    };
  }
  await ensureAccess();
  const params = new URLSearchParams({ applicationId });
  const quizHostChannelId = getScopedHostChannelId();
  if (quizHostChannelId) params.set('quizHostChannelId', quizHostChannelId);
  const response = await fetch(`${getBaseUrl()}/api/telegram-sender/status?${params.toString()}`, {
    credentials: 'include',
    headers: getAuthorizedHeaders(),
  });
  return readJsonSafe(response);
}

export async function updateTelegramSenderSettings(applicationId: string, settings: Partial<TelegramSenderSettings> & { botToken?: string }) {
  if (!isEnabled()) return { success: false, error: 'Offline mode' };
  await ensureAccess();
  const response = await fetch(`${getBaseUrl()}/api/telegram-sender/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthorizedHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      applicationId,
      quizHostChannelId: getScopedHostChannelId() || null,
      productKey: HOST_PRODUCT_KEY,
      ...settings,
    }),
  });
  return readJsonSafe(response);
}

export async function sendTelegramTestMessage(payload: {
  applicationId: string;
  frontendQuizGameId?: string;
  messageText: string;
  messageLabel?: string;
}) {
  if (!isEnabled()) return { success: false, error: 'Offline mode' };
  await ensureAccess();
  const response = await fetch(`${getBaseUrl()}/api/telegram-broadcast/test`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthorizedHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...payload, quizHostChannelId: getScopedHostChannelId() || null, productKey: HOST_PRODUCT_KEY }),
  });
  return readJsonSafe(response);
}

export async function broadcastQuestionToTelegram(payload: {
  applicationId: string;
  frontendQuizGameId: string;
  questionId: string;
  questionIndex: number;
  questionText: string;
  options: string[];
  openedAtServer: number;
}): Promise<TelegramBroadcastResult> {
  if (!isEnabled()) return { success: false, error: 'Offline mode' };
  await ensureAccess();
  const response = await fetch(`${getBaseUrl()}/api/telegram-broadcast/question`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthorizedHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...payload, quizHostChannelId: getScopedHostChannelId() || null, productKey: HOST_PRODUCT_KEY }),
  });
  return readJsonSafe(response);
}

export async function broadcastEventToTelegram(payload: {
  applicationId: string;
  frontendQuizGameId: string;
  eventType:
    | 'quiz_started'
    | 'question_closed'
    | 'quiz_ended'
    | 'top_scorers'
    | 'prize_winners'
    | 'powerplay_started'
    | 'powerplay_ended';
  eventKey?: string;
  openedAtServer?: number;
  tokens?: Record<string, string | number | null | undefined>;
}): Promise<TelegramBroadcastResult> {
  if (!isEnabled()) return { success: false, error: 'Offline mode' };
  await ensureAccess();
  const response = await fetch(`${getBaseUrl()}/api/telegram-broadcast/event`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthorizedHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...payload, quizHostChannelId: getScopedHostChannelId() || null, productKey: HOST_PRODUCT_KEY }),
  });
  return readJsonSafe(response);
}
