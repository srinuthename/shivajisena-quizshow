// Application Mode Configuration
// Controls how the application operates with backend services

import { readActiveQuizRunSettingSync } from '@/lib/quizRunConfig';

export type AppMode = 'offline' | 'frontend_scoring' | 'backend_scoring' | 'online';

export interface AppModeConfig {
  mode: AppMode;
  label: string;
  description: string;
  features: {
    sseRequired: boolean;
    apiRequired: boolean;
    frontendViewerScoring: boolean;
    backendViewerScoring: boolean;
    youtubePanel: boolean;
    viewerLeaderboards: boolean;
    clockSyncRequired: boolean;
    localStoragePersistence: boolean;
  };
}

const APP_MODE_KEY = 'appOperationMode';
const SSE_SERVER_URL_KEY = 'sseStreamServerUrl';
const API_SERVER_URL_KEY = 'apiServerUrl';
const BACKEND_TARGET_KEY = 'backendTarget';
const QUIZ_DOMAIN_MODE_KEY = 'quizDomainMode';
const QUIZ_DOMAIN_SERVER_URL_KEY = 'quizDomainServerUrl';
const LEGACY_LOCAL_BACKEND_BASES = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);

export type QuizDomainMode = 'embedded' | 'split' | 'disabled';
export type BackendTarget = 'cloud' | 'local' | 'custom' | 'none';

export const APP_MODE_CONFIGS: Record<AppMode, AppModeConfig> = {
  offline: {
    mode: 'offline',
    label: 'Offline Mode (No Backend)',
    description: 'Quiz engine only - teams, scoring, leaderboards. No backend connections, no viewers.',
    features: {
      sseRequired: false,
      apiRequired: false,
      frontendViewerScoring: false,
      backendViewerScoring: false,
      youtubePanel: false,
      viewerLeaderboards: false,
      clockSyncRequired: false,
      localStoragePersistence: true,
    },
  },
  frontend_scoring: {
    mode: 'frontend_scoring',
    label: 'Frontend Scoring Engine',
    description: 'Frontend handles scoring and timing. Backend can still persist quiz runs, state, analytics, and prizes.',
    features: {
      sseRequired: true,
      apiRequired: false,
      frontendViewerScoring: true,
      backendViewerScoring: false,
      youtubePanel: true,
      viewerLeaderboards: true,
      clockSyncRequired: true,
      localStoragePersistence: true,
    },
  },
  backend_scoring: {
    mode: 'backend_scoring',
    label: 'Backend Scoring Engine',
    description: 'Frontend quiz + backend handles viewer scoring and leaderboards.',
    features: {
      sseRequired: true,
      apiRequired: true,
      frontendViewerScoring: false,
      backendViewerScoring: true,
      youtubePanel: true,
      viewerLeaderboards: true,
      clockSyncRequired: true,
      localStoragePersistence: true,
    },
  },
  online: {
    mode: 'online',
    label: 'Online Mode',
    description: 'Backend is the quiz engine. Frontend is display/controller only.',
    features: {
      sseRequired: true,
      apiRequired: true,
      frontendViewerScoring: false,
      backendViewerScoring: true,
      youtubePanel: true,
      viewerLeaderboards: true,
      clockSyncRequired: true,
      localStoragePersistence: false,
    },
  },
};

