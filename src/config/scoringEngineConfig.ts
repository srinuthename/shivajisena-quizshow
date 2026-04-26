// Scoring Engine Configuration
// Manages connection to the backend scoring engine service (separate from SSE stream server)
import { getAppMode, getBackendBaseUrl, isLocalBackendBaseUrl, requiresHostLoginForBackendUrl } from '@/config/appMode';
import { ensureRemoteAppAccessSession, getStoredApplicationId, getAppAccessHeaders } from '@/config/hostProduct';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';

const SCORING_ENGINE_URL_KEY = 'scoringEngineUrl';
const SCORING_ENGINE_ENABLED_KEY = 'scoringEngineEnabled';
const SCORING_GRACE_WINDOW_KEY = 'scoringGraceWindowMs';
const SCORING_POLL_INTERVAL_KEY = 'scoringPollIntervalMs';

const DEFAULT_BACKEND_BASE_URL = String(import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:50510')
  .trim()
  .replace(/\/+$/, '');
export const DEFAULT_SCORING_ENGINE_URL =
  import.meta.env.VITE_SCORING_ENGINE_URL || `${DEFAULT_BACKEND_BASE_URL}/scoring`;
export const DEFAULT_GRACE_WINDOW_MS = import.meta.env.VITE_DEFAULT_GRACE_WINDOW_MS || 10000; // 10 seconds
export const DEFAULT_POLL_INTERVAL_MS = import.meta.env.VITE_DEFAULT_POLL_INTERVAL_MS || 5000; // 5 seconds

// --- URL ---

export const getScoringEngineUrl = (): string => {
  try {
    if (getAppMode() === 'offline') {
      return '';
    }
    const stored = (localStorage.getItem(SCORING_ENGINE_URL_KEY) || '').replace(/\/+$/, '');
    const backendBaseUrl = getBackendBaseUrl();
    if (requiresHostLoginForBackendUrl(backendBaseUrl) && (!stored || isLocalBackendBaseUrl(stored))) {
      return `${backendBaseUrl}/scoring`;
    }
    return stored || DEFAULT_SCORING_ENGINE_URL;
  } catch {
    if (getAppMode() === 'offline') {
      return '';
    }
    const backendBaseUrl = getBackendBaseUrl();
    return requiresHostLoginForBackendUrl(backendBaseUrl)
      ? `${backendBaseUrl}/scoring`
      : DEFAULT_SCORING_ENGINE_URL;
  }
};

const getScoringEngineBaseUrl = (): string => getScoringEngineUrl().replace(/\/+$/, '');
const ensureScoringEngineAccess = async (baseUrl: string): Promise<void> => {
  await ensureSharedAuthToken(60_000).catch(() => null);
  await ensureRemoteAppAccessSession(baseUrl).catch(() => null);
};

const getCurrentApplicationId = (): string => {
  return getStoredApplicationId();
};

export const setScoringEngineUrl = (url: string): void => {
  try {
    localStorage.setItem(SCORING_ENGINE_URL_KEY, url);
    window.dispatchEvent(new CustomEvent('scoringEngineConfigChanged'));
  } catch (e) {
    console.error('Failed to save scoring engine URL:', e);
  }
};

// --- Enabled ---

export const isScoringEngineEnabled = (): boolean => {
  try {
    if (getAppMode() === 'offline') return false;
    const saved = localStorage.getItem(SCORING_ENGINE_ENABLED_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return false;
  }
};

export const setScoringEngineEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SCORING_ENGINE_ENABLED_KEY, enabled.toString());
    window.dispatchEvent(new CustomEvent('scoringEngineConfigChanged'));
  } catch (e) {
    console.error('Failed to save scoring engine enabled state:', e);
  }
};

// --- Grace Window ---

export const getGraceWindowMs = (): number => {
  try {
    const saved = localStorage.getItem(SCORING_GRACE_WINDOW_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_GRACE_WINDOW_MS;
  } catch {
    return DEFAULT_GRACE_WINDOW_MS;
  }
};

export const setGraceWindowMs = (ms: number): void => {
  try {
    localStorage.setItem(SCORING_GRACE_WINDOW_KEY, ms.toString());
  } catch (e) {
    console.error('Failed to save grace window:', e);
  }
};

// --- Poll Interval ---

export const getPollIntervalMs = (): number => {
  try {
    const saved = localStorage.getItem(SCORING_POLL_INTERVAL_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_POLL_INTERVAL_MS;
  } catch {
    return DEFAULT_POLL_INTERVAL_MS;
  }
};

export const setPollIntervalMs = (ms: number): void => {
  try {
    localStorage.setItem(SCORING_POLL_INTERVAL_KEY, ms.toString());
  } catch (e) {
    console.error('Failed to save poll interval:', e);
  }
};

// --- Health Check ---

export const testScoringEngineConnection = async (
  url?: string
): Promise<{ success: boolean; message: string }> => {
  const baseUrl = (url || getScoringEngineUrl()).replace(/\/+$/, '');
  if (!baseUrl) {
    return { success: false, message: 'Offline or no scoring engine configured' };
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    let response = await fetch(`${baseUrl}/healthz`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) {
      response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
    }
    clearTimeout(timeoutId);
    if (response.ok) {
      return { success: true, message: 'Scoring engine connected' };
    }
    return { success: false, message: `HTTP ${response.status}` };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, message: 'Connection timeout (5s)' };
    }
    return { success: false, message: 'Connection failed' };
  }
};

