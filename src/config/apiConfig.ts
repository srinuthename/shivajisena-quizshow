// API Configuration for Quiz Game Backend
import { getAppMode, getBackendTarget, modeRequiresApi, getApiServerUrl, setApiServerUrl, getSSEBaseUrl, getSSEStreamUrl, DEFAULT_SSE_STREAM_URL } from '@/config/appMode';
import { ensureRemoteAppAccessSession, getHostProductHeaders, getStoredApplicationId, HOST_PRODUCT_KEY } from '@/config/hostProduct';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';
import { AnswerEvent, isValidAnswerEvent, normalizeAnswer, getAnswerIndex, getReceivedTimestamp } from '@/types/userResponse';
import { getBrowserClientId } from '@/lib/clientIdentity';
import { readQuizHostChannel } from '@/lib/quizHostChannel';

const STORAGE_KEY = "youtubeApiConfig";

/* ============================
   CONFIG TYPES
============================ */

export interface ApiConfig {
  serverUrl: string;
  useDummyData: boolean;
}

/**
 * Processed quiz answer for frontend consumption
 * Derived from the new unified UserResponse schema
 */
export interface QuizAnswer {
  id: string;
  userUniqueId: string;
  userProfilePicUrl: string;
  userName: string;
  questionIndex: number;
  responseTimeMs: number;
  receivedTimestampMs?: number;
  selectedChoiceIndex: number;
  selectedChoiceText: string;
  isCorrectAnswer: boolean;
}

// Alias for backward compatibility
export type BackendAnswer = QuizAnswer;

const DEFAULT_CONFIG: ApiConfig = {
  serverUrl: import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:50510",
  useDummyData: true,
};

/* ============================
   CONFIG STORAGE
============================ */

export const getApiConfig = (): ApiConfig => {
  const saved = localStorage.getItem(STORAGE_KEY);
  const apiServerUrl = getApiServerUrl();
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...parsed, serverUrl: apiServerUrl };
    } catch (e) {
      console.error("Failed to parse API config:", e);
    }
  }
  return { ...DEFAULT_CONFIG, serverUrl: apiServerUrl };
};

export const saveApiConfig = (config: Partial<ApiConfig>): void => {
  const current = getApiConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  if (config.serverUrl) {
    setApiServerUrl(config.serverUrl);
  }
};

/* ============================
   BACKEND ENABLED CHECK
============================ */

const FRONTEND_SCORING_ALLOWED_OPS = new Set([
  'openQuizGame',
  'closeQuizGame',
  'getQuizStatus',
]);

const checkBackendEnabled = (operation: string): boolean => {
  const mode = getAppMode();
  if (mode === 'offline' || getBackendTarget() === 'none') {
    console.log(`[API] Backend disabled for mode ${mode}, skipping ${operation}`);
    return false;
  }

  // Most API calls remain backend_scoring/online only.
  // Quiz game identity lifecycle (open/close/status) is also required in frontend_scoring.
  const frontendScoringLifecycleOp = mode === 'frontend_scoring' && FRONTEND_SCORING_ALLOWED_OPS.has(operation);
  const enabled = modeRequiresApi(mode) || frontendScoringLifecycleOp;
  if (!enabled) {
    console.log(`[API] Backend disabled for mode ${mode}, skipping ${operation}`);
  }
  return enabled;
};

// Stream manager base URL is derived from the SSE server URL (same host).
// If the user hasn't explicitly configured an SSE URL, fall back to the API server URL
// so that a single URL configured in the admin panel covers all orchestrator calls.
const getOrchestratorBaseUrl = (): string => {
  const sseUrl = getSSEStreamUrl();
  // If SSE URL was explicitly set (not the default), use its base
  if (sseUrl !== DEFAULT_SSE_STREAM_URL) {
    return getSSEBaseUrl();
  }
  // Otherwise use the API server URL (which the user likely configured)
  return getApiServerUrl();
};

// Simple circuit breaker to avoid spamming a dead backend
let _circuitOpenUntil = 0;
let _consecutiveFailures = 0;
const CIRCUIT_MAX_BACKOFF_MS = 60_000;

const tripCircuit = () => {
  _consecutiveFailures += 1;
  const backoff = Math.min(1000 * Math.pow(2, _consecutiveFailures - 1), CIRCUIT_MAX_BACKOFF_MS);
  _circuitOpenUntil = Date.now() + backoff;
};

const resetCircuit = () => {
  _consecutiveFailures = 0;
  _circuitOpenUntil = 0;
};

const isCircuitOpen = (): boolean => Date.now() < _circuitOpenUntil;

// Stream manager talks directly to orchestrator and should work in frontend_scoring as well.
// Only offline mode blocks these calls.
const checkOrchestratorEnabled = (operation: string): boolean => {
  const mode = getAppMode();
  if (mode === 'offline' || getBackendTarget() === 'none') {
    console.log(`[API] Orchestrator disabled for mode ${mode}, skipping ${operation}`);
    return false;
  }
  if (isCircuitOpen()) {
    // Silently skip — backend is known-unreachable
    return false;
  }
  return true;
};

const readJsonSafe = async (response: Response): Promise<{ data: unknown; nonJsonBody?: string }> => {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    const body = await response.text().catch(() => "");
    return { data: null, nonJsonBody: body };
  }
  try {
    return { data: await response.json() };
  } catch {
    return { data: null };
  }
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const readString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

