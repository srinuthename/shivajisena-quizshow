import { useState, useEffect, useCallback, useRef } from 'react';
import { getQuizAnswers, getFrontendQuizGameId, QuizAnswer } from '@/config/apiConfig';
import { calculateViewerScore } from '@/lib/viewerScoring';

export interface ProcessedAnswer {
  id: string;
  odytChannelId: string;
  userName: string;
  avatarUrl: string;
  answer: string; // A, B, C, D
  responseTimeMs: number;
  isCorrect: boolean;
  score: number;
  supportingTeam?: 'east' | 'west' | 'north' | 'south' | null;
}

interface UseAnswerPollingOptions {
  enabled: boolean;
  questionIndex: number;
  questionOpenTime: number | null;
  questionCloseTime?: number | null;
  pollingInterval?: number;
  correctAnswer: number | null;
  questionDurationMs?: number;
  onNewAnswers?: (answers: ProcessedAnswer[]) => void;
}

export type PollingConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const calculateScore = (
  isCorrect: boolean,
  questionDuration: number,
  responseTimeMs: number
): number => {
  const minimumScore = parseInt(localStorage.getItem('minimumCorrectScore') || '100', 10);
  return calculateViewerScore({
    isCorrect,
    questionDurationMs: questionDuration,
    responseTimeMs,
    minimumScore,
  });
};

export const useAnswerPolling = ({
  enabled,
  questionIndex,
  questionOpenTime,
  questionCloseTime = null,
  pollingInterval = 1500,
  correctAnswer,
  questionDurationMs = 30000,
  onNewAnswers,
}: UseAnswerPollingOptions) => {
  const [answers, setAnswers] = useState<ProcessedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<number | null>(null);
  const [status, setStatus] = useState<PollingConnectionStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);

  const processedIdsRef = useRef<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnswerTimeRef = useRef<number | undefined>(undefined);

  /**
   * Process a QuizAnswer from the API into ProcessedAnswer format
   */
  const processAnswer = useCallback((
    answer: QuizAnswer,
    correctIdx: number | null,
    qOpenTime: number | null
  ): ProcessedAnswer => {
    // Get answer letter from selectedChoiceIndex
    const answerLetter = answer.selectedChoiceIndex >= 0 && answer.selectedChoiceIndex <= 3
      ? ['A', 'B', 'C', 'D'][answer.selectedChoiceIndex]
      : 'X';
    
    const receivedTimestampMs = Number.isFinite(answer.receivedTimestampMs)
      ? Number(answer.receivedTimestampMs)
      : null;
    const responseTimeMs = qOpenTime && receivedTimestampMs
      ? Math.max(0, receivedTimestampMs - qOpenTime)
      : Math.max(0, Number(answer.responseTimeMs || 0));
    
    // Check if answer is correct
    const isCorrect = answer.isCorrectAnswer ?? 
      (correctIdx !== null && answer.selectedChoiceIndex === correctIdx);
    
    // Calculate score based on response time
    const score = calculateScore(isCorrect, questionDurationMs, responseTimeMs);

    return {
      id: answer.id,
      odytChannelId: answer.userUniqueId,
      userName: answer.userName,
      avatarUrl: answer.userProfilePicUrl,
      answer: answerLetter,
      responseTimeMs,
      isCorrect,
      score,
      supportingTeam: null,
    };
  }, [questionDurationMs]);

  // Track users who have already answered (first answer only per user per question)
  const answeredUsersRef = useRef<Set<string>>(new Set());

  const pollAnswers = useCallback(async () => {
    if (!enabled || questionIndex < 0 || !questionOpenTime) {
      console.log('[AnswerPolling] Skipping poll - questionIndex < 0');
      return;
    }
    
    const frontendQuizGameId = getFrontendQuizGameId();
    if (!frontendQuizGameId) {
      console.log('[AnswerPolling] Skipping poll - no frontendQuizGameId set');
      return;
    }

    console.log('[AnswerPolling] Polling answers for game:', frontendQuizGameId, 'question:', questionIndex);
    setIsLoading(true);
    setStatus((prev) => (prev === 'connected' ? prev : 'connecting'));
    try {
      const result = await getQuizAnswers(questionIndex, lastAnswerTimeRef.current);
      console.log('[AnswerPolling] Poll result:', result.success, 'answers:', result.answers?.length || 0);
      
      if (result.success) {
        setError(null);
        const pollTimestamp = Date.now();
        setLastPoll(pollTimestamp);
        setStatus('connected');
        setIsConnected(true);

        // Filter new answers: not already processed AND first answer per user
        const newAnswers = (result.answers || []).filter((a) => {
          const receivedTimestampMs = Number.isFinite(a.receivedTimestampMs)
            ? Number(a.receivedTimestampMs)
            : null;
          if (receivedTimestampMs && receivedTimestampMs < questionOpenTime) return false;
          if (questionCloseTime && receivedTimestampMs && receivedTimestampMs > questionCloseTime) return false;
          // Skip if already processed
          if (processedIdsRef.current.has(a.id)) return false;
          // Skip if user already answered this question (keep first answer only)
          if (answeredUsersRef.current.has(a.userUniqueId)) return false;
          return true;
        });

        if (newAnswers.length > 0) {
          const processed = newAnswers.map((a) =>
            processAnswer(a, correctAnswer, questionOpenTime)
          );

          // Mark as processed and track answered users
          newAnswers.forEach((a) => {
            processedIdsRef.current.add(a.id);
            answeredUsersRef.current.add(a.userUniqueId);
            const receivedTimestampMs = Number.isFinite(a.receivedTimestampMs)
              ? Number(a.receivedTimestampMs)
              : undefined;
            if (receivedTimestampMs !== undefined) {
              lastAnswerTimeRef.current = Math.max(lastAnswerTimeRef.current || 0, receivedTimestampMs);
            }
          });

          setAnswers((prev) => [...prev, ...processed]);
          onNewAnswers?.(processed);
        }
      } else {
        setError(result.error || 'Failed to fetch answers');
        setStatus('error');
        setIsConnected(false);
      }
    } catch (err) {
      setError('Polling failed');
      setStatus('error');
      setIsConnected(false);
      console.error('[AnswerPolling] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, questionIndex, correctAnswer, questionOpenTime, questionCloseTime, processAnswer, onNewAnswers]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Initial poll
    pollAnswers();

    // Set up interval
    pollingIntervalRef.current = setInterval(pollAnswers, pollingInterval);
  }, [pollAnswers, pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsConnected(false);
    setStatus((prev) => (prev === 'error' ? prev : 'disconnected'));
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setAnswers([]);
    processedIdsRef.current.clear();
    answeredUsersRef.current.clear();
    lastAnswerTimeRef.current = undefined;
    setError(null);
    setLastPoll(null);
    setIsConnected(false);
    setStatus(enabled ? 'connecting' : 'disconnected');
  }, [stopPolling]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled && questionIndex >= 0) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, questionIndex, startPolling, stopPolling]);

  // Reset when question changes
  useEffect(() => {
    reset();
  }, [questionIndex]);

  return {
    answers,
    isLoading,
    error,
    lastPoll,
    totalAnswers: answers.length,
    status,
    isConnected,
    reset,
    refetch: pollAnswers,
  };
};
