// Active Quiz Session Manager
// sessionStorage tracks the active tab, localStorage keeps the active runtime
// identity recoverable across browser refreshes until the quiz is explicitly ended.

const SESSION_ACTIVE_KEY = 'quizActiveSession';
const SESSION_ACTIVE_BACKUP_KEY = 'quizActiveSession:runtime';

export interface ActiveQuizSession {
  sessionId: string;
  frontendGameId: string;
  episodeNumber: string;
  startedAt: number;
  status: 'active' | 'paused';
  skipInitialBackendRestore?: boolean;
}

/**
 * Start a new active quiz session
 * This stores session info in sessionStorage (ephemeral - dies with tab)
 */
export const startActiveSession = (
  sessionId: string,
  frontendGameId: string,
  episodeNumber: string,
  options?: {
    startedAt?: number;
    skipInitialBackendRestore?: boolean;
  }
): ActiveQuizSession => {
  const session: ActiveQuizSession = {
    sessionId,
    frontendGameId,
    episodeNumber,
    startedAt: Number(options?.startedAt || Date.now()),
    status: 'active',
    skipInitialBackendRestore: options?.skipInitialBackendRestore === true,
  };

  const serialized = JSON.stringify(session);
  sessionStorage.setItem(SESSION_ACTIVE_KEY, serialized);
  localStorage.setItem(SESSION_ACTIVE_BACKUP_KEY, serialized);
  console.log('[ActiveSession] Started new session:', session);
  return session;
};

/**
 * Get the current active session (if any)
 */
export const getActiveSession = (): ActiveQuizSession | null => {
  try {
    const data = sessionStorage.getItem(SESSION_ACTIVE_KEY) || localStorage.getItem(SESSION_ACTIVE_BACKUP_KEY);
    if (!data) return null;
    const session = JSON.parse(data) as ActiveQuizSession;
    if (!sessionStorage.getItem(SESSION_ACTIVE_KEY)) {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    return null;
  }
};

/**
 * Update the active session (e.g., add backend game ID)
 */
export const updateActiveSession = (updates: Partial<ActiveQuizSession>): ActiveQuizSession | null => {
  const current = getActiveSession();
  if (!current) return null;

  const updated = { ...current, ...updates };
  const serialized = JSON.stringify(updated);
  sessionStorage.setItem(SESSION_ACTIVE_KEY, serialized);
  localStorage.setItem(SESSION_ACTIVE_BACKUP_KEY, serialized);
  console.log('[ActiveSession] Updated session:', updated);
  return updated;
};

/**
 * End the active session
 */
export const endActiveSession = (): void => {
  console.log('[ActiveSession] Ending session');
  sessionStorage.removeItem(SESSION_ACTIVE_KEY);
  localStorage.removeItem(SESSION_ACTIVE_BACKUP_KEY);
};

/**
 * Check if there's an active session
 */
export const hasActiveSession = (): boolean => {
  return getActiveSession() !== null;
};

/**
 * Pause/resume session
 */
export const setSessionStatus = (status: 'active' | 'paused'): void => {
  updateActiveSession({ status });
};
