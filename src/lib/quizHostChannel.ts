export interface QuizHostChannel {
  quizHostChannelId: string | null;
  quizHostChannelTitle: string;
  quizHostChannelHandle: string;
}

const QUIZ_HOST_CHANNEL_ID_KEY = 'quizHostChannelId';
const QUIZ_HOST_CHANNEL_TITLE_KEY = 'quizHostChannelTitle';
const QUIZ_HOST_CHANNEL_HANDLE_KEY = 'quizHostChannelHandle';
export const QUIZ_HOST_CHANNEL_UPDATED_EVENT = 'quizHostChannelUpdated';

const trim = (value: unknown) => String(value || '').trim();

// Memoized JWT decode — readQuizHostChannel is called many times per render
// across many components. Re-decoding the same token is wasteful.
let _decodeCache: { token: string; payload: Record<string, unknown> | null } | null = null;

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  if (_decodeCache && _decodeCache.token === token) {
    return _decodeCache.payload;
  }
  let payload: Record<string, unknown> | null = null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    payload = JSON.parse(json) as Record<string, unknown>;
  } catch {
    payload = null;
  }
  _decodeCache = { token, payload };
  return payload;
};

/**
 * Read the quiz host channel info.
 * Primary source: the JWT access token in localStorage (youtubeChannelId claim).
 * Fallback: legacy per-key localStorage entries.
 */
export const readQuizHostChannel = (): QuizHostChannel => {
  try {
    const token = localStorage.getItem('quizUiStateToken');
    if (token) {
      const decoded = decodeJwtPayload(token);
      if (decoded && decoded.youtubeChannelId) {
        return {
          quizHostChannelId: trim(decoded.youtubeChannelId) || null,
          quizHostChannelTitle: trim(decoded.youtubeChannelTitle),
          quizHostChannelHandle: trim(decoded.youtubeChannelHandle),
        };
      }
    }
  } catch {
    /* fall through to legacy keys */
  }

  return {
    quizHostChannelId: trim(localStorage.getItem(QUIZ_HOST_CHANNEL_ID_KEY)) || null,
    quizHostChannelTitle: trim(localStorage.getItem(QUIZ_HOST_CHANNEL_TITLE_KEY)),
    quizHostChannelHandle: trim(localStorage.getItem(QUIZ_HOST_CHANNEL_HANDLE_KEY)),
  };
};

export const saveQuizHostChannel = (host: Partial<QuizHostChannel> | null | undefined): QuizHostChannel => {
  const next: QuizHostChannel = {
    quizHostChannelId: trim(host?.quizHostChannelId) || null,
    quizHostChannelTitle: trim(host?.quizHostChannelTitle),
    quizHostChannelHandle: trim(host?.quizHostChannelHandle),
  };

  if (next.quizHostChannelId) {
    localStorage.setItem(QUIZ_HOST_CHANNEL_ID_KEY, next.quizHostChannelId);
  } else {
    localStorage.removeItem(QUIZ_HOST_CHANNEL_ID_KEY);
  }

  if (next.quizHostChannelTitle) {
    localStorage.setItem(QUIZ_HOST_CHANNEL_TITLE_KEY, next.quizHostChannelTitle);
  } else {
    localStorage.removeItem(QUIZ_HOST_CHANNEL_TITLE_KEY);
  }

  if (next.quizHostChannelHandle) {
    localStorage.setItem(QUIZ_HOST_CHANNEL_HANDLE_KEY, next.quizHostChannelHandle);
  } else {
    localStorage.removeItem(QUIZ_HOST_CHANNEL_HANDLE_KEY);
  }

  // Invalidate JWT decode cache (token may have changed alongside this update)
  _decodeCache = null;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUIZ_HOST_CHANNEL_UPDATED_EVENT));
  }

  return next;
};