const readStringPath = (source: unknown, path: string): string | undefined => {
  const keys = path.split(".");
  let cursor: unknown = source;
  for (const key of keys) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return readString(cursor);
};

const extractTransformMode = (stream: Record<string, unknown>): string | null => {
  const direct =
    readString(stream.transformMode) ||
    readString(stream.mode) ||
    readString(stream.messageMode) ||
    readString(stream.transform_mode);
  if (direct) return direct;

  const nestedPaths = [
    "route.transformMode",
    "route.mode",
    "stream.transformMode",
    "stream.mode",
    "transform.mode",
    "transform.transformMode",
    "config.transformMode",
    "config.messageMode",
    "settings.transformMode",
    "settings.messageMode",
    "metadata.transformMode",
    "metadata.mode",
  ];

  for (const path of nestedPaths) {
    const value = readStringPath(stream, path);
    if (value) return value;
  }
  return null;
};

const readBoolean = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

const parseResultEnvelope = (
  value: unknown
): {
  success?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
  streams?: unknown;
  raw: Record<string, unknown>;
} => {
  const raw = asRecord(value);
  return {
    success: readBoolean(raw.success),
    ok: readBoolean(raw.ok),
    error: readString(raw.error),
    message: readString(raw.message),
    streams: raw.streams,
    raw,
  };
};

const STREAM_REQUEST_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = STREAM_REQUEST_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(new DOMException("Request timeout", "AbortError")), timeoutMs);
  const inputSignal = init.signal;
  let cleanupInputSignal: (() => void) | null = null;
  if (inputSignal) {
    const onAbort = () => controller.abort(inputSignal.reason);
    if (inputSignal.aborted) {
      controller.abort(inputSignal.reason);
    } else {
      inputSignal.addEventListener("abort", onAbort, { once: true });
      cleanupInputSignal = () => inputSignal.removeEventListener("abort", onAbort);
    }
  }
  try {
    if (typeof input === 'string') {
      try {
        const target = new URL(input, window.location.origin);
        await ensureSharedAuthToken(60_000).catch(() => null);
        await ensureRemoteAppAccessSession(target.origin);
      } catch {
        // Ignore parse failures and let the fetch surface the real error.
      }
    }
    return await fetch(input, {
      ...init,
      headers: getHostProductHeaders(init.headers),
      credentials: init.credentials ?? 'include',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    cleanupInputSignal?.();
  }
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

const fetchWithTimeoutRetry = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = STREAM_REQUEST_TIMEOUT_MS,
  retries = 1
): Promise<Response> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchWithTimeout(input, init, timeoutMs);
    } catch (error) {
      lastError = error;
      if (!isAbortError(error) || attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw lastError;
};

/* ============================
   IDENTITY HELPERS
============================ */

type StreamScopeOverride = {
  frontendQuizGameId?: string | null;
  resourceId?: string | null;
};

const getGameIdentity = (): { applicationId: string | null; frontendQuizGameId: string | null } => {
  const applicationId = getStoredApplicationId();
  const frontendQuizGameId = localStorage.getItem('frontendQuizGameId');
  return { applicationId, frontendQuizGameId };
};

const getStreamScope = (override?: StreamScopeOverride): {
  tenantId: string;
  applicationId: string;
  consumer: string;
  resourceId: string;
} => {
  const frontendQuizGameId = String(override?.frontendQuizGameId ?? '').trim();
  const hostChannel = readQuizHostChannel();
  return {
    tenantId: String(hostChannel.quizHostChannelId || 'default-org').trim() || 'default-org',
    applicationId: HOST_PRODUCT_KEY,
    consumer: HOST_PRODUCT_KEY,
    resourceId: String(override?.resourceId ?? frontendQuizGameId).trim(),
  };
};

const withClientQuery = (url: string, override?: StreamScopeOverride): string => {
  try {
    const u = new URL(url, window.location.origin);
    const clientId = getBrowserClientId();
    const frontendQuizGameId = String(override?.frontendQuizGameId ?? '').trim();
    const scope = getStreamScope(override);
    if (clientId) u.searchParams.set("clientId", clientId);
    if (frontendQuizGameId) {
      u.searchParams.set("frontendQuizGameId", frontendQuizGameId);
          }
    if (scope.tenantId) u.searchParams.set("tenantId", scope.tenantId);
    if (scope.applicationId) u.searchParams.set("applicationId", scope.applicationId);
    if (scope.consumer) u.searchParams.set("consumer", scope.consumer);
    if (scope.resourceId) u.searchParams.set("resourceId", scope.resourceId);
    return u.toString();
  } catch {
    return url;
  }
};

/* ============================
   HEALTH CHECK
============================ */

export const checkHealth = async (): Promise<{ success: boolean; status?: string }> => {
  const config = getApiConfig();
  try {
    const response = await fetch(`${config.serverUrl}/api/health`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, status: data.status };
    }
    return { success: false };
  } catch (error) {
    console.error("Health check failed:", error);
    return { success: false };
  }
};

export const testApiConnection = async (
  serverUrl: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${serverUrl}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { success: true, message: "Connection successful!" };
    }
    return { success: false, message: `HTTP ${response.status}` };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, message: "Connection timeout (5s)" };
    }
    return { success: false, message: "Connection failed" };
  }
};

