const ANALYTICS_OWNER_KEY = 'analyticsOwnerId';
const ANALYTICS_ENABLED_KEY = 'quizAnalyticsEnabled';

export const isQuizAnalyticsEnabled = (): boolean => {
  const raw = localStorage.getItem(ANALYTICS_ENABLED_KEY);
  // Default to enabled when no preference has been set
  if (raw === null) return true;
  return raw === 'true';
};

export const setQuizAnalyticsEnabled = (enabled: boolean): void => {
  localStorage.setItem(ANALYTICS_ENABLED_KEY, String(enabled));
};

export const getAnalyticsOwnerId = (): string => {
  const existing = localStorage.getItem(ANALYTICS_OWNER_KEY);
  if (existing) return existing;
  const next =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `owner-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(ANALYTICS_OWNER_KEY, next);
  return next;
};
