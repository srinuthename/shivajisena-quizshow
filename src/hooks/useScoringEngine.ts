// Hook to poll the backend scoring engine for leaderboard data
// Used in backend_scoring mode to replace frontend-calculated leaderboards

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAppMode } from '@/config/appMode';
import { ensureRemoteAppAccessSession, getAppAccessHeaders, getStoredApplicationId } from '@/config/hostProduct';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';
import {
  getScoringEngineUrl,
  getPollIntervalMs,
  isScoringEngineEnabled,
} from '@/config/scoringEngineConfig';

export interface ScoringFastestEntry {
  channelId: string;
  userName: string;
  avatarUrl: string;
  answer: string;
  responseTimeMs: number;
  isCorrect: boolean;
  score: number;
}

export interface ScoringQuestionLeaderboard {
  entries: ScoringFastestEntry[];
  totalAnswers: number;
  correctCount: number;
  distribution: Record<string, number>; // A/B/C/D counts
  isFinalized: boolean;
}

export interface ScoringQuizLeaderboard {
  entries: Array<{
    channelId: string;
    userName: string;
    avatarUrl: string;
    totalScore: number;
    correctAnswers: number;
    totalResponses: number;
    avgResponseTimeMs: number;
  }>;
}

interface UseScoringEngineOptions {
  enabled: boolean;
  gameId: string | null;
  questionIndex: number;
}

const getApplicationId = (): string => {
  return getStoredApplicationId();
};

const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const toNumberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const normalizeQuizLeaderboard = (raw: unknown): ScoringQuizLeaderboard | null => {
  if (!Array.isArray(raw)) return null;
  const entries = raw.map((entry) => {
    const row = toRecord(entry);
    return {
      channelId: toStringValue(row.channelId ?? row.odytChannelId ?? row.userUniqueId),
      userName: toStringValue(row.userName, 'Viewer'),
      avatarUrl: toStringValue(row.avatarUrl ?? row.userProfilePicUrl),
      totalScore: toNumberValue(row.totalScore),
      correctAnswers: toNumberValue(row.correctAnswers),
      totalResponses: toNumberValue(row.totalResponses),
      avgResponseTimeMs: toNumberValue(row.avgResponseTimeMs),
    };
  });
  return { entries };
};

const normalizeFastestEntries = (raw: unknown): ScoringFastestEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const row = toRecord(entry);
    return {
      channelId: toStringValue(row.channelId ?? row.odytChannelId ?? row.userUniqueId),
      userName: toStringValue(row.userName, 'Viewer'),
      avatarUrl: toStringValue(row.avatarUrl ?? row.userProfilePicUrl),
      answer: toStringValue(row.answer),
      responseTimeMs: toNumberValue(row.responseTimeMs),
      isCorrect: Boolean(row.isCorrect),
      score: toNumberValue(row.score),
    };
  });
};

const normalizeQuestionLeaderboard = (raw: unknown): ScoringQuestionLeaderboard | null => {
  const row = toRecord(raw);
  const entries = normalizeFastestEntries(row.entries);
  const distributionRaw = toRecord(row.distribution);
  const distribution: Record<string, number> = {
    A: toNumberValue(distributionRaw.A),
    B: toNumberValue(distributionRaw.B),
    C: toNumberValue(distributionRaw.C),
    D: toNumberValue(distributionRaw.D),
  };
  const totalAnswers = toNumberValue(row.totalAnswers);
  const correctCount = toNumberValue(row.correctCount);
  const isFinalized = typeof row.isFinalized === 'boolean' ? row.isFinalized : false;

  if (!entries.length && totalAnswers === 0 && correctCount === 0) {
    return null;
  }

  return {
    entries,
    totalAnswers,
    correctCount,
    distribution,
    isFinalized,
  };
};

export const useScoringEngine = ({
  enabled,
  gameId,
  questionIndex,
}: UseScoringEngineOptions) => {
  const [fastest, setFastest] = useState<ScoringFastestEntry[]>([]);
  const [questionLeaderboard, setQuestionLeaderboard] = useState<ScoringQuestionLeaderboard | null>(null);
  const [quizLeaderboard, setQuizLeaderboard] = useState<ScoringQuizLeaderboard | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isBackendScoringMode = getAppMode() === 'backend_scoring';
  const shouldPoll = enabled && isBackendScoringMode && !!gameId && isScoringEngineEnabled();

  const poll = useCallback(async () => {
    if (!gameId) return;

    const baseUrl = getScoringEngineUrl().replace(/\/+$/, '');
    const applicationId = getApplicationId();
    const encodedAppId = encodeURIComponent(applicationId);
    const encodedGameId = encodeURIComponent(gameId);

    try {
      await ensureSharedAuthToken(60_000).catch(() => null);
      await ensureRemoteAppAccessSession(baseUrl).catch(() => null);
      const [scoreRes, quizRes] = await Promise.all([
        fetch(`${baseUrl}/api/quiz/score/${encodedAppId}/${encodedGameId}`, {
          credentials: 'include',
          headers: getAppAccessHeaders(),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`${baseUrl}/api/quiz/leaderboard/${encodedAppId}/${encodedGameId}`, {
          credentials: 'include',
          headers: getAppAccessHeaders(),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      const scoreSnapshot = scoreRes?.scoreSnapshot || null;
      const scoreSnapshotRecord = toRecord(scoreSnapshot);
      const fastestRaw =
        scoreSnapshotRecord.fastest && Array.isArray(scoreSnapshotRecord.fastest)
          ? scoreSnapshotRecord.fastest
          : toRecord(scoreSnapshotRecord.fastest).entries;
      const normalizedFastest = normalizeFastestEntries(fastestRaw);
      if (normalizedFastest.length) {
        setFastest(normalizedFastest);
      }

      const questionLeaderboardRaw =
        scoreSnapshotRecord.questionLeaderboard ?? scoreRes?.questionLeaderboard ?? null;
      const normalizedQuestion = normalizeQuestionLeaderboard(questionLeaderboardRaw);
      if (normalizedQuestion) {
        setQuestionLeaderboard(normalizedQuestion);
      }

      const normalizedQuiz = normalizeQuizLeaderboard(
        quizRes?.leaderboard ??
          scoreSnapshotRecord.leaderboard ??
          scoreRes?.leaderboard
      );
      if (normalizedQuiz) {
        setQuizLeaderboard(normalizedQuiz);
      }

      setLastPollTime(Date.now());
    } catch (e) {
      console.error('[ScoringEngine] Poll failed:', e);
    }
  }, [gameId, questionIndex]);

  useEffect(() => {
    if (!shouldPoll) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    // Poll immediately
    poll();

    // Then poll on interval
    const interval = getPollIntervalMs();
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
    };
  }, [shouldPoll, poll]);

  // Reset on question change
  useEffect(() => {
    setFastest([]);
    setQuestionLeaderboard(null);
  }, [questionIndex]);

  return {
    fastest,
    questionLeaderboard,
    quizLeaderboard,
    isPolling,
    lastPollTime,
    pollNow: poll,
  };
};
