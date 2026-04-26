import { getApiServerUrl, getAppMode } from '@/config/appMode';
import { ensureRemoteAppAccessSession, HOST_PRODUCT_KEY, getHostProductHeaders } from '@/config/hostProduct';
import { clearSharedAuthToken, disconnectSharedYouTubeConnection, ensureSharedAuthToken, getSharedAuthHeaders, refreshSharedAuthToken } from '@/lib/sharedAuth';

export interface YouTubeChatSenderSettings {
  enabled: boolean;
  retryCount: number;
  retryDelayMs: number;
  minIntervalMs: number;
  rateLimitCooldownMs: number;
  template: string;
  questionClosedTemplate: string;
  quizStartedTemplate: string;
  quizEndedTemplate: string;
  topScorersTemplate: string;
  prizeWinnersTemplate: string;
  powerplayStartedTemplate: string;
  powerplayEndedTemplate: string;
}

export interface YouTubeChatSenderStatus {
  success: boolean;
  productKey?: string;
  applicationId: string;
  requestedApplicationId?: string;
  resolvedApplicationId?: string;
  sessionAuthenticated?: boolean;
  sessionExpiresAt?: string | null;
  connected: boolean;
  channelId: string;
  channelTitle: string;
  channelHandle: string;
  expiresAt: string | null;
  scope: string;
  settings: YouTubeChatSenderSettings;
  activeStreams: number;
  totalStreams: number;
  targetStreams: Array<{
    streamId: string;
    title: string;
    channelTitle: string;
    status: string;
    chatEnabled: boolean;
    watchUrl: string;
    targetStatus: 'eligible' | 'inactive';
    targetReason: string;
    lastDelivery: {
      frontendQuizGameId: string;
      questionId: string;
      questionIndex: number | null;
      status: 'sent' | 'failed' | 'skipped' | string;
      attemptCount: number;
      sentAt: string | null;
      error: string;
    } | null;
  }>;
  oauthConfigured: boolean;
  lastError: string;
  error?: string;
}

export interface YouTubeCurrentLive {
  videoId: string;
  title: string;
  description: string;
  scheduledStartTime: string | null;
  actualStartTime: string | null;
  privacyStatus: string;
  lifeCycleStatus: string;
  watchUrl: string;
}

export interface YouTubeChatBroadcastResult {
  success: boolean;
  queued?: boolean;
  partialSuccess?: boolean;
  skipped?: boolean;
  reason?: string;
  messageText?: string;
  partCount?: number;
  sentCount?: number;
  failedCount?: number;
  results?: Array<{
    streamId: string;
    title?: string;
    channelTitle?: string;
    status: 'sent' | 'failed' | 'skipped';
    partCount?: number;
    attemptCount: number;
    liveChatId?: string;
    error?: string;
  }>;
  error?: string;
}

const getBaseUrl = () => getApiServerUrl().replace(/\/+$/, '');

const isEnabled = () => getAppMode() !== 'offline';

const ensureAccess = async () => {
  await ensureSharedAuthToken(60_000).catch(() => null);
  await ensureRemoteAppAccessSession(getBaseUrl());
};

const getAuthorizedHostHeaders = (headers?: HeadersInit): Headers => {
  return getSharedAuthHeaders(getHostProductHeaders(headers));
};

const isAuthResolutionError = (payload: unknown): boolean => {
  const error = String((payload as { error?: unknown })?.error || "").trim().toLowerCase();
  return (
    error === "auth_required" ||
    error === "app_access_required" ||
    error.includes("youtube host login is required") ||
    error.includes("shared auth service url or bearer token is missing") ||
    error.includes("invalid session user") ||
    error.includes("user not found")
  );
};

const fetchWithSharedAuthRetry = async (url: string, init: RequestInit = {}): Promise<Response> => {
  await ensureSharedAuthToken();
  let response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: getAuthorizedHostHeaders(init.headers),
  });
  if (response.status !== 401 && response.status !== 403) {
    return response;
  }

  const refreshed = await refreshSharedAuthToken();
  if (!refreshed) {
    return response;
  }

  response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: getAuthorizedHostHeaders(init.headers),
  });
  return response;
};

async function readJsonSafe(response: Response) {
  return response.json().catch(() => ({}));
}

