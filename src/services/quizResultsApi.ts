// Quiz Results API Service
// Browser storage remains the source of truth for host config and runtime
// recovery in frontend_scoring. Backend quiz routes are used for run-scoped
// audit/history data and narrow same-run fallback reads only.

import { getQuizDomainApiBaseUrl, getAppMode } from '@/config/appMode';
import { ensureRemoteAppAccessSession, getAppAccessHeaders } from '@/config/hostProduct';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';
import {
  SaveQuizResultsPayload,
  SaveQuizResultsResponse,
  PanelLeaderboardPayload,
  LiveLeaderboardPayload,
} from '@/types/quizResults';

const resolveFrontendQuizGameId = (payload: unknown): string => {
  const source = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};
  const episode = (source.episode && typeof source.episode === 'object')
    ? source.episode as Record<string, unknown>
    : {};
  return String(
    episode.frontendQuizGameId ||
      episode.runId ||
      source.frontendQuizGameId ||
      source.runId ||
      ''
  ).trim();
};

const normalizeLeaderboardPayload = <T extends PanelLeaderboardPayload | LiveLeaderboardPayload>(payload: T): T => {
  const frontendQuizGameId = resolveFrontendQuizGameId(payload);
  if (!frontendQuizGameId) return payload;
  return {
    ...payload,
    frontendQuizGameId,
    runId: frontendQuizGameId,
    episode: {
      ...payload.episode,
      frontendQuizGameId,
      runId: frontendQuizGameId,
    },
  } as T;
};

const normalizeSavePayload = (payload: SaveQuizResultsPayload): SaveQuizResultsPayload => ({
  panelLeaderboard: normalizeLeaderboardPayload(payload.panelLeaderboard),
  liveLeaderboard: normalizeLeaderboardPayload(payload.liveLeaderboard),
});

// Use the explicitly configured SSE base URL, or fall back to API server URL
const getBaseUrl = (): string => {
  if (getAppMode() === 'offline') {
    throw new Error('Offline mode');
  }
  const baseUrl = getQuizDomainApiBaseUrl().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Backend unavailable');
  }
  return baseUrl;
};

const getAuthorizedHeaders = (headers?: HeadersInit): Headers =>
  getAppAccessHeaders(headers);

const ensureAuthorizedBase = async (): Promise<string> => {
  const baseUrl = getBaseUrl();
  // Keep quiz-result writes on the same bearer-token path as other protected APIs.
  await ensureSharedAuthToken(60_000).catch(() => null);
  await ensureRemoteAppAccessSession(baseUrl);
  return baseUrl;
};

const postQuizResultsOnce = async (
  payload: SaveQuizResultsPayload
): Promise<SaveQuizResultsResponse> => {
  const normalizedPayload = normalizeSavePayload(payload);
  const baseUrl = await ensureAuthorizedBase();
  const response = await fetch(`${baseUrl}/api/quiz-results/save`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthorizedHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(normalizedPayload),
  });
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  const data = await response.json().catch(() => ({}));
  if (!data || typeof data.success !== 'boolean') {
    return { success: false, error: 'Invalid response' };
  }
  return data as SaveQuizResultsResponse;
};

const postQuizResultsWithRetry = async (
  payload: SaveQuizResultsPayload,
  attempts = 3
): Promise<SaveQuizResultsResponse> => {
  let lastError = 'Unknown error';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await postQuizResultsOnce(payload);
      if (result.success) return result;
      lastError = result.error || result.message || `Attempt ${attempt} failed`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Network error';
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  return { success: false, error: lastError };
};

/**
 * POST /api/quiz-results/save
 * Saves both panel and live leaderboard data together
 */
