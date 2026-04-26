import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { YouTubeChatResponses, ChatResponse } from "./YouTubeChatResponses";
import { LeaderboardEntry } from "./LiveLeaderboard";
import { AnswerDistributionChart } from "./AnswerDistributionChart";
import { ViewerBoardsTabs } from "./ViewerBoardsTabs";
import { useAnswerSSE, ProcessedAnswer, SSEConnectionStatus } from "@/hooks/useAnswerSSE";
import { useDummyAnswers } from "@/hooks/useDummyAnswers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Trophy, BarChart3, Maximize2, Minimize2, X, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveResponseCounter } from "./LiveResponseCounter";
import { ConnectionQualityIndicator, ConnectionStatus, ConnectionQuality } from "./ConnectionQualityIndicator";
import { getFrontendQuizGameId, setFrontendQuizGameId as setApiFrontendQuizGameId, getActiveFrontendQuizGame } from "@/config/apiConfig";
import { SupportingTeam, TeamSupporterCounts, calculateTeamCounts } from "./TeamSupportBadge";
import { useApp } from "@/context/AppContext";
import { isSSEEnabled, getAppMode } from "@/config/appMode";
import { useQuizStore } from "@/store/quizStore";
import { useServerNow } from "@/hooks/useServerNow";
import { useScoringEngine } from "@/hooks/useScoringEngine";
import { getGraceWindowMs } from "@/config/scoringEngineConfig";
import { calculateViewerScore } from "@/lib/viewerScoring";
import { usePrizeOverlay } from "@/hooks/usePrizeOverlay";

// Storage keys for dummy answer settings
const DUMMY_ENABLED_KEY = 'dummyAnswersEnabled';
const DUMMY_RATE_KEY = 'dummyAnswersRate';
const DUMMY_CORRECT_PROB_KEY = 'dummyAnswersCorrectProb';
/* ================= CONSTANTS ================= */

export const YOUTUBE_LEADERBOARD_STORAGE_KEY = "youtubeQuizLeaderboard:v1";
const QUESTION_LEADERBOARD_STORAGE_PREFIX = "youtubeQuestionLeaderboard:v1";

/** Clears the YouTube leaderboard from localStorage */
export const clearYouTubeLeaderboard = (): void => {
  localStorage.removeItem(YOUTUBE_LEADERBOARD_STORAGE_KEY);
  localStorage.removeItem("youtubeQuizLeaderboard");
  // Remove per-quiz scoped leaderboard snapshots
  const scopedPrefix = `${YOUTUBE_LEADERBOARD_STORAGE_KEY}:`;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(scopedPrefix)) {
      localStorage.removeItem(key);
    }
  }
};

/* ================= TYPES ================= */

interface YouTubeLivePanelProps {
  quizStartToken?: number;
  isAnswerRevealed: boolean;
  correctAnswer: number | null;
  correctLabel?: string | null;
  labelToOriginalIndex?: Record<string, number> | null;
  questionActive: boolean;
  questionId?: string | number;
  questionIndex?: number; // For backend answer polling
  questionOpenTime: number | null;
  questionCloseTime?: number | null; // When question was closed (reveal answer clicked)
  onLeaderboardUpdate?: (entries: LeaderboardEntry[]) => void;
  onTeamSupporterCountsUpdate?: (counts: TeamSupporterCounts) => void;
  onResponsesUpdate?: (responses: ChatResponse[]) => void;
  onQuestionFinalized?: (questionId: string, responses: ChatResponse[]) => void;
  onSSEStatusUpdate?: (status: SSEConnectionStatus, isConnected: boolean) => void;
  onPredictionUpdate?: (prediction: { odytChannelId: string; userName: string; avatarUrl: string; predictedTeam: string }) => void;
  onEmojiReaction?: (reaction: { id: string; emoji: string; userName: string }) => void;
  cumulativeLeaderboard?: LeaderboardEntry[];
  isPowerplayActive?: boolean;
  maskResponses?: boolean;
  onHide?: () => void;
}

interface StoredLeaderboardData {
  entries: Record<
    string,
    {
      userName: string;
      avatarUrl: string;
      totalScore: number;
      correctAnswers: number;
      totalResponses: number;
      totalResponseTimeMs: number;
      supportingTeam?: SupportingTeam;
    }
  >;
}

/* ================= HELPERS ================= */

const normalizeAnswer = (text: string): string | null => {
  const cleaned = text.trim().toUpperCase();
  return /^[A-Z]$/.test(cleaned) ? cleaned : null;
};

const normalizeAvatarUrl = (value: string | null | undefined): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("/")
  ) {
    return raw;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}\/.+/i.test(raw)) {
    return `https://${raw}`;
  }
  return "";
};

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

/* ================= COMPONENT ================= */