/* ============================
   QUIZ GAME LIFECYCLE
============================ */

let currentFrontendQuizGameId: string | null = null;

export const getFrontendQuizGameId = (): string | null => currentFrontendQuizGameId;

export const setFrontendQuizGameId = (id: string | null): void => {
  currentFrontendQuizGameId = id;
};

export const clearFrontendQuizGameId = (): void => {
  currentFrontendQuizGameId = null;
};

export const getQuizStatus = async (): Promise<{
  success: boolean;
  isGameOpen?: boolean;
  gameTitle?: string;
  frontendQuizGameId?: string;
  activeQuestionIndex?: number;
  isQuestionOpen?: boolean;
  isPowerplayModeON?: boolean;
  questionStartedAt?: string;
  correctChoiceIndex?: number;
  gameStartedAt?: string;
}> => {
  if (!checkBackendEnabled('getQuizStatus')) {
    return { success: true, isGameOpen: false };
  }

  const config = getApiConfig();
  const { applicationId, frontendQuizGameId } = getGameIdentity();
  
  if (!applicationId || !frontendQuizGameId) {
    console.log('[API] Missing applicationId or frontendQuizGameId for status check');
    return { success: false };
  }

  try {
    const response = await fetchWithTimeout(`${config.serverUrl}/api/quizgame/status`, {
      method: "POST",
      headers: getHostProductHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ applicationId, frontendQuizGameId }),
    });
    const result = await response.json();
    if (result.success) {
      currentFrontendQuizGameId = frontendQuizGameId;
    }
    return result;
  } catch (error) {
    console.error("Failed to get quiz status:", error);
    return { success: false };
  }
};

export const openQuizGame = async (
  gameData: {
    gameTitle?: string;
    frontendQuizGameId: string;
    applicationId: string;
    episodeName?: string;
    episodeNumber?: string;
    quizHostChannelId?: string | null;
    quizHostChannelTitle?: string | null;
    quizHostChannelHandle?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<{ success: boolean; frontendQuizGameId?: string; error?: string }> => {
  if (!checkBackendEnabled('openQuizGame')) {
    return { success: true, frontendQuizGameId: undefined };
  }

  const config = getApiConfig();
  try {
    const response = await fetchWithTimeout(`${config.serverUrl}/api/analytics/quiz-runs/lifecycle`, {
      method: "POST",
      headers: getHostProductHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        applicationId: gameData.applicationId,
        frontendQuizGameId: gameData.frontendQuizGameId,
        eventType: 'created',
        clientTs: Date.now(),
        consentEnabled: true,
        gameTitle: gameData.gameTitle || '',
        episodeName: gameData.episodeName || '',
        episodeNumber: gameData.episodeNumber || '',
        quizHostChannelId: gameData.quizHostChannelId || null,
        quizHostChannelTitle: gameData.quizHostChannelTitle || '',
        quizHostChannelHandle: gameData.quizHostChannelHandle || '',
        metadata: gameData.metadata || null,
      }),
    });
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const result = await response.json().catch(() => ({}));
    if (result?.success) {
      currentFrontendQuizGameId = gameData.frontendQuizGameId;
      console.log('[API] Quiz game opened, ID:', currentFrontendQuizGameId);
      return { success: true, frontendQuizGameId: gameData.frontendQuizGameId };
    }
    return { success: false, error: result?.error || 'open lifecycle failed' };
  } catch (error) {
    console.error("Failed to open quiz game:", error);
    return { success: false, error: "Request failed" };
  }
};

export const closeQuizGame = async (): Promise<{ success: boolean; error?: string }> => {
  if (!checkBackendEnabled('closeQuizGame')) {
    return { success: true };
  }

  const config = getApiConfig();
  const { applicationId, frontendQuizGameId } = getGameIdentity();
  
  if (!applicationId || !frontendQuizGameId) {
    console.log('[API] Missing applicationId or frontendQuizGameId for game close');
    return { success: false, error: 'Missing identity' };
  }

  try {
    const response = await fetchWithTimeout(`${config.serverUrl}/api/analytics/quiz-runs/lifecycle`, {
      method: "POST",
      headers: getHostProductHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ 
        applicationId, 
        frontendQuizGameId,
        eventType: 'closed',
        clientTs: Date.now(),
        consentEnabled: true,
      }),
    });
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const result = await response.json().catch(() => ({}));
    if (result?.success) {
      console.log('[API] Quiz game closed');
      currentFrontendQuizGameId = null;
      return { success: true };
    }
    return { success: false, error: result?.error || 'close lifecycle failed' };
  } catch (error) {
    console.error("Failed to close quiz game:", error);
    return { success: false, error: "Request failed" };
  }
};

