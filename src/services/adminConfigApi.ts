/**
 * Admin workspace configuration API.
 * Stores/retrieves the admin quiz settings as a JSON blob in the backend
 * using the QuizGameState endpoint with a well-known game ID.
 */

import { getQuizDomainApiBaseUrl, getAppMode } from '@/config/appMode';
import { ensureRemoteAppAccessSession, getAppAccessHeaders } from '@/config/hostProduct';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';

const CONFIG_GAME_ID_BASE = '__admin_workspace_config__';
const ADMIN_CONFIG_TIMEOUT_MS = 8000;

/**
 * Returns a per-channel sentinel game ID so each YouTube host channel gets
 * its own isolated config document in QuizGameState.  Falls back to the
 * base sentinel when no channel is available (e.g. offline mode, new user).
 */
const getConfigGameId = (hostChannelId?: string | null): string => {
  const ch = (hostChannelId || '').trim();
  return ch ? `${CONFIG_GAME_ID_BASE}:${ch}` : CONFIG_GAME_ID_BASE;
};

export interface AdminConfig {
  // Branding
  showTitle?: string;
  logoUrl?: string;
  channelName?: string;
  episodePrefix?: string;
  episodeNumber?: string;
  quizName?: string;
  partnerLogos?: string[];
  // Teams
  teamConfigs?: unknown[];
  // Scoring
  correctAnswerScore?: number;
  wrongAnswerPenalty?: number;
  lifelinePenalty?: number;
  teamLifelines?: number;
  // Question selection
  questionsPerCategory?: number;
  maxUsedCountThreshold?: number;
  shuffleQuestions?: boolean;
  // Timers
  timerDuration?: number;
  masterTimerDuration?: number;
  passedQuestionTimer?: number;
  revealCountdownDuration?: number;
  rapidFireDuration?: number;
  // UI flags
  showActivityFeed?: boolean;
  showDifficultyBadge?: boolean;
  showSaveIndicator?: boolean;
  showToastMessages?: boolean;
  showIntroAnimation?: boolean;
  maskViewerResponses?: boolean;
  youtubeIntegrationEnabled?: boolean;
  disableLivePanelDuringPowerplay?: boolean;
  showYouTubeAutoPostPanel?: boolean;
  showEngagementHeatmap?: boolean;
  showViewerPredictions?: boolean;
  powerplayEnabled?: boolean;
  quizAnalyticsEnabled?: boolean;
  // Ticker
  tickerEnabled?: boolean;
  tickerMessageRegular?: string;
  tickerMessagePowerplay?: string;
  // Display
  tvModeEnabled?: boolean;
  fixedLeaderboard?: boolean;
  showSequenceNumbers?: boolean;
  minimumCorrectScore?: number;
  // Topic settings (quiz active/inactive toggles)
  topicSettings?: Record<string, boolean>;
  // Host channel scope (written at save time so the DB document is channelId-scoped)
  quizHostChannelId?: string | null;
  quizHostChannelTitle?: string | null;
  quizHostChannelHandle?: string | null;
  // Timestamp
  savedAt?: number;
}

const getBaseUrl = (): string => {
  const baseUrl = getQuizDomainApiBaseUrl().replace(/\/+$/, '');
  if (!baseUrl) throw new Error('Backend unavailable');
  return baseUrl;
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = ADMIN_CONFIG_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (typeof input === 'string') {
      const target = new URL(input, window.location.origin);
      await ensureSharedAuthToken(60_000).catch(() => null);
      await ensureRemoteAppAccessSession(target.origin);
    }
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

/**
 * Load admin workspace config from the backend.
 * Pass hostChannelId so the lookup is scoped to the current host's channel.
 * Returns null if not found or offline.
 */
export const loadAdminConfig = async (
  applicationId: string,
  hostChannelId?: string | null
): Promise<AdminConfig | null> => {
  if (getAppMode() === 'offline' || !applicationId) return null;
  const configGameId = getConfigGameId(hostChannelId);
  try {
    const response = await fetchWithTimeout(
      `${getBaseUrl()}/api/quiz/state/${encodeURIComponent(applicationId)}/${encodeURIComponent(configGameId)}`,
      {
        credentials: 'include',
        cache: 'no-store',
        headers: getAppAccessHeaders(),
      }
    );
    // 404 = no admin config saved yet for this host (first-time user) — fall back to defaults silently.
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const json = await response.json().catch(() => ({}));
    return (json?.data?.state as AdminConfig) ?? (json?.state as AdminConfig) ?? null;
  } catch {
    return null;
  }
};

/**
 * Save admin workspace config to the backend.
 * hostChannelId scopes the document to the current host's channel so two
 * hosts sharing the same applicationId never overwrite each other's config.
 */
export const saveAdminConfig = async (
  applicationId: string,
  hostChannelId: string | null | undefined,
  config: AdminConfig
): Promise<boolean> => {
  if (getAppMode() === 'offline' || !applicationId) return false;
  const configGameId = getConfigGameId(hostChannelId);
  try {
    const response = await fetchWithTimeout(
      `${getBaseUrl()}/api/quiz/state/${encodeURIComponent(applicationId)}/${encodeURIComponent(configGameId)}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: getAppAccessHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          checkpointType: 'admin-workspace-config',
          // Include host channel fields at the payload level so replaceQuizState
          // picks them up via extractQuizHostChannel() and scopes the document.
          quizHostChannelId: config.quizHostChannelId || null,
          quizHostChannelTitle: config.quizHostChannelTitle || null,
          quizHostChannelHandle: config.quizHostChannelHandle || null,
          state: { ...config, savedAt: Date.now() },
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
};
