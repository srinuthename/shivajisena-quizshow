import { readActiveQuizRunSettingSync } from '@/lib/quizRunConfig';

const ADMIN_SETTINGS_DB_NAME = 'quizAdminSettings';
const ADMIN_SETTINGS_STORE_NAME = 'settings';
const QUIZ_SESSION_SNAPSHOT_STORE_NAME = 'quizSessionSnapshots';
const ADMIN_SETTINGS_DB_VERSION = 2;
export const ADMIN_SETTINGS_UPDATED_EVENT = 'quizConfigUpdated';

const LEGACY_ADMIN_SETTING_KEYS = [
  'teamConfigs',
  'episodeNumber',
  'correctAnswerScore',
  'wrongAnswerPenalty',
  'lifelinePenalty',
  'teamLifelines',
  'questionsPerCategory',
  'maxUsedCountThreshold',
  'shuffleQuestions',
  'timerDuration',
  'masterTimerDuration',
  'passedQuestionTimer',
  'revealCountdownDuration',
  'rapidFireDuration',
  'showActivityFeed',
  'showDifficultyBadge',
  'showSaveIndicator',
  'showToastMessages',
  'showIntroAnimation',
  'maskViewerResponses',
  'youtubeIntegrationEnabled',
  'disableLivePanelDuringPowerplay',
  'showYouTubeAutoPostPanel',
  'showEngagementHeatmap',
  'showViewerPredictions',
  'powerplayEnabled',
  'quizAnalyticsEnabled',
  'tickerEnabled',
  'tickerMessageRegular',
  'tickerMessagePowerplay',
  'tvModeEnabled',
  'fixedLeaderboard',
  'showSequenceNumbers',
  'minimumCorrectScore',
  'soundVolume',
  'appOperationMode',
  'sseStreamEnabled',
  'sseStreamServerUrl',
  'sseHeartbeatTimeout',
  'sseReconnectDelay',
  'viewerAnswerDelayMs',
  'viewerPostRevealGraceMs',
  'quizBranding',
  'topicSettings',
] as const;

type StoredSettingRecord = {
  key: string;
  value: string;
  updatedAt: number;
};

type QuizSessionConfigSnapshotRecord = {
  sessionId: string;
  savedAt: number;
  snapshot: Record<string, unknown>;
  isLatest?: boolean;
};

const settingsCache = new Map<string, string>();
let settingsHydrated = false;
let settingsHydrationPromise: Promise<void> | null = null;

const openAdminSettingsDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(ADMIN_SETTINGS_DB_NAME, ADMIN_SETTINGS_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ADMIN_SETTINGS_STORE_NAME)) {
        db.createObjectStore(ADMIN_SETTINGS_STORE_NAME, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(QUIZ_SESSION_SNAPSHOT_STORE_NAME)) {
        db.createObjectStore(QUIZ_SESSION_SNAPSHOT_STORE_NAME, { keyPath: 'sessionId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open admin settings database'));
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> => {
  const db = await openAdminSettingsDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(ADMIN_SETTINGS_STORE_NAME, mode);
    const store = tx.objectStore(ADMIN_SETTINGS_STORE_NAME);
    Promise.resolve(run(store))
      .then((result) => {
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error || new Error('Admin settings transaction failed'));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error || new Error('Admin settings transaction aborted'));
        };
      })
      .catch((error) => {
        db.close();
        reject(error);
      });
  });
};

const getAllStoredSettings = async (): Promise<StoredSettingRecord[]> =>
  withStore('readonly', (store) =>
    new Promise<StoredSettingRecord[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? (request.result as StoredSettingRecord[]) : []);
      request.onerror = () => reject(request.error || new Error('Failed to read admin settings'));
    })
  );

const getSnapshotStoreRecord = async (sessionId: string): Promise<QuizSessionConfigSnapshotRecord | null> =>
  withStore('readonly', (store) =>
    new Promise<QuizSessionConfigSnapshotRecord | null>((resolve, reject) => {
      const tx = store.transaction;
      const snapshotStore = tx.db.transaction(QUIZ_SESSION_SNAPSHOT_STORE_NAME, 'readonly').objectStore(QUIZ_SESSION_SNAPSHOT_STORE_NAME);
      const request = snapshotStore.get(sessionId);
      request.onsuccess = () => resolve((request.result as QuizSessionConfigSnapshotRecord | undefined) || null);
      request.onerror = () => reject(request.error || new Error('Failed to read quiz session snapshot'));
    })
  );

const getAllSnapshotRecords = async (): Promise<QuizSessionConfigSnapshotRecord[]> =>
  new Promise(async (resolve, reject) => {
    const db = await openAdminSettingsDb().catch(reject);
    if (!db) return;
    const tx = db.transaction(QUIZ_SESSION_SNAPSHOT_STORE_NAME, 'readonly');
    const store = tx.objectStore(QUIZ_SESSION_SNAPSHOT_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      db.close();
      resolve(Array.isArray(request.result) ? (request.result as QuizSessionConfigSnapshotRecord[]) : []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error('Failed to read quiz session snapshots'));
    };
  });