export const openQuizQuestion = async (
  data: {
    questionIndex: number;
    correctChoiceIndex: number;
    questionTag?: string;
  }
): Promise<{ success: boolean; questionOpenTime?: string; message?: string; error?: string }> => {
  if (!checkBackendEnabled('openQuizQuestion')) {
    return { success: true };
  }

  const config = getApiConfig();
  const { applicationId, frontendQuizGameId } = getGameIdentity();
  
  if (!applicationId || !frontendQuizGameId) {
    console.log('[API] Missing applicationId or frontendQuizGameId for question open');
    return { success: false, error: 'Missing identity' };
  }

  try {
    const response = await fetchWithTimeout(`${config.serverUrl}/api/quizgame/question-open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        frontendQuizGameId,
        ...data,
      }),
    });
    const result = await response.json();
    if (result.success) {
      console.log('[API] Question opened:', data.questionIndex);
    }
    return result;
  } catch (error) {
    console.error("Failed to open question:", error);
    return { success: false, error: "Request failed" };
  }
};

export const closeQuizQuestion = async (): Promise<{ success: boolean; duration?: number; message?: string; error?: string }> => {
  if (!checkBackendEnabled('closeQuizQuestion')) {
    return { success: true };
  }

  const config = getApiConfig();
  const { applicationId, frontendQuizGameId } = getGameIdentity();
  
  if (!applicationId || !frontendQuizGameId) {
    console.log('[API] Missing applicationId or frontendQuizGameId for question close');
    return { success: false, error: 'Missing identity' };
  }

  try {
    const response = await fetchWithTimeout(`${config.serverUrl}/api/quizgame/question-close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, frontendQuizGameId }),
    });
    const result = await response.json();
    if (result.success) {
      console.log('[API] Question closed');
    }
    return result;
  } catch (error) {
    console.error("Failed to close question:", error);
    return { success: false, error: "Request failed" };
  }
};

/* ============================
   POWERPLAY
============================ */

export const startPowerplay = async (): Promise<{ success: boolean; isPowerplayModeON?: boolean; message?: string }> => {
  if (!checkBackendEnabled('startPowerplay')) {
    return { success: true };
  }

  const config = getApiConfig();
  const { applicationId, frontendQuizGameId } = getGameIdentity();
  
  if (!applicationId || !frontendQuizGameId) {
    console.log('[API] Missing applicationId or frontendQuizGameId for powerplay start');
    return { success: false, message: 'Missing identity' };
  }

  try {
    const response = await fetchWithTimeout(`${config.serverUrl}/api/quizgame/powerplay/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, frontendQuizGameId }),
    });
    const result = await response.json();
    if (result.success) {
      console.log('[API] Powerplay started');
    }
    return result;
  } catch (error) {
    console.error("Failed to start powerplay:", error);
    return { success: false, message: "Request failed" };
  }
};

export const stopPowerplay = async (): Promise<{ success: boolean; isPowerplayModeON?: boolean; message?: string }> => {
  if (!checkBackendEnabled('stopPowerplay')) {
    return { success: true };
  }

  const config = getApiConfig();
  const { applicationId, frontendQuizGameId } = getGameIdentity();
  
  if (!applicationId || !frontendQuizGameId) {
    console.log('[API] Missing applicationId or frontendQuizGameId for powerplay stop');
    return { success: false, message: 'Missing identity' };
  }

  try {
    const response = await fetchWithTimeout(`${config.serverUrl}/api/quizgame/powerplay/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, frontendQuizGameId }),
    });
    const result = await response.json();
    if (result.success) {
      console.log('[API] Powerplay stopped');
    }
    return result;
  } catch (error) {
    console.error("Failed to stop powerplay:", error);
    return { success: false, message: "Request failed" };
  }
};

/* ============================
   ANSWERS - Transforms AnswerEvent to QuizAnswer
============================ */

/**
 * Transform an AnswerEvent to a QuizAnswer for compatibility
 * Uses getReceivedTimestamp to handle both legacy and new schema
 */
const transformAnswerEventToQuizAnswer = (
  event: AnswerEvent,
  questionIndex: number,
  correctChoiceIndex: number | null
): QuizAnswer | null => {
  if (!isValidAnswerEvent(event)) return null;

  const answerLetter = normalizeAnswer(event.answer);
  if (!answerLetter) return null;

  const selectedChoiceIndex = getAnswerIndex(answerLetter);
  if (selectedChoiceIndex === null) return null;

  const isCorrect = correctChoiceIndex !== null && selectedChoiceIndex === correctChoiceIndex;
  
  // Use getReceivedTimestamp to handle both receivedAtYT and legacy receivedAt
  const receivedTs = getReceivedTimestamp(event);

  return {
    id: event.id || `${event.streamId}:${event.channelId}:${receivedTs}`,
    userUniqueId: event.channelId,
    userProfilePicUrl: event.avatarUrl || event.avatar || '',
    userName: event.displayName || event.author || event.channelId,
    questionIndex,
    responseTimeMs: 0, // Will be calculated by frontend based on questionOpenTime
    receivedTimestampMs: receivedTs,
    selectedChoiceIndex,
    selectedChoiceText: answerLetter,
    isCorrectAnswer: isCorrect,
  };
};