export const DEFAULT_LOCAL_BACKEND_BASE_URL =
  String(import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:50510').trim().replace(/\/+$/, '');
export const DEFAULT_PUBLIC_BACKEND_BASE_URL = DEFAULT_LOCAL_BACKEND_BASE_URL;
export const DEFAULT_API_SERVER_URL = DEFAULT_LOCAL_BACKEND_BASE_URL;
export const DEFAULT_SSE_STREAM_URL = `${DEFAULT_LOCAL_BACKEND_BASE_URL}/sse`;
export const DEFAULT_QUIZ_DOMAIN_MODE: QuizDomainMode = 'embedded';
export const DEFAULT_QUIZ_DOMAIN_SERVER_URL = DEFAULT_API_SERVER_URL;

const getOrchestratorBaseUrl = (): string => {
  const mode = getAppMode();
  if (mode === 'offline' || getBackendTarget() === 'none') {
    return '';
  }

  const sseUrl = getSSEStreamUrl();
  if (sseUrl !== DEFAULT_SSE_STREAM_URL) {
    return getSSEBaseUrl();
  }
  return getApiServerUrl();
};

// Migration: map old mode names to new ones
const migrateMode = (saved: string | null): AppMode | null => {
  if (!saved) return null;
  
  // Map old 'mixed' mode to 'frontend_scoring'
  if (saved === 'mixed') return 'frontend_scoring';
  
  // Validate new mode names
  if (saved === 'offline' || saved === 'frontend_scoring' || saved === 'backend_scoring' || saved === 'online') {
    return saved as AppMode;
  }
  
  return null;
};

export const getAppMode = (): AppMode => {
  try {
    const saved = readActiveQuizRunSettingSync(APP_MODE_KEY) ?? localStorage.getItem(APP_MODE_KEY);
    const migrated = migrateMode(saved);
    if (migrated) {
      // Persist migrated mode if it was changed
      if (saved === 'mixed') {
        localStorage.setItem(APP_MODE_KEY, 'frontend_scoring');
      }
      return migrated;
    }
  } catch (e) {
    console.error('Failed to load app mode:', e);
  }
  return 'frontend_scoring'; // Default to frontend scoring mode
};

export const setAppMode = (mode: AppMode): void => {
  try {
    localStorage.setItem(APP_MODE_KEY, mode);
    window.dispatchEvent(new CustomEvent('appModeChanged', { detail: mode }));
  } catch (e) {
    console.error('Failed to save app mode:', e);
  }
};

export const getAppModeConfig = (): AppModeConfig => {
  return APP_MODE_CONFIGS[getAppMode()];
};

// SSE Stream Server URL
export const getSSEStreamUrl = (): string => {
  try {
    migrateLegacyBackendStorage();
    return readActiveQuizRunSettingSync(SSE_SERVER_URL_KEY) || localStorage.getItem(SSE_SERVER_URL_KEY) || DEFAULT_SSE_STREAM_URL;
  } catch {
    return DEFAULT_SSE_STREAM_URL;
  }
};

export const setSSEStreamUrl = (url: string): void => {
  try {
    localStorage.setItem(SSE_SERVER_URL_KEY, url);
    syncBackendTargetWithBaseUrl(getSSEBaseFromUrl(url));
    window.dispatchEvent(new CustomEvent('sseStreamUrlChanged', { detail: url }));
  } catch (e) {
    console.error('Failed to save SSE stream URL:', e);
  }
};

const normalizeBackendBaseUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
};

const getSSEStreamUrlForBase = (baseUrl: string): string => `${normalizeBackendBaseUrl(baseUrl)}/sse`;

const getSSEBaseFromUrl = (rawUrl: string): string => {
  const raw = rawUrl.trim().replace(/\/+$/, '');
  if (raw.endsWith('/api/events')) return raw.slice(0, -'/api/events'.length);
  if (raw.endsWith('/sse')) return raw.slice(0, -'/sse'.length);
  if (raw.endsWith('/stream')) return raw.slice(0, -'/stream'.length);
  return raw;
};

const migrateLegacyBackendStorage = (): void => {
  try {
    const storedApiBase = normalizeBackendBaseUrl(localStorage.getItem(API_SERVER_URL_KEY) || '');
    if (storedApiBase && LEGACY_LOCAL_BACKEND_BASES.has(storedApiBase)) {
      localStorage.setItem(API_SERVER_URL_KEY, DEFAULT_API_SERVER_URL);
      localStorage.setItem('backendUrl', DEFAULT_API_SERVER_URL);
    }

    const storedSseUrl = (localStorage.getItem(SSE_SERVER_URL_KEY) || '').trim();
    if (!storedSseUrl) return;
    const storedSseBase = getSSEBaseFromUrl(storedSseUrl);
    if (LEGACY_LOCAL_BACKEND_BASES.has(storedSseBase)) {
      localStorage.setItem(SSE_SERVER_URL_KEY, DEFAULT_SSE_STREAM_URL);
    }
  } catch {
    // Ignore storage migration errors in private mode / blocked storage environments.
  }
};

export const getBackendBaseUrl = (): string => {
  if (getBackendTarget() === 'none') return '';
  return normalizeBackendBaseUrl(getApiServerUrl());
};

export const getBackendTargetBaseUrl = (target: Exclude<BackendTarget, 'custom' | 'none'>): string => {
  return target === 'cloud' ? DEFAULT_API_SERVER_URL : DEFAULT_API_SERVER_URL;
};

