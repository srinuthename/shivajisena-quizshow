import { useState, useEffect, useRef, useCallback } from 'react';
import { QuizSessionTeamResult, QuizSessionViewerResult } from '@/types/quiz';
import { getActiveSession, startActiveSession, endActiveSession, type ActiveQuizSession } from '@/lib/quizActiveSession';

/**
 * Minimal session record shape (replaces IndexedDB QuizSessionRecord).
 * Runtime-only — no persistence outside sessionStorage.
 */
export interface QuizSessionRecord {
  id: string;
  episodeNumber: string;
  startedAt: number;
  /** @deprecated Use startedAt */
  createdAt: number;
  endedAt?: number | null;
  status: 'active' | 'completed' | 'aborted';
  totalQuestions: number;
  totalViewerResponses: number;
  totalViewers: number;
  teamLeaderboard: QuizSessionTeamResult[];
  viewerLeaderboard: QuizSessionViewerResult[];
  /** Backend frontendQuizGameId — present for sessions hydrated from the server. */
  frontendQuizGameId?: string;
  /** Optional advanced-history snapshots populated from backend results. Shape varies by source. */
  currentQuestionLeaderboard?: unknown[];
  currentCumulativeLeaderboard?: unknown[];
  lastViewerBoardsUpdatedAt?: number;
}

function activeToRecord(s: ActiveQuizSession): QuizSessionRecord {
  return {
    id: s.sessionId,
    episodeNumber: s.episodeNumber,
    startedAt: s.startedAt,
    createdAt: s.startedAt,
    status: s.status === 'paused' ? 'active' : s.status as 'active',
    totalQuestions: 0,
    totalViewerResponses: 0,
    totalViewers: 0,
    teamLeaderboard: [],
    viewerLeaderboard: [],
  };
}

export function useQuizSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<QuizSessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionIdRef = useRef<string | null>(null);

  // Load active session from sessionStorage on mount
  useEffect(() => {
    const active = getActiveSession();
    if (active) {
      setSessionId(active.sessionId);
      setSession(activeToRecord(active));
      sessionIdRef.current = active.sessionId;
    }
    setIsLoading(false);
  }, []);

  const startNewSession = useCallback(async (episodeNumber: string): Promise<string> => {
    // End current session if exists
    if (sessionIdRef.current) {
      endActiveSession();
    }

    const newId = crypto.randomUUID();
    const active = startActiveSession(newId, '', episodeNumber);
    setSessionId(newId);
    setSession(activeToRecord(active));
    sessionIdRef.current = newId;
    return newId;
  }, []);

  const updateSessionStats = useCallback(async (updates: {
    totalQuestions?: number;
    totalViewerResponses?: number;
    totalViewers?: number;
  }) => {
    if (!sessionIdRef.current) return;
    setSession((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const closeSession = useCallback(async (
    teamLeaderboard: QuizSessionTeamResult[],
    viewerLeaderboard: QuizSessionViewerResult[],
    status: 'completed' | 'aborted' = 'completed'
  ) => {
    if (!sessionIdRef.current) return;
    endActiveSession();
    setSession((prev) => prev ? {
      ...prev,
      status,
      endedAt: Date.now(),
      teamLeaderboard,
      viewerLeaderboard,
    } : prev);
    setSessionId(null);
    sessionIdRef.current = null;
  }, []);

  const abortSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    endActiveSession();
    setSessionId(null);
    setSession(null);
    sessionIdRef.current = null;
  }, []);

  return {
    sessionId,
    session,
    isLoading,
    startNewSession,
    updateSessionStats,
    closeSession,
    abortSession,
    hasActiveSession: !!sessionId,
  };
}