export const saveQuizResults = async (
  payload: SaveQuizResultsPayload
): Promise<SaveQuizResultsResponse> => {
  if (getAppMode() === 'offline') {
    return { success: true, message: 'Skipped in offline mode' };
  }
  try {
    return await postQuizResultsWithRetry(payload, 3);
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to save quiz results:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * POST /api/quiz-results/panel-leaderboard
 * Saves panel (team) leaderboard only
 */
export const savePanelLeaderboard = async (
  payload: PanelLeaderboardPayload
): Promise<SaveQuizResultsResponse> => {
  if (getAppMode() === 'offline') {
    return { success: true, message: 'Skipped in offline mode' };
  }
  try {
    const normalizedPayload = normalizeLeaderboardPayload(payload);
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/quiz-results/panel-leaderboard`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthorizedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(normalizedPayload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: String((data as Record<string, unknown>)?.error || `HTTP ${response.status}`) };
    }
    return data as SaveQuizResultsResponse;
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to save panel leaderboard:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * POST /api/quiz-results/live-leaderboard
 * Saves live (viewer) leaderboard only
 */
export const saveLiveLeaderboard = async (
  payload: LiveLeaderboardPayload
): Promise<SaveQuizResultsResponse> => {
  if (getAppMode() === 'offline') {
    return { success: true, message: 'Skipped in offline mode' };
  }
  try {
    const normalizedPayload = normalizeLeaderboardPayload(payload);
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/quiz-results/live-leaderboard`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthorizedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(normalizedPayload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: String((data as Record<string, unknown>)?.error || `HTTP ${response.status}`) };
    }
    return data as SaveQuizResultsResponse;
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to save live leaderboard:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * GET /api/quiz-results/:frontendQuizGameId
 * Fetch saved run results for audit/reporting and limited same-run fallback use.
 * Host scoring, timers, teams, and other browser-owned config must not be
 * hydrated from this payload until login/ownership exists.
 */
export const getQuizResults = async (
  frontendQuizGameId: string
): Promise<{ success: boolean; data?: SaveQuizResultsPayload; error?: string }> => {
  if (getAppMode() === 'offline') {
    return { success: false, error: 'Unavailable in offline mode' };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/quiz-results/${frontendQuizGameId}`, {
      credentials: 'include',
      headers: getAuthorizedHeaders(),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: String(payload?.error || `HTTP ${response.status}`) };
    }
    return payload;
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to fetch quiz results:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * GET /api/quiz-results/history
 * Fetch list of all saved quiz episodes
 */
export const getQuizResultsHistory = async (): Promise<{
  success: boolean;
  episodes?: Array<{ frontendQuizGameId: string; episodeName: string; startedAt: string; endedAt: string; status: string }>;
  error?: string;
}> => {
  if (getAppMode() === 'offline') {
    return { success: false, error: 'Unavailable in offline mode' };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/quiz-results/history`, {
      credentials: 'include',
      headers: getAuthorizedHeaders(),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: String(payload?.error || `HTTP ${response.status}`) };
    }
    return payload;
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to fetch results history:', error);
    return { success: false, error: 'Network error' };
  }
};

export const deleteQuizResultsEpisode = async (
  frontendQuizGameId: string
): Promise<{ success: boolean; error?: string; deleted?: Record<string, number> }> => {
  if (getAppMode() === 'offline') {
    return { success: false, error: 'Unavailable in offline mode' };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/quiz-results/${encodeURIComponent(frontendQuizGameId)}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthorizedHeaders(),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: String(payload?.error || `HTTP ${response.status}`) };
    }
    return payload;
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to delete quiz result:', error);
    return { success: false, error: 'Network error' };
  }
};

export const deleteAbortedQuizResultsHistory = async (): Promise<{
  success: boolean;
  deletedRuns?: number;
  error?: string;
}> => {
  if (getAppMode() === 'offline') {
    return { success: false, error: 'Unavailable in offline mode' };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/quiz-results/history/delete-aborted`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthorizedHeaders({ 'Content-Type': 'application/json' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: String(payload?.error || `HTTP ${response.status}`) };
    }
    return payload;
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to delete aborted quiz history:', error);
    return { success: false, error: 'Network error' };
  }
};

export const clearAllBackendQuizResultsHistory = async (): Promise<{
  success: boolean;
  deletedRuns?: number;
  error?: string;
}> => {
  if (getAppMode() === 'offline') {
    return { success: false, error: 'Unavailable in offline mode' };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/quiz-results/history/all`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAppAccessHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to clear backend quiz history:', error);
    return { success: false, error: 'Network error' };
  }
};

