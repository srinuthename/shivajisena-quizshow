import type { StreamInfo } from '@/config/apiConfig';
import type { BrandingConfig } from '@/config/brandingConfig';

const QUIZ_RUN_CONFIG_PREFIX = 'quizRunConfig:';
const ACTIVE_QUIZ_RUN_CONFIG_ID_KEY = 'quizActiveRunConfigId';

export interface SavedQuizRunConfig {
  frontendQuizGameId: string;
  applicationId: string | null;
  savedAt: number;
  episodeName: string;
  episodeNumber: string;
  quizShowName: string;
  branding: BrandingConfig;
  teams: Array<{
    name: string;
    members: string[];
    avatar?: string;
  }>;
  topicSettings: Record<string, boolean>;
  settings: Record<string, unknown>;
  streams: StreamInfo[];
  runtime: {
    appMode: string;
    sseEnabled: boolean;
    sseStreamUrl: string;
    startedAtMs?: number | null;
    skipInitialBackendRestore?: boolean;
  };
}

type SavedQuizRunConfigPatch = Omit<Partial<SavedQuizRunConfig>, 'runtime'> & {
  runtime?: Partial<SavedQuizRunConfig['runtime']>;
};

const getQuizRunConfigKey = (frontendQuizGameId: string): string =>
  `${QUIZ_RUN_CONFIG_PREFIX}${String(frontendQuizGameId || '').trim()}`;

const stringifyValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value ?? null);
};

const mapConfigKeyToValue = (config: SavedQuizRunConfig, key: string): unknown => {
  switch (key) {
    case 'quizBranding':
      return config.branding;
    case 'teamConfigs':
      return config.teams;
    case 'topicSettings':
      return config.topicSettings;
    case 'episodeNumber':
      return config.episodeNumber;
    case 'episodeName':
      return config.episodeName;
    case 'quizShowName':
      return config.quizShowName;
    case 'appOperationMode':
      return config.runtime.appMode;
    case 'sseStreamEnabled':
      return config.runtime.sseEnabled;
    case 'sseStreamServerUrl':
      return config.runtime.sseStreamUrl;
    case 'savedStreams':
      return config.streams;
    default:
      return config.settings[key];
  }
};

export const saveQuizRunConfig = (config: SavedQuizRunConfig): void => {
  const runId = String(config.frontendQuizGameId || '').trim();
  if (!runId) return;
  try {
    localStorage.setItem(getQuizRunConfigKey(runId), JSON.stringify({ ...config, frontendQuizGameId: runId }));
    window.dispatchEvent(new CustomEvent('quizRunConfigSaved', { detail: runId }));
  } catch (error) {
    console.error('[QuizRunConfig] Failed to persist run config:', error);
  }
};

export const updateQuizRunConfig = (
  frontendQuizGameId: string | null | undefined,
  updates: SavedQuizRunConfigPatch
): SavedQuizRunConfig | null => {
  const current = readQuizRunConfigSync(frontendQuizGameId);
  if (!current) return null;
  const next: SavedQuizRunConfig = {
    ...current,
    ...updates,
    runtime: {
      ...current.runtime,
      ...(updates.runtime || {}),
    },
  };
  saveQuizRunConfig(next);
  return next;
};

export const readQuizRunConfigSync = (frontendQuizGameId: string | null | undefined): SavedQuizRunConfig | null => {
  const runId = String(frontendQuizGameId || '').trim();
  if (!runId) return null;
  try {
    const raw = localStorage.getItem(getQuizRunConfigKey(runId));
    if (!raw) return null;
    return JSON.parse(raw) as SavedQuizRunConfig;
  } catch {
    return null;
  }
};

export const setActiveQuizRunConfig = (frontendQuizGameId: string | null | undefined): void => {
  const runId = String(frontendQuizGameId || '').trim();
  try {
    if (runId) {
      sessionStorage.setItem(ACTIVE_QUIZ_RUN_CONFIG_ID_KEY, runId);
    } else {
      sessionStorage.removeItem(ACTIVE_QUIZ_RUN_CONFIG_ID_KEY);
    }
    window.dispatchEvent(new CustomEvent('quizActiveRunConfigChanged', { detail: runId || null }));
  } catch (error) {
    console.error('[QuizRunConfig] Failed to set active run config:', error);
  }
};

export const readActiveQuizRunConfigIdSync = (): string | null => {
  try {
    return String(sessionStorage.getItem(ACTIVE_QUIZ_RUN_CONFIG_ID_KEY) || '').trim() || null;
  } catch {
    return null;
  }
};

export const readActiveQuizRunConfigSync = (preferredRunId?: string | null): SavedQuizRunConfig | null => {
  const resolvedRunId = String(preferredRunId || readActiveQuizRunConfigIdSync() || '').trim();
  return readQuizRunConfigSync(resolvedRunId);
};

export const readActiveQuizRunSettingSync = (
  key: string,
  preferredRunId?: string | null,
): string | null | undefined => {
  const config = readActiveQuizRunConfigSync(preferredRunId);
  if (!config) return undefined;
  const value = mapConfigKeyToValue(config, key);
  if (value === undefined) return undefined;
  return stringifyValue(value);
};

export const clearActiveQuizRunConfig = (): void => {
  setActiveQuizRunConfig(null);
};

export const clearStoredQuizRunConfigs = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(QUIZ_RUN_CONFIG_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem(ACTIVE_QUIZ_RUN_CONFIG_ID_KEY);
  } catch (error) {
    console.error('[QuizRunConfig] Failed clearing stored run configs:', error);
  }
};