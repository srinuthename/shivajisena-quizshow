// Active Quiz Session Manager
// Manages sessionStorage-based active session state (dies when tab closes)
// Settings are stored in IndexedDB for persistence, but active session is ephemeral

const SESSION_ACTIVE_KEY = 'quizActiveSession';

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

  sessionStorage.setItem(SESSION_ACTIVE_KEY, JSON.stringify(session));
  console.log('[ActiveSession] Started new session:', session);
  return session;
};

/**
 * Get the current active session (if any)
 */
export const getActiveSession = (): ActiveQuizSession | null => {
  try {
    const data = sessionStorage.getItem(SESSION_ACTIVE_KEY);
    if (!data) return null;
    return JSON.parse(data) as ActiveQuizSession;
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
  sessionStorage.setItem(SESSION_ACTIVE_KEY, JSON.stringify(updated));
  console.log('[ActiveSession] Updated session:', updated);
  return updated;
};

/**
 * End the active session
 */
export const endActiveSession = (): void => {
  console.log('[ActiveSession] Ending session');
  sessionStorage.removeItem(SESSION_ACTIVE_KEY);
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