const persistSnapshotRecord = async (record: QuizSessionConfigSnapshotRecord): Promise<void> => {
  const db = await openAdminSettingsDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUIZ_SESSION_SNAPSHOT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(QUIZ_SESSION_SNAPSHOT_STORE_NAME);
    const clearLatestRequest = store.getAll();
    clearLatestRequest.onsuccess = () => {
      const existing = Array.isArray(clearLatestRequest.result) ? (clearLatestRequest.result as QuizSessionConfigSnapshotRecord[]) : [];
      existing.forEach((entry) => {
        if (entry.isLatest) {
          store.put({ ...entry, isLatest: false });
        }
      });
      store.put({ ...record, isLatest: true });
    };
    clearLatestRequest.onerror = () => reject(clearLatestRequest.error || new Error('Failed to update latest quiz session snapshot'));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Quiz session snapshot transaction failed'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('Quiz session snapshot transaction aborted'));
    };
  });
};

const persistStoredSettings = async (entries: StoredSettingRecord[]): Promise<void> => {
  await withStore('readwrite', (store) => {
    entries.forEach((entry) => store.put(entry));
  });
};

const removeLegacyLocalStorageKey = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

const deleteStoredSettings = async (keys: string[]): Promise<void> => {
  await withStore('readwrite', (store) => {
    keys.forEach((key) => store.delete(key));
  });
};

const emitSettingsUpdated = (keys: string[]): void => {
  try {
    window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_UPDATED_EVENT, { detail: { keys } }));
  } catch {
    // ignore
  }
};

export const hydrateMirroredAdminSettings = async (): Promise<void> => {
  if (settingsHydrated) return;
  if (!settingsHydrationPromise) {
    settingsHydrationPromise = (async () => {
      try {
        const storedEntries = await getAllStoredSettings();
        settingsCache.clear();
        storedEntries.forEach((entry) => settingsCache.set(entry.key, entry.value));
      } finally {
        settingsHydrated = true;
      }
    })();
  }
  return settingsHydrationPromise;
};

const parseWithFallback = <T>(raw: string | null, fallback: T): T => {
  if (raw === null) return fallback;
  if (typeof fallback === 'boolean') {
    return (raw === 'true') as T;
  }
  if (typeof fallback === 'number') {
    const parsed = Number(raw);
    return (Number.isFinite(parsed) ? parsed : fallback) as T;
  }
  if (typeof fallback === 'string') {
    return raw as T;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const stringifyValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value ?? null);
};

export const readMirroredAdminSettingSync = <T>(key: string, fallback: T): T =>
  parseWithFallback<T>(
    readActiveQuizRunSettingSync(key)
      ?? (settingsCache.has(key) ? settingsCache.get(key) ?? null : null),
    fallback
  );

export const readMirroredAdminSetting = async <T>(key: string, fallback: T): Promise<T> => {
  await hydrateMirroredAdminSettings().catch(() => {
    // ignore and fall back to provided default
  });
  return readMirroredAdminSettingSync(key, fallback);
};

export const hasMirroredAdminSettingSync = (key: string): boolean => {
  if (readActiveQuizRunSettingSync(key) !== undefined) return true;
  return settingsCache.has(key);
};

export const writeMirroredAdminSettings = async (entries: Record<string, unknown>): Promise<void> => {
  const payload = Object.entries(entries).map(([key, value]) => ({
    key,
    value: stringifyValue(value),
    updatedAt: Date.now(),
  }));
  payload.forEach((entry) => settingsCache.set(entry.key, entry.value));
  await persistStoredSettings(payload);
  emitSettingsUpdated(payload.map((entry) => entry.key));
};

export const writeMirroredAdminSetting = async (key: string, value: unknown): Promise<void> => {
  await writeMirroredAdminSettings({ [key]: value });
};

export const clearMirroredAdminSettings = async (keys: string[] = [...LEGACY_ADMIN_SETTING_KEYS]): Promise<void> => {
  keys.forEach((key) => settingsCache.delete(key));
  await deleteStoredSettings(keys);
  emitSettingsUpdated(keys);
};

export const saveQuizSessionConfigSnapshot = async (sessionId: string, snapshot: Record<string, unknown>): Promise<void> => {
  const payload: QuizSessionConfigSnapshotRecord = {
    sessionId,
    savedAt: Date.now(),
    snapshot,
  };
  await persistSnapshotRecord(payload);
  removeLegacyLocalStorageKey(`quizSessionConfigSnapshot:${sessionId}`);
  removeLegacyLocalStorageKey('latestQuizSessionConfigSnapshot');
};

export const readLatestQuizSessionConfigSnapshot = async (): Promise<QuizSessionConfigSnapshotRecord | null> => {
  try {
    const records = await getAllSnapshotRecords();
    const latest = records
      .filter((record) => Boolean(record?.sessionId))
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))[0] || null;
    if (latest) return latest;
  } catch {
    return null;
  }

  return null;
};