// --- Scoring Engine API calls ---

export const notifyQuestionOpen = async (payload: {
  gameId: string;
  questionIndex: number;
  correctChoiceIndex: number;
  openedAt: number;
  durationMs?: number;
}): Promise<boolean> => {
  const baseUrl = getScoringEngineBaseUrl();
  if (!baseUrl) {
    console.log('[ScoringEngine] Disabled or offline, skipping notifyQuestionOpen');
    return false;
  }

  try {
    await ensureScoringEngineAccess(baseUrl);
    const body = {
      applicationId: getCurrentApplicationId(),
      frontendQuizGameId: payload.gameId,
      questionId: `q-${payload.questionIndex}`,
      questionIndex: payload.questionIndex,
      correctChoiceIndex: payload.correctChoiceIndex,
      durationMs: payload.durationMs,
      clientOpenedAt: payload.openedAt,
      approxServerOpenedAt: payload.openedAt,
    };
    const res = await fetch(`${baseUrl}/api/quiz/question/open`, {
      method: 'POST',
      credentials: 'include',
      headers: getAppAccessHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.error('[ScoringEngine] Failed to notify question open:', e);
    return false;
  }
};

export const notifyQuestionClose = async (payload: {
  gameId: string;
  questionIndex: number;
  closedAt: number;
  graceMs?: number;
}): Promise<boolean> => {
  const baseUrl = getScoringEngineBaseUrl();
  if (!baseUrl) {
    console.log('[ScoringEngine] Disabled or offline, skipping notifyQuestionClose');
    return false;
  }

  try {
    await ensureScoringEngineAccess(baseUrl);
    const graceMs = payload.graceMs ?? getGraceWindowMs();
    const body = {
      applicationId: getCurrentApplicationId(),
      frontendQuizGameId: payload.gameId,
      questionId: `q-${payload.questionIndex}`,
      questionIndex: payload.questionIndex,
      graceMs,
      clientClosedAt: payload.closedAt,
      approxServerClosedAt: payload.closedAt,
    };
    const res = await fetch(`${baseUrl}/api/quiz/question/close`, {
      method: 'POST',
      credentials: 'include',
      headers: getAppAccessHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.error('[ScoringEngine] Failed to notify question close:', e);
    return false;
  }
};

export const notifyGameOpen = async (payload: {
  gameId: string;
  gameTitle?: string;
}): Promise<boolean> => {
  const baseUrl = getScoringEngineBaseUrl();
  if (!baseUrl) {
    console.log('[ScoringEngine] Disabled or offline, skipping notifyGameOpen');
    return false;
  }

  try {
    await ensureScoringEngineAccess(baseUrl);
    const applicationId = getCurrentApplicationId();
    const res = await fetch(
      `${baseUrl}/api/quiz/state/${encodeURIComponent(applicationId)}/${encodeURIComponent(payload.gameId)}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: getAppAccessHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          isGameOpen: true,
          gameTitle: payload.gameTitle || null,
        }),
      }
    );
    return res.ok;
  } catch (e) {
    console.error('[ScoringEngine] Failed to notify game open:', e);
    return false;
  }
};

export const notifyGameClose = async (payload: {
  gameId: string;
}): Promise<boolean> => {
  const baseUrl = getScoringEngineBaseUrl();
  if (!baseUrl) {
    console.log('[ScoringEngine] Disabled or offline, skipping notifyGameClose');
    return false;
  }

  try {
    await ensureScoringEngineAccess(baseUrl);
    const applicationId = getCurrentApplicationId();
    const res = await fetch(
      `${baseUrl}/api/quiz/state/${encodeURIComponent(applicationId)}/${encodeURIComponent(payload.gameId)}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: getAppAccessHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          isGameOpen: false,
          gameClosedAt: new Date().toISOString(),
        }),
      }
    );
    return res.ok;
  } catch (e) {
    console.error('[ScoringEngine] Failed to notify game close:', e);
    return false;
  }
};