export const getQuizAnswers = async (
  questionIndex: number,
  lastAnswerTime?: number
): Promise<{ success: boolean; answers?: QuizAnswer[]; error?: string }> => {
  if (!checkBackendEnabled('getQuizAnswers')) {
    return { success: true, answers: [] };
  }

  const config = getApiConfig();
  const { applicationId, frontendQuizGameId } = getGameIdentity();
  const effectiveGameId = frontendQuizGameId || currentFrontendQuizGameId;
  const scope = getStreamScope();
  
  if (!applicationId || !effectiveGameId) {
    console.log('[API] Missing applicationId or frontendQuizGameId for fetching answers');
    return { success: true, answers: [] };
  }

  try {
    const params = new URLSearchParams({
      applicationId,
      frontendQuizGameId: String(frontendQuizGameId || effectiveGameId),
      tenantId: scope.tenantId,
      consumer: scope.consumer,
      resourceId: String(scope.resourceId || effectiveGameId),
      connectorTenantId: scope.tenantId,
      connectorApplicationId: scope.applicationId,
      connectorConsumer: scope.consumer,
      connectorResourceId: String(scope.resourceId || effectiveGameId),
    });
    if (lastAnswerTime !== undefined) {
      params.set('lastResponseTime', String(lastAnswerTime));
    }
    const primaryUrl = `${config.serverUrl}/api/responses/${effectiveGameId}?${params.toString()}`;
    const response = await fetchWithTimeout(primaryUrl);
    const result = await response.json();
    
    // Backend now returns response events; keep `answers` as a transformed frontend alias.
    const sourceEvents = result.responses || result.answers;
    if (result.success && sourceEvents) {
      const transformedAnswers = sourceEvents
        .map((r: AnswerEvent) => transformAnswerEventToQuizAnswer(r, questionIndex, null))
        .filter((a: QuizAnswer | null): a is QuizAnswer => a !== null);
      return { success: true, answers: transformedAnswers };
    }
    
    return result;
  } catch (error) {
    console.error("Failed to get quiz answers:", error);
    return { success: false, error: "Request failed" };
  }
};

/* ============================
   ADMIN RESET
============================ */