export const isLocalBackendBaseUrl = (baseUrl: string): boolean => {
  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

export const requiresHostLoginForBackendUrl = (baseUrl: string): boolean => {
  const normalized = normalizeBackendBaseUrl(baseUrl);
  if (!normalized) return false;
  return !isLocalBackendBaseUrl(normalized);
};

export const inferBackendTarget = (baseUrl: string): BackendTarget => {
  const normalized = normalizeBackendBaseUrl(baseUrl);
  if (!normalized) return 'none';
  return 'custom';
};

const syncBackendTargetWithBaseUrl = (baseUrl: string): void => {
  try {
    localStorage.setItem(BACKEND_TARGET_KEY, inferBackendTarget(baseUrl));
  } catch (e) {
    console.error('Failed to save backend target:', e);
  }
};

export const getBackendTarget = (): BackendTarget => {
  try {
    const saved = localStorage.getItem(BACKEND_TARGET_KEY);
    if (saved === 'cloud' || saved === 'local' || saved === 'custom' || saved === 'none') {
      return saved;
    }
    // IMPORTANT: do NOT call getApiServerUrl() here — it calls getBackendTarget()
    // back, producing infinite recursion on a fresh browser (no localStorage).
    // Read the raw URL key directly and infer from it.
    const rawApiUrl = (localStorage.getItem(API_SERVER_URL_KEY) || DEFAULT_API_SERVER_URL).trim();
    return inferBackendTarget(rawApiUrl);
  } catch {
    return inferBackendTarget(DEFAULT_API_SERVER_URL);
  }
};

export const setBackendTarget = (target: BackendTarget): void => {
  try {
    localStorage.setItem(BACKEND_TARGET_KEY, target);
    window.dispatchEvent(new CustomEvent('backendTargetChanged', { detail: target }));
  } catch (e) {
    console.error('Failed to save backend target:', e);
  }
};

export const applyBackendBaseUrl = (baseUrl: string, target: BackendTarget = 'custom'): void => {
  const normalizedBaseUrl = normalizeBackendBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return;

  try {
    localStorage.setItem(API_SERVER_URL_KEY, normalizedBaseUrl);
    localStorage.setItem(SSE_SERVER_URL_KEY, getSSEStreamUrlForBase(normalizedBaseUrl));
    localStorage.setItem('backendUrl', normalizedBaseUrl);
    setBackendTarget(target);
    window.dispatchEvent(new CustomEvent('apiServerUrlChanged', { detail: normalizedBaseUrl }));
    window.dispatchEvent(new CustomEvent('sseStreamUrlChanged', { detail: getSSEStreamUrlForBase(normalizedBaseUrl) }));
  } catch (e) {
    console.error('Failed to apply backend base URL:', e);
  }
};

type SSEEndpointPath = '/sse' | '/api/events' | '/stream';

const getConfiguredSSEEndpointPath = (rawUrl: string): SSEEndpointPath => {
  const raw = rawUrl.trim().replace(/\/+$/, '');
  if (raw.endsWith('/api/events')) return '/api/events';
  if (raw.endsWith('/stream')) return '/stream';
  return '/sse';
};

// Resolve the final SSE events URL from the configured base.
export const getSSEEventsUrl = (): string => {
  if (getAppMode() === 'offline' || getBackendTarget() === 'none') {
    return '';
  }

  const configured = getSSEStreamUrl();
  const endpointPath = getConfiguredSSEEndpointPath(configured);
  const baseUrl = getSSEBaseUrl();
  return baseUrl ? `${baseUrl}${endpointPath}` : '';
};

// Resolve the base SSE service URL from any allowed input.
// Examples:
// - http://host:3000/sse -> http://host:3000
// - http://host:3000/api/events -> http://host:3000
// - http://host:3000 -> http://host:3000
export const getSSEBaseUrl = (): string => {
  if (getAppMode() === 'offline' || getBackendTarget() === 'none') {
    return '';
  }

  const raw = getSSEStreamUrl().replace(/\/+$/, '');
  if (raw.endsWith('/api/events')) {
    return raw.slice(0, -'/api/events'.length);
  }
  if (raw.endsWith('/sse')) {
    return raw.slice(0, -'/sse'.length);
  }
  if (raw.endsWith('/stream')) {
    return raw.slice(0, -'/stream'.length);
  }
  return raw;
};

export const getSSETimeUrl = (): string => `${getSSEBaseUrl()}/api/time`;

export const getSSEQuizTimelineUrl = (action: 'open' | 'close'): string =>
  `${getSSEBaseUrl()}/api/quiz/timeline/${action}`;

// API Server URL (separate from SSE)
export const getApiServerUrl = (): string => {
  try {
    migrateLegacyBackendStorage();
    if (getBackendTarget() === 'none' || getAppMode() === 'offline') {
      return '';
    }

    const newKey = localStorage.getItem(API_SERVER_URL_KEY);
    if (newKey) return newKey;
    return DEFAULT_API_SERVER_URL;
  } catch {
    return getBackendTarget() === 'none' || getAppMode() === 'offline' ? '' : DEFAULT_API_SERVER_URL;
  }
};

export const setApiServerUrl = (url: string): void => {
  try {
    const normalized = normalizeBackendBaseUrl(url);
    localStorage.setItem(API_SERVER_URL_KEY, normalized);
    syncBackendTargetWithBaseUrl(normalized);
    window.dispatchEvent(new CustomEvent('apiServerUrlChanged', { detail: normalized }));
  } catch (e) {
    console.error('Failed to save API server URL:', e);
  }
};

const normalizeQuizDomainMode = (value: string | null): QuizDomainMode | null => {
  if (!value) return null;
  if (value === 'embedded' || value === 'split' || value === 'disabled') return value;
  return null;
};

export const getQuizDomainMode = (): QuizDomainMode => {
  try {
    const raw = localStorage.getItem(QUIZ_DOMAIN_MODE_KEY);
    const mode = normalizeQuizDomainMode(raw);
    return mode || DEFAULT_QUIZ_DOMAIN_MODE;
  } catch {
    return DEFAULT_QUIZ_DOMAIN_MODE;
  }
};

export const setQuizDomainMode = (mode: QuizDomainMode): void => {
  try {
    localStorage.setItem(QUIZ_DOMAIN_MODE_KEY, mode);
    window.dispatchEvent(new CustomEvent('quizDomainModeChanged', { detail: mode }));
  } catch (e) {
    console.error('Failed to save quiz domain mode:', e);
  }
};

export const getQuizDomainServerUrl = (): string => {
  try {
    const stored = (localStorage.getItem(QUIZ_DOMAIN_SERVER_URL_KEY) || '').replace(/\/+$/, '');
    return stored || DEFAULT_QUIZ_DOMAIN_SERVER_URL;
  } catch {
    return DEFAULT_QUIZ_DOMAIN_SERVER_URL;
  }
};

export const setQuizDomainServerUrl = (url: string): void => {
  try {
    localStorage.setItem(QUIZ_DOMAIN_SERVER_URL_KEY, url);
    window.dispatchEvent(new CustomEvent('quizDomainServerUrlChanged', { detail: url }));
  } catch (e) {
    console.error('Failed to save quiz domain server URL:', e);
  }
};

export const getQuizDomainApiBaseUrl = (): string => {
  if (getAppMode() === 'offline' || getBackendTarget() === 'none') {
    return '';
  }
  const mode = getQuizDomainMode();
  if (mode === 'split') {
    return getQuizDomainServerUrl().replace(/\/+$/, '');
  }
  return getApiServerUrl();
};

// SSE is only available in modes that require it
// In offline mode, SSE is always disabled regardless of the toggle
const SSE_ENABLED_KEY = 'sseStreamEnabled';

export const isSSEEnabled = (): boolean => {
  try {
    const mode = getAppMode();
    const config = APP_MODE_CONFIGS[mode];
    
    // If mode doesn't support SSE, always return false
    if (!config.features.sseRequired && !config.features.youtubePanel) {
      return false;
    }
    
    // In offline mode, SSE is always disabled
    if (mode === 'offline') {
      return false;
    }
    
    const saved = readActiveQuizRunSettingSync(SSE_ENABLED_KEY) ?? localStorage.getItem(SSE_ENABLED_KEY);
    // Default to true for SSE-capable modes
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
};

export const setSSEEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SSE_ENABLED_KEY, enabled.toString());
    window.dispatchEvent(new CustomEvent('sseEnabledChanged', { detail: enabled }));
  } catch (e) {
    console.error('Failed to save SSE enabled state:', e);
  }
};

