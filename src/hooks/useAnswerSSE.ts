import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { recordMetric } from '@/lib/perfTelemetry';
import { getSSEEventsUrl, getSSEHeartbeatTimeout, isSSEEnabled, shouldScoreViewersLocally, getViewerAnswerDelay } from '@/config/appMode';
import { HOST_PRODUCT_KEY } from '@/config/hostProduct';
import { ingestSseTimeSignal } from '@/lib/clockSync';
import { AnswerEvent, SystemEvent, normalizeAnswer, getReceivedTimestamp } from '@/types/userResponse';
import { getBrowserClientId } from '@/lib/clientIdentity';
import { detectEmojiReaction } from '@/components/AudienceReactions';
import { calculateViewerScore } from '@/lib/viewerScoring';
import { readQuizHostChannel } from '@/lib/quizHostChannel';
import { issueScopedSseToken } from '@/lib/sseAuth';

// Legacy fallback scoring constants — only used when no labelToOriginalIndex is provided
const LEGACY_ANSWER_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

// Team hashtag detection
const TEAM_HASHTAGS: Record<string, 'east' | 'west' | 'north' | 'south'> = {
  '#east': 'east',
  '#west': 'west',
  '#north': 'north',
  '#south': 'south',
  'east': 'east',
  'west': 'west',
  'north': 'north',
  'south': 'south',
};

// Prediction hashtag detection
const PREDICTION_HASHTAGS: Record<string, string> = {
  '#predict-east': 'east',
  '#predict-west': 'west',
  '#predict-north': 'north',
  '#predict-south': 'south',
  '#predicteast': 'east',
  '#predictwest': 'west',
  '#predictnorth': 'north',
  '#predictsouth': 'south',
};

const detectTeamHashtag = (message: string): 'east' | 'west' | 'north' | 'south' | null => {
  const normalized = message.trim().toLowerCase();
  return TEAM_HASHTAGS[normalized] || null;
};

const detectPredictionHashtag = (message: string): string | null => {
  const normalized = message.trim().toLowerCase().replace(/\s+/g, '');
  return PREDICTION_HASHTAGS[normalized] || null;
};

// Health/reconnect checks run periodically to keep stream alive
const PERIODIC_RECONNECT_INTERVAL_MS = 5000;

export interface ProcessedAnswer {
  id: string;
  odytChannelId: string;
  userName: string;
  avatarUrl: string;
  answer: string; // A, B, C, D
  responseTimeMs: number;
  isCorrect: boolean;
  score: number;
  serverSeq?: number;
  supportingTeam?: 'east' | 'west' | 'north' | 'south' | null;
  predictedTeam?: string | null;
  emojiReaction?: string | null;
}

interface BufferedAnswer extends ProcessedAnswer {
  _sortTime: number;
  _sortSeq: number;
  _sortId: string;
}

interface UseAnswerSSEOptions {
  enabled: boolean;
  questionIndex: number;
  questionId?: string | number | null;
  resourceId?: string | null;
  questionOpenTime: number | null;
  questionCloseTime?: number | null; // When the question was closed (after reveal grace)
  correctAnswer: number | null;
  labelToOriginalIndex?: Record<string, number> | null;
  questionDurationMs?: number;
  onNewAnswers?: (answers: ProcessedAnswer[]) => void;
}

export type SSEConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

// Small tolerance for non-server timestamps to avoid false rejections
const FALLBACK_SKEW_MS = 250;


// SSE backpressure / queueing constants
const MAX_QUEUE_LENGTH = 1000;
const QUEUE_STATS_UPDATE_MS = 1000;

// Exponential backoff constants for SSE reconnection
const INITIAL_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 60000; // Max 1 minute between retries
const RECONNECT_MULTIPLIER = 2;
const RECONNECT_JITTER = 0.3;