export const YouTubeLivePanel = ({
  quizStartToken,
  isAnswerRevealed,
  correctAnswer,
  correctLabel = null,
  labelToOriginalIndex = null,
  questionActive,
  questionId,
  questionIndex = 0,
  questionOpenTime,
  questionCloseTime = null,
  onLeaderboardUpdate,
  onTeamSupporterCountsUpdate,
  onResponsesUpdate,
  onQuestionFinalized,
  onSSEStatusUpdate,
  onPredictionUpdate,
  onEmojiReaction,
  cumulativeLeaderboard = [],
  isPowerplayActive = false,
  maskResponses = false,
  onHide,
}: YouTubeLivePanelProps) => {
  const [activeTab, setActiveTab] = useState("responses");
  const [leaderboardData, setLeaderboardData] =
    useState<StoredLeaderboardData>({ entries: {} });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const setViewerStats = useQuizStore((state) => state.setViewerStats);
  const setViewerLeaderboardStore = useQuizStore((state) => state.setViewerLeaderboard);

  // Backend scoring engine polling (active only in backend_scoring mode).
  // The extra polling extension below is only for backend scoring mode.
  // Frontend scoring still has its own SSE-based late-answer grace window.
  const { frontendQuizGameId: appContextFrontendGameId, applicationId } = useApp();
  const appMode = getAppMode();
  const isBackendScoringMode = appMode === 'backend_scoring';
  const graceExtensionRef = useRef<NodeJS.Timeout | null>(null);
  const [pollExtended, setPollExtended] = useState(false);

  // Grace window extension here applies only to backend scoring mode.
  // Frontend scoring relies on the SSE questionCloseTime gate instead.
  useEffect(() => {
    // Only extend polling for backend scoring mode
    if (!isBackendScoringMode) {
      setPollExtended(false);
      return;
    }

    if (!questionActive && !pollExtended) {
      // Question just closed — extend polling for grace window + buffer (backend scoring only)
      const graceMs = getGraceWindowMs() + 5000;
      setPollExtended(true);
      graceExtensionRef.current = setTimeout(() => {
        setPollExtended(false);
      }, graceMs);
    }
    if (questionActive) {
      // Question opened — cancel any pending extension
      setPollExtended(false);
      if (graceExtensionRef.current) {
        clearTimeout(graceExtensionRef.current);
        graceExtensionRef.current = null;
      }
    }
    return () => {
      if (graceExtensionRef.current) clearTimeout(graceExtensionRef.current);
    };
  }, [questionActive, isBackendScoringMode, pollExtended]);

  // Poll by the active frontend quiz run ID that the rest of the app already uses.
  const effectiveGameIdForPolling = appContextFrontendGameId;
  
  const scoringEngine = useScoringEngine({
    enabled: isBackendScoringMode && (questionActive || pollExtended),
    gameId: effectiveGameIdForPolling,
    questionIndex,
  });

  const [allResponses, setAllResponses] = useState<ChatResponse[]>([]);
  const allResponsesRef = useRef<ChatResponse[]>([]);
  const [displayedResponses, setDisplayedResponses] = useState<ChatResponse[]>([]);
  const [leaderboardHydrated, setLeaderboardHydrated] = useState(false);
  const scopedQuizId = useMemo(
    () => appContextFrontendGameId || "default",
    [appContextFrontendGameId]
  );
  const leaderboardStorageKey = useMemo(() => {
    return `${YOUTUBE_LEADERBOARD_STORAGE_KEY}:${scopedQuizId}`;
  }, [scopedQuizId]);
  const questionLeaderboardStorageKey = useMemo(() => {
    const scopedQuestionId = questionId === undefined || questionId === null ? "unknown" : String(questionId);
    return `${QUESTION_LEADERBOARD_STORAGE_PREFIX}:${scopedQuizId}:${scopedQuestionId}`;
  }, [scopedQuizId, questionId]);
  const questionLeaderboardStoragePrefix = useMemo(
    () => `${QUESTION_LEADERBOARD_STORAGE_PREFIX}:${scopedQuizId}:`,
    [scopedQuizId]
  );
  const cumulativeEntries = useMemo(
    () => (cumulativeLeaderboard.length > 0 ? cumulativeLeaderboard : leaderboard),
    [cumulativeLeaderboard, leaderboard]
  );

  const prizeOverlay = usePrizeOverlay({
    enabled: Boolean(appContextFrontendGameId && cumulativeEntries.length > 0),
    applicationId,
    frontendQuizGameId: String(appContextFrontendGameId || ""),
    viewers: cumulativeEntries.map((entry, idx) => ({
      odytChannelId: entry.odytChannelId,
      userName: entry.userName,
      rank: idx + 1,
    })),
    pollMs: 0,
    refreshKey: `${String(questionId ?? "q")}:${isAnswerRevealed ? "revealed" : "open"}`,
  });

  const xpLevelByChannel = useMemo(() => {
    const next: Record<string, number> = {};
    for (const entry of cumulativeEntries) {
      const channelId = String(entry.odytChannelId || "");
      next[channelId] = Number(prizeOverlay.overlayByChannel[channelId]?.properParticipations || 0);
    }
    return next;
  }, [cumulativeEntries, prizeOverlay.overlayByChannel]);

  const respondedUsersRef = useRef<Set<string>>(new Set());
  const leaderboardCalculatedRef = useRef(false);
  const queueRef = useRef<ChatResponse[]>([]);
  const userTeamMapRef = useRef<Map<string, SupportingTeam>>(new Map());

  /* ================= LOAD / SAVE ================= */
  useEffect(() => {
    allResponsesRef.current = allResponses;
  }, [allResponses]);


  useEffect(() => {
    // New quiz run should always start from a clean in-memory + persisted state.
    setLeaderboardData({ entries: {} });
    setLeaderboardHydrated(true);
    setLeaderboard([]);
    setAllResponses([]);
    setDisplayedResponses([]);
    queueRef.current = [];
    respondedUsersRef.current.clear();
    userTeamMapRef.current.clear();
    leaderboardCalculatedRef.current = false;
    onResponsesUpdate?.([]);
    onTeamSupporterCountsUpdate?.(calculateTeamCounts(userTeamMapRef.current));

    if (getAppMode() !== 'backend_scoring') {
      localStorage.removeItem(leaderboardStorageKey);
    }

    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(questionLeaderboardStoragePrefix)) {
        localStorage.removeItem(key);
      }
    }
  }, [quizStartToken, leaderboardStorageKey, onResponsesUpdate, onTeamSupporterCountsUpdate, questionLeaderboardStoragePrefix]);

  useEffect(() => {
    if (getAppMode() === 'backend_scoring') return;
    // Quiz-scoped load: each quiz gets isolated leaderboard/support state.
    setLeaderboardHydrated(false);
    userTeamMapRef.current.clear();
    const saved = localStorage.getItem(leaderboardStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredLeaderboardData;
        const entries = Object.fromEntries(
          Object.entries(parsed?.entries || {}).map(([id, d]) => [
            id,
            {
              ...d,
              avatarUrl: normalizeAvatarUrl(d?.avatarUrl),
            },
          ])
        );
        setLeaderboardData({ entries });
        setLeaderboardHydrated(true);
      } catch (err) {
        console.warn("[YouTubeLivePanel] Failed to parse stored leaderboard data", err);
        setLeaderboardData({ entries: {} });
        setLeaderboardHydrated(true);
      }
    } else {
      setLeaderboardData({ entries: {} });
      setLeaderboardHydrated(true);
    }
  }, [leaderboardStorageKey]);

  useEffect(() => {
    if (getAppMode() === 'backend_scoring') return;
    if (!leaderboardHydrated) return;
    localStorage.setItem(leaderboardStorageKey, JSON.stringify(leaderboardData));

    const entries: LeaderboardEntry[] = Object.entries(
      leaderboardData.entries
    ).map(([odytChannelId, d]) => ({
      odytChannelId,
      userName: d.userName,
      avatarUrl: normalizeAvatarUrl(d.avatarUrl),
      totalScore: d.totalScore,
      correctAnswers: d.correctAnswers,
      totalResponses: d.totalResponses,
      avgResponseTimeMs:
        d.totalResponses > 0
          ? d.totalResponseTimeMs / d.totalResponses
          : 0,
      supportingTeam: d.supportingTeam,
    }));

    entries.sort((a, b) =>
      b.totalScore !== a.totalScore
        ? b.totalScore - a.totalScore
        : a.avgResponseTimeMs - b.avgResponseTimeMs
    );

    console.log(`[YouTubeLivePanel] Cumulative leaderboard update: ${entries.length} users, top scores: ${entries.slice(0, 3).map(e => `${e.userName}:${e.totalScore}`).join(', ')}`);

    setLeaderboard(entries);
    if (onLeaderboardUpdate) {
      // In backend-scoring mode, parent merges snapshots cumulatively.
      // Avoid writing raw poll snapshots directly to shared store/localStorage.
      onLeaderboardUpdate(entries);
    } else {
      setViewerLeaderboardStore(entries);
    }

    // Calculate and emit team supporter counts
    const teamCounts = calculateTeamCounts(userTeamMapRef.current);
    onTeamSupporterCountsUpdate?.(teamCounts);
  }, [leaderboardData, leaderboardStorageKey, leaderboardHydrated, onLeaderboardUpdate, onTeamSupporterCountsUpdate, setViewerLeaderboardStore]);

  /* ================= QUESTION RESET ================= */

  useEffect(() => {
    // Only reset when a new question is opened.
    // Do not clear during reveal/close transitions, or scoring will lose responses.
    if (!questionId || isAnswerRevealed) return;

    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(questionLeaderboardStoragePrefix) && key !== questionLeaderboardStorageKey) {
        localStorage.removeItem(key);
      }
    }

    let restoredResponses: ChatResponse[] = [];
    try {
      const raw = localStorage.getItem(questionLeaderboardStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { responses?: ChatResponse[] };
        if (Array.isArray(parsed?.responses)) {
          restoredResponses = parsed.responses;
        }
      }
    } catch (err) {
      console.warn("[YouTubeLivePanel] Failed to restore question leaderboard state", err);
    }

    queueRef.current = [];
    leaderboardCalculatedRef.current = false;
    respondedUsersRef.current.clear();
    restoredResponses.forEach((r) => respondedUsersRef.current.add(r.odytChannelId));

    setAllResponses(restoredResponses);
    setDisplayedResponses(restoredResponses);
    onResponsesUpdate?.(restoredResponses);
  }, [questionId, isAnswerRevealed, onResponsesUpdate, questionLeaderboardStorageKey, questionLeaderboardStoragePrefix]);

  useEffect(() => {
    if (!questionId) return;
    try {
      localStorage.setItem(
        questionLeaderboardStorageKey,
        JSON.stringify({
          questionId: String(questionId),
          savedAt: Date.now(),
          responses: allResponses,
        })
      );
    } catch (err) {
      console.warn("[YouTubeLivePanel] Failed to persist question leaderboard state", err);
    }
  }, [questionId, questionLeaderboardStorageKey, allResponses]);

  useEffect(() => {
    if (isPowerplayActive) {
      setIsExpanded(false);
    }
  }, [isPowerplayActive]);

  /* ================= BACKEND INTEGRATION ================= */

  // Legacy module state fallback. This should never overwrite the AppContext-owned
  // frontend run ID.
  const [localQuizGameId, setLocalQuizGameId] = useState<string | null>(() => {
    return getFrontendQuizGameId();
  });
  
  const effectiveBackendGameId = appContextFrontendGameId || localQuizGameId;
  const hasBackendQuizGame = !!effectiveBackendGameId;
  
  // Keep the legacy module ID aligned with the active frontend run ID.
  useEffect(() => {
    const nextId = appContextFrontendGameId || getFrontendQuizGameId();
    if (nextId && nextId !== localQuizGameId) {
      setLocalQuizGameId(nextId);
      setApiFrontendQuizGameId(nextId);
      console.log('[YouTubeLivePanel] Synced active quiz ID for polling:', nextId);
    }
  }, [appContextFrontendGameId, localQuizGameId]);
  
  // Recover the active quiz run id into the legacy in-memory module if needed.
  useEffect(() => {
    const recoverQuizGame = async () => {
      if (appContextFrontendGameId) {
        return;
      }

      const storedApiId = getFrontendQuizGameId();

      if (storedApiId) {
        setLocalQuizGameId(storedApiId);
        console.log('[YouTubeLivePanel] Using apiConfig quiz game ID:', storedApiId);
        return;
      }
      
      // Try to recover from backend via status API
      try {
        const result = await getActiveFrontendQuizGame();
        if (result.success && result.frontendQuizGameId) {
          setLocalQuizGameId(result.frontendQuizGameId);
          setApiFrontendQuizGameId(result.frontendQuizGameId);
          console.log('[YouTubeLivePanel] Recovered active quiz run ID:', result.frontendQuizGameId);
        }
      } catch (e) {
        console.log('[YouTubeLivePanel] No active quiz game found');
      }
    };
    recoverQuizGame();
  }, [appContextFrontendGameId]);
  
  // Debug logging
  useEffect(() => {
    console.log('[YouTubeLivePanel] Backend game ID:', effectiveBackendGameId, 'hasBackend:', hasBackendQuizGame, 'questionActive:', questionActive);
  }, [effectiveBackendGameId, hasBackendQuizGame, questionActive]);

  // Default connection state values (stream management is now backend-only)
  const status: ConnectionStatus = 'connected';
  const quality: ConnectionQuality = 'excellent';
  const lastHeartbeat: number | null = Date.now();
  const reconnectAttempt = 0;
  const maxReconnectAttempts = 5;
  const messageRate = 0;
  const reconnect = () => {};
  const isConnected = true;

  // Backend SSE - used when we have a quiz game ID or want live answers
  const handleNewBackendAnswers = useCallback((newAnswers: ProcessedAnswer[]) => {
    const emojiOnly = newAnswers.filter((a) => a.answer === 'EMOJI');
    const supportOnly = newAnswers.filter((a) => a.answer === 'SUPPORT');
    const predictionOnly = newAnswers.filter((a) => a.answer === 'PREDICT');
    const answerEvents = newAnswers.filter((a) => a.answer !== 'SUPPORT' && a.answer !== 'PREDICT' && a.answer !== 'EMOJI');

    // Handle emoji reactions
    emojiOnly.forEach((e) => {
      if (e.emojiReaction && onEmojiReaction) {
        onEmojiReaction({ id: e.id, emoji: e.emojiReaction, userName: e.userName });
      }
    });

    // Handle predictions
    predictionOnly.forEach((p) => {
      if (p.predictedTeam && onPredictionUpdate) {
        onPredictionUpdate({
          odytChannelId: p.odytChannelId,
          userName: p.userName,
          avatarUrl: p.avatarUrl,
          predictedTeam: p.predictedTeam,
        });
      }
    });

    // Convert ProcessedAnswer to ChatResponse format
    const responses: ChatResponse[] = answerEvents
      .map((a) => {
        const normalizedAnswer = normalizeAnswer(a.answer || "");
        if (!normalizedAnswer) return null;
        return {
          id: a.id,
          odytChannelId: a.odytChannelId,
          userName: a.userName,
          avatarUrl: normalizeAvatarUrl(a.avatarUrl),
          answer: normalizedAnswer,
          responseTimeMs: a.responseTimeMs,
          isCorrect: a.isCorrect,
          score: a.score,
          serverSeq: a.serverSeq,
          supportingTeam: a.supportingTeam,
        } as ChatResponse;
      })
      .filter((r): r is ChatResponse => !!r);

    // Update user team map with latest supporting team on every message
    let teamMapChanged = false;
    [...supportOnly, ...answerEvents].forEach((a) => {
      if (a.supportingTeam) {
        const currentTeam = userTeamMapRef.current.get(a.odytChannelId);
        if (currentTeam !== a.supportingTeam) {
          userTeamMapRef.current.set(a.odytChannelId, a.supportingTeam);
          teamMapChanged = true;
        }
      }
    });

    // Recalculate and emit team counts immediately when team map changes
    if (teamMapChanged) {
      const teamCounts = calculateTeamCounts(userTeamMapRef.current);
      onTeamSupporterCountsUpdate?.(teamCounts);
    }

    if (!responses.length) {
      return;
    }

    // One answer per user per question.
    // respondedUsersRef is reset on each new question, so this blocks duplicates/replays
    // within the current question without affecting the next question.
    const uniqueResponses: ChatResponse[] = [];
    responses.forEach((r) => {
      if (respondedUsersRef.current.has(r.odytChannelId)) return;
      respondedUsersRef.current.add(r.odytChannelId);
      uniqueResponses.push(r);
    });

    if (!uniqueResponses.length) return;

    // Persist participants immediately so final leaderboard keeps everyone who answered,
    // even if quiz ends before reveal/scoring of the current question.
    setLeaderboardData((prev) => {
      const entries = { ...prev.entries };
      uniqueResponses.forEach((r) => {
        const existing = entries[r.odytChannelId];
        const latestTeam = userTeamMapRef.current.get(r.odytChannelId) || r.supportingTeam;
        if (existing) {
          const nextAvatar =
            normalizeAvatarUrl(r.avatarUrl) ||
            normalizeAvatarUrl(existing.avatarUrl) ||
            "";
          const nextUserName =
            (r.userName && r.userName.trim()) ||
            (existing.userName && existing.userName.trim()) ||
            "Viewer";
          entries[r.odytChannelId] = {
            ...existing,
            userName: nextUserName,
            avatarUrl: nextAvatar,
            totalResponses: existing.totalResponses + 1,
            totalResponseTimeMs: existing.totalResponseTimeMs + r.responseTimeMs,
            supportingTeam: latestTeam || existing.supportingTeam,
          };
        } else {
          entries[r.odytChannelId] = {
            userName: r.userName,
            avatarUrl: normalizeAvatarUrl(r.avatarUrl),
            totalScore: 0,
            correctAnswers: 0,
            totalResponses: 1,
            totalResponseTimeMs: r.responseTimeMs,
            supportingTeam: latestTeam,
          };
        }
      });

      return { entries };
    });

    // Add to all responses (A/B/C/D only)
    setAllResponses((prev) => [...prev, ...uniqueResponses]);
    
    // Add to queue for animated display
    uniqueResponses.forEach((r) => {
      queueRef.current.push(r);
    });
  }, [onTeamSupporterCountsUpdate, onPredictionUpdate, onEmojiReaction]);

  // SSE configuration - keep the transport open, filter responses in the frontend by resourceId.
  // IMPORTANT: During powerplay, we completely skip viewer answer processing
  // This avoids practical latency issues and simplifies scoring
  const sseActive = isSSEEnabled() && !isPowerplayActive;
  const sseResourceId = String(appContextFrontendGameId || localQuizGameId || "").trim();
  
  // Use SSE for real-time responses again. The frontend filters by connectorResourceId/frontendQuizGameId.
  const {
    answers: backendAnswers,
    totalAnswers: backendTotalAnswers,
    status: sseStatus,
    isConnected: sseIsConnected,
    lastEventTime: backendLastPoll,
    lastHeartbeat: sseLastHeartbeat,
    reconnect: sseReconnect,
    reset: sseReset,
  } = useAnswerSSE({
    enabled: sseActive,
    questionIndex,
    resourceId: sseResourceId,
    questionOpenTime: isPowerplayActive ? null : questionOpenTime, // Null during powerplay = skip timing
    questionCloseTime, // Pass close time for strict answer filtering
    correctAnswer,
    labelToOriginalIndex,
    onNewAnswers: isPowerplayActive ? undefined : handleNewBackendAnswers, // Skip handler during powerplay
  });

  /* ================= DUMMY ANSWERS INTEGRATION ================= */

  // Read dummy answer settings from localStorage
  const [dummyEnabled, setDummyEnabled] = useState(() => {
    try {
      return localStorage.getItem(DUMMY_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [dummyRate, setDummyRate] = useState(() => {
    try {
      return parseInt(localStorage.getItem(DUMMY_RATE_KEY) || '30', 10);
    } catch {
      return 30;
    }
  });

  const [dummyCorrectProb, setDummyCorrectProb] = useState(() => {
    try {
      return parseFloat(localStorage.getItem(DUMMY_CORRECT_PROB_KEY) || '0.4');
    } catch {
      return 0.4;
    }
  });

  // Listen for storage changes to sync dummy settings (no polling - use custom event)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DUMMY_ENABLED_KEY) {
        setDummyEnabled(e.newValue === 'true');
      }
      if (e.key === DUMMY_RATE_KEY && e.newValue) {
        setDummyRate(parseInt(e.newValue, 10));
      }
      if (e.key === DUMMY_CORRECT_PROB_KEY && e.newValue) {
        setDummyCorrectProb(parseFloat(e.newValue));
      }
    };

    // Listen for custom event from same-tab storage changes
    const handleDummySettingsChange = () => {
      const enabled = localStorage.getItem(DUMMY_ENABLED_KEY) === 'true';
      const rate = parseInt(localStorage.getItem(DUMMY_RATE_KEY) || '30', 10);
      const prob = parseFloat(localStorage.getItem(DUMMY_CORRECT_PROB_KEY) || '0.4');
      
      setDummyEnabled(enabled);
      setDummyRate(rate);
      setDummyCorrectProb(prob);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dummySettingsChanged', handleDummySettingsChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dummySettingsChanged', handleDummySettingsChange);
    };
  }, []);

  // Handle dummy answer generation - also skip during powerplay
  const handleNewDummyAnswer = useCallback((answer: ProcessedAnswer) => {
    if (isPowerplayActive) return; // Skip during powerplay
    handleNewBackendAnswers([answer]);
    console.log('[YouTubeLivePanel] Dummy answer generated:', answer.userName, answer.answer);
  }, [handleNewBackendAnswers, isPowerplayActive]);

  const { isGenerating: isDummyGenerating, generatedCount: dummyCount } = useDummyAnswers({
    enabled: dummyEnabled && questionActive && !isAnswerRevealed && !isPowerplayActive,
    answersPerMinute: dummyRate,
    correctAnswerProbability: dummyCorrectProb,
    questionIndex,
    correctAnswer,
    questionDurationMs: 30000,
    onNewAnswer: handleNewDummyAnswer,
  });

  // Combined connection status - use SSE status again.
  const effectiveIsConnected = sseIsConnected;
  const effectiveStatus: SSEConnectionStatus = sseStatus;
  const effectiveReconnect = sseReconnect;
  
  // Emit SSE status to parent component
  useEffect(() => {
    onSSEStatusUpdate?.(sseStatus, sseIsConnected);
  }, [sseStatus, sseIsConnected, onSSEStatusUpdate]);
  
  // Calculate answer rate based on seconds since question opened and total answers received
  const [answerRate, setAnswerRate] = useState(0);
  const serverNow = useServerNow();
  
  // Update answer rate based on elapsed time and total responses (reduced frequency)
  useEffect(() => {
    if (!questionActive || !questionOpenTime) {
      setAnswerRate(0);
      return;
    }
    
    // Calculate rate every 2 seconds to reduce CPU usage
    const intervalId = setInterval(() => {
      const elapsedMs = serverNow() - questionOpenTime;
      const elapsedSeconds = elapsedMs / 1000;
      
      if (elapsedSeconds > 0 && allResponses.length > 0) {
        // Rate = answers per second
        const rate = allResponses.length / elapsedSeconds;
        setAnswerRate(rate);
      } else {
        setAnswerRate(0);
      }
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [questionActive, questionOpenTime, allResponses.length, serverNow]);
  
  // Reset answer rate on question change
  useEffect(() => {
    setAnswerRate(0);
  }, [questionId]);

  /* ================= QUEUE DISPLAY ================= */

  useEffect(() => {
    if (!questionActive) return;

    // Use requestAnimationFrame-based throttling for smoother display
    let animationFrameId: number;
    let lastUpdate = 0;
    const DISPLAY_INTERVAL = 1000; // ms between display updates (1s stagger)

    const processQueue = (timestamp: number) => {
      if (timestamp - lastUpdate >= DISPLAY_INTERVAL) {
        if (queueRef.current.length > 0) {
          // Display one item at a time for smooth staggered appearance
          const item = queueRef.current.shift();
          if (item) {
            setDisplayedResponses((prev) => [...prev, item]);
          }
        }
        lastUpdate = timestamp;
      }
      animationFrameId = requestAnimationFrame(processQueue);
    };

    animationFrameId = requestAnimationFrame(processQueue);

    return () => cancelAnimationFrame(animationFrameId);
  }, [questionActive]);

  /* ================= BACKEND SCORING ENGINE OVERRIDE ================= */

  // When in backend_scoring mode, override cumulative leaderboard with polling data
  useEffect(() => {
    if (getAppMode() !== 'backend_scoring' || !scoringEngine.quizLeaderboard) return;

    const backendEntries: LeaderboardEntry[] = scoringEngine.quizLeaderboard.entries.map((e) => ({
      odytChannelId: e.channelId,
      userName: e.userName,
      avatarUrl: normalizeAvatarUrl(e.avatarUrl),
      totalScore: e.totalScore,
      correctAnswers: e.correctAnswers,
      totalResponses: e.totalResponses,
      avgResponseTimeMs: e.avgResponseTimeMs,
    }));

    setLeaderboard(backendEntries);
    if (onLeaderboardUpdate) {
      // Let parent own cumulative merge/persistence in backend-scoring mode.
      onLeaderboardUpdate(backendEntries);
    } else {
      setViewerLeaderboardStore(backendEntries);
    }
  }, [scoringEngine.quizLeaderboard, onLeaderboardUpdate, setViewerLeaderboardStore]);

  // Override answer distribution with backend data
  useEffect(() => {
    if (getAppMode() !== 'backend_scoring' || !scoringEngine.questionLeaderboard) return;

    const dist = scoringEngine.questionLeaderboard.distribution;
    const counts: Record<string, number> = {};
    if (dist) {
      Object.entries(dist as Record<string, number>).forEach(([letter, count]) => {
        if (count) counts[letter] = count;
      });
    }

    setViewerStats({
      counts,
      total: scoringEngine.questionLeaderboard.totalAnswers,
      unique: scoringEngine.questionLeaderboard.totalAnswers, // approximate
    });
  }, [scoringEngine.questionLeaderboard, setViewerStats]);

  /* ================= SCORING ================= */

  // Store question duration when answer is revealed for consistent scoring
  const questionDurationRef = useRef<number>(30000);

  useEffect(() => {
    if (
      !isAnswerRevealed ||
      correctAnswer === null ||
      leaderboardCalculatedRef.current
    )
      return;

    if (getAppMode() === 'backend_scoring') {
      return;
    }

    leaderboardCalculatedRef.current = true;

    // Calculate duration once when answer is revealed
    const duration = questionOpenTime
      ? Math.max(0, serverNow() - questionOpenTime)
      : 30000;
    questionDurationRef.current = duration;

    const correctLetter = correctLabel ?? (["A", "B", "C", "D"][correctAnswer] || null);

    const scored = allResponsesRef.current.map((r) => {
      const isCorrect = correctLetter !== null && r.answer === correctLetter;
      return {
        ...r,
        isCorrect,
        score: calculateScore(isCorrect, duration, r.responseTimeMs),
      };
    });

    setAllResponses(scored);
    setDisplayedResponses(scored);

    // Update leaderboard with scored responses
    setLeaderboardData((prev) => {
      const entries = { ...prev.entries };

      scored.forEach((r) => {
        const existing = entries[r.odytChannelId];
        const latestTeam = userTeamMapRef.current.get(r.odytChannelId) || r.supportingTeam;
        if (latestTeam) {
          userTeamMapRef.current.set(r.odytChannelId, latestTeam);
        }

        if (existing) {
          const nextAvatar =
            normalizeAvatarUrl(r.avatarUrl) ||
            normalizeAvatarUrl(existing.avatarUrl) ||
            "";
          const nextUserName =
            (r.userName && r.userName.trim()) ||
            (existing.userName && existing.userName.trim()) ||
            "Viewer";
          entries[r.odytChannelId] = {
            ...existing,
            userName: nextUserName,
            avatarUrl: nextAvatar,
            totalScore: existing.totalScore + r.score,
            correctAnswers: existing.correctAnswers + (r.isCorrect ? 1 : 0),
            // totalResponses / totalResponseTimeMs are updated at message ingest time.
            totalResponses: existing.totalResponses,
            totalResponseTimeMs: existing.totalResponseTimeMs,
            supportingTeam: latestTeam || existing.supportingTeam,
          };
        } else {
          entries[r.odytChannelId] = {
            userName: r.userName,
            avatarUrl: normalizeAvatarUrl(r.avatarUrl),
            totalScore: r.score,
            correctAnswers: r.isCorrect ? 1 : 0,
            // Fallback: should be rare because ingest step creates user entry first.
            totalResponses: 1,
            totalResponseTimeMs: r.responseTimeMs,
            supportingTeam: latestTeam,
          };
        }
      });

      return { entries };
    });

    const finalizedQuestionId =
      questionId === undefined || questionId === null
        ? `q-${questionIndex}`
        : String(questionId);
    onQuestionFinalized?.(finalizedQuestionId, scored);
  }, [isAnswerRevealed, correctAnswer, questionOpenTime, serverNow, onQuestionFinalized, questionId, questionIndex]);

  // Keep parent question-board data in lockstep with this panel's Q-Board source.
  useEffect(() => {
    onResponsesUpdate?.(allResponses);
  }, [allResponses, onResponsesUpdate]);

  // Separate effect to update team counts after scoring is complete
  useEffect(() => {
    if (!isAnswerRevealed || correctAnswer === null) return;
    
    // Small delay to ensure state updates are complete
    const timeoutId = setTimeout(() => {
      const teamCounts = calculateTeamCounts(userTeamMapRef.current);
      onTeamSupporterCountsUpdate?.(teamCounts);
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [isAnswerRevealed, correctAnswer, onTeamSupporterCountsUpdate]);

  /* ================= DISTRIBUTION ================= */

  const answerCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allResponses.forEach((r) => {
      if (r.answer && /^[A-Z]$/.test(r.answer)) {
        map[r.answer] = (map[r.answer] || 0) + 1;
      }
    });
    return map;
  }, [allResponses]);

  useEffect(() => {
    if (getAppMode() === 'backend_scoring') return;
    setViewerStats({
      counts: answerCounts,
      total: allResponses.length,
      unique: respondedUsersRef.current.size,
    });
  }, [answerCounts, allResponses.length, setViewerStats]);

  if (!questionActive) return null;

  const waitingForBackendQuiz = isBackendScoringMode && isAnswerRevealed && !scoringEngine.quizLeaderboard;
  /* ================= UI ================= */

  const panelContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-2">
        <TabsList className={`grid grid-cols-3 bg-card/50 ${isExpanded ? 'h-12' : ''}`}>
          <TabsTrigger value="responses" className={`${isExpanded ? 'text-base px-4 py-2' : 'text-xs px-2'}`}><Users className={`${isExpanded ? 'w-5 h-5 mr-2' : 'w-3.5 h-3.5'}`} />{isExpanded && ' '}Live</TabsTrigger>
          <TabsTrigger value="chart" className={`${isExpanded ? 'text-base px-4 py-2' : 'text-xs px-2'}`}><BarChart3 className={`${isExpanded ? 'w-5 h-5 mr-2' : 'w-3.5 h-3.5'}`} />{isExpanded && ' '}Chart</TabsTrigger>
          <TabsTrigger value="leaderboard" className={`${isExpanded ? 'text-base px-4 py-2' : 'text-xs px-2'}`}><Trophy className={`${isExpanded ? 'w-5 h-5 mr-2' : 'w-3.5 h-3.5'}`} />{isExpanded && ' '}Boards</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          {/* Dummy Answer Indicator */}
          {dummyEnabled && isDummyGenerating && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 text-amber-600 text-xs">
              <Bot className="w-3 h-3 animate-pulse" />
              <span className="font-mono">{dummyCount}</span>
            </div>
          )}
          {/* Live Response Counter - moved next to tabs */}
          <LiveResponseCounter
            totalResponses={allResponses.length}
            uniqueResponders={respondedUsersRef.current.size}
            responseRate={answerRate}
            isActive={effectiveIsConnected}
          />
          <ConnectionQualityIndicator
            status={effectiveStatus as any}
            quality={sseIsConnected ? 'excellent' : (sseStatus === 'connecting' || sseStatus === 'reconnecting' ? 'good' : 'poor')}
            lastHeartbeat={sseLastHeartbeat || backendLastPoll}
            reconnectAttempt={reconnectAttempt}
            maxReconnectAttempts={maxReconnectAttempts}
            messageRate={answerRate}
            onReconnect={effectiveReconnect}
            compact
          />
          {onHide && (
            <Button size="icon" variant="ghost" onClick={onHide} aria-label="Hide YouTube panel">
              <X />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
      </div>

      <TabsContent value="responses" className="flex-1">
        <YouTubeChatResponses
          {...{ isAnswerRevealed, correctAnswer, questionActive }}
          correctLabel={correctLabel}
          allResponses={allResponses}
          displayedResponses={displayedResponses}
          status={effectiveStatus as any}
          onReconnect={effectiveReconnect}
          isPowerplayActive={isPowerplayActive}
          maskResponses={maskResponses}
        />
      </TabsContent>

      <TabsContent value="chart" className="flex-1">
        <AnswerDistributionChart
          counts={answerCounts}
          correctLabel={correctLabel}
          correctAnswer={correctAnswer}
          isRevealed={isAnswerRevealed}
        />
      </TabsContent>

      <TabsContent value="leaderboard" className="flex-1 overflow-hidden">
        {waitingForBackendQuiz ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Waiting for backend scoring results...
          </div>
        ) : (
          <ViewerBoardsTabs
            showTabs={true}
            questionResponses={allResponses}
            cumulativeEntries={cumulativeEntries}
            isAnswerRevealed={isAnswerRevealed}
            correctAnswer={correctAnswer}
            maskResponses={maskResponses}
            isExpanded={isExpanded}
            enablePrizeAdminControls={false}
            prizeTypeOptions={prizeOverlay.policyEnabledTypes}
            prizeOverlayByChannel={prizeOverlay.overlayByChannel}
            selectedPrizeByChannel={prizeOverlay.selectedPrizeByChannel}
            assigningByChannel={prizeOverlay.assigningByChannel}
            xpLevelByChannel={xpLevelByChannel}
          />
        )}
      </TabsContent>
    </Tabs>
  );

  return isExpanded ? (
    <div className="fixed inset-0 z-50 bg-background p-6">
      <Button onClick={() => setIsExpanded(false)}><X /> Close</Button>
      {panelContent}
    </div>
  ) : (
    panelContent
  );
};