// Helper to check if mode supports viewer features
export const modeSupportsViewers = (mode?: AppMode): boolean => {
  const currentMode = mode || getAppMode();
  return currentMode !== 'offline';
};

// Helper to check if mode requires API server
export const modeRequiresApi = (mode?: AppMode): boolean => {
  const currentMode = mode || getAppMode();
  const config = APP_MODE_CONFIGS[currentMode];
  return config.features.apiRequired;
};

// Helper to check if mode requires SSE
export const modeRequiresSSE = (mode?: AppMode): boolean => {
  const currentMode = mode || getAppMode();
  const config = APP_MODE_CONFIGS[currentMode];
  return config.features.sseRequired;
};

// Helper to check if frontend should score viewers
export const shouldScoreViewersLocally = (mode?: AppMode): boolean => {
  const currentMode = mode || getAppMode();
  const config = APP_MODE_CONFIGS[currentMode];
  return config.features.frontendViewerScoring;
};

// Helper to check if backend quiz sync should be active
export const isBackendSyncEnabled = (): boolean => {
  return getAppMode() === 'online';
};

// SSE Advanced Settings
const SSE_RECONNECT_DELAY_KEY = 'sseReconnectDelay';
const SSE_HEARTBEAT_TIMEOUT_KEY = 'sseHeartbeatTimeout';
const VIEWER_ANSWER_DELAY_KEY = 'viewerAnswerDelayMs';
const VIEWER_POST_REVEAL_GRACE_KEY = 'viewerPostRevealGraceMs';