const fetchJsonWithSharedAuthRetry = async <T>(
  url: string,
  init: RequestInit = {}
): Promise<T> => {
  let response = await fetchWithSharedAuthRetry(url, init);
  let payload = await readJsonSafe(response) as T;

  if (!response.ok || !isAuthResolutionError(payload)) {
    return payload;
  }

  const refreshed = await refreshSharedAuthToken();
  if (!refreshed) {
    return payload;
  }

  response = await fetchWithSharedAuthRetry(url, init);
  payload = await readJsonSafe(response) as T;
  return payload;
};

export async function getYouTubeChatSenderStatus(
  applicationId: string,
  options?: { resourceId?: string; tenantId?: string }
): Promise<YouTubeChatSenderStatus> {
  if (!isEnabled()) {
    return {
      success: false,
      applicationId,
      connected: false,
      channelId: '',
      channelTitle: '',
      channelHandle: '',
      expiresAt: null,
      scope: '',
      settings: {
        enabled: false,
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
      },
      activeStreams: 0,
      totalStreams: 0,
      targetStreams: [],
      oauthConfigured: false,
      lastError: 'offline_mode',
      error: 'Offline mode',
    };
  }
  const params = new URLSearchParams({ applicationId });
  if (options?.resourceId) params.set('resourceId', options.resourceId);
  if (options?.tenantId) params.set('tenantId', options.tenantId);
  await ensureAccess();
  return fetchJsonWithSharedAuthRetry<YouTubeChatSenderStatus>(
    `${getBaseUrl()}/api/youtube-host/status?${params.toString()}`
  );
}

export async function disconnectSharedYouTubeAuth(applicationId: string): Promise<{ success: boolean; error?: string }> {
  void applicationId;
  if (!isEnabled()) return { success: false, error: 'Offline mode' };
  return disconnectSharedYouTubeConnection();
}

export async function logoutSharedAuthSession(): Promise<{ success: boolean; error?: string }> {
  clearSharedAuthToken();
  return { success: true };
}

export async function getYouTubeCurrentLives(applicationId: string): Promise<{
  success: boolean;
  applicationId?: string;
  hostChannel?: {
    channelId: string;
    channelTitle: string;
    channelHandle: string;
  };
  currentLives?: YouTubeCurrentLive[];
  error?: string;
}> {
  if (!isEnabled()) return { success: false, error: 'Offline mode', currentLives: [] };
  await ensureAccess();
  return fetchJsonWithSharedAuthRetry<{
    success: boolean;
    applicationId?: string;
    hostChannel?: {
      channelId: string;
      channelTitle: string;
      channelHandle: string;
    };
    currentLives?: YouTubeCurrentLive[];
    error?: string;
  }>(
    `${getBaseUrl()}/api/youtube-host/current-lives?applicationId=${encodeURIComponent(applicationId)}`
  );
}

export async function updateYouTubeChatSenderSettings(applicationId: string, settings: Partial<YouTubeChatSenderSettings>) {
  if (!isEnabled()) return { success: false, error: 'Offline mode' };
  await ensureAccess();
  const response = await fetch(`${getBaseUrl()}/api/youtube-chat-sender/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthorizedHostHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ applicationId, productKey: HOST_PRODUCT_KEY, ...settings }),
  });
  return readJsonSafe(response);
}

export async function broadcastQuestionToYouTubeChat(payload: {
  applicationId: string;
  frontendQuizGameId: string;
  tenantId?: string;
  resourceId?: string;
  consumer?: string;
  questionId: string;
  questionIndex: number;
  questionText: string;
  options: string[];
  labels?: string[];
  openedAtServer: number;
}): Promise<YouTubeChatBroadcastResult> {
  if (!isEnabled()) return { success: false, error: 'Offline mode' };
  await ensureAccess();
  return fetchJsonWithSharedAuthRetry<YouTubeChatBroadcastResult>(`${getBaseUrl()}/api/youtube-chat-broadcast/question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, productKey: HOST_PRODUCT_KEY }),
  });
}

export async function broadcastEventToYouTubeChat(payload: {
  applicationId: string;
  frontendQuizGameId: string;
  tenantId?: string;
  resourceId?: string;
  consumer?: string;
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
}): Promise<YouTubeChatBroadcastResult> {
  if (!isEnabled()) return { success: false, error: 'Offline mode' };
  await ensureAccess();
  return fetchJsonWithSharedAuthRetry<YouTubeChatBroadcastResult>(`${getBaseUrl()}/api/youtube-chat-broadcast/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, productKey: HOST_PRODUCT_KEY }),
  });
}