export const getQuizStateCheckpoint = async (
  applicationId: string,
  frontendQuizGameId: string
): Promise<{ success: boolean; data?: { checkpointType: string; state: Record<string, unknown>; storedAt?: string; updatedAt?: string }; error?: string }> => {
  if (getAppMode() === 'offline') {
    return { success: false, error: 'Unavailable in offline mode' };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(
      `${baseUrl}/api/quiz/state/${encodeURIComponent(applicationId)}/${encodeURIComponent(frontendQuizGameId)}`,
      {
        credentials: 'include',
        headers: getAppAccessHeaders(),
      }
    );
    return await response.json();
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to fetch quiz state checkpoint:', error);
    return { success: false, error: 'Network error' };
  }
};

// Backend checkpoint APIs keep a run-scoped audit copy of browser-owned quiz
// state. They are not the authority for host settings restoration.
export const replaceQuizStateCheckpoint = async (payload: {
  applicationId: string;
  frontendQuizGameId: string;
  checkpointType: string;
  state: Record<string, unknown>;
}): Promise<{ success: boolean; data?: unknown; error?: string }> => {
  if (getAppMode() === 'offline') {
    return { success: true, data: { skipped: true } };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(
      `${baseUrl}/api/quiz/state/${encodeURIComponent(payload.applicationId)}/${encodeURIComponent(payload.frontendQuizGameId)}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: getAppAccessHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          checkpointType: payload.checkpointType,
          state: payload.state,
        }),
      }
    );
    return await response.json();
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to save quiz state checkpoint:', error);
    return { success: false, error: 'Network error' };
  }
};

export const mergeQuizStateCheckpoint = async (payload: {
  applicationId: string;
  frontendQuizGameId: string;
  checkpointType: string;
  state: Record<string, unknown>;
}): Promise<{ success: boolean; data?: unknown; error?: string }> => {
  if (getAppMode() === 'offline') {
    return { success: true, data: { skipped: true } };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(
      `${baseUrl}/api/quiz/state/${encodeURIComponent(payload.applicationId)}/${encodeURIComponent(payload.frontendQuizGameId)}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: getAppAccessHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          checkpointType: payload.checkpointType,
          state: payload.state,
        }),
      }
    );
    return await response.json();
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to merge quiz state checkpoint:', error);
    return { success: false, error: 'Network error' };
  }
};

export const getQuizRunMeta = async (
  frontendQuizGameId: string
): Promise<{
  success: boolean;
  data?: {
    frontendQuizGameId: string;
    gameTitle?: string;
    episodeName?: string;
    episodeNumber?: string;
    quizShowName?: string;
  };
  error?: string;
}> => {
  if (getAppMode() === 'offline') {
    return { success: false, error: 'Unavailable in offline mode' };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/quiz-runs/${encodeURIComponent(frontendQuizGameId)}/meta`, {
      credentials: 'include',
      headers: getAppAccessHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to fetch quiz run meta:', error);
    return { success: false, error: 'Network error' };
  }
};

export const updateQuizRunMeta = async (
  frontendQuizGameId: string,
  payload: {
    gameTitle?: string;
    episodeName?: string;
    episodeNumber?: string;
    quizShowName?: string;
  }
): Promise<{
  success: boolean;
  data?: {
    frontendQuizGameId: string;
    gameTitle?: string;
    episodeName?: string;
    episodeNumber?: string;
    quizShowName?: string;
  };
  error?: string;
}> => {
  if (getAppMode() === 'offline') {
    return { success: false, error: 'Unavailable in offline mode' };
  }
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/quiz-runs/${encodeURIComponent(frontendQuizGameId)}/meta`, {
      method: 'PUT',
      credentials: 'include',
      headers: getAppAccessHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error('[QuizResultsAPI] Failed to update quiz run meta:', error);
    return { success: false, error: 'Network error' };
  }
};