export const DEFAULT_SSE_RECONNECT_DELAY = 3000; // ms
export const DEFAULT_SSE_HEARTBEAT_TIMEOUT = 45; // seconds
export const DEFAULT_VIEWER_ANSWER_DELAY = 500; // ms
export const DEFAULT_VIEWER_POST_REVEAL_GRACE_MS = 6000; // ms
export const MIN_VIEWER_POST_REVEAL_GRACE_MS = 2000; // ms
export const MAX_VIEWER_POST_REVEAL_GRACE_MS = 10000; // ms

const clampViewerPostRevealGraceMs = (value: number): number =>
  Math.max(
    MIN_VIEWER_POST_REVEAL_GRACE_MS,
    Math.min(MAX_VIEWER_POST_REVEAL_GRACE_MS, Math.round(value))
  );

export const getSSEReconnectDelay = (): number => {
  try {
    const saved = localStorage.getItem(SSE_RECONNECT_DELAY_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_SSE_RECONNECT_DELAY;
  } catch {
    return DEFAULT_SSE_RECONNECT_DELAY;
  }
};

export const setSSEReconnectDelay = (delay: number): void => {
  try {
    localStorage.setItem(SSE_RECONNECT_DELAY_KEY, delay.toString());
  } catch (e) {
    console.error('Failed to save SSE reconnect delay:', e);
  }
};

export const getSSEHeartbeatTimeout = (): number => {
  try {
    const saved = localStorage.getItem(SSE_HEARTBEAT_TIMEOUT_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_SSE_HEARTBEAT_TIMEOUT;
  } catch {
    return DEFAULT_SSE_HEARTBEAT_TIMEOUT;
  }
};

export const setSSEHeartbeatTimeout = (timeout: number): void => {
  try {
    localStorage.setItem(SSE_HEARTBEAT_TIMEOUT_KEY, timeout.toString());
  } catch (e) {
    console.error('Failed to save SSE heartbeat timeout:', e);
  }
};

// Viewer answer delay factor (for frontend scoring latency compensation)
export const getViewerAnswerDelay = (): number => {
  try {
    const saved = localStorage.getItem(VIEWER_ANSWER_DELAY_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_VIEWER_ANSWER_DELAY;
  } catch {
    return DEFAULT_VIEWER_ANSWER_DELAY;
  }
};

export const setViewerAnswerDelay = (delayMs: number): void => {
  try {
    localStorage.setItem(VIEWER_ANSWER_DELAY_KEY, delayMs.toString());
  } catch (e) {
    console.error('Failed to save viewer answer delay:', e);
  }
};

// Grace window after reveal to still accept in-flight answers.
export const getViewerPostRevealGraceMs = (): number => {
  try {
    const saved = localStorage.getItem(VIEWER_POST_REVEAL_GRACE_KEY);
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_VIEWER_POST_REVEAL_GRACE_MS;
    if (!Number.isFinite(parsed)) return DEFAULT_VIEWER_POST_REVEAL_GRACE_MS;
    return clampViewerPostRevealGraceMs(parsed);
  } catch {
    return DEFAULT_VIEWER_POST_REVEAL_GRACE_MS;
  }
};

export const setViewerPostRevealGraceMs = (delayMs: number): void => {
  try {
    const clamped = clampViewerPostRevealGraceMs(delayMs);
    localStorage.setItem(VIEWER_POST_REVEAL_GRACE_KEY, clamped.toString());
  } catch (e) {
    console.error('Failed to save viewer post-reveal grace:', e);
  }
};

// Startup diagnostics to quickly verify effective wiring per mode.
export const logModeEndpointDiagnostics = (): void => {
  const mode = getAppMode();
  const config = APP_MODE_CONFIGS[mode];

  console.info('[AppMode] Endpoint diagnostics', {
    mode,
    modeLabel: config.label,
    requiresSSE: config.features.sseRequired,
    requiresApi: config.features.apiRequired,
    sseEnabled: isSSEEnabled(),
    sseConfiguredUrl: getSSEStreamUrl(),
    sseBaseUrl: getSSEBaseUrl(),
    sseEventsUrl: getSSEEventsUrl(),
    sseTimeUrl: getSSETimeUrl(),
    apiServerUrl: getApiServerUrl(),
  });
};