export const adminReset = async (): Promise<{ success: boolean }> => {
  if (!checkBackendEnabled('adminReset')) {
    return { success: true };
  }

  const config = getApiConfig();
  const { applicationId, frontendQuizGameId } = getGameIdentity();
  
  try {
    const response = await fetchWithTimeout(`${config.serverUrl}/api/admin/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, frontendQuizGameId }),
    });
    const result = await response.json();
    if (result.success) {
      currentFrontendQuizGameId = null;
      console.log('[API] Admin reset completed');
    }
    return result;
  } catch (error) {
    console.error("Failed to admin reset:", error);
    return { success: false };
  }
};

/* ============================
   GET ACTIVE QUIZ GAME
============================ */

export const getActiveFrontendQuizGame = async (): Promise<{ success: boolean; frontendQuizGameId?: string; error?: string }> => {
  if (!checkBackendEnabled('getActiveQuizGame')) {
    return { success: false, error: 'Backend disabled' };
  }

  const status = await getQuizStatus();
  if (status.success && status.isGameOpen && status.frontendQuizGameId) {
    currentFrontendQuizGameId = status.frontendQuizGameId;
    return { success: true, frontendQuizGameId: status.frontendQuizGameId };
  }
  return { success: false, error: 'No active quiz game' };
};

/* ============================
   STREAM MANAGEMENT
============================ */

export interface StreamInfo {
  streamId: string;
  videoId: string;
  chatId: string;
  isStopped: boolean;
  startedAt: string;
  status?: string;
  error?: string | null;
  title?: string;
  channelTitle?: string;
  transformMode?: string | null;
  lastHeartbeatAt?: string | null;
  lastMessageAt?: string | null;
  lastContinuationAt?: string | null;
  ownerClientId?: string | null;
  ownerQuizGameId?: string | null;
  ownerLeaseExpiresAt?: string | null;
  ownerLeaseTouchedAt?: string | null;
}

export const addStreamToGame = async (
  videoUrl: string,
  transformMode?: string,
  override?: StreamScopeOverride
): Promise<{ success: boolean; error?: string; message?: string }> => {
  if (!checkOrchestratorEnabled('addStreamToGame')) {
    return { success: false, error: 'Orchestrator disabled in offline mode' };
  }

  const orchestratorUrl = getOrchestratorBaseUrl();
  const frontendQuizGameId = String(override?.frontendQuizGameId ?? '').trim();
  
  if (!frontendQuizGameId) {
    return { success: false, error: 'Missing quiz game id' };
  }

  try {
    const scope = getStreamScope(override);
    const existing = await getActiveStreams(override);
    if (existing.success && Array.isArray(existing.streams)) {
      const normalizedInput = String(videoUrl || '').trim();
      const youtubeIdMatch =
        normalizedInput.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
        normalizedInput.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
        normalizedInput.match(/^([a-zA-Z0-9_-]{11})$/);
      const requestedVideoId = String(youtubeIdMatch?.[1] || normalizedInput).trim();
      const duplicate = existing.streams.find((stream) => String(stream.videoId || '').trim() === requestedVideoId);
      if (duplicate) {
        return { success: true, message: 'Stream already exists' };
      }
    }
    const payload = JSON.stringify({
      videoUrl,
      streamInput: videoUrl,
      url: videoUrl,
      transformMode: transformMode || "synthetic",
      clientId: getBrowserClientId(),
      applicationId: scope.applicationId,
      frontendQuizGameId,
      connectorEnabled: true,
      connectorTenantId: scope.tenantId,
      connectorApplicationId: scope.applicationId,
      connectorResourceId: scope.resourceId || frontendQuizGameId,
      connectorConsumer: scope.consumer,
      tenantId: scope.tenantId,
      consumer: scope.consumer,
      resourceId: scope.resourceId || frontendQuizGameId,
    });
    const attempt = async (url: string) => {
      const response = await fetchWithTimeout(withClientQuery(url, override), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      return response;
    };

    let response = await attempt(`${orchestratorUrl}/api/stream-manager/streams`);
    if (response.status === 404) {
      response = await attempt(`${orchestratorUrl}/add-stream`);
    }
    const { data: result } = await readJsonSafe(response);
    const parsed = parseResultEnvelope(result);
    if (!response.ok) {
      const errText = String(parsed.error || parsed.message || "").toLowerCase();
      // Idempotent add: if stream is already present, treat as success.
      if (response.status === 400 && errText.includes("already exists")) {
        return { success: true, message: "Stream already exists" };
      }
      return { success: false, error: parsed.error || "Failed to add stream" };
    }
    if (typeof parsed.success === "boolean") {
      return {
        success: parsed.success,
        error: parsed.error,
        message: parsed.message,
      };
    }
    return {
      success: parsed.ok !== false,
      message: parsed.message || (parsed.ok ? "Stream added" : undefined),
      error: parsed.ok === false ? parsed.error || "Failed to add stream" : undefined,
    };
  } catch (error) {
    console.error("Failed to add stream:", error);
    return { success: false, error: "Request failed" };
  }
};

export const removeStreamFromGame = async (
  videoId: string,
  override?: StreamScopeOverride
): Promise<{ success: boolean; error?: string }> => {
  if (!checkOrchestratorEnabled('removeStreamFromGame')) {
    return { success: false, error: 'Orchestrator disabled in offline mode' };
  }

  const orchestratorUrl = getOrchestratorBaseUrl();
  try {
    let response = await fetchWithTimeout(withClientQuery(`${orchestratorUrl}/api/stream-manager/streams/${videoId}`, override), {
      method: "DELETE",
    });
    if (response.status === 404) {
      response = await fetchWithTimeout(withClientQuery(`${orchestratorUrl}/remove-stream/${videoId}`, override), {
        method: "DELETE",
      });
    }
    const { data: result } = await readJsonSafe(response);
    const parsed = parseResultEnvelope(result);
    if (!response.ok) {
      return { success: false, error: parsed.error || "Failed to remove stream" };
    }
    if (typeof parsed.success === "boolean") {
      return { success: parsed.success, error: parsed.error };
    }
    return { success: parsed.ok !== false, error: parsed.ok === false ? parsed.error : undefined };
  } catch (error) {
    console.error("Failed to remove stream:", error);
    return { success: false, error: "Request failed" };
  }
};

export const toggleStreamStatus = async (
  videoId: string,
  override?: StreamScopeOverride
): Promise<{ success: boolean; isStopped?: boolean; error?: string }> => {
  if (!checkOrchestratorEnabled('toggleStreamStatus')) {
    return { success: false, error: 'Orchestrator disabled in offline mode' };
  }

  const orchestratorUrl = getOrchestratorBaseUrl();
  try {
    const existsRes = await fetchWithTimeout(withClientQuery(`${orchestratorUrl}/api/stream-manager/streams`, override));
    if (existsRes.status === 404) {
      // Compatibility: toggle route only exists on legacy API.
      const response = await fetchWithTimeout(withClientQuery(`${orchestratorUrl}/toggle-stream/${videoId}`, override), {
        method: "POST",
      });
      const { data } = await readJsonSafe(response);
      const parsed = parseResultEnvelope(data);
      if (typeof parsed.success === "boolean") {
        return { success: parsed.success, error: parsed.error };
      }
      return {
        success: parsed.ok ?? false,
        error: parsed.error || (parsed.ok === false ? "Toggle failed" : "Toggle failed (non-JSON response)"),
      };
    }
    // Use current status to infer intended start/stop action.
    const streamListJson = await existsRes.json().catch(() => ({}));
    const streams = Array.isArray(streamListJson?.streams) ? streamListJson.streams : [];
    const target = streams.find((entry: { id?: string; streamId?: string; status?: string }) =>
      String(entry.id || entry.streamId || "") === videoId
    );
    const action = target?.status === "running" ? "stop" : "start";
    const direct = await fetchWithTimeout(withClientQuery(`${orchestratorUrl}/api/stream-manager/streams/${videoId}/${action}`, override), {
      method: "POST",
    });
    const { data: directJson } = await readJsonSafe(direct);
    const parsed = parseResultEnvelope(directJson);
    if (!direct.ok || parsed.ok === false || parsed.success === false) {
      return { success: false, error: parsed.error || "Toggle failed" };
    }
    return { success: true, isStopped: action === "stop" };
  } catch (error) {
    console.error("Failed to toggle stream:", error);
    return { success: false, error: "Request failed" };
  }
};

export const getActiveStreams = async (override?: StreamScopeOverride): Promise<{
  success: boolean;
  streams?: StreamInfo[];
  error?: string;
}> => {
  if (!checkOrchestratorEnabled('getActiveStreams')) {
    return { success: true, streams: [] };
  }

  const frontendQuizGameId = String(override?.frontendQuizGameId ?? '').trim();
  if (!frontendQuizGameId) {
    return { success: true, streams: [] };
  }

  const orchestratorUrl = getOrchestratorBaseUrl();
  try {
    const primary = await fetchWithTimeoutRetry(
      withClientQuery(`${orchestratorUrl}/api/stream-manager/streams`, override),
      {},
      20000,
      1
    );
    const primaryRead = await readJsonSafe(primary);
    const primaryJson = parseResultEnvelope(primaryRead.data);
    const rawStreams = Array.isArray(primaryJson.streams) ? primaryJson.streams : [];
    const toStreamInfo = (entry: unknown): StreamInfo => {
      const stream = asRecord(entry);
      return {
        streamId: String(stream.id || stream.streamId || ""),
        videoId: String(stream.sourceVideoId || stream.videoId || stream.id || stream.streamId || ""),
        chatId: readString(stream.chatId) || "",
        isStopped: readString(stream.status) !== "running",
        startedAt: readString(stream.addedAt) || readString(stream.lastHeartbeatAt) || new Date().toISOString(),
        status: readString(stream.status) || "idle",
        error: readString(stream.error) || readString(stream.lastError) || null,
        title: readString(stream.title) || "",
        channelTitle: readString(stream.channelTitle) || "",
        transformMode: extractTransformMode(stream),
        lastHeartbeatAt: readString(stream.lastHeartbeatAt) || null,
        lastMessageAt: readString(stream.lastMessageAt) || null,
        lastContinuationAt: readString(stream.lastContinuationAt) || null,
        ownerClientId: readString(stream.ownerClientId) || null,
        ownerQuizGameId: readString(stream.ownerQuizGameId) || null,
        ownerLeaseExpiresAt: readString(stream.ownerLeaseExpiresAt) || null,
        ownerLeaseTouchedAt: readString(stream.ownerLeaseTouchedAt) || null,
      };
    };
    const streams = rawStreams.map(toStreamInfo);
    if (Array.isArray(streams) && streams.length >= 0 && primary.ok) {
      resetCircuit();
      return { success: true, streams };
    }

    const fallback = await fetchWithTimeoutRetry(
      withClientQuery(`${orchestratorUrl}/api/streams/active`, override),
      {},
      20000,
      1
    );
    const { data: fallbackJson } = await readJsonSafe(fallback);
    const parsedFallback = parseResultEnvelope(fallbackJson);
    if (parsedFallback.success && Array.isArray(parsedFallback.streams)) {
      return { success: true, streams: parsedFallback.streams.map(toStreamInfo) };
    }
    return {
      success: false,
      error: primaryRead.nonJsonBody?.startsWith("<!DOCTYPE")
        ? "Server returned HTML instead of JSON. Check API server URL/proxy."
        : "Failed to load streams",
    };
  } catch (error) {
    tripCircuit();
    if (!(error instanceof DOMException && error.name === "AbortError") && _consecutiveFailures <= 2) {
      console.error("Failed to get active streams:", error);
    }
    return {
      success: false,
      error: isAbortError(error) ? "Request timed out" : "Request failed",
    };
  }
};

export const restartStream = async (
  videoId: string,
  override?: StreamScopeOverride
): Promise<{ success: boolean; error?: string }> => {
  if (!checkOrchestratorEnabled('restartStream')) {
    return { success: false, error: 'Orchestrator disabled in offline mode' };
  }

  const orchestratorUrl = getOrchestratorBaseUrl();
  try {
    let response = await fetchWithTimeout(withClientQuery(`${orchestratorUrl}/api/stream-manager/streams/${videoId}/restart`, override), {
      method: "POST",
    });
    if (response.status === 404) {
      response = await fetchWithTimeout(withClientQuery(`${orchestratorUrl}/restart-stream/${videoId}`, override), {
        method: "POST",
      });
      const { data } = await readJsonSafe(response);
      const parsed = parseResultEnvelope(data);
      return { success: parsed.success ?? parsed.ok ?? false, error: parsed.error || "Restart failed (non-JSON response)" };
    }
    const { data: direct } = await readJsonSafe(response);
    const parsed = parseResultEnvelope(direct);
    if (!response.ok || parsed.ok === false || parsed.success === false) {
      return { success: false, error: parsed.error || "Restart failed" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to restart stream:", error);
    return { success: false, error: "Request failed" };
  }
};

export const revalidateStream = async (
  videoId: string,
  override?: StreamScopeOverride
): Promise<{ success: boolean; error?: string }> => {
  if (!checkOrchestratorEnabled('revalidateStream')) {
    return { success: false, error: 'Orchestrator disabled in offline mode' };
  }

  const orchestratorUrl = getOrchestratorBaseUrl();
  try {
    let response = await fetchWithTimeout(withClientQuery(`${orchestratorUrl}/api/stream-manager/streams/${videoId}/revalidate`, override), {
      method: "POST",
    });
    if (response.status === 404) {
      response = await fetchWithTimeout(withClientQuery(`${orchestratorUrl}/revalidate-stream/${videoId}`, override), {
        method: "POST",
      });
      const { data } = await readJsonSafe(response);
      const parsed = parseResultEnvelope(data);
      return { success: parsed.success ?? parsed.ok ?? false, error: parsed.error || "Revalidate failed (non-JSON response)" };
    }
    const { data: direct } = await readJsonSafe(response);
    const parsed = parseResultEnvelope(direct);
    if (!response.ok || parsed.ok === false || parsed.success === false) {
      return { success: false, error: parsed.error || "Revalidate failed" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to revalidate stream:", error);
    return { success: false, error: "Request failed" };
  }
};

export const refreshAllStreams = async (override?: StreamScopeOverride): Promise<{ success: boolean; error?: string }> => {
  if (!checkOrchestratorEnabled('refreshAllStreams')) {
    return { success: false, error: 'Orchestrator disabled in offline mode' };
  }

  const orchestratorUrl = getOrchestratorBaseUrl();
  try {
    let response = await fetchWithTimeoutRetry(withClientQuery(`${orchestratorUrl}/api/stream-manager/refresh`, override), {
      method: "POST",
    }, 25000, 1);
    if (response.status === 404) {
      response = await fetchWithTimeoutRetry(withClientQuery(`${orchestratorUrl}/refresh-streams`, override), {
        method: "POST",
      }, 25000, 1);
      const { data } = await readJsonSafe(response);
      const parsed = parseResultEnvelope(data);
      return { success: parsed.success ?? parsed.ok ?? false, error: parsed.error || "Refresh failed (non-JSON response)" };
    }
    const { data: direct } = await readJsonSafe(response);
    const parsed = parseResultEnvelope(direct);
    if (!response.ok || parsed.ok === false || parsed.success === false) {
      return { success: false, error: parsed.error || "Refresh failed" };
    }
    return { success: true };
  } catch (error) {
    if (!isAbortError(error)) {
      console.error("Failed to refresh streams:", error);
    }
    return {
      success: false,
      error: isAbortError(error)
        ? "Refresh timed out (orchestrator may still be processing). Try again."
        : "Request failed",
    };
  }
};

export const startAllStreams = async (override?: StreamScopeOverride): Promise<{ success: boolean; error?: string }> => {
  if (!checkOrchestratorEnabled('startAllStreams')) {
    return { success: false, error: 'Orchestrator disabled in offline mode' };
  }

  const orchestratorUrl = getOrchestratorBaseUrl();
  try {
    let response = await fetchWithTimeoutRetry(withClientQuery(`${orchestratorUrl}/api/stream-manager/start-all`, override), {
      method: "POST",
    }, 15000, 1);
    if (response.status === 404) {
      response = await fetchWithTimeoutRetry(withClientQuery(`${orchestratorUrl}/start-all-streams`, override), {
        method: "POST",
      }, 15000, 1);
      const { data } = await readJsonSafe(response);
      const parsed = parseResultEnvelope(data);
      return { success: parsed.success ?? parsed.ok ?? false, error: parsed.error || "Start-all failed (non-JSON response)" };
    }
    const { data: direct } = await readJsonSafe(response);
    const parsed = parseResultEnvelope(direct);
    if (!response.ok || parsed.ok === false || parsed.success === false) {
      return { success: false, error: parsed.error || "Start-all failed" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to start all streams:", error);
    return { success: false, error: "Request failed" };
  }
};

export const stopAllStreams = async (override?: StreamScopeOverride): Promise<{ success: boolean; error?: string }> => {
  if (!checkOrchestratorEnabled('stopAllStreams')) {
    return { success: false, error: 'Orchestrator disabled in offline mode' };
  }

  const orchestratorUrl = getOrchestratorBaseUrl();
  try {
    let response = await fetchWithTimeoutRetry(withClientQuery(`${orchestratorUrl}/api/stream-manager/stop-all`, override), {
      method: "POST",
    }, 15000, 1);
    if (response.status === 404) {
      response = await fetchWithTimeoutRetry(withClientQuery(`${orchestratorUrl}/stop-all-streams`, override), {
        method: "POST",
      }, 15000, 1);
      const { data } = await readJsonSafe(response);
      const parsed = parseResultEnvelope(data);
      return { success: parsed.success ?? parsed.ok ?? false, error: parsed.error || "Stop-all failed (non-JSON response)" };
    }
    const { data: direct } = await readJsonSafe(response);
    const parsed = parseResultEnvelope(direct);
    if (!response.ok || parsed.ok === false || parsed.success === false) {
      return { success: false, error: parsed.error || "Stop-all failed" };
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to stop all streams:", error);
    return { success: false, error: "Request failed" };
  }
};

/* ============================
   CREATE QUIZ GAME (NEW)
============================ */

export const createQuizGame = async (
  frontendQuizGameId: string,
  applicationId: string,
  gameTitle?: string
): Promise<{
  success: boolean;
  frontendQuizGameId?: string;
  alreadyExists?: boolean;
  error?: string;
}> => {
  if (!checkBackendEnabled('createQuizGame')) {
    return { success: true, frontendQuizGameId: undefined };
  }

  const config = getApiConfig();

  try {
    const response = await fetch(
      `${config.serverUrl}/api/quizgame/create-from-frontend`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontendQuizGameId,
          applicationId,
          gameTitle,
        }),
      }
    );

    const result = await response.json();

    if (result.success && result.frontendQuizGameId) {
      currentFrontendQuizGameId = frontendQuizGameId;
      console.log("[API] Quiz game created:", currentFrontendQuizGameId, result.alreadyExists ? "(already existed)" : "");
    }

    return result;
  } catch (error) {
    console.error("Failed to create quiz game:", error);
    return {
      success: false,
      error: "Request failed",
    };
  }
};