// Strip @ prefix from usernames
const stripAt = (name: string): string => name.replace(/^@+/, '');
const normalizeAvatarUrl = (value: string | null | undefined): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('//')) return `https:${raw}`;
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:') ||
    raw.startsWith('/')
  ) {
    return raw;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}\/.+/i.test(raw)) {
    return `https://${raw}`;
  }
  return '';
};

const getCurrentSseScope = (activeResourceId?: string | null) => {
  const hostChannel = readQuizHostChannel();
  const channelId = String(hostChannel.quizHostChannelId || '').trim();
  return {
    tenantId: channelId || 'default-org',
    applicationId: HOST_PRODUCT_KEY,
    consumer: HOST_PRODUCT_KEY,
    resourceId: String(activeResourceId || '').trim(),
  };
};

const matchesCurrentSseScope = (event: Partial<AnswerEvent>, activeResourceId?: string | null): boolean => {
  const scope = getCurrentSseScope(activeResourceId);
  const eventResourceId = String(event.connectorResourceId || '').trim();
  if (!scope.resourceId) return false;
  if (!eventResourceId) return false;
  return eventResourceId === scope.resourceId;
};

export const useAnswerSSE = ({
  enabled,
  questionIndex,
  questionId = null,
  resourceId = null,
  questionOpenTime,
  questionCloseTime = null,
  correctAnswer,
  labelToOriginalIndex = null,
  questionDurationMs = 30000,
  onNewAnswers,
}: UseAnswerSSEOptions) => {
  const [answers, setAnswers] = useState<ProcessedAnswer[]>([]);
  
  // Batching for high-frequency SSE
  const batchedAnswers = useRef<BufferedAnswer[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);

  function processBatch() {
    if (batchedAnswers.current.length > 0) {
      const batch = batchedAnswers.current;
      batchedAnswers.current = [];
      const sorted = batch
        .slice()
        .sort((a, b) =>
          a._sortTime !== b._sortTime
            ? a._sortTime - b._sortTime
            : a._sortSeq !== b._sortSeq
              ? a._sortSeq - b._sortSeq
              : a._sortId.localeCompare(b._sortId)
        )
        .map(({ _sortTime: _t, _sortSeq: _s, _sortId: _i, ...rest }) => rest);
      const t0 = performance.now();
      startTransition(() => {
        setAnswers((prev) => [...prev, ...sorted]);
      });
      const t1 = performance.now();
      recordMetric('sse.batch.size', sorted.length);
      recordMetric('sse.batch.process_ms', Math.max(0, Math.round(t1 - t0)));
      if (onNewAnswers) onNewAnswers(sorted);
    }
    batchTimeout.current = null;
  }

  const getMinimumScore = () => parseInt(localStorage.getItem('minimumCorrectScore') || '100', 10);

  function addAnswerToBatch(answer: BufferedAnswer) {
    const currentCorrect = correctAnswerRef.current;
    // Only score locally if mode supports frontend scoring
    if (currentCorrect !== null && shouldScoreViewersLocally()) {
      const { score, isCorrect } = scoreAnswer(answer, currentCorrect, getMinimumScore());
      answer = { ...answer, score, isCorrect };
    }

    const qlen = batchedAnswers.current.length;
    if (qlen >= MAX_QUEUE_LENGTH) {
      const drop = Math.max(1, qlen - MAX_QUEUE_LENGTH + 1);
      batchedAnswers.current.splice(0, drop);
      droppedCountRef.current = (droppedCountRef.current || 0) + drop;
    }

    batchedAnswers.current.push(answer);
    queueLengthRef.current = batchedAnswers.current.length;
    if (batchedAnswers.current.length >= 20) {
      if (batchTimeout.current) clearTimeout(batchTimeout.current);
      processBatch();
    } else if (!batchTimeout.current) {
      batchTimeout.current = setTimeout(processBatch, 100);
    }
  }

  const [status, setStatus] = useState<SSEConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const answeredUsersRef = useRef<Set<string>>(new Set());
  const supportedUsersRef = useRef<Set<string>>(new Set());
  const lastEventIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectAttemptRef = useRef<number>(0);
  const connectInFlightRef = useRef<boolean>(false);
  const questionOpenTimeRef = useRef<number | null>(questionOpenTime);
  const questionCloseTimeRef = useRef<number | null>(questionCloseTime);
  const correctAnswerRef = useRef<number | null>(correctAnswer);
  const missingServerSeqLoggedRef = useRef<boolean>(false);
  const latestServerSeqSeenRef = useRef<number>(0);
  const questionOpenSeqFloorRef = useRef<number>(0);
  const prevQuestionOpenTimeRef = useRef<number | null>(questionOpenTime);
  const queueLengthRef = useRef<number>(0);
  const droppedCountRef = useRef<number>(0);
  const reconnectAttemptRef = useRef<number>(0);
  const [queueLength, setQueueLength] = useState<number>(0);
  const [droppedCount, setDroppedCount] = useState<number>(0);
  const periodicReconnectRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number | null>(null);
  const connectStartedAtRef = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => {
    questionOpenTimeRef.current = questionOpenTime;
  }, [questionOpenTime]);

  // Capture sequence watermark at each question-open boundary.
  // Any replayed/pre-open message with serverSeq <= floor is rejected.
  useEffect(() => {
    const prev = prevQuestionOpenTimeRef.current;
    const next = questionOpenTime;
    if (next && !prev) {
      questionOpenSeqFloorRef.current = latestServerSeqSeenRef.current;
    }
    prevQuestionOpenTimeRef.current = next;
  }, [questionOpenTime]);

  useEffect(() => {
    questionCloseTimeRef.current = questionCloseTime;
  }, [questionCloseTime]);

  const lastScoredCorrectRef = useRef<number | null>(null);
  const labelToOriginalIndexRef = useRef<Record<string, number> | null>(labelToOriginalIndex);

  useEffect(() => {
    correctAnswerRef.current = correctAnswer;
  }, [correctAnswer]);

  useEffect(() => {
    labelToOriginalIndexRef.current = labelToOriginalIndex ?? null;
  }, [labelToOriginalIndex]);

  useEffect(() => {
    lastHeartbeatRef.current = lastHeartbeat;
  }, [lastHeartbeat]);

  // Periodically publish queue metrics
  useEffect(() => {
    const t = setInterval(() => {
      if (queueLengthRef.current !== queueLength) setQueueLength(queueLengthRef.current);
      if (droppedCountRef.current !== droppedCount) setDroppedCount(droppedCountRef.current || 0);
    }, QUEUE_STATS_UPDATE_MS);
    return () => clearInterval(t);
  }, [queueLength, droppedCount]);

  // Main-thread scoring function (replaces worker to avoid MIME type issues)
  const scoreAnswer = useCallback((answer: ProcessedAnswer, correctAns: number, minScore: number): { score: number; isCorrect: boolean } => {
    const normalized = (answer.answer || '').trim().toUpperCase();
    const labelMap = labelToOriginalIndexRef.current;
    const idx = labelMap ? (labelMap[normalized] ?? -1) : (LEGACY_ANSWER_INDEX[normalized] ?? -1);
    const isCorrect = idx !== -1 && idx === correctAns;

    if (!isCorrect) {
      return { score: 0, isCorrect: false };
    }

    const score = calculateViewerScore({
      isCorrect: true,
      responseTimeMs: answer.responseTimeMs || 0,
      questionDurationMs,
      minimumScore: minScore,
    });

    return { score, isCorrect: true };
  }, [questionDurationMs]);

  /**
   * Process an AnswerEvent from the backend
   * Uses server timestamps when available; falls back to YouTube timestamps
   * Rejects answers received before question opened or after question closed
   */
  const processAnswerEvent = useCallback(
    (event: AnswerEvent, eventId?: string): BufferedAnswer | null => {
      const qOpenTime = questionOpenTimeRef.current;
      const qCloseTime = questionCloseTimeRef.current;
      const userKey = event.channelId?.trim() || '';
      const uniqueId = eventId || event.id || `${event.streamId}:${event.channelId}:${Date.now()}`;

      // Only process answer-type events from stream payload.
      if (!event || event.type !== 'ANSWER') {
        console.log('[SSE] Invalid answer event:', event);
        return null;
      }

      // Get user identifier
      if (!userKey) {
        return null;
      }

      // Track latest seen server sequence globally, even for events we may later reject.
      const eventServerSeq = Number.isFinite(event.serverSeq) ? Number(event.serverSeq) : null;
      if (eventServerSeq !== null && eventServerSeq > latestServerSeqSeenRef.current) {
        latestServerSeqSeenRef.current = eventServerSeq;
      }

      // Skip if already processed or user already answered
      if (processedIdsRef.current.has(uniqueId)) {
        return null;
      }

      // Check for emoji reaction before other checks
      const emojiReaction = detectEmojiReaction(event.answer);
      if (emojiReaction) {
        processedIdsRef.current.add(uniqueId);
        const tSeq = Number.isFinite(event.serverSeq) ? (event.serverSeq as number) : undefined;
        return {
          id: uniqueId, odytChannelId: userKey,
          userName: stripAt(event.displayName || event.author || ''),
          avatarUrl: normalizeAvatarUrl(event.avatarUrl || event.avatar || ''),
          answer: 'EMOJI', responseTimeMs: 0, isCorrect: false, score: 0,
          serverSeq: tSeq, supportingTeam: null, predictedTeam: null,
          emojiReaction,
          _sortTime: Date.now(), _sortSeq: tSeq ?? 0, _sortId: uniqueId,
        };
      }

      // Check for team hashtag support before answer validation
      const teamHashtag = detectTeamHashtag(event.answer);
      const predictionHashtag = detectPredictionHashtag(event.answer);

      // Normalize answer to uppercase
      const answerLetter = normalizeAnswer(event.answer);
      const isPredictionOnly = Boolean(predictionHashtag && !answerLetter && !teamHashtag);
      const isSupportOnly = Boolean(teamHashtag && !answerLetter && !predictionHashtag);
      const isAnswerOnly = Boolean(answerLetter && !teamHashtag && !predictionHashtag);
      const isMixed = Boolean(answerLetter && (teamHashtag || predictionHashtag));

      // Allow one A/B/C/D answer per user per question.
      // Allow one team-support command per user per question.
      if ((isAnswerOnly || isMixed) && answeredUsersRef.current.has(userKey)) {
        return null;
      }
      if ((isSupportOnly || isMixed) && supportedUsersRef.current.has(userKey)) {
        return null;
      }

      // Prediction - emit as special PREDICT entry
      if (isPredictionOnly) {
        processedIdsRef.current.add(uniqueId);
        const tSeq = Number.isFinite(event.serverSeq) ? (event.serverSeq as number) : undefined;
        return {
          id: uniqueId, odytChannelId: userKey,
          userName: stripAt(event.displayName || event.author || ''),
          avatarUrl: normalizeAvatarUrl(event.avatarUrl || event.avatar || ''),
          answer: 'PREDICT', responseTimeMs: 0, isCorrect: false, score: 0,
          serverSeq: tSeq, supportingTeam: null, predictedTeam: predictionHashtag,
          _sortTime: Date.now(), _sortSeq: tSeq ?? 0, _sortId: uniqueId,
        };
      }

      if (!answerLetter && !teamHashtag) {
        console.log('[SSE] Invalid answer format:', event.answer, 'from user:', userKey);
        return null;
      }

      // If it's a team hashtag (not a quiz answer), emit as support-only entry
      if (teamHashtag && !answerLetter) {
        processedIdsRef.current.add(uniqueId);
        supportedUsersRef.current.add(userKey);
        const tSeq = Number.isFinite(event.serverSeq) ? (event.serverSeq as number) : undefined;
        return {
          id: uniqueId, odytChannelId: userKey,
          userName: stripAt(event.displayName || event.author || ''),
          avatarUrl: normalizeAvatarUrl(event.avatarUrl || event.avatar || ''),
          answer: 'SUPPORT', responseTimeMs: 0, isCorrect: false, score: 0,
          serverSeq: tSeq, supportingTeam: teamHashtag,
          _sortTime: Date.now(), _sortSeq: tSeq ?? 0, _sortId: uniqueId,
        };
      }

      // Pick an origin timestamp for open/close gating.
      // Prioritize message-origin clocks to avoid replay floods being treated as "new" answers.
      const originTimestamp = (() => {
        if (Number.isFinite(event.youtubeServerTimestamp)) return event.youtubeServerTimestamp as number;
        if (event.receivedAtYT) {
          const parsed = Date.parse(event.receivedAtYT);
          if (Number.isFinite(parsed)) return parsed;
        }
        if (event.receivedAt) {
          const parsed = Date.parse(event.receivedAt);
          if (Number.isFinite(parsed)) return parsed;
        }
        if (event.stageTs) {
          if (Number.isFinite(event.stageTs.reader)) return event.stageTs.reader as number;
          if (Number.isFinite(event.stageTs.transform)) return event.stageTs.transform as number;
        }
        return null;
      })();

      // Transport/server timestamp fallback (used if no origin timestamp exists).
      const transportTimestamp = (() => {
        if (Number.isFinite(event.serverTs)) return event.serverTs as number;
        if (event.stageTs && Number.isFinite(event.stageTs.sse)) return event.stageTs.sse as number;
        return getReceivedTimestamp(event);
      })();

      const receivedTime = originTimestamp ?? transportTimestamp;
      const isServerTime = originTimestamp === null;
      const skew = isServerTime ? 0 : FALLBACK_SKEW_MS;

      // Keep SSE connection alive between questions, but ignore answer ingestion
      // unless a question is currently open.
      if (!qOpenTime) {
        return null;
      }

      // Sequence gate: reject replayed/backlog events from before question open.
      if (eventServerSeq !== null && eventServerSeq <= questionOpenSeqFloorRef.current) {
        return null;
      }

      if (
        shouldScoreViewersLocally() &&
        !Number.isFinite(event.serverSeq) &&
        !missingServerSeqLoggedRef.current
      ) {
        missingServerSeqLoggedRef.current = true;
        console.warn('[SSE] serverSeq missing; ordering may be nondeterministic.');
      }
      
      // CRITICAL: Filter out messages received BEFORE the question was opened
      if (qOpenTime && receivedTime < qOpenTime - skew) {
        console.log('[SSE] Ignoring answer received before question opened:', userKey, 'received:', receivedTime, 'opened:', qOpenTime);
        return null;
      }
      
      // Filter out messages received after question close.
      // Question close itself already happens at reveal + grace window in TeamQuiz.
      if (qCloseTime && receivedTime > qCloseTime + skew) {
        console.log('[SSE] Ignoring answer received after question closed:', userKey, 'received:', receivedTime, 'closed:', qCloseTime);
        return null;
      }
      
      // Calculate response time based on receivedAtYT timestamp
      // Apply viewer answer delay factor for latency compensation (frontend scoring only)
      const delayFactor = shouldScoreViewersLocally() ? getViewerAnswerDelay() : 0;
      const responseTimeMs = qOpenTime ? Math.max(0, (receivedTime - qOpenTime) - delayFactor) : 0;

      // Mark as processed
      processedIdsRef.current.add(uniqueId);
      if (answerLetter) answeredUsersRef.current.add(userKey);
      if (teamHashtag) supportedUsersRef.current.add(userKey);

      const serverSeq = Number.isFinite(event.serverSeq) ? (event.serverSeq as number) : undefined;
      const sortSeq = serverSeq ?? 0;

      return {
        id: uniqueId,
        odytChannelId: userKey,
        userName: stripAt(event.displayName || event.author || ''),
        avatarUrl: normalizeAvatarUrl(event.avatarUrl || event.avatar || ''),
        answer: answerLetter,
        responseTimeMs,
        isCorrect: false, // Will be computed at reveal
        score: 0, // Will be computed at reveal
        serverSeq,
        supportingTeam: teamHashtag || null,
        _sortTime: receivedTime,
        _sortSeq: sortSeq,
        _sortId: uniqueId,
      };
    },
    [questionId, questionIndex]
  );

  // Calculate exponential backoff delay with jitter
  const getReconnectDelay = useCallback(() => {
    const attempt = reconnectAttemptRef.current;
    const baseDelay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(RECONNECT_MULTIPLIER, attempt),
      MAX_RECONNECT_DELAY_MS
    );
    const jitter = baseDelay * RECONNECT_JITTER * Math.random();
    return Math.floor(baseDelay + jitter);
  }, []);

  const connect = useCallback(async (force = false) => {
    if (connectInFlightRef.current) return;
    connectInFlightRef.current = true;
    try {
      const attemptId = ++connectAttemptRef.current;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (!isSSEEnabled()) {
        console.log('[SSE] Disabled');
        setStatus('disconnected');
        reconnectAttemptRef.current = 0;
        return;
      }

      const existing = eventSourceRef.current;
      if (existing) {
        if (!force && (existing.readyState === EventSource.OPEN || existing.readyState === EventSource.CONNECTING)) {
          return;
        }
        existing.close();
        eventSourceRef.current = null;
      }

      const sseUrl = getSSEEventsUrl();
      if (!sseUrl) {
        console.log('[SSE] No SSE URL configured, refusing to connect');
        setStatus('disconnected');
        return;
      }
      if (!String(resourceId || '').trim()) {
        setStatus('disconnected');
        setError(null);
        return;
      }
      if (attemptId !== connectAttemptRef.current) {
        return;
      }

      console.log('[SSE] Connecting to:', sseUrl, 'attempt:', reconnectAttemptRef.current);
      setStatus('connecting');

      const sseWithClient = await (async () => {
        const url = new URL(sseUrl, window.location.origin);
        const clientId = getBrowserClientId();
        const frontendQuizGameId = String(resourceId || "").trim();
        const hostChannel = readQuizHostChannel();
        const tenantId = String(hostChannel.quizHostChannelId || "").trim() || "default-org";
        const applicationId = HOST_PRODUCT_KEY;
        const consumer = HOST_PRODUCT_KEY;
        if (clientId) url.searchParams.set("clientId", clientId);
        url.pathname = '/streams/events';
        const token = await issueScopedSseToken({
          baseUrl: url.origin,
          tenantId,
          applicationId,
          resourceId: frontendQuizGameId,
          consumer,
        });
        url.searchParams.set('tenantId', tenantId);
        url.searchParams.set('applicationId', applicationId);
        url.searchParams.set('resourceId', frontendQuizGameId);
        url.searchParams.set('consumer', consumer);
        url.searchParams.set('token', token);
        return url.toString();
      })();

      const eventSource = new EventSource(sseWithClient);
      eventSourceRef.current = eventSource;
      connectStartedAtRef.current = Date.now();

      eventSource.onopen = () => {
        setStatus('connected');
        setError(null);
        setLastHeartbeat(Date.now());
        reconnectAttemptRef.current = 0;
        connectStartedAtRef.current = null;
        console.log('[SSE] Connected');
      };

      // Listen for 'answer' event type
      eventSource.addEventListener('answer', (event: MessageEvent) => {
      setLastHeartbeat(Date.now());
      try {
        const data = JSON.parse(event.data) as AnswerEvent;
        if (!matchesCurrentSseScope(data, resourceId)) return;
        ingestSseTimeSignal(data);
        const eventId = event.lastEventId || undefined;
        setLastEventTime(Date.now());
        
        if (eventId) {
          lastEventIdRef.current = eventId;
        }
        
        const processed = processAnswerEvent(data, eventId);
        if (processed) {
          addAnswerToBatch(processed);
        }
      } catch (err) {
        console.error('[SSE] Failed to parse answer event:', err);
      }
      });

      // Listen for 'system' events (for logging/debugging)
      eventSource.addEventListener('system', (event: MessageEvent) => {
      setLastHeartbeat(Date.now());
      try {
        const data = JSON.parse(event.data) as SystemEvent;
        ingestSseTimeSignal(data);
        console.log('[SSE] System message:', data.message, data.clientId ? `(clientId: ${data.clientId})` : '');
      } catch {
        // Ignore parse errors for system messages
      }
      });

      // Also listen to default onmessage for any other events
      eventSource.onmessage = (event) => {
      setLastHeartbeat(Date.now());
      try {
        const data = JSON.parse(event.data);
        ingestSseTimeSignal(data);
        
        // Check if it looks like an answer event
        if (data.type === 'ANSWER' && data.channelId) {
          if (!matchesCurrentSseScope(data as AnswerEvent, resourceId)) return;
          const eventId = event.lastEventId || undefined;
          setLastEventTime(Date.now());
          
          if (eventId) {
            lastEventIdRef.current = eventId;
          }
          
          const processed = processAnswerEvent(data as AnswerEvent, eventId);
          if (processed) {
            addAnswerToBatch(processed);
          }
        }
      } catch {
        // Ignore non-JSON payloads (e.g., heartbeats)
      }
      };

      eventSource.onerror = () => {
      const rs = eventSource.readyState;
      if (rs === EventSource.CONNECTING) {
        // Native EventSource reconnect is in progress.
        setStatus('reconnecting');
        return;
      }

      if (rs === EventSource.CLOSED) {
        setStatus('disconnected');
      } else {
        setStatus('reconnecting');
      }
      setError('SSE connection error');

      // Only schedule manual reconnect when EventSource is fully closed.
      if (enabled && rs === EventSource.CLOSED) {
        if (eventSourceRef.current === eventSource) {
          eventSourceRef.current = null;
        }
        connectStartedAtRef.current = null;
        reconnectAttemptRef.current += 1;
        const delay = getReconnectDelay();
        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (enabled) void connect(true);
        }, delay);
      }
      };
    } finally {
      connectInFlightRef.current = false;
    }
  }, [enabled, processAnswerEvent, getReconnectDelay]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (periodicReconnectRef.current) {
      clearInterval(periodicReconnectRef.current);
      periodicReconnectRef.current = null;
    }
    setStatus('disconnected');
    setLastHeartbeat(null);
    connectStartedAtRef.current = null;
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0; // Reset backoff
    disconnect();
    void connect(true);
  }, [disconnect, connect]);

  const reset = useCallback(() => {
    setAnswers([]);
    processedIdsRef.current.clear();
    answeredUsersRef.current.clear();
    supportedUsersRef.current.clear();
    lastEventIdRef.current = null;
    lastScoredCorrectRef.current = null;
    setError(null);
    setLastEventTime(null);
    latestServerSeqSeenRef.current = 0;
    questionOpenSeqFloorRef.current = 0;
    prevQuestionOpenTimeRef.current = null;
    batchedAnswers.current = [];
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
      batchTimeout.current = null;
    }
    console.log('[SSE] Reset: cleared all answers and tracking state');
  }, []);

  // Connect/disconnect based on enabled state
  useEffect(() => {
    if (enabled) {
      void connect();
      
      // Keep the stream alive with periodic health + heartbeat checks.
      periodicReconnectRef.current = setInterval(() => {
        if (!isSSEEnabled()) return;

        const es = eventSourceRef.current;
        const readyState = es?.readyState;
        const isOpen = readyState === EventSource.OPEN;
        const now = Date.now();
        const heartbeatTimeoutMs = Math.max(5000, getSSEHeartbeatTimeout() * 1000);
        const hb = lastHeartbeatRef.current;
        const stale = hb !== null && now - hb > heartbeatTimeoutMs;
        const connectingTooLong =
          readyState === EventSource.CONNECTING &&
          connectStartedAtRef.current !== null &&
          now - connectStartedAtRef.current > Math.max(8000, heartbeatTimeoutMs);

        if (readyState === EventSource.CLOSED || connectingTooLong) {
          if (connectInFlightRef.current) return;
          console.log('[SSE] Transport stalled (closed/connecting-too-long), recreating stream...');
          void connect(true);
          return;
        }

        if (!isOpen) return;

        if (stale) {
          if (connectInFlightRef.current) return;
          console.log('[SSE] Heartbeat stale, reconnecting stream...');
          void connect(true);
        }
      }, PERIODIC_RECONNECT_INTERVAL_MS);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Recover quickly when tab becomes active or network returns.
  useEffect(() => {
    if (!enabled) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const es = eventSourceRef.current;
      if (!es || es.readyState !== EventSource.OPEN) {
        void reconnect();
      }
    };
    const handleOnline = () => {
      void reconnect();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, reconnect]);

  // Auto-connect when SSE is globally enabled
  useEffect(() => {
    const handleSSEEnabled = (e: CustomEvent<boolean>) => {
      if (e.detail) {
        void connect(true);
      }
    };
    window.addEventListener('sseEnabledChanged', handleSSEEnabled as EventListener);
    return () => window.removeEventListener('sseEnabledChanged', handleSSEEnabled as EventListener);
  }, [connect]);

  // Reconnect on admin config change
  useEffect(() => {
    const handler = () => {
      if (enabled) void connect(true);
    };

    window.addEventListener('sseConfigChanged', handler as EventListener);
    window.addEventListener('sseStreamUrlChanged', handler as EventListener);
    window.addEventListener('appModeChanged', handler as EventListener);
    return () => {
      window.removeEventListener('sseConfigChanged', handler as EventListener);
      window.removeEventListener('sseStreamUrlChanged', handler as EventListener);
      window.removeEventListener('appModeChanged', handler as EventListener);
    };
  }, [enabled, connect]);

  // Reset when question changes - clear all previous answers
  useEffect(() => {
    reset();
  }, [questionIndex, reset]);

  // When correctAnswer becomes available (reveal), score all answers on main thread
  // Only in frontend_scoring mode; backend_scoring mode skips local scoring
  useEffect(() => {
    if (correctAnswer === null) return;
    if (lastScoredCorrectRef.current === correctAnswer) return;
    
    // Skip local scoring if mode doesn't support frontend scoring
    if (!shouldScoreViewersLocally()) {
      console.log('[SSE] Backend scoring mode - skipping local score calculation');
      return;
    }

    lastScoredCorrectRef.current = correctAnswer;
    const minScore = getMinimumScore();

    if (batchedAnswers.current.length > 0) {
      batchedAnswers.current = batchedAnswers.current.map((a) => {
        const { score, isCorrect } = scoreAnswer(a, correctAnswer, minScore);
        return { ...a, isCorrect, score };
      });
    }

    startTransition(() => {
      setAnswers((prev) =>
        prev.map((a) => {
          const { score, isCorrect } = scoreAnswer(a, correctAnswer, minScore);
          return { ...a, isCorrect, score };
        })
      );
    });
  }, [correctAnswer, scoreAnswer]);

  return {
    answers,
    status,
    isConnected: status === 'connected',
    error,
    lastEventTime,
    lastHeartbeat,
    totalAnswers: answers.length,
    reset,
    reconnect,
    queueLength,
    droppedCount,
  };
};
