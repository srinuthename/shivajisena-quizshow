import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, Pause, Play, RotateCcw, X, Pencil, Volume2, VolumeX, Award, Loader2, Save, Maximize, Minimize, Zap, Music, Music2, SkipForward, Heart, ShieldCheck, Youtube, Users, Trophy, CheckCircle, XCircle, Shuffle, Globe, Copy, AlertTriangle, Smartphone } from "lucide-react";
import { useTimer } from "@/hooks/useTimer";
import { useSounds } from "@/hooks/useSounds";
import { useTVMode } from "@/hooks/useTVMode";
import { useBranding } from "@/hooks/useBranding";
import { useTranslation } from "@/hooks/useTranslation";
import { useRevealStateMachine } from "@/hooks/useRevealStateMachine";
import { useQuizLifecycleMachine } from "@/hooks/useQuizLifecycleMachine";
import { Team, PassChain, QuestionData, QuizSessionTeamResult, QuizSessionViewerResult } from "@/types/quiz";
import { LeaderboardWithMaximize } from "./LeaderboardWithMaximize";
import { QuestionGrid } from "./QuestionGrid";
import { ActivityFeed, ActivityLog } from "./ActivityFeed";
import { PreGameCountdown } from "./PreGameCountdown";
import { YouTubeLivePanel, clearYouTubeLeaderboard } from "./YouTubeLivePanel";
import { PowerplaySummary } from "./PowerplaySummary";
import { QuestionResultPanel } from "./QuestionResultPanel";
import { PartnerLogosSlideshow } from "./PartnerLogosSlideshow";
import { QuizStreamSidebar } from "./QuizStreamSidebar";
import { LeaderboardEntry } from "./LiveLeaderboard";
import { ChatResponse } from "./YouTubeChatResponses";
import { TeamSupporterCounts, createEmptyTeamCounts } from "./TeamSupportBadge";
import { YouTubeUserProvider } from "@/context/YouTubeUserContext";
import { useQuizGame } from "@/context/QuizGameContext";
import { useApp } from "@/context/AppContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useBackend } from "@/hooks/useBackend";
import { EngagementHeatmap } from "./EngagementHeatmap";
import { HalftimeShowModal } from "./HalftimeShowModal";
import { ViewerPredictionSystem, ViewerPrediction, detectPredictionHashtag } from "./ViewerPredictionSystem";
import { AudienceReactions, EmojiReaction } from "./AudienceReactions";

// Extracted quiz components for better maintainability
import { 
  QuizHeader, 
  PowerplayOverlay, 
  QuizTimerCard, 
  NowPlayingCard, 
  AnswerOptions, 
  QuestionTimerBar,
  LiveTickerBar 
} from "./quiz";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDefaultLogo } from "@/config/brandingConfig";
import { createSessionQuestions, getSessionPools, getSessionQuestion, getSessionSubjects, getSessionSettings, hasSessionData, isSessionValid, restoreSessionDataFromIndexedDb } from "@/lib/quizSessionManager";
import { incrementQuestionUsedCount } from "@/lib/quizManagementDB";
import { getActiveSession, startActiveSession, endActiveSession, updateActiveSession } from "@/lib/quizActiveSession";
import { DEFAULT_QUIZ_SETTINGS } from "@/config/quizSettings";
import { closeQuizGame, setFrontendQuizGameId as setApiFrontendQuizGameId } from "@/config/apiConfig";
import { getGameState, saveGameState, saveViewerLeaderboard, getViewerLeaderboard } from "@/lib/gameStateManager";
import { useQuizStore } from "@/store/quizStore";
import confetti from 'canvas-confetti';
import { toast } from "@/hooks/use-toast";
import { syncClockWithServer } from "@/lib/clockSync";
import { getSSEBaseUrl, getAppMode, getSSEQuizTimelineUrl, getViewerPostRevealGraceMs } from "@/config/appMode";
import { getAppAccessHeaders } from "@/config/hostProduct";
import { notifyQuestionOpen, notifyQuestionClose, notifyGameOpen, notifyGameClose, isScoringEngineEnabled } from "@/config/scoringEngineConfig";
import { buildViewerLeaderboardRanks, clearFinalLeaderboardSnapshot, saveFinalLeaderboardSnapshot } from "@/lib/finalLeaderboardSnapshot";
import { buildQuizResultsPayload } from "@/lib/buildQuizResultsPayload";
import { getQuizResults, replaceQuizStateCheckpoint, saveLiveLeaderboard, saveQuizResults } from "@/services/quizResultsApi";
import { postAnswerActionsBatch, postQuizRunLifecycle } from "@/services/analyticsApi";
import { getAnalyticsOwnerId, isQuizAnalyticsEnabled } from "@/lib/analyticsIdentity";
import { broadcastEventToYouTubeChat, broadcastQuestionToYouTubeChat, getYouTubeChatSenderStatus, type YouTubeChatBroadcastResult } from "@/services/youtubeChatSenderApi";
import { broadcastEventToTelegram, broadcastQuestionToTelegram } from "@/services/telegramSenderApi";
import { buildQuizAuthStartUrl } from "@/lib/sharedAuth";
import { readQuizHostChannel } from "@/lib/quizHostChannel";
import { getStoredApplicationId, HOST_PRODUCT_KEY } from "@/config/hostProduct";
import { readMirroredAdminSettingSync } from "@/lib/adminConfigPersistence";
import { clearQuizRunConfig, readActiveQuizRunConfigSync, updateQuizRunConfig } from "@/lib/quizRunConfig";
import { readLatestQuizSessionConfigSnapshot } from "@/lib/adminConfigPersistence";

const readAdminNumber = (key: string, fallback: number): number => Number(readMirroredAdminSettingSync<number>(key, fallback));
const readAdminBoolean = (key: string, fallback: boolean): boolean => readMirroredAdminSettingSync<boolean>(key, fallback);
const readAdminString = (key: string, fallback: string): string => readMirroredAdminSettingSync<string>(key, fallback);
const readAdminJson = <T,>(key: string, fallback: T): T => readMirroredAdminSettingSync<T>(key, fallback);
import {
  TEAM_COLORS,
  LIVE_SYNC_LAST_OK_AT_KEY,
  LIVE_SYNC_LAST_ERROR_AT_KEY,
  LIVE_SYNC_LAST_ERROR_KEY,
  LIVE_SYNC_FAILURES_KEY,
  LIVE_SYNC_LAST_RESTORE_SOURCE_KEY,
  YOUTUBE_AUTO_POST_PANEL_VISIBILITY_EVENT,
  ENGAGEMENT_HEATMAP_VISIBILITY_EVENT,
  VIEWER_PREDICTIONS_VISIBILITY_EVENT,
} from "./teamQuiz/constants";
import {
  normalizeDirectionalTeamName,
  getInitials,
  serializeViewerResponses,
  deserializeViewerResponses,
  extractBackendViewerBoardsSnapshot,
} from "./teamQuiz/helpers";
import { generateShuffleMap, QuestionShuffleMap } from "@/lib/questionShuffle";

type YouTubeChatBroadcastState = {
  sending: boolean;
  result: YouTubeChatBroadcastResult | null;
};

type PendingYouTubeDelivery = {
  applicationId: string;
  frontendQuizGameId: string;
  questionId: string;
  resourceId: string;
  tenantId: string;
};

const TeamQuizInner = () => {
  const { tvModeEnabled } = useTVMode();
  const { frontendQuizGameId: streamFrontendQuizGameId, setFrontendQuizGameId, cleanupStreamsForQuizEnd } = useQuizGame();
  const { applicationId, frontendQuizGameId, clearQuizRuntimeContext } = useApp();
  const backend = useBackend();
  const { t, language, toggleLanguage, setLanguage } = useTranslation();
  const [searchParams] = useSearchParams();

  // Keep the shared in-memory API run ID aligned with the frontend-owned quiz run ID.
  useEffect(() => {
    if (frontendQuizGameId) {
      setApiFrontendQuizGameId(frontendQuizGameId);
      console.log('[Quiz] Active frontend game ID synced to apiConfig:', frontendQuizGameId);
    }
  }, [frontendQuizGameId]);

  // Quiz page defaults to Telugu.
  useEffect(() => {
    setLanguage('te');
  }, [setLanguage]);

  // Read gameId from URL on mount - use for QuizGameContext (stream management)
  useEffect(() => {
    const gameIdFromUrl = searchParams.get('gameId');
    // Use frontendQuizGameId from AppContext if available, otherwise fall back to URL param
    const effectiveGameId = frontendQuizGameId || gameIdFromUrl;
    if (effectiveGameId && effectiveGameId !== streamFrontendQuizGameId) {
      setFrontendQuizGameId(effectiveGameId);
      // DO NOT set apiQuizGameId here - that should only be the backend MongoDB ObjectId
      console.log('[Quiz] Using frontend game ID for stream context:', effectiveGameId);
    }
  }, [searchParams, streamFrontendQuizGameId, setFrontendQuizGameId, frontendQuizGameId]);

  // Branding from hook for app-wide consistency
  const { branding, pageTitle, isLoading: brandingLoading } = useBranding();

  const getResolvedEpisodeMeta = () => {
    const activeRunConfig = readActiveQuizRunConfigSync(frontendQuizGameId || streamFrontendQuizGameId || searchParams.get('gameId'));
    const quizShowName = String(
      activeRunConfig?.quizShowName || branding.showTitle || 'Quiz Show'
    ).trim() || 'Quiz Show';
    const episodeNumber = String(
      activeRunConfig?.episodeNumber || branding.episodeNumber || '1'
    ).trim() || '1';
    const episodeName = String(
      activeRunConfig?.episodeName || `${quizShowName} Episode #${episodeNumber}`
    ).trim() || `${quizShowName} Episode #${episodeNumber}`;
    return { episodeName, episodeNumber, quizShowName };
  };

  // Initialize teams from localStorage config
  const [teams] = useState<Team[]>(() => {
    const configs = readAdminJson("teamConfigs", [
      { name: "#East", members: [] },
      { name: "#West", members: [] },
      { name: "#North", members: [] },
      { name: "#South", members: [] }
    ]);

    return configs.map((config: any, i: number) => ({
      id: i + 1,
      name: normalizeDirectionalTeamName(config.name, i),
      members: config.members || [],
      score: 0,
      color: TEAM_COLORS[i % TEAM_COLORS.length],
      avatar: config.avatar || undefined
    }));
  });

  // IndexedDB Question Management (for updating usedCount in permanent storage)
  // Session-based question pools from localStorage (filtered/shuffled copy)
  const [sessionPools, setSessionPools] = useState<Record<string, number[]>>({});
  const [sessionSubjects, setSessionSubjects] = useState<string[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  // Load session data on mount
  useEffect(() => {
    // Check for active session in sessionStorage (ephemeral - same tab only)
    const checkSession = async () => {
      let activeSession = getActiveSession();

      // Refresh recovery: sessionStorage can be absent after reload, but
      // active runtime config/session data is kept in localStorage until quiz end.
      if (!activeSession) {
        try {
          const runConfig = readActiveQuizRunConfigSync(frontendQuizGameId || searchParams.get('gameId'));
          const recoveredGameId = String(runConfig?.frontendQuizGameId || frontendQuizGameId || searchParams.get('gameId') || '').trim();
          if (runConfig && recoveredGameId) {
            activeSession = startActiveSession(
              crypto.randomUUID(),
              recoveredGameId,
              runConfig.episodeNumber || branding?.episodeNumber || '1',
              {
                startedAt: Number(runConfig.runtime?.startedAtMs || Date.now()),
                skipInitialBackendRestore: Boolean(runConfig.runtime?.skipInitialBackendRestore),
              }
            );
            console.log('[Quiz] Revived active session from runtime storage after refresh:', recoveredGameId);
          }
        } catch {
          // corrupt runtime storage — fall through to redirect
        }
      }

      const durableSessionId = activeSession?.sessionId || '';
      const durableFrontendGameId = String(frontendQuizGameId || activeSession?.frontendGameId || searchParams.get('gameId') || '').trim();
      const durableEpisodeNumber = String(activeSession?.episodeNumber || branding?.episodeNumber || '').trim();

      if (!activeSession && durableSessionId && durableFrontendGameId) {
        activeSession = startActiveSession(
          durableSessionId,
          durableFrontendGameId,
          durableEpisodeNumber || '1'
        );
        console.log('[Quiz] Recovered active session from durable storage:', durableSessionId);
      }

      // Restore runtime session questions from localStorage if in-memory data was lost.
      if (activeSession && !hasSessionData()) {
        await restoreSessionDataFromIndexedDb();
      }

      // If question pools are still missing (in-memory was lost on refresh),
      // rebuild them from the saved config snapshot and IndexedDB question bank.
      if (activeSession && !hasSessionData()) {
        try {
          const latestSnapshot = await readLatestQuizSessionConfigSnapshot();
          if (latestSnapshot) {
            const { snapshot } = latestSnapshot;
            const settings = (snapshot?.settings as Record<string, unknown>) || {};
            const questionsPerCategory = Number(settings.questionsPerCategory) || 50;
            const maxUsedCount = Number(settings.maxUsedCountThreshold) || 1;
            const shuffleEnabled = settings.shuffleQuestions !== false;
            const topicSettings = (snapshot?.topicSettings as Record<string, boolean>) || {};
            await createSessionQuestions(questionsPerCategory, maxUsedCount, shuffleEnabled, topicSettings);
            console.log('[Quiz] Question pools rebuilt from config snapshot after refresh');
          }
        } catch (error) {
          console.error('[Quiz] Failed to rebuild question pools from config snapshot:', error);
        }
      }

      // Check both sessionStorage (active session) and localStorage (session data).
      if (activeSession && hasSessionData()) {
        if (!isSessionValid()) {
          console.log('[Quiz] Session data is stale or inconsistent, redirecting to admin');
          navigate('/admin');
          return;
        }

        const pools = getSessionPools();
        const subjects = getSessionSubjects();
        setSessionPools(pools);
        setSessionSubjects(subjects);
        setSessionReady(true);
        console.log('[Quiz] Session loaded:', activeSession.sessionId);
        return;
      }

      if (activeSession && !hasSessionData()) {
        console.log('[Quiz] Active session exists but session question data is missing, redirecting to admin');
        navigate('/admin');
        return;
      }

      console.log('[Quiz] No active session found, redirecting to admin');
      navigate('/admin');
    };
    
    checkSession();
  }, [navigate, frontendQuizGameId, searchParams, branding?.episodeNumber]);

  // Rebuild session questions in selected language when language changes.
  useEffect(() => {
    const refreshForLanguage = async () => {
      if (!sessionReady) return;
      const settings =
        getSessionSettings() || {
          questionsPerCategory:
            parseInt(localStorage.getItem('questionsPerCategory') || '50', 10) || 50,
          maxUsedCount:
            parseInt(localStorage.getItem('maxUsedCountThreshold') || '1', 10) || 1,
          shuffleEnabled: localStorage.getItem('shuffleQuestions') !== 'false',
        };

      await createSessionQuestions(
        settings.questionsPerCategory,
        settings.maxUsedCount,
        settings.shuffleEnabled
      );
      setSessionPools(getSessionPools());
      setSessionSubjects(getSessionSubjects());
    };

    const handler = () => {
      void refreshForLanguage();
    };

    void refreshForLanguage();
    window.addEventListener('languageChanged', handler as EventListener);
    return () => {
      window.removeEventListener('languageChanged', handler as EventListener);
    };
  }, [sessionReady]);

  // Quiz state
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [currentBackendQuestionIndex, setCurrentBackendQuestionIndex] = useState<number>(0);
  const [currentSubject, setCurrentSubject] = useState<string>("");
  const [quizMasterScore, setQuizMasterScore] = useState(0);

  // Load scoring configuration
  const correctAnswerScore = readAdminNumber("correctAnswerScore", DEFAULT_QUIZ_SETTINGS.correctAnswerScore);
  const wrongAnswerPenalty = readAdminNumber("wrongAnswerPenalty", DEFAULT_QUIZ_SETTINGS.wrongAnswerPenalty);
  const lifelinePenalty = readAdminNumber("lifelinePenalty", DEFAULT_QUIZ_SETTINGS.lifelinePenalty);
  const [questionOpenTime, setQuestionOpenTime] = useState<number | null>(null); // Timestamp when question was opened
  const [questionCloseTime, setQuestionCloseTime] = useState<number | null>(null); // Timestamp when question was closed (after reveal grace)
  const [graceWaitUntilMs, setGraceWaitUntilMs] = useState<number | null>(null);
  const [graceRemainingMs, setGraceRemainingMs] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [shuffleMap, setShuffleMap] = useState<QuestionShuffleMap | null>(null);
  const [passChain, setPassChain] = useState<PassChain | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const lifecycle = useQuizLifecycleMachine();
  const revealState = useRevealStateMachine(5);
  const {
    showCountdown,
    showRevealAnimation,
    countdownValue,
    start: startRevealCountdown,
    tick: tickRevealCountdown,
    reset: resetReveal,
    revealNow,
    hydrate: hydrateReveal,
  } = revealState;
  const {
    startGame,
    endGame,
    clearGameEnd,
    openQuestion,
    closeQuestion,
    startReveal,
    completeReveal,
    startPowerplay: startPowerplayPhase,
    endPowerplay: endPowerplayPhase,
    hydrate: hydrateLifecycle,
  } = lifecycle;
  const [teamScores, setTeamScores] = useState<number[]>(() => Array(teams.length).fill(0));
  const finalRankedTeams = useMemo(
    () =>
      teams
        .map((team, index) => ({
          ...team,
          name: normalizeDirectionalTeamName(team.name, index),
          score: teamScores[index] || 0,
        }))
        .sort((a, b) => b.score - a.score),
    [teams, teamScores]
  );
  const [teamStreaks, setTeamStreaks] = useState<number[]>(() => Array(teams.length).fill(0));
  const [timerDuration] = useState<number>(() => {
    return readAdminNumber("timerDuration", DEFAULT_QUIZ_SETTINGS.timerDuration);
  });
  const [masterTimerDuration] = useState<number>(() => {
    return readAdminNumber("masterTimerDuration", DEFAULT_QUIZ_SETTINGS.masterTimerDuration);
  });
  const [passedQuestionTimer] = useState<number>(() => {
    return readAdminNumber("passedQuestionTimer", DEFAULT_QUIZ_SETTINGS.passedQuestionTimer);
  });
  const [revealCountdownDuration] = useState<number>(() => {
    return readAdminNumber("revealCountdownDuration", DEFAULT_QUIZ_SETTINGS.revealCountdownDuration);
  });
  const timer = useTimer();
  const masterTimer = useTimer();
  const gameStarted = lifecycle.gamePhase !== 'idle';
  const gameEnded = lifecycle.gamePhase === 'ended';
  const questionActive = lifecycle.questionPhase !== 'idle';
  const powerplayActive = lifecycle.powerplayPhase === 'active';
  const gameEndHandledRef = useRef(false);
  const streamCleanupHandledRef = useRef(false);
  const lifecycleFinalizedRef = useRef(false);
  const lifecycleClosedPostedRef = useRef(false);
  const quizCloseInitiatedRef = useRef(false);
  const questionSectionRef = useRef<HTMLDivElement>(null);
  const [scoreChanges, setScoreChanges] = useState<Map<number, number>>(new Map());
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [showActivityFeed, setShowActivityFeed] = useState<boolean>(() => {
    return readAdminBoolean("showActivityFeed", DEFAULT_QUIZ_SETTINGS.showActivityFeed);
  });
  const [showDifficultyBadge] = useState<boolean>(() => {
    return readAdminBoolean("showDifficultyBadge", DEFAULT_QUIZ_SETTINGS.showDifficultyBadge);
  });
  const [showSaveIndicator] = useState<boolean>(() => {
    return readAdminBoolean("showSaveIndicator", DEFAULT_QUIZ_SETTINGS.showSaveIndicator);
  });
  const [showToastMessages] = useState<boolean>(() => {
    return readAdminBoolean("showToastMessages", DEFAULT_QUIZ_SETTINGS.showToastMessages);
  });
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const persistThrottleMs = 400;
  const lastPersistRef = useRef(0);
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [shuffleQuestions] = useState<boolean>(() => {
    return readAdminBoolean("shuffleQuestions", DEFAULT_QUIZ_SETTINGS.shuffleQuestions);
  });
  const [maskViewerResponses] = useState<boolean>(() => {
    return readAdminBoolean("maskViewerResponses", DEFAULT_QUIZ_SETTINGS.maskViewerResponses);
  });
  const [fixedLeaderboard] = useState<boolean>(() => {
    return readAdminBoolean("fixedLeaderboard", DEFAULT_QUIZ_SETTINGS.fixedLeaderboard);
  });
  const [youtubeIntegrationEnabled, setYoutubeIntegrationEnabled] = useState<boolean>(() => {
    return readAdminBoolean("youtubeIntegrationEnabled", DEFAULT_QUIZ_SETTINGS.youtubeIntegrationEnabled);
  });
  // SSE connection status for header indicator
  const [sseStatus, setSSEStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'reconnecting'>('disconnected');
  const [sseIsConnected, setSSEIsConnected] = useState(false);
  const quizCloseInProgress = quizCloseInitiatedRef.current || lifecycleClosedPostedRef.current || masterTimer.isTimeUp;
  
  // Check if we're in a mode that supports YouTube/viewer features
  // Offline mode = no YouTube panel, no SSE, no viewer features
  const appModeSupportsViewers = backend.appMode !== 'offline';
  
  useEffect(() => {
    const sync = () => {
      setYoutubeIntegrationEnabled(readAdminBoolean("youtubeIntegrationEnabled", DEFAULT_QUIZ_SETTINGS.youtubeIntegrationEnabled));
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "youtubeIntegrationEnabled") sync();
    };
    const handleCustom = () => sync();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("youtubeIntegrationChanged", handleCustom as EventListener);
    sync();

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("youtubeIntegrationChanged", handleCustom as EventListener);
    };
  }, []);
  const [powerplayEnabled] = useState<boolean>(() => {
    return readAdminBoolean("powerplayEnabled", DEFAULT_QUIZ_SETTINGS.powerplayEnabled);
  });
  const [tickerMessageRegular] = useState<string>(() => {
    return readAdminString("tickerMessageRegular", "📢 Type A, B, C, or D in YouTube chat to answer!");
  });
  const [tickerMessagePowerplay] = useState<string>(() => {
    return readAdminString("tickerMessagePowerplay", "⚡ POWERPLAY ACTIVE! Answer quickly for maximum points!");
  });
  const [tickerEnabled] = useState<boolean>(() => {
    return readAdminBoolean("tickerEnabled", DEFAULT_QUIZ_SETTINGS.tickerEnabled);
  });
  const [youtubePanelVisible, setYoutubePanelVisible] = useState(true);
  const { playCorrect, playWrong, playPass, playBuzzer, playTick, playCountdownTick, playHeartbeat, playBigReveal, playVictoryFanfare, playTensionBuild, playRapidFireStart, playRapidFireEnd, playCoinScore, playStreakCelebration, volume, setVolume, musicPlaying, musicTrack, toggleBackgroundMusic, stopBackgroundMusic } = useSounds();

  const [showIntroAnimation] = useState<boolean>(() => {
    return readAdminBoolean("showIntroAnimation", DEFAULT_QUIZ_SETTINGS.showIntroAnimation);
  });
  const [showPreGameCountdown, setShowPreGameCountdown] = useState<boolean>(() => {
    const savedGameState = localStorage.getItem('quizGameState');
    const isIntroEnabled = readAdminBoolean("showIntroAnimation", DEFAULT_QUIZ_SETTINGS.showIntroAnimation);
    // Only show countdown if no saved game state exists (fresh quiz) AND intro animation is enabled
    return !savedGameState && isIntroEnabled;
  });
  // Use subjects from session data
  const subjects = sessionReady ? sessionSubjects : [];
  const [manualEditMode, setManualEditMode] = useState(false);
  const [manualQuestionText, setManualQuestionText] = useState("");
  const [selectedTeamForSwitch, setSelectedTeamForSwitch] = useState<number | null>(null);
  const [changeQuestionMode, setChangeQuestionMode] = useState(false);
  const [changeQuestionTeam, setChangeQuestionTeam] = useState<number | null>(null);
  const [verifyAnswerUsed, setVerifyAnswerUsed] = useState(false);
  const [verifyAnswerResult, setVerifyAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [teamLifelines, setTeamLifelines] = useState<number[]>(() => {
    const saved = localStorage.getItem("teamLifelinesState");
    if (saved) return JSON.parse(saved);
    const lifelineCount = readAdminNumber("teamLifelines", DEFAULT_QUIZ_SETTINGS.teamLifelines);
    return Array(teams.length).fill(lifelineCount);
  });
  const [currentQuestionDisplayIndex, setCurrentQuestionDisplayIndex] = useState<number | null>(null);
  const [questionIdForPanel, setQuestionIdForPanel] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerLeaderboard, setViewerLeaderboard] = useState<LeaderboardEntry[]>([]);
  const viewerLeaderboardRef = useRef<LeaderboardEntry[]>([]);
  const [teamSupporterCounts, setTeamSupporterCounts] = useState<TeamSupporterCounts>(() => createEmptyTeamCounts());
  const [viewerResponses, setViewerResponses] = useState<ChatResponse[]>([]);
  const [quizStartToken, setQuizStartToken] = useState(0);
  const [showResultPanel, setShowResultPanel] = useState(false);
  const [lastResultCorrect, setLastResultCorrect] = useState(true);
  const [lastQuestionForResult, setLastQuestionForResult] = useState<QuestionData | null>(null);
  const [lastCorrectAnswerForResult, setLastCorrectAnswerForResult] = useState<number | null>(null);
  const [lastQuestionNumberForResult, setLastQuestionNumberForResult] = useState<string | number | null>(null);
  const [youtubeChatBroadcastState, setYouTubeChatBroadcastState] = useState<YouTubeChatBroadcastState>(() => {
    try {
      const saved = localStorage.getItem("ytChatBroadcastResult");
      const result = saved ? (JSON.parse(saved) as YouTubeChatBroadcastResult) : null;
      return { sending: false, result };
    } catch {
      return { sending: false, result: null };
    }
  });
  const [showYouTubeAutoPostPanel, setShowYouTubeAutoPostPanel] = useState<boolean>(() => {
    return readAdminBoolean("showYouTubeAutoPostPanel", DEFAULT_QUIZ_SETTINGS.showYouTubeAutoPostPanel);
  });
  const [showEngagementHeatmap, setShowEngagementHeatmap] = useState<boolean>(() => {
    return readAdminBoolean("showEngagementHeatmap", DEFAULT_QUIZ_SETTINGS.showEngagementHeatmap);
  });
  const [showViewerPredictions, setShowViewerPredictions] = useState<boolean>(() => {
    return readAdminBoolean("showViewerPredictions", DEFAULT_QUIZ_SETTINGS.showViewerPredictions);
  });
  const [pendingYouTubeDelivery, setPendingYouTubeDelivery] = useState<PendingYouTubeDelivery | null>(null);
  const setGameState = useQuizStore((state) => state.setGameState);
  const setViewerLeaderboardStore = useQuizStore((state) => state.setViewerLeaderboard);
  const setViewerStats = useQuizStore((state) => state.setViewerStats);
  const isGraceWaiting = graceRemainingMs > 0;

  useEffect(() => {
    if (!graceWaitUntilMs) {
      setGraceRemainingMs(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, graceWaitUntilMs - Date.now());
      setGraceRemainingMs(remaining);
    };
    tick();
    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, [graceWaitUntilMs]);

  useEffect(() => {
    const refreshVisibility = () => {
      setShowYouTubeAutoPostPanel(readAdminBoolean("showYouTubeAutoPostPanel", DEFAULT_QUIZ_SETTINGS.showYouTubeAutoPostPanel));
    };

    const handleVisibilityChange = () => refreshVisibility();
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "showYouTubeAutoPostPanel") {
        refreshVisibility();
      }
    };

    window.addEventListener(YOUTUBE_AUTO_POST_PANEL_VISIBILITY_EVENT, handleVisibilityChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(YOUTUBE_AUTO_POST_PANEL_VISIBILITY_EVENT, handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const refreshVisibility = () => {
      setShowEngagementHeatmap(readAdminBoolean("showEngagementHeatmap", DEFAULT_QUIZ_SETTINGS.showEngagementHeatmap));
    };

    const handleVisibilityChange = () => refreshVisibility();
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "showEngagementHeatmap") {
        refreshVisibility();
      }
    };

    window.addEventListener(ENGAGEMENT_HEATMAP_VISIBILITY_EVENT, handleVisibilityChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(ENGAGEMENT_HEATMAP_VISIBILITY_EVENT, handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const refreshVisibility = () => {
      setShowViewerPredictions(readAdminBoolean("showViewerPredictions", DEFAULT_QUIZ_SETTINGS.showViewerPredictions));
    };

    const handleVisibilityChange = () => refreshVisibility();
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "showViewerPredictions") {
        refreshVisibility();
      }
    };

    window.addEventListener(VIEWER_PREDICTIONS_VISIBILITY_EVENT, handleVisibilityChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(VIEWER_PREDICTIONS_VISIBILITY_EVENT, handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);


  // New feature states: engagement heatmap, halftime, predictions
  const [engagementHistory, setEngagementHistory] = useState<TeamSupporterCounts[]>([]);
  const [showHalftime, setShowHalftime] = useState(false);
  const [viewerPredictions, setViewerPredictions] = useState<Map<string, ViewerPrediction>>(new Map());
  const [predictionsLocked, setPredictionsLocked] = useState(false);
  const [emojiReactions, setEmojiReactions] = useState<EmojiReaction[]>([]);
  const emojiIdCounter = useRef(0);
  const finalizedViewerQuestionsRef = useRef<Set<string>>(new Set());
  const liveLeaderboardSyncTimerRef = useRef<number | null>(null);
  const liveLeaderboardSyncSignatureRef = useRef<string>("");

  const mergeCumulativeViewerLeaderboard = useCallback(
    (incoming: LeaderboardEntry[]) => {
      setViewerLeaderboard((prev) => {
        if (!incoming.length) return prev;
        // Union + monotonic merge:
        // - Keep prior cumulative users so partial snapshots don't drop historical viewers.
        // - Never add totals (prevents double-count inflation).
        // - For each viewer, only move metrics forward.
        const merged = new Map<string, LeaderboardEntry>();
        prev.forEach((entry) => merged.set(entry.odytChannelId, entry));

        incoming.forEach((entry) => {
          const existing = merged.get(entry.odytChannelId);
          if (!existing) {
            merged.set(entry.odytChannelId, entry);
            return;
          }

          const existingTotalResponses = existing.totalResponses ?? 0;
          const existingCorrectAnswers = existing.correctAnswers ?? 0;
          const existingTotalScore = existing.totalScore ?? 0;

          const incomingTotalResponses = entry.totalResponses ?? 0;
          const incomingCorrectAnswers = entry.correctAnswers ?? 0;
          const incomingTotalScore = entry.totalScore ?? 0;

          const hasForwardProgress =
            incomingTotalResponses > existingTotalResponses ||
            incomingCorrectAnswers > existingCorrectAnswers ||
            incomingTotalScore > existingTotalScore;

          const mergedIdentity: LeaderboardEntry = {
            ...existing,
            userName: entry.userName?.trim() ? entry.userName : existing.userName,
            avatarUrl: entry.avatarUrl?.trim() ? entry.avatarUrl : existing.avatarUrl,
            supportingTeam: entry.supportingTeam ?? existing.supportingTeam,
          };

          if (hasForwardProgress) {
            merged.set(entry.odytChannelId, {
              ...mergedIdentity,
              ...entry,
              userName: mergedIdentity.userName,
              avatarUrl: mergedIdentity.avatarUrl,
              supportingTeam: mergedIdentity.supportingTeam,
            });
          } else {
            merged.set(entry.odytChannelId, mergedIdentity);
          }
        });

        const result = Array.from(merged.values()).sort((a, b) =>
          b.totalScore !== a.totalScore
            ? b.totalScore - a.totalScore
            : a.avgResponseTimeMs - b.avgResponseTimeMs
        );
        console.log(
          `[CumulativeLeaderboard] Merge monotonic: ${prev.length} prev + ${incoming.length} incoming -> ${result.length} final. Top score: ${result[0]?.totalScore ?? 0}`
        );
        return result;
      });
    },
    []
  );

  // Save viewer leaderboard to localStorage for persistence across refresh
  useEffect(() => {
    viewerLeaderboardRef.current = viewerLeaderboard;
    saveViewerLeaderboard(viewerLeaderboard);
    // Also keep in sessionStorage for the dedicated page
    sessionStorage.setItem('viewerLeaderboard', JSON.stringify(viewerLeaderboard));
    setViewerLeaderboardStore(viewerLeaderboard);
  }, [viewerLeaderboard, setViewerLeaderboardStore]);

  // Persist the in-flight question board immediately so a hard refresh can restore it
  // even before IndexedDB or backend snapshots have flushed.
  useEffect(() => {
    saveGameState({
      currentQuestionResponses: serializeViewerResponses(viewerResponses),
    });
  }, [viewerResponses]);

  // Persist the last YouTube chat broadcast result so the auto-post panel
  // survives a hard refresh mid-question.
  useEffect(() => {
    try {
      if (youtubeChatBroadcastState.result) {
        localStorage.setItem("ytChatBroadcastResult", JSON.stringify(youtubeChatBroadcastState.result));
      } else {
        localStorage.removeItem("ytChatBroadcastResult");
      }
    } catch { /* storage unavailable */ }
  }, [youtubeChatBroadcastState.result]);

  // Persist live viewer leaderboards to orchestrator (Mongo) so refresh survives without relying only on browser storage.
  useEffect(() => {
    if (!gameStarted) return;
    if (backend.appMode === 'offline') return;
    if (!isQuizAnalyticsEnabled()) return;
    const runId = frontendQuizGameId || streamFrontendQuizGameId || null;
    if (!runId) return;

    const totalResponses = viewerLeaderboard.reduce((sum, v) => sum + (v.totalResponses || 0), 0);
    const signature = JSON.stringify({
      runId,
      viewers: viewerLeaderboard.map((v) => [
        v.odytChannelId,
        v.totalScore,
        v.correctAnswers,
        v.totalResponses,
        v.avgResponseTimeMs,
      ]),
      q: viewerResponses.map((r) => [r.id, r.odytChannelId, r.answer, r.score, r.isCorrect]),
    });
    if (signature === liveLeaderboardSyncSignatureRef.current) return;

    if (liveLeaderboardSyncTimerRef.current) {
      window.clearTimeout(liveLeaderboardSyncTimerRef.current);
    }
    liveLeaderboardSyncTimerRef.current = window.setTimeout(() => {
      const quizHostChannel = readQuizHostChannel();
      const { episodeName, episodeNumber, quizShowName } = getResolvedEpisodeMeta();
      const startedAtIso = (() => {
        const runConfig = readActiveQuizRunConfigSync(runId);
        const activeSession = getActiveSession();
        const ms = Number(activeSession?.startedAt || runConfig?.runtime?.startedAtMs || Date.now());
        return new Date(Number.isFinite(ms) ? ms : Date.now()).toISOString();
      })();

      void saveLiveLeaderboard({
        episode: {
          episodeName,
          episodeNumber,
          quizShowName,
          startedAt: startedAtIso,
          endedAt: new Date().toISOString(),
          totalQuestions: usedQuestions.size,
          totalDurationSeconds: Math.max(0, Math.floor((Date.now() - Date.parse(startedAtIso)) / 1000)),
          status: gameEnded ? "completed" : "running",
          frontendQuizGameId: runId,
          applicationId: localStorage.getItem("applicationId"),
          analyticsOwnerId: getAnalyticsOwnerId(),
          quizHostChannel,
        },
        viewers: buildViewerLeaderboardRanks(viewerLeaderboard),
        totalUniqueViewers: viewerLeaderboard.length,
        totalResponses,
        avgResponseTimeMs:
          totalResponses > 0
            ? viewerLeaderboard.reduce((sum, v) => sum + (v.avgResponseTimeMs || 0) * (v.totalResponses || 0), 0) / totalResponses
            : 0,
        currentQuestionResponses: viewerResponses.map((r) => ({
          id: r.id,
          odytChannelId: r.odytChannelId,
          userName: r.userName,
          avatarUrl: r.avatarUrl,
          answer: r.answer,
          responseTimeMs: r.responseTimeMs,
          isCorrect: r.isCorrect,
          score: r.score,
          supportingTeam: r.supportingTeam,
        })),
      }).then((res) => {
        if (res.success) {
          liveLeaderboardSyncSignatureRef.current = signature;
          localStorage.setItem(LIVE_SYNC_LAST_OK_AT_KEY, new Date().toISOString());
          localStorage.removeItem(LIVE_SYNC_LAST_ERROR_KEY);
          localStorage.removeItem(LIVE_SYNC_LAST_ERROR_AT_KEY);
        } else {
          localStorage.setItem(LIVE_SYNC_LAST_ERROR_KEY, String(res.error || "saveLiveLeaderboard failed"));
          localStorage.setItem(LIVE_SYNC_LAST_ERROR_AT_KEY, new Date().toISOString());
          const failures = Number(localStorage.getItem(LIVE_SYNC_FAILURES_KEY) || "0");
          localStorage.setItem(LIVE_SYNC_FAILURES_KEY, String(failures + 1));
        }
      }).catch((err) => {
        localStorage.setItem(LIVE_SYNC_LAST_ERROR_KEY, String(err instanceof Error ? err.message : err));
        localStorage.setItem(LIVE_SYNC_LAST_ERROR_AT_KEY, new Date().toISOString());
        const failures = Number(localStorage.getItem(LIVE_SYNC_FAILURES_KEY) || "0");
        localStorage.setItem(LIVE_SYNC_FAILURES_KEY, String(failures + 1));
      });
    }, 1200);

    return () => {
      if (liveLeaderboardSyncTimerRef.current) {
        window.clearTimeout(liveLeaderboardSyncTimerRef.current);
      }
    };
  }, [
    gameStarted,
    backend.appMode,
    gameEnded,
    frontendQuizGameId,
    streamFrontendQuizGameId,
    viewerLeaderboard,
    viewerResponses,
    usedQuestions.size,
    branding.showTitle,
  ]);

  const boardsSyncTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!gameStarted) return;
    const sessionId = getActiveSession()?.sessionId;
    if (!sessionId) return;

    const questionBoard = viewerResponses.map((r) => ({
      id: r.id,
      odytChannelId: r.odytChannelId,
      userName: r.userName,
      avatarUrl: r.avatarUrl,
      answer: r.answer,
      responseTimeMs: r.responseTimeMs,
      isCorrect: r.isCorrect,
      score: r.score,
      serverSeq: r.serverSeq,
      supportingTeam: r.supportingTeam,
    }));
    const cumulativeBoard = buildViewerLeaderboardRanks(viewerLeaderboard);

    if (boardsSyncTimerRef.current) {
      window.clearTimeout(boardsSyncTimerRef.current);
    }
    boardsSyncTimerRef.current = window.setTimeout(() => {
      // Viewer boards are now runtime-only; no IndexedDB sync needed
    }, 75);

    return () => {
      if (boardsSyncTimerRef.current) {
        window.clearTimeout(boardsSyncTimerRef.current);
      }
    };
  }, [gameStarted, viewerResponses, viewerLeaderboard]);

  const sessionClosedRef = useRef(false);
  const clockOffsetRef = useRef<number>(0);
  const currentQuestionTagRef = useRef<string | null>(null);
  // Guard to prevent duplicate close events for the same question
  const questionCloseSentRef = useRef<string | null>(null);
  const pendingQuestionCloseTimeoutRef = useRef<number | null>(null);
  const questionTransitionInFlightRef = useRef(false);

  const clearPendingQuestionClose = useCallback(() => {
    if (pendingQuestionCloseTimeoutRef.current !== null) {
      window.clearTimeout(pendingQuestionCloseTimeoutRef.current);
      pendingQuestionCloseTimeoutRef.current = null;
    }
  }, []);

  // Track engagement history per question - snapshot when question changes
  const prevQuestionIdxRef = useRef<number>(-1);
  useEffect(() => {
    if (currentBackendQuestionIndex !== prevQuestionIdxRef.current && currentBackendQuestionIndex > 0) {
      // Snapshot the current team supporter counts for the previous question
      setEngagementHistory(prev => [...prev, { ...teamSupporterCounts }]);
    }
    prevQuestionIdxRef.current = currentBackendQuestionIndex;
  }, [currentBackendQuestionIndex, teamSupporterCounts]);

  // Auto-lock predictions after first question opens
  useEffect(() => {
    if (currentBackendQuestionIndex > 0 && !predictionsLocked) {
      setPredictionsLocked(true);
    }
  }, [currentBackendQuestionIndex, predictionsLocked]);

  // Play sound effects on score changes
  useEffect(() => {
    if (scoreChanges.size === 0) return;
    scoreChanges.forEach((change) => {
      if (change > 0) playCoinScore();
    });
    // Check for streaks (3+) and play celebration
    teamStreaks.forEach((streak) => {
      if (streak === 3 || streak === 5 || streak === 7) playStreakCelebration();
    });
  }, [scoreChanges, teamStreaks, playCoinScore, playStreakCelebration]);

  const resetViewerSessionState = useCallback(() => {
    setViewerLeaderboard([]);
    viewerLeaderboardRef.current = [];
    setTeamSupporterCounts(createEmptyTeamCounts());
    setViewerResponses([]);
    finalizedViewerQuestionsRef.current.clear();
    setViewerStats({ counts: {}, total: 0, unique: 0 });
    clearFinalLeaderboardSnapshot();
    saveViewerLeaderboard([]);
    clearYouTubeLeaderboard();
    try {
      sessionStorage.removeItem('viewerLeaderboard');
    } catch {
      // ignore storage errors
    }
  }, [setViewerStats]);

  const handleViewerQuestionFinalized = useCallback((questionId: string, responses: ChatResponse[]) => {
    const qid = String(questionId || '').trim();
    if (!qid) return;
    if (finalizedViewerQuestionsRef.current.has(qid)) return;
    finalizedViewerQuestionsRef.current.add(qid);

    const uniqueByUser = new Map<string, ChatResponse>();
    responses.forEach((r) => {
      const userId = String(r.odytChannelId || '').trim();
      const answer = String(r.answer || '').trim().toUpperCase();
      if (!userId) return;
      if (!['A', 'B', 'C', 'D'].includes(answer)) return;
      if (!uniqueByUser.has(userId)) {
        uniqueByUser.set(userId, r);
      }
    });

    const scoredResponses = Array.from(uniqueByUser.values());
    const questionRanked = [...scoredResponses].sort((a, b) => {
      const scoreDelta = (b.score || 0) - (a.score || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return (a.responseTimeMs || 0) - (b.responseTimeMs || 0);
    });
    const questionRankByUser = new Map<string, number>();
    questionRanked.forEach((r, idx) => {
      questionRankByUser.set(r.odytChannelId, idx + 1);
    });

    const previous = viewerLeaderboardRef.current || [];
    const byUser = new Map<string, LeaderboardEntry & { _totalResponseTimeMs: number }>();
    previous.forEach((entry) => {
      const totalResponses = entry.totalResponses || 0;
      byUser.set(entry.odytChannelId, {
        ...entry,
        _totalResponseTimeMs: (entry.avgResponseTimeMs || 0) * totalResponses,
      });
    });

    scoredResponses.forEach((r) => {
      const userId = String(r.odytChannelId || '').trim();
      if (!userId) return;
      const existing = byUser.get(userId);
      if (existing) {
        const nextTotalResponses = (existing.totalResponses || 0) + 1;
        const nextTotalResponseTime = existing._totalResponseTimeMs + (r.responseTimeMs || 0);
        byUser.set(userId, {
          ...existing,
          userName: r.userName || existing.userName,
          avatarUrl: r.avatarUrl || existing.avatarUrl,
          supportingTeam: r.supportingTeam ?? existing.supportingTeam,
          totalScore: (existing.totalScore || 0) + (r.score || 0),
          correctAnswers: (existing.correctAnswers || 0) + (r.isCorrect ? 1 : 0),
          totalResponses: nextTotalResponses,
          avgResponseTimeMs: nextTotalResponses > 0 ? nextTotalResponseTime / nextTotalResponses : 0,
          _totalResponseTimeMs: nextTotalResponseTime,
        });
      } else {
        byUser.set(userId, {
          odytChannelId: userId,
          userName: r.userName || 'Viewer',
          avatarUrl: r.avatarUrl || '',
          supportingTeam: r.supportingTeam,
          totalScore: r.score || 0,
          correctAnswers: r.isCorrect ? 1 : 0,
          totalResponses: 1,
          avgResponseTimeMs: r.responseTimeMs || 0,
          _totalResponseTimeMs: r.responseTimeMs || 0,
        });
      }
    });

    const nextLeaderboard = Array.from(byUser.values())
      .map(({ _totalResponseTimeMs: _ignored, ...entry }) => entry)
      .sort((a, b) =>
        b.totalScore !== a.totalScore
          ? b.totalScore - a.totalScore
          : a.avgResponseTimeMs - b.avgResponseTimeMs
      );
    setViewerLeaderboard(nextLeaderboard);
    viewerLeaderboardRef.current = nextLeaderboard;

    const gameId = frontendQuizGameId || streamFrontendQuizGameId;
    if (!gameId || !isQuizAnalyticsEnabled() || backend.appMode === 'offline') return;

    const cumulativeByUser = new Map<string, LeaderboardEntry>();
    nextLeaderboard.forEach((entry) => cumulativeByUser.set(entry.odytChannelId, entry));
    const cumulativeRankByUser = new Map<string, number>();
    nextLeaderboard.forEach((entry, idx) => cumulativeRankByUser.set(entry.odytChannelId, idx + 1));
    const questionIdx = Number.isFinite(currentBackendQuestionIndex)
      ? Number(currentBackendQuestionIndex)
      : null;

    const scoredActions = scoredResponses.map((r) => {
      const userId = String(r.odytChannelId || '').trim();
      const cumulative = cumulativeByUser.get(userId);
      return {
        actionId: `${qid}:${userId}`,
        questionId: qid,
        questionIndex: questionIdx,
        actionType: 'scored_answer' as const,
        eventType: 'ANSWER',
        odytChannelId: userId,
        userName: r.userName || null,
        displayName: r.userName || null,
        avatarUrl: r.avatarUrl || null,
        rawAnswer: r.answer || null,
        normalizedAnswer: String(r.answer || '').toUpperCase() || null,
        supportingTeam: r.supportingTeam || null,
        responseTimeMs: Number(r.responseTimeMs || 0),
        isCorrect: r.isCorrect === null || r.isCorrect === undefined ? null : Boolean(r.isCorrect),
        awardedScore: Number(r.score || 0),
        questionRank: questionRankByUser.get(userId) ?? null,
        cumulativeTotalScore: cumulative?.totalScore ?? null,
        cumulativeCorrectAnswers: cumulative?.correctAnswers ?? null,
        cumulativeTotalResponses: cumulative?.totalResponses ?? null,
        cumulativeAvgResponseTimeMs: cumulative?.avgResponseTimeMs ?? null,
        cumulativeRank: cumulativeRankByUser.get(userId) ?? null,
        questionOpenedAt: questionOpenTime,
        questionClosedAt: questionCloseTime,
        eventServerSeq: Number.isFinite(r.serverSeq) ? Number(r.serverSeq) : null,
        eventServerTs: questionCloseTime || null,
        clientCapturedAt: Date.now(),
        payload: {
          gameId,
          scoringMode: backend.appMode,
          finalizedAt: new Date().toISOString(),
        },
      };
    });

    void postAnswerActionsBatch({
      frontendQuizGameId: gameId,
      applicationId: getStoredApplicationId(),
      analyticsOwnerId: getAnalyticsOwnerId(),
      consentEnabled: true,
      actions: scoredActions,
    }).catch((error) => {
      console.warn('[Quiz] Failed to persist scored answer actions:', error);
    });
  }, [frontendQuizGameId, streamFrontendQuizGameId, backend.appMode, currentBackendQuestionIndex, questionOpenTime, questionCloseTime]);

  const beginQuizSession = useCallback(() => {
    resetViewerSessionState();
    const startedAt = Date.now();
    updateActiveSession({ startedAt });
    updateQuizRunConfig(frontendQuizGameId || streamFrontendQuizGameId || null, {
      runtime: {
        startedAtMs: startedAt,
      },
    });
    setQuizStartToken((prev) => prev + 1);
    startGame();
  }, [frontendQuizGameId, resetViewerSessionState, startGame, streamFrontendQuizGameId]);

  const cleanupStreamsOnQuizEnd = useCallback(async () => {
    if (streamCleanupHandledRef.current) return;
    streamCleanupHandledRef.current = true;
    const result = await cleanupStreamsForQuizEnd();
    if (!result.success) {
      console.warn('[Quiz] Stream cleanup failed at quiz end:', result.error);
      return;
    }
    console.log('[Quiz] Streams cleaned up at quiz end:', result.removed);
  }, [cleanupStreamsForQuizEnd]);

  const ensureClockSync = useCallback(async () => {
    // Skip clock sync in offline mode - no external calls allowed
    if (backend.appMode === 'offline') {
      return 0;
    }
    try {
      const offset = await syncClockWithServer(getSSEBaseUrl(), { maxAgeMs: 60_000 });
      clockOffsetRef.current = offset;
      return offset;
    } catch (err) {
      console.error('[Quiz] Clock sync failed, using previous offset', err);
      return clockOffsetRef.current;
    }
  }, [backend.appMode]);

  const toServerTime = useCallback((clientTs: number) => clientTs + clockOffsetRef.current, []);

  const postQuizRunLifecycleEvent = useCallback(async (eventType: 'created' | 'closed' | 'ended' | 'aborted'): Promise<boolean> => {
    if (backend.appMode === 'offline') return true;
    const gameId = frontendQuizGameId || streamFrontendQuizGameId;
    if (!gameId) return false;
    if (!isQuizAnalyticsEnabled()) return true;

    try {
      const quizHostChannel = readQuizHostChannel();
      const { episodeName, episodeNumber } = getResolvedEpisodeMeta();
      const result = await postQuizRunLifecycle({
        frontendQuizGameId: gameId,
        applicationId: getStoredApplicationId(),
        analyticsOwnerId: getAnalyticsOwnerId(),
        quizHostChannelId: quizHostChannel.quizHostChannelId,
        quizHostChannelTitle: quizHostChannel.quizHostChannelTitle,
        quizHostChannelHandle: quizHostChannel.quizHostChannelHandle,
        consentEnabled: true,
        eventType,
        clientTs: Date.now(),
        gameTitle: branding.showTitle || '',
        episodeName,
        episodeNumber,
      });
      if (!result.success) {
        console.warn(`[Quiz] Lifecycle event ${eventType} returned failure:`, result.error || 'unknown_error');
        return false;
      }
      console.log(`[Quiz] Lifecycle event posted: ${eventType} for run ${gameId}`);
      return true;
    } catch (err) {
      console.warn(`[Quiz] Failed posting lifecycle event ${eventType}:`, err);
      return false;
    }
  }, [backend.appMode, frontendQuizGameId, streamFrontendQuizGameId, branding.showTitle]);

  // Powerplay Mode State
  const [powerplayDuration] = useState<number>(() => {
    return readAdminNumber("rapidFireDuration", DEFAULT_QUIZ_SETTINGS.rapidFireDuration);
  });
  const [powerplayUsed, setPowerplayUsed] = useState<boolean[]>(() => Array(teams.length).fill(false));
  const [powerplayTeam, setPowerplayTeam] = useState<number | null>(null);
  const powerplayTimer = useTimer();
  const powerplayEndPendingRef = useRef(false);
  const [powerplayFlash, setPowerplayFlash] = useState(false);
  const [powerplayEndFlash, setPowerplayEndFlash] = useState(false);
  const [showPowerplaySummary, setShowPowerplaySummary] = useState(false);
  const [powerplayStats, setPowerplayStats] = useState<{
    teamName: string;
    teamColor: string;
    correctAnswers: number;
    wrongAnswers: number;
    lifelinesUsed: number;
    pointsScored: number;
    pointsLost: number;
    netScore: number;
    questionsAttempted: number;
  } | null>(null);
  const powerplayStartScoreRef = useRef<number>(0);
  const powerplayCorrectRef = useRef<number>(0);
  const powerplayWrongRef = useRef<number>(0);
  const powerplayLifelinesRef = useRef<number>(0);
  const powerplayPointsScoredRef = useRef<number>(0);
  const powerplayPointsLostRef = useRef<number>(0);
  const powerplayQuestionsRef = useRef<number>(0);
  const youtubePanelVisibleBeforePowerplayRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!pendingYouTubeDelivery || !youtubeChatBroadcastState.result?.queued) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const pollMs = 1500;
    let deadlineAt = Date.now() + 15_000;

    const finalizeFromStatus = async () => {
      while (!cancelled && Date.now() < deadlineAt) {
        attempts += 1;
        try {
          const status = await getYouTubeChatSenderStatus(pendingYouTubeDelivery.applicationId, {
            resourceId: pendingYouTubeDelivery.resourceId,
            tenantId: pendingYouTubeDelivery.tenantId,
          });
          const targetStreams = Array.isArray(status?.targetStreams) ? status.targetStreams : [];
          const eligibleStreams = targetStreams.filter((stream) => stream.targetStatus === 'eligible');
          const partCount = Math.max(1, Number(youtubeChatBroadcastState.result?.partCount || 1));
          const minIntervalMs = Math.max(1500, Number(status?.settings?.minIntervalMs || 5000));
          const retryCount = Math.max(0, Number(status?.settings?.retryCount || 0));
          const retryDelayMs = Math.max(0, Number(status?.settings?.retryDelayMs || 1500));
          const expectedMs = Math.max(
            15_000,
            eligibleStreams.length * partCount * minIntervalMs +
              eligibleStreams.length * partCount * retryCount * retryDelayMs +
              10_000
          );
          deadlineAt = Math.max(deadlineAt, Date.now() + expectedMs);

          if (targetStreams.length > 0 && eligibleStreams.length === 0) {
            if (!cancelled) {
              setYouTubeChatBroadcastState((prev) => ({
                sending: false,
                result: prev.result
                  ? {
                      ...prev.result,
                      queued: false,
                      success: prev.result.sentCount ? prev.result.sentCount > 0 : false,
                      partialSuccess: prev.result.partialSuccess || false,
                      skipped: !prev.result.sentCount,
                      error: prev.result.sentCount
                        ? prev.result.error
                        : targetStreams.map((stream) => stream.targetReason).filter(Boolean).join(' | ') ||
                          'No eligible active streams were available for YouTube auto-post.',
                    }
                  : null,
              }));
              setPendingYouTubeDelivery(null);
            }
            return;
          }

          const matching = eligibleStreams.filter((stream) => {
            const delivery = stream.lastDelivery;
            if (!delivery) return false;
            return (
              String(delivery.frontendQuizGameId || '') === pendingYouTubeDelivery.frontendQuizGameId &&
              String(delivery.questionId || '') === pendingYouTubeDelivery.questionId
            );
          });

          if (eligibleStreams.length > 0 && matching.length === eligibleStreams.length) {
            const results = matching.map((stream) => ({
              streamId: stream.streamId,
              title: stream.title,
              channelTitle: stream.channelTitle,
              status: ((stream.lastDelivery?.status === 'sent' || stream.lastDelivery?.status === 'failed' || stream.lastDelivery?.status === 'skipped')
                ? stream.lastDelivery.status
                : 'failed') as 'sent' | 'failed' | 'skipped',
              partCount: youtubeChatBroadcastState.result?.partCount,
              attemptCount: Number(stream.lastDelivery?.attemptCount || 0),
              error: stream.lastDelivery?.error || '',
            }));
            const sentCount = results.filter((item) => item.status === 'sent').length;
            const failedCount = results.length - sentCount;

            if (!cancelled) {
              setYouTubeChatBroadcastState((prev) => ({
                sending: false,
                result: prev.result
                  ? {
                      ...prev.result,
                      queued: false,
                      success: sentCount > 0,
                      partialSuccess: sentCount > 0 && failedCount > 0,
                      sentCount,
                      failedCount,
                      results,
                    }
                  : null,
              }));
              setPendingYouTubeDelivery(null);
            }
            return;
          }
        } catch (error) {
          console.warn('[Quiz] Failed polling YouTube chat delivery status:', error);
        }

        if (!cancelled && Date.now() < deadlineAt) {
          await new Promise((resolve) => window.setTimeout(resolve, pollMs));
        }
      }

      if (!cancelled) {
        setYouTubeChatBroadcastState((prev) => ({
          sending: false,
          result: prev.result?.queued
            ? {
                ...prev.result,
                queued: false,
                success: false,
                partialSuccess: false,
                error:
                  prev.result.error ||
                  'Queued delivery did not complete within the expected time window. The message may still be blocked by rate limiting, retries, or no eligible active streams.',
              }
            : prev.result,
        }));
        setPendingYouTubeDelivery(null);
      }
    };

    void finalizeFromStatus();

    return () => {
      cancelled = true;
    };
  }, [pendingYouTubeDelivery, youtubeChatBroadcastState.result]);

  const persistBackendQuizStateCheckpoint = useCallback(async (
    checkpointType: string,
    overrides: Record<string, unknown> = {}
  ): Promise<boolean> => {
    if (backend.appMode === 'offline') return true;
    const runId = frontendQuizGameId || streamFrontendQuizGameId;
    const appId = applicationId || getStoredApplicationId();
    if (!runId || !appId) return false;

    const state = {
      frontendQuizGameId: runId,
      applicationId: appId,
      checkpointType,
      savedAtClient: Date.now(),
      gamePhase: lifecycle.gamePhase,
      questionPhase: lifecycle.questionPhase,
      powerplayPhase: lifecycle.powerplayPhase,
      currentTeamIndex,
      teamScores,
      teamStreaks,
      teamLifelines,
      quizMasterScore,
      usedQuestions: Array.from(usedQuestions),
      currentQuestion: currentQuestion
        ? {
            text: currentQuestion.text,
            options: Array.isArray(currentQuestion.options) ? currentQuestion.options : [],
            correctAnswer: currentQuestion.correctAnswer,
            correctAnswerText: currentQuestion.correctAnswerText,
          }
        : null,
      currentQuestionId: currentQuestionTagRef.current || null,
      currentQuestionDisplayIndex,
      questionOpenTime,
      questionCloseTime,
      selectedAnswer,
      passChain,
      timerSeconds: timer.seconds,
      timerIsRunning: timer.isRunning,
      masterTimerSeconds: masterTimer.seconds,
      masterTimerIsRunning: masterTimer.isRunning,
      powerplayActive,
      powerplayTeam,
      powerplayUsed,
      powerplayTimerSeconds: powerplayTimer.seconds,
      powerplayTimerIsRunning: powerplayTimer.isRunning,
      viewerLeaderboard: viewerLeaderboard.map((viewer) => ({
        odytChannelId: String(viewer.odytChannelId || ""),
        userName: String(viewer.userName || ""),
        avatarUrl: String(viewer.avatarUrl || ""),
        totalScore: Number(viewer.totalScore || 0),
        correctAnswers: Number(viewer.correctAnswers || 0),
        totalResponses: Number(viewer.totalResponses || 0),
        avgResponseTimeMs: Number(viewer.avgResponseTimeMs || 0),
        streak: Number(viewer.streak || 0),
        previousRank: Number(viewer.previousRank || 0),
        supportingTeam: viewer.supportingTeam || null,
      })),
      currentQuestionResponses: viewerResponses.map((response) => ({
        id: String(response.id || ""),
        odytChannelId: String(response.odytChannelId || ""),
        userName: String(response.userName || ""),
        avatarUrl: String(response.avatarUrl || ""),
        answer: String(response.answer || ""),
        responseTimeMs: Number(response.responseTimeMs || 0),
        isCorrect: response.isCorrect ?? null,
        score: response.score ?? null,
        serverSeq: response.serverSeq ?? null,
        supportingTeam: response.supportingTeam || null,
      })),
      branding: {
        showTitle: branding.showTitle,
        pageTitle,
        episodeNumber: branding.episodeNumber,
        channelName: branding.channelName,
      },
      quizHostChannel: readQuizHostChannel(),
      ...overrides,
    };

    try {
      const result = await replaceQuizStateCheckpoint({
        applicationId: appId,
        frontendQuizGameId: runId,
        checkpointType,
        state,
      });
      if (!result.success) {
        console.warn(`[Quiz] Quiz state checkpoint ${checkpointType} returned failure:`, result.error || 'unknown_error');
        return false;
      }
      return true;
    } catch (error) {
      console.warn(`[Quiz] Failed to save quiz state checkpoint ${checkpointType}:`, error);
      return false;
    }
  }, [
    backend.appMode,
    frontendQuizGameId,
    streamFrontendQuizGameId,
    applicationId,
    lifecycle.gamePhase,
    lifecycle.questionPhase,
    lifecycle.powerplayPhase,
    currentTeamIndex,
    teamScores,
    teamStreaks,
    teamLifelines,
    quizMasterScore,
    usedQuestions,
    currentQuestion,
    currentQuestionDisplayIndex,
    questionOpenTime,
    questionCloseTime,
    selectedAnswer,
    passChain,
    timer.seconds,
    timer.isRunning,
    masterTimer.seconds,
    masterTimer.isRunning,
    powerplayActive,
    powerplayTeam,
    powerplayUsed,
    powerplayTimer.seconds,
    powerplayTimer.isRunning,
    viewerLeaderboard,
    viewerResponses,
    branding.showTitle,
    branding.episodeNumber,
    branding.channelName,
    pageTitle,
  ]);

  const markQuizClosedLifecycle = useCallback(async () => {
    quizCloseInitiatedRef.current = true;
    if (lifecycleClosedPostedRef.current) return true;
    const ok = await postQuizRunLifecycleEvent('closed');
    if (ok) {
      void persistBackendQuizStateCheckpoint('quiz_closed', {
        gamePhase: 'closed',
        questionPhase: questionActive ? 'open' : lifecycle.questionPhase,
      });
      lifecycleClosedPostedRef.current = true;
    }
    return ok;
  }, [postQuizRunLifecycleEvent, persistBackendQuizStateCheckpoint, questionActive, lifecycle.questionPhase]);

  const broadcastYouTubeChatEvent = useCallback(async (
    eventType: 'quiz_started' | 'question_closed' | 'quiz_ended' | 'top_scorers' | 'prize_winners' | 'powerplay_started' | 'powerplay_ended',
    tokens: Record<string, string | number | null | undefined>,
    eventKey?: string,
    openedAtServer?: number | null,
  ) => {
    if (
      backend.appMode === 'offline' ||
      !applicationId ||
      !(frontendQuizGameId || streamFrontendQuizGameId) ||
      !youtubeIntegrationEnabled ||
      !appModeSupportsViewers
    ) {
      return null;
    }
    const commonTokens = {
      quizTitle: String(pageTitle || '').trim(),
      channelName: String(branding.channelName || '').trim(),
      'Channel Name': String(branding.channelName || '').trim(),
    };
    const quizHostChannel = readQuizHostChannel();
    return broadcastEventToYouTubeChat({
      applicationId,
      frontendQuizGameId: frontendQuizGameId || streamFrontendQuizGameId,
      tenantId: quizHostChannel.quizHostChannelId || 'default-org',
      resourceId: frontendQuizGameId || streamFrontendQuizGameId,
      consumer: HOST_PRODUCT_KEY,
      eventType,
      eventKey,
      openedAtServer: openedAtServer ?? undefined,
      tokens: { ...tokens, ...commonTokens },
    }).catch(() => null);
  }, [backend.appMode, applicationId, frontendQuizGameId, streamFrontendQuizGameId, youtubeIntegrationEnabled, appModeSupportsViewers, pageTitle, branding.channelName]);

  const broadcastTelegramEvent = useCallback(async (
    eventType: 'quiz_started' | 'question_closed' | 'quiz_ended' | 'top_scorers' | 'prize_winners' | 'powerplay_started' | 'powerplay_ended',
    tokens: Record<string, string | number | null | undefined>,
    eventKey?: string,
    openedAtServer?: number | null,
  ) => {
    if (
      backend.appMode === 'offline' ||
      !applicationId ||
      !(frontendQuizGameId || streamFrontendQuizGameId) ||
      !youtubeIntegrationEnabled ||
      !appModeSupportsViewers
    ) {
      return null;
    }
    const commonTokens = {
      quizTitle: String(pageTitle || '').trim(),
      channelName: String(branding.channelName || '').trim(),
      'Channel Name': String(branding.channelName || '').trim(),
    };
    return broadcastEventToTelegram({
      applicationId,
      frontendQuizGameId: frontendQuizGameId || streamFrontendQuizGameId,
      eventType,
      eventKey,
      openedAtServer: openedAtServer ?? undefined,
      tokens: { ...tokens, ...commonTokens },
    }).catch(() => null);
  }, [backend.appMode, applicationId, frontendQuizGameId, streamFrontendQuizGameId, youtubeIntegrationEnabled, appModeSupportsViewers, pageTitle, branding.channelName]);

  const postTimelineEvent = useCallback(
    async (
      action: 'open' | 'close',
      payload: Record<string, unknown>
    ): Promise<{ serverOpenedAt?: number; serverClosedAt?: number } | null> => {
      // Skip timeline events in offline mode - no external calls allowed
      if (backend.appMode === 'offline') {
        return null;
      }
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 2000);
        const res = await fetch(getSSEQuizTimelineUrl(action), {
          method: 'POST',
          credentials: 'include',
          headers: getAppAccessHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            ...payload,
            frontendQuizGameId: frontendQuizGameId || streamFrontendQuizGameId || null,
            consentEnabled: isQuizAnalyticsEnabled(),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && (data.serverOpenedAt || data.serverClosedAt)) {
            return {
              serverOpenedAt: data.serverOpenedAt,
              serverClosedAt: data.serverClosedAt,
            };
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Expected on timeout; timeline sync is best-effort and should not block gameplay.
        } else {
          console.error(`[Quiz] Failed to post timeline ${action}`, err);
        }
      }

      // In backend_scoring mode, also notify the scoring engine
      // NOTE: This runs even if the SSE server call above failed (return null path)
      // We intentionally DON'T return here — scoring engine notification is fire-and-forget
      return null;
    },
    [backend.appMode, frontendQuizGameId, streamFrontendQuizGameId]
  );

  // Separate effect-free helper: notify scoring engine with corrected server timestamps
  const notifyScoringEngineAfterTimeline = useCallback(
    (action: string, serverResult: { serverOpenedAt?: number; serverClosedAt?: number } | null, payload: Record<string, unknown>) => {
      if (backend.appMode !== 'backend_scoring' || !frontendQuizGameId || !isScoringEngineEnabled()) return;

      if (action === 'open' && payload.questionIndex !== undefined) {
        const correctIdx = sessionStorage.getItem('currentCorrectAnswer');
        // Use corrected server timestamp if available, fall back to approximate
        const openedAt = serverResult?.serverOpenedAt || (payload.approxServerOpenedAt as number) || Date.now();
        notifyQuestionOpen({
          gameId: frontendQuizGameId,
          questionIndex: payload.questionIndex as number,
          correctChoiceIndex: correctIdx ? parseInt(correctIdx, 10) : -1,
          openedAt,
          durationMs: parseInt(localStorage.getItem('timerDuration') || '90', 10) * 1000,
        });
      } else if (action === 'close') {
        const qIdx = payload.questionIndex ?? sessionStorage.getItem('currentQuestionIndex');
        const closedAt = serverResult?.serverClosedAt || (payload.approxServerClosedAt as number) || Date.now();
        notifyQuestionClose({
          gameId: frontendQuizGameId,
          questionIndex: typeof qIdx === 'number' ? qIdx : parseInt(String(qIdx || '0'), 10),
          closedAt,
        });
      }
    },
    [backend.appMode, frontendQuizGameId]
  );

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.log(err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.log(err));
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // No longer need to sync usedQuestions from IndexedDB - we manage them locally in session

  // Set initial subject when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !currentSubject) {
      setCurrentSubject(subjects[0]);
    }
  }, [subjects, currentSubject]);

  // Minimize YouTube panel during powerplay and restore after
  useEffect(() => {
    if (!youtubeIntegrationEnabled) return;

    if (powerplayActive) {
      if (youtubePanelVisibleBeforePowerplayRef.current === null) {
        youtubePanelVisibleBeforePowerplayRef.current = youtubePanelVisible;
      }
      setYoutubePanelVisible(false);
      setShowResultPanel(false);
      setViewerResponses([]);
      return;
    }

    if (youtubePanelVisibleBeforePowerplayRef.current !== null) {
      setYoutubePanelVisible(youtubePanelVisibleBeforePowerplayRef.current);
      youtubePanelVisibleBeforePowerplayRef.current = null;
    }
  }, [powerplayActive, youtubeIntegrationEnabled, youtubePanelVisible]);

  // Load game state from localStorage on mount using GameStateManager
  useEffect(() => {
    const savedState = getGameState();
    if (savedState) {
      setCurrentTeamIndex(savedState.currentTeamIndex || 0);
      setCurrentQuestion(savedState.currentQuestion || null);
      setPassChain(savedState.passChain || null);
      setChangeQuestionMode(savedState.changeQuestionMode || false);
      setChangeQuestionTeam(savedState.changeQuestionTeam || null);
      setTeamScores(savedState.teamScores || Array(teams.length).fill(0));
      setTeamStreaks(savedState.teamStreaks || Array(teams.length).fill(0));
      setQuizMasterScore(savedState.quizMasterScore || 0);
      setUsedQuestions(new Set(savedState.usedQuestions || []));
      const savedGamePhase = savedState.gamePhase;
      const savedQuestionPhase = savedState.questionPhase;
      const savedPowerplayPhase = savedState.powerplayPhase;
      hydrateLifecycle({
        gameStarted: savedGamePhase
          ? savedGamePhase === 'running'
          : savedState.gameStarted || false,
        gameEnded: savedGamePhase
          ? savedGamePhase === 'ended'
          : savedState.gameEnded || false,
        questionActive: savedQuestionPhase
          ? savedQuestionPhase !== 'idle'
          : savedState.questionActive || false,
        showCountdown: savedQuestionPhase
          ? savedQuestionPhase === 'revealCountdown'
          : savedState.showCountdown || false,
        showRevealAnimation: savedQuestionPhase
          ? savedQuestionPhase === 'revealed'
          : savedState.showRevealAnimation || false,
        powerplayActive: savedPowerplayPhase
          ? savedPowerplayPhase === 'active'
          : savedState.powerplayActive || false,
      });
      if (savedGamePhase ? savedGamePhase === 'ended' : savedState.gameEnded) {
        gameEndHandledRef.current = true;
      }
      setActivities(savedState.activities || []);
      setSelectedAnswer(savedState.selectedAnswer ?? null);
      hydrateReveal(
        savedState.showCountdown || false,
        savedState.showRevealAnimation || false,
        savedState.countdownValue || 5
      );
      setVerifyAnswerUsed(savedState.verifyAnswerUsed || false);
      setVerifyAnswerResult(savedState.verifyAnswerResult || null);
      setCurrentQuestionDisplayIndex(savedState.currentQuestionDisplayIndex ?? null);
      setQuestionOpenTime(savedState.questionOpenTime ?? null);
      setQuestionCloseTime(savedState.questionCloseTime ?? null);
      setScreenFlash(false);
      // Reveal state is restored via revealState.hydrate

      const savedCurrentQuestionResponses = deserializeViewerResponses(savedState.currentQuestionResponses);
      if (savedCurrentQuestionResponses.length > 0) {
        setViewerResponses(savedCurrentQuestionResponses);
        localStorage.setItem(LIVE_SYNC_LAST_RESTORE_SOURCE_KEY, "localStorage-current-question");
      }

      // Restore powerplay state
      if (savedState.powerplayUsed) setPowerplayUsed(savedState.powerplayUsed);
      if (savedState.powerplayTeam !== undefined) setPowerplayTeam(savedState.powerplayTeam);
      if (savedState.powerplayTimerSeconds > 0 && savedState.powerplayTimerIsRunning) {
        powerplayTimer.start(savedState.powerplayTimerSeconds);
      }
      if (savedState.timerSeconds > 0) {
        if (savedState.timerIsRunning) {
          timer.start(savedState.timerSeconds);
        }
      }
      if (savedState.masterTimerSeconds > 0) {
        if (savedState.masterTimerIsRunning) {
          masterTimer.start(savedState.masterTimerSeconds);
        }
      } else if (!savedState.gameStarted) {
        masterTimer.start(masterTimerDuration * 60);
        beginQuizSession();
      }

      // Restore viewer leaderboard from localStorage
      const savedViewerLeaderboard = getViewerLeaderboard();
      if (savedViewerLeaderboard.length > 0) {
        setViewerLeaderboard(savedViewerLeaderboard);
        localStorage.setItem(LIVE_SYNC_LAST_RESTORE_SOURCE_KEY, "localStorage");
      }

      // Restore the current question board from the active session before falling
      // back to backend snapshots. IndexedDB session storage removed — skip local restore.
      void (async () => {
        // No-op: viewer boards are no longer persisted locally
      })();

      // Backend restore fallback is intentionally limited to viewer boards only.
      // Scoring rules, timers, teams, and other host config remain browser-owned
      // until login/ownership exists, even though backend keeps an audit copy.
      // Skip this on the very first load of a freshly created run because no
      // quiz-result snapshot exists yet, and probing it only creates a noisy 404.
      const restoreRunId = frontendQuizGameId || streamFrontendQuizGameId || null;
      const activeSession = getActiveSession();
      const runConfig = readActiveQuizRunConfigSync(restoreRunId);
      const skipInitialBackendRestore = Boolean(
        restoreRunId
          && ((activeSession?.frontendGameId === restoreRunId && activeSession?.skipInitialBackendRestore)
            || runConfig?.runtime?.skipInitialBackendRestore)
      );

      if (skipInitialBackendRestore) {
        updateActiveSession({ skipInitialBackendRestore: false });
        updateQuizRunConfig(restoreRunId, {
          runtime: {
            skipInitialBackendRestore: false,
          },
        });
      }

      if (restoreRunId && !skipInitialBackendRestore) {
        void (async () => {
          const result = await getQuizResults(restoreRunId);
          if (!result.success || !result.data) return;

          const backendViewerBoards = extractBackendViewerBoardsSnapshot(result.data);
          if (!backendViewerBoards) return;

          if (backendViewerBoards.viewerLeaderboard.length > 0 && savedViewerLeaderboard.length === 0) {
            setViewerLeaderboard(backendViewerBoards.viewerLeaderboard);
            localStorage.setItem(LIVE_SYNC_LAST_RESTORE_SOURCE_KEY, "mongodb");
          }

          if (savedCurrentQuestionResponses.length === 0 && backendViewerBoards.currentQuestionResponses.length > 0) {
            setViewerResponses(backendViewerBoards.currentQuestionResponses);
            localStorage.setItem(LIVE_SYNC_LAST_RESTORE_SOURCE_KEY, "mongodb");
          }
        })();
      }
    } else {
      // First time - check if intro animation is enabled
      const isIntroEnabled = readAdminBoolean("showIntroAnimation", DEFAULT_QUIZ_SETTINGS.showIntroAnimation);

      if (!isIntroEnabled) {
        // Skip countdown, start game immediately
        masterTimer.start(masterTimerDuration * 60);
        beginQuizSession();
        void persistBackendQuizStateCheckpoint('quiz_started', {
          gamePhase: 'running',
          questionPhase: 'idle',
          powerplayPhase: 'inactive',
        });

        // Game is already created from Admin save - just log for debugging
        console.log('[Quiz] Game started with ID:', streamFrontendQuizGameId);

        // Notify scoring engine of game open in backend_scoring mode
        if (getAppMode() === 'backend_scoring' && frontendQuizGameId && isScoringEngineEnabled()) {
          notifyGameOpen({ gameId: frontendQuizGameId, gameTitle: branding.showTitle });
        }
      }
      // If intro is enabled, timer will be started in onComplete of PreGameCountdown
    }
  }, [beginQuizSession]);

  const schedulePersist = useCallback((payload: Parameters<typeof setGameState>[0]) => {
    const now = Date.now();
    const elapsed = now - lastPersistRef.current;

    if (elapsed >= persistThrottleMs) {
      lastPersistRef.current = now;
      setGameState(payload);
      return;
    }

    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = setTimeout(() => {
      lastPersistRef.current = Date.now();
      setGameState(payload);
    }, persistThrottleMs - elapsed);
  }, [setGameState]);

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, []);

  // Save and broadcast game state after every change (throttled)
  useEffect(() => {
    const sessionId = getActiveSession()?.sessionId;

    schedulePersist({
      currentTeamIndex,
      teamScores,
      teamStreaks,
      quizMasterScore,
      usedQuestions: Array.from(usedQuestions),
      gameStarted,
      gameEnded,
      gamePhase: lifecycle.gamePhase,

      questionActive,
      questionPhase: lifecycle.questionPhase,
      currentQuestion,
      currentQuestionDisplayIndex,
      passChain,
      changeQuestionMode,
      changeQuestionTeam,

      selectedAnswer,
      showCountdown,
      countdownValue,
      showRevealAnimation,
      verifyAnswerUsed,
      verifyAnswerResult,

      timerSeconds: timer.seconds,
      timerIsRunning: timer.isRunning,
      masterTimerSeconds: masterTimer.seconds,
      masterTimerIsRunning: masterTimer.isRunning,

      powerplayActive,
      powerplayPhase: lifecycle.powerplayPhase,
      powerplayTeam,
      powerplayUsed,
      powerplayTimerSeconds: powerplayTimer.seconds,
      powerplayTimerIsRunning: powerplayTimer.isRunning,

      activities,
      currentQuestionResponses: serializeViewerResponses(viewerResponses),

      sessionId,
      episodeNumber: branding.episodeNumber,
      questionOpenTime,
      questionCloseTime,
    });

    // Show save indicator briefly
    if (showSaveIndicator && gameStarted) {
      setShowSavedIndicator(true);
      const timeout = setTimeout(() => setShowSavedIndicator(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [
    currentTeamIndex,
    currentQuestion,
    currentQuestionDisplayIndex,
    questionActive,
    passChain,
    changeQuestionMode,
    changeQuestionTeam,
    teamScores,
    teamStreaks,
    quizMasterScore,
    usedQuestions,
    timer.seconds,
    timer.isRunning,
    masterTimer.seconds,
    masterTimer.isRunning,
    gameStarted,
    gameEnded,
    activities,
    viewerResponses,
    selectedAnswer,
    showCountdown,
    countdownValue,
    showRevealAnimation,
    verifyAnswerUsed,
    verifyAnswerResult,
    powerplayUsed,
    powerplayActive,
    powerplayTeam,
    powerplayTimer.seconds,
    powerplayTimer.isRunning,
    schedulePersist,
    branding.episodeNumber,
    lifecycle.gamePhase,
    lifecycle.questionPhase,
    lifecycle.powerplayPhase,
    questionOpenTime,
    questionCloseTime,
  ]);

  const handleSubjectChange = (subject: string) => {
    if (questionActive) {
      if (showToastMessages) {
        toast({ title: "Please Finish Current Question", description: "You must finish the current question first.", variant: "destructive" });
      }
      return;
    }
    setCurrentSubject(subject);
  };

  const showQuestion = async (subject: string, questionNum: number, displayIndex?: number) => {
    if (questionTransitionInFlightRef.current) {
      console.warn('[Quiz] Question transition already in progress, ignoring click');
      return;
    }
    questionTransitionInFlightRef.current = true;

    try {
    const questionKey = `${subject}-${questionNum}`;

    if (usedQuestions.has(questionKey)) {
      if (showToastMessages) {
        toast({ title: "Question Used", description: "This question has already been used.", variant: "destructive" });
      }
      return;
    }

    // CRITICAL: If a previous question is still open, close it first
    // This ensures answers are properly cleared and previous question is finalized
    if (questionActive) {
      console.log('[Quiz] Closing previous question before opening new one');
      clearPendingQuestionClose();
      closeQuestion();

      if (!powerplayActive) {
        // Reset question state and mark close timestamp with best-effort server time
        const previousCloseTs = toServerTime(Date.now());
        setQuestionCloseTime(previousCloseTs);
        
        // Guard against duplicate close events
        const prevTag = currentQuestionTagRef.current;
        if (prevTag && questionCloseSentRef.current !== prevTag) {
          questionCloseSentRef.current = prevTag;
          const closePayload = {
            questionId: prevTag,
            approxServerClosedAt: previousCloseTs,
            clientClosedAt: Date.now(),
            reason: 'auto-close-before-new-question',
          };
          // Do not block UI transition on network I/O to avoid "stuck" question clicks.
          void (async () => {
            const timelineResult = await postTimelineEvent('close', closePayload);
            notifyScoringEngineAfterTimeline('close', timelineResult, closePayload);
            if (timelineResult?.serverClosedAt) {
              setQuestionCloseTime(timelineResult.serverClosedAt);
            }
          })();
        } else if (prevTag) {
          console.log('[Quiz] Skipping duplicate auto-close event for:', prevTag);
        }
      }
    }
    
    // Reset the close guard for the new question
    questionCloseSentRef.current = null;

    // Clear previous question state - answers will be cleared by YouTubeLivePanel on questionId change
    setQuestionOpenTime(null);
    setQuestionCloseTime(null);
    setGraceWaitUntilMs(null);
    setGraceRemainingMs(0);
    setViewerResponses([]);
    setShowResultPanel(false);
    setYouTubeChatBroadcastState({ sending: false, result: null });
    setPendingYouTubeDelivery(null);

    // Get question from session data
    let questionData: QuestionData | undefined;

    // Get from session manager
    const sessionQuestion = await getSessionQuestion(subject, questionNum);
    const sessionQuestionId = sessionQuestion?.id;
    if (sessionQuestion) {
      questionData = {
        text: sessionQuestion.text,
        image: sessionQuestion.image,
        difficulty: sessionQuestion.difficulty as 'Easy' | 'Medium' | 'Hard',
        options: sessionQuestion.options,
        correctAnswer: sessionQuestion.correctAnswer,
        correctAnswerText: sessionQuestion.correctAnswerText
      };
    }

    if (!questionData) {
      if (showToastMessages) {
        toast({ title: "Error", description: "Question not available.", variant: "destructive" });
      }
      return;
    }

    const questionTag = `${subject}-${questionNum}`;
    currentQuestionTagRef.current = questionTag;
    setQuestionIdForPanel(questionTag);

    // Generate shuffle map once per question so display and broadcast use the same mapping
    const currentShuffleMap = Array.isArray(questionData.options) && questionData.options.length > 1
      ? generateShuffleMap(questionData.options, questionData.correctAnswer)
      : null;

    let backendQuestionIndex: number | null = null;
    if (!powerplayActive) {
      // Capture question open time BEFORE any async operations using server-aligned clock
      await ensureClockSync();
      const clientOpenedAt = Date.now();
      const approxServerOpenedAt = toServerTime(clientOpenedAt);
      setQuestionOpenTime(approxServerOpenedAt);
      setQuestionCloseTime(null); // Clear close time for new question

      backendQuestionIndex = usedQuestions.size; // Capture BEFORE adding to set
      setCurrentBackendQuestionIndex(backendQuestionIndex);

      // Store correct answer and question index for scoring engine access
      sessionStorage.setItem('currentCorrectAnswer', questionData.correctAnswer.toString());
      sessionStorage.setItem('currentQuestionIndex', backendQuestionIndex.toString());

      const openPayload = {
        questionId: questionTag,
        questionIndex: backendQuestionIndex,
        approxServerOpenedAt,
        clientOpenedAt,
      };
      // Do not block question rendering on timeline API call.
      void (async () => {
        const timelineResult = await postTimelineEvent('open', openPayload);
        notifyScoringEngineAfterTimeline('open', timelineResult, openPayload);
        const resolvedOpenedAt = timelineResult?.serverOpenedAt || approxServerOpenedAt;
        if (timelineResult?.serverOpenedAt) {
          setQuestionOpenTime(resolvedOpenedAt);
        }
        void persistBackendQuizStateCheckpoint('question_open', {
          gamePhase: 'running',
          questionPhase: 'open',
          currentQuestionId: questionTag,
          currentQuestionDisplayIndex: displayIndex ?? null,
          currentQuestion: {
            text: questionData.text,
            options: Array.isArray(questionData.options) ? questionData.options : [],
            correctAnswer: questionData.correctAnswer,
            correctAnswerText: questionData.correctAnswerText,
          },
          usedQuestions: Array.from(new Set([...Array.from(usedQuestions), questionKey])),
          passChain: {
            originalTeam: changeQuestionMode && changeQuestionTeam !== null ? changeQuestionTeam : currentTeamIndex,
            currentTeam: changeQuestionMode && changeQuestionTeam !== null ? changeQuestionTeam : currentTeamIndex,
            teams: [changeQuestionMode && changeQuestionTeam !== null ? changeQuestionTeam : currentTeamIndex],
          },
          questionOpenTime: resolvedOpenedAt,
          questionCloseTime: null,
          selectedAnswer: null,
          currentQuestionResponses: [],
        });
        const runId = frontendQuizGameId || streamFrontendQuizGameId;
        if (
          applicationId &&
          runId &&
          youtubeIntegrationEnabled &&
          appModeSupportsViewers &&
          !powerplayActive
        ) {
          const displayedQuestionNumber = Number.isFinite(displayIndex)
            ? Number(displayIndex)
            : Number.isFinite(questionNum)
              ? Number(questionNum)
              : Number(backendQuestionIndex) + 1;
          setYouTubeChatBroadcastState({ sending: true, result: null });
          const broadcastOptions = currentShuffleMap
            ? currentShuffleMap.shuffledOptions.map((o) => String(o || ''))
            : Array.isArray(questionData.options) ? questionData.options.map((o) => String(o || '')) : [];
          const payload = {
            applicationId,
            frontendQuizGameId: runId,
            tenantId: readQuizHostChannel().quizHostChannelId || 'default-org',
            resourceId: runId,
            consumer: HOST_PRODUCT_KEY,
            questionId: questionTag,
            questionIndex: Math.max(0, displayedQuestionNumber - 1),
            questionText: questionData.text,
            options: broadcastOptions,
            labels: currentShuffleMap ? currentShuffleMap.labels : undefined,
            openedAtServer: resolvedOpenedAt,
          };
          const [youtubeResult] = await Promise.allSettled([
            broadcastQuestionToYouTubeChat(payload),
            broadcastQuestionToTelegram(payload),
          ]);
          const broadcastResult: YouTubeChatBroadcastResult = youtubeResult.status === 'fulfilled'
            ? youtubeResult.value
            : {
                success: false,
                error: String(youtubeResult.reason?.message || youtubeResult.reason || 'Failed to broadcast question to YouTube chat'),
              };
          setYouTubeChatBroadcastState({ sending: false, result: broadcastResult });
          setPendingYouTubeDelivery(
            broadcastResult.success && broadcastResult.queued && !broadcastResult.skipped
              ? {
                  applicationId,
                  frontendQuizGameId: runId,
                  questionId: questionTag,
                  resourceId: runId,
                  tenantId: readQuizHostChannel().quizHostChannelId || 'default-org',
                }
              : null
          );
          if (broadcastResult.success && broadcastResult.queued && !broadcastResult.skipped) {
            toast({
              title: 'YouTube chat auto-post queued',
              description: `${broadcastResult.partCount || 1} message part${broadcastResult.partCount === 1 ? '' : 's'} queued for background delivery.`,
            });
          } else if (broadcastResult.skipped) {
            toast({
              title: 'YouTube chat auto-post skipped',
              description: broadcastResult.error || 'No eligible streams were available, so no YouTube message was sent.',
            });
          } else if (broadcastResult.success && !broadcastResult.skipped) {
            toast({
              title: 'YouTube chat auto-post sent',
              description: `${broadcastResult.sentCount || 0} stream(s) updated${broadcastResult.failedCount ? `, ${broadcastResult.failedCount} failed` : ''}.`,
            });
          } else if (broadcastResult.error || broadcastResult.failedCount) {
            toast({
              title: 'YouTube chat auto-post issue',
              description: broadcastResult.error || `${broadcastResult.failedCount || 0} stream(s) failed. Manual copy is available below the ticker.`,
              variant: 'destructive',
            });
          }
        }
      })();
    } else {
      setQuestionOpenTime(null);
      setQuestionCloseTime(null);
    }

    // Handle change question mode
    if (changeQuestionMode && changeQuestionTeam !== null) {
      // Apply lifeline penalty
      const newScores = [...teamScores];
      newScores[changeQuestionTeam] -= lifelinePenalty;
      setTeamScores(newScores);

      // Show score change indicator
      setScoreChanges(new Map([[changeQuestionTeam, -lifelinePenalty]]));
      setTimeout(() => setScoreChanges(new Map()), 1500);

      // Log activity
      setActivities(prev => [...prev.slice(-99), {
        id: `${Date.now()}-lifeline`,
        type: "penalty",
        teamName: teams[changeQuestionTeam].name,
        teamColor: teams[changeQuestionTeam].color,
        timestamp: new Date(),
        points: -lifelinePenalty
      }]);

      // Mark question as used in both local state and IndexedDB
      setUsedQuestions(prev => new Set([...prev, questionKey]));
      if (sessionQuestionId) {
        incrementQuestionUsedCount(sessionQuestionId).catch(() => undefined);
      }

      setCurrentQuestion(questionData);
      setShuffleMap(currentShuffleMap);
      openQuestion();
      setSelectedAnswer(null);
      setCurrentQuestionDisplayIndex(displayIndex ?? null);

      // Keep the same team and start fresh timer
      setPassChain({
        originalTeam: changeQuestionTeam,
        currentTeam: changeQuestionTeam,
        teams: [changeQuestionTeam]
      });
      setCurrentTeamIndex(changeQuestionTeam);

      if (!powerplayActive) {
        timer.start(timerDuration);
      }
      // Reset change question mode
      setChangeQuestionMode(false);
      setChangeQuestionTeam(null);
      return;
    }

    // Mark question as used in both local state and IndexedDB
    setUsedQuestions(prev => new Set([...prev, questionKey]));
    if (sessionQuestionId) {
      incrementQuestionUsedCount(sessionQuestionId).catch(() => undefined);
    }
    setPassChain({
      originalTeam: currentTeamIndex,
      currentTeam: currentTeamIndex,
      teams: [currentTeamIndex]
    });

    setCurrentQuestion(questionData);
    setShuffleMap(currentShuffleMap);
    openQuestion();
    setSelectedAnswer(null);
    setCurrentQuestionDisplayIndex(displayIndex ?? null);
    // Only start question timer if not in powerplay mode
    if (!powerplayActive) {
      timer.start(timerDuration);
    }

    // Auto-scroll to question section
    setTimeout(() => {
      questionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    } finally {
      questionTransitionInFlightRef.current = false;
    }
  };

  const handleAnswerSelect = (displayIndex: number) => {
    if (!currentQuestion || !passChain) return;

    // Block selection if reveal countdown is active or answer has been revealed
    if (showCountdown || showRevealAnimation) return;

    // In normal mode (not powerplay), after timer runs out, only allow selection via Change Option button
    if (!powerplayActive && timer.isTimeUp && selectedAnswer !== null) return;

    // Convert display position back to original option index so comparisons against correctAnswer still work
    const answerIndex = shuffleMap ? shuffleMap.shuffledIndices[displayIndex] : displayIndex;
    setSelectedAnswer(answerIndex);

    // Don't pause timer - let it keep running
    // Don't start countdown immediately - wait for "Reveal Answer" button
  };

  const handleRevealAnswer = async () => {
    // Stop the timer when revealing answer
    timer.stop();

    if (!powerplayActive) {
      const postRevealGraceMs = getViewerPostRevealGraceMs();
      const revealClickedAt = Date.now();
      const revealClickedAtServer = toServerTime(revealClickedAt);
      setGraceWaitUntilMs(revealClickedAtServer + postRevealGraceMs);
      setQuestionCloseTime(null);
      clearPendingQuestionClose();
      console.log('[Quiz] Reveal clicked at (server aligned):', revealClickedAtServer, 'close scheduled after grace (ms):', postRevealGraceMs);

      // Guard against duplicate close events for the same question
      const currentTag = currentQuestionTagRef.current;
      if (currentTag && questionCloseSentRef.current !== currentTag) {
        pendingQuestionCloseTimeoutRef.current = window.setTimeout(() => {
          void (async () => {
            if (questionCloseSentRef.current === currentTag) {
              console.log('[Quiz] Skipping duplicate close event for:', currentTag);
              return;
            }
            const clientClosedAt = Date.now();
            const closeTime = toServerTime(clientClosedAt);
            questionCloseSentRef.current = currentTag;
            setQuestionCloseTime(closeTime);
            setGraceWaitUntilMs(null);
            console.log('[Quiz] Question closed at (server aligned):', closeTime);

            const closePayload = {
              questionId: currentTag,
              approxServerClosedAt: closeTime,
              clientClosedAt,
            };
            const timelineResult = await postTimelineEvent('close', closePayload);
            notifyScoringEngineAfterTimeline('close', timelineResult, closePayload);
            const resolvedClosedAt = timelineResult?.serverClosedAt || closeTime;
            if (timelineResult?.serverClosedAt) {
              setQuestionCloseTime(timelineResult.serverClosedAt);
            }
            void persistBackendQuizStateCheckpoint('question_closed', {
              questionPhase: 'revealed',
              questionCloseTime: resolvedClosedAt,
              graceWaitUntilMs: null,
            });
            void broadcastYouTubeChatEvent(
              'question_closed',
              {
                quizTitle: branding.showTitle || '',
                questionIndex: currentQuestionDisplayIndex,
              },
              `question_closed:${currentTag}`,
              resolvedClosedAt
            );
            void broadcastTelegramEvent(
              'question_closed',
              {
                quizTitle: branding.showTitle || '',
                questionIndex: currentQuestionDisplayIndex,
              },
              `question_closed:${currentTag}`,
              resolvedClosedAt
            );
          })();
        }, Math.max(0, postRevealGraceMs));
      }
    }

    // Start reveal animation - glow and blink on all buttons
    startRevealCountdown(revealCountdownDuration);
    startReveal();
  };

  useEffect(() => {
    return () => {
      clearPendingQuestionClose();
    };
  }, [clearPendingQuestionClose]);

  const handleVerifyAnswer = () => {
    if (!passChain || !currentQuestion || selectedAnswer === null) return;

    const currentTeam = passChain.currentTeam;

    // Check if team has lifelines remaining
    if (teamLifelines[currentTeam] <= 0) {
      toast({ title: "No Lifelines", description: "This team has used all their lifelines.", variant: "destructive" });
      return;
    }

    // Apply lifeline penalty
    const newScores = [...teamScores];
    newScores[currentTeam] -= lifelinePenalty;
    setTeamScores(newScores);

    // Track lifeline usage during powerplay
    if (powerplayActive && currentTeam === powerplayTeam) {
      powerplayLifelinesRef.current += 1;
      powerplayPointsLostRef.current += lifelinePenalty;
    }

    // Decrement team lifelines
    const newLifelines = [...teamLifelines];
    newLifelines[currentTeam] -= 1;
    setTeamLifelines(newLifelines);
    localStorage.setItem("teamLifelinesState", JSON.stringify(newLifelines));

    // Show score change indicator
    setScoreChanges(new Map([[currentTeam, -lifelinePenalty]]));
    setTimeout(() => setScoreChanges(new Map()), 1500);

    // Check if answer is correct
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setVerifyAnswerResult(isCorrect ? 'correct' : 'wrong');

    // Play appropriate sound
    if (isCorrect) {
      playCorrect();
    } else {
      playBuzzer();
    }

    // Log activity
    setActivities(prev => [...prev.slice(-99), {
      id: `${Date.now()}-verify-answer`,
      type: "penalty",
      teamName: teams[currentTeam].name,
      teamColor: teams[currentTeam].color,
      timestamp: new Date(),
      points: -lifelinePenalty
    }]);

    // Mark verify answer as used for this question
    setVerifyAnswerUsed(true);
  };

  const handleChangeAnswerAfterVerify = () => {
    // Allow team to change their answer after seeing verify result
    setSelectedAnswer(null);
    setVerifyAnswerResult(null);
  };

  // Reveal countdown effect - rapid blinking with sounds
  useEffect(() => {
    if (!showCountdown || countdownValue <= 0) return;

    // Play countdown tick sound - faster for lower numbers
    playCountdownTick(countdownValue);

    // Also play heartbeat for extra tension
    if (countdownValue <= 3) {
      playHeartbeat();
    }

    // Faster countdown - 400ms per tick for rapid effect
    const timeout = setTimeout(() => {
      tickRevealCountdown();
    }, countdownValue <= 3 ? 300 : 500);
    return () => clearTimeout(timeout);
  }, [showCountdown, countdownValue, playCountdownTick, playHeartbeat, tickRevealCountdown]);

  useEffect(() => {
    if (showRevealAnimation && !revealTriggeredRef.current) {
      revealTriggeredRef.current = true;
      completeReveal();
      if (selectedAnswer !== null && currentQuestion && selectedAnswer !== currentQuestion.correctAnswer) {
        playBuzzer();
        setScreenFlash(true);
        setTimeout(() => setScreenFlash(false), 500);
      }
      return;
    }
    if (!showRevealAnimation) {
      revealTriggeredRef.current = false;
    }
  }, [showRevealAnimation, selectedAnswer, currentQuestion, playBuzzer]);

  const handleCorrectAnswer = () => {
    if (!passChain) return;
    if (!powerplayActive && isGraceWaiting) {
      toast({ title: "Processing viewer answers", description: "Please wait for the grace window to finish." });
      return;
    }

    const answeringTeam = passChain.currentTeam;
    const newScores = [...teamScores];

    newScores[answeringTeam] += correctAnswerScore;

    setTeamScores(newScores);

    // Track powerplay stats
    if (powerplayActive && answeringTeam === powerplayTeam) {
      powerplayCorrectRef.current += 1;
      powerplayPointsScoredRef.current += correctAnswerScore;
      powerplayQuestionsRef.current += 1;
    }

    // Update streak - consecutive correct answers for this team only
    setTeamStreaks((prev) => {
      const next = [...prev];
      next[answeringTeam] = (next[answeringTeam] ?? 0) + 1;
      return next;
    });

    // Show score change indicator
    setScoreChanges(new Map([[answeringTeam, correctAnswerScore]]));
    setTimeout(() => setScoreChanges(new Map()), 1500);

    // Log activity
    setActivities(prev => [...prev.slice(-99), {
      id: `${Date.now()}-correct`,
      type: "correct",
      teamName: teams[answeringTeam].name,
      teamColor: teams[answeringTeam].color,
      timestamp: new Date(),
      points: correctAnswerScore
    }]);

    playCorrect();
    playVictoryFanfare();

    // Show result panel if YouTube integration is enabled (skip during powerplay)
    if (youtubeIntegrationEnabled && !powerplayActive) {
      setLastQuestionForResult(currentQuestion);
      setLastCorrectAnswerForResult(currentQuestion?.correctAnswer ?? null);
      setLastQuestionNumberForResult(currentQuestionDisplayIndex);
      setLastResultCorrect(true);
      setShowResultPanel(true);
    }

    // Trigger epic confetti celebration
    const fireConfetti = () => {
      // Center burst
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#ff6b35', '#22c55e', '#3b82f6']
      });

      // Side cannons
      setTimeout(() => {
        confetti({
          particleCount: 75,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ffd700', '#ff6b35']
        });
        confetti({
          particleCount: 75,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#22c55e', '#3b82f6']
        });
      }, 200);

      // Star burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 360,
          startVelocity: 30,
          gravity: 0.5,
          origin: { y: 0.5, x: 0.5 },
          shapes: ['star'],
          colors: ['#ffd700']
        });
      }, 400);
    };
    fireConfetti();

    // Simple circular progression: always move to next team
    // If powerplay is active, stay with powerplay team; otherwise move to next team
    if (!powerplayActive) {
      setCurrentTeamIndex((passChain.originalTeam + 1) % teams.length);
    }
    endQuestion();
  };

  const handleWrongAnswer = () => {
    if (!passChain) return;
    if (!powerplayActive && isGraceWaiting) {
      toast({ title: "Processing viewer answers", description: "Please wait for the grace window to finish." });
      return;
    }

    const answeringTeam = passChain.currentTeam;
    const newScores = [...teamScores];

    newScores[answeringTeam] -= wrongAnswerPenalty;

    setTeamScores(newScores);

    // Track powerplay stats
    if (powerplayActive && answeringTeam === powerplayTeam) {
      powerplayWrongRef.current += 1;
      powerplayPointsLostRef.current += wrongAnswerPenalty;
      powerplayQuestionsRef.current += 1;
    }

    // Reset streak on wrong answer
    setTeamStreaks((prev) => {
      const next = [...prev];
      next[answeringTeam] = 0;
      return next;
    });

    // Show score change indicator
    setScoreChanges(new Map([[answeringTeam, -wrongAnswerPenalty]]));
    setTimeout(() => setScoreChanges(new Map()), 1500);

    // Log activity
    setActivities(prev => [...prev.slice(-99), {
      id: `${Date.now()}-wrong`,
      type: "wrong",
      teamName: teams[answeringTeam].name,
      teamColor: teams[answeringTeam].color,
      timestamp: new Date(),
      points: -wrongAnswerPenalty
    }]);

    playWrong();

    // Show result panel if YouTube integration is enabled (skip during powerplay)
    if (youtubeIntegrationEnabled && !powerplayActive) {
      setLastQuestionForResult(currentQuestion);
      setLastCorrectAnswerForResult(currentQuestion?.correctAnswer ?? null);
      setLastQuestionNumberForResult(currentQuestionDisplayIndex);
      setLastResultCorrect(false);
      setShowResultPanel(true);
    }

    // Original team's turn is complete - move to next team after original team
    // If powerplay is active, stay with powerplay team; otherwise move to next team
    if (!powerplayActive) {
      setCurrentTeamIndex((passChain.originalTeam + 1) % teams.length);
    }

    endQuestion();
  };

  // State for admin reveal delay
  const [adminRevealPending, setAdminRevealPending] = useState(false);
  const adminRevealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const revealTriggeredRef = useRef(false);

  const handlePassAnswer = () => {
    if (!passChain) return;

    timer.stop();

    // Simple circular progression: always move to next team
    const nextTeamIndex = (currentTeamIndex + 1) % teams.length;

    // Check if we've completed the circle (back to original team)
    if (passChain.teams.includes(nextTeamIndex)) {
      // No one could answer - reveal answer first, then give point to admin after 10 seconds
      toast({ title: "No Team Could Answer", description: "Revealing correct answer...", variant: "default" });

      // Show the correct answer reveal animation
      startReveal();
      revealNow();
      setAdminRevealPending(true);

      // After 10 seconds, complete the admin scoring and move on
      adminRevealTimeoutRef.current = setTimeout(() => {
        setQuizMasterScore(prev => prev + correctAnswerScore);

        // Log activity
        setActivities(prev => [...prev.slice(-99), {
          id: `${Date.now()}-master`,
          type: "master",
          teamName: "Admin",
          teamColor: "bg-blue-100 text-blue-800",
          timestamp: new Date()
        }]);

        toast({ title: "Point to Admin!", description: "Moving to next question...", variant: "default" });

        // Move to next team in circular fashion
        setCurrentTeamIndex((passChain.originalTeam + 1) % teams.length);

        setAdminRevealPending(false);
        resetReveal();
        endQuestion();
      }, 10000); // 10 second delay

      return;
    }

    // Reset streak when a team passes
    setTeamStreaks((prev) => {
      const next = [...prev];
      next[currentTeamIndex] = 0;
      return next;
    });

    // Log pass activity
    setActivities(prev => [...prev.slice(-99), {
      id: `${Date.now()}-pass`,
      type: "pass",
      teamName: teams[currentTeamIndex].name,
      teamColor: teams[currentTeamIndex].color,
      timestamp: new Date()
    }]);

    playPass();
    setPassChain(prev => prev ? {
      ...prev,
      currentTeam: nextTeamIndex,
      teams: [...prev.teams, nextTeamIndex]
    } : null);

    setCurrentTeamIndex(nextTeamIndex);
    timer.start(passedQuestionTimer);
  };

  const endQuestion = () => {
    // Clear admin reveal timeout if pending
    if (adminRevealTimeoutRef.current) {
      clearTimeout(adminRevealTimeoutRef.current);
      adminRevealTimeoutRef.current = null;
    }
    setAdminRevealPending(false);

    closeQuestion();
    setCurrentQuestion(null);
    setPassChain(null);
    setSelectedAnswer(null);
    setScreenFlash(false);
    resetReveal();
    setVerifyAnswerUsed(false);
    setVerifyAnswerResult(null);
    setCurrentQuestionDisplayIndex(null);
    setQuestionIdForPanel(null);
    setGraceWaitUntilMs(null);
    setGraceRemainingMs(0);
    timer.reset();
    
    // Note: questionOpenTime and questionCloseTime are intentionally NOT reset here
    // They will be reset when the next question is opened
    // This allows scoring to complete properly after endQuestion is called

    // Check if powerplay should end after this question
    if (powerplayEndPendingRef.current && powerplayActive) {
      powerplayEndPendingRef.current = false;
      endPowerplay();
    }
  };

  // Start Powerplay Mode
  const startPowerplay = async () => {
    if (!powerplayEnabled || powerplayUsed[currentTeamIndex] || powerplayActive || questionActive) return;

    // Initialize powerplay tracking refs
    powerplayStartScoreRef.current = teamScores[currentTeamIndex];
    powerplayCorrectRef.current = 0;
    powerplayWrongRef.current = 0;
    powerplayLifelinesRef.current = 0;
    powerplayPointsScoredRef.current = 0;
    powerplayPointsLostRef.current = 0;
    powerplayQuestionsRef.current = 0;

    // Mark powerplay as used for this team
    const newPowerplayUsed = [...powerplayUsed];
    newPowerplayUsed[currentTeamIndex] = true;
    setPowerplayUsed(newPowerplayUsed);

    // Activate powerplay mode
    startPowerplayPhase();
    setPowerplayTeam(currentTeamIndex);
    powerplayTimer.start(powerplayDuration * 60);

    // Play epic sound effect
    playRapidFireStart();

    // Show fullscreen flash animation
    setPowerplayFlash(true);
    setTimeout(() => setPowerplayFlash(false), 1500);

    // Log activity
    setActivities(prev => [...prev.slice(-99), {
      id: `${Date.now()}-powerplay`,
      type: "powerplay" as const,
      teamName: teams[currentTeamIndex].name,
      teamColor: teams[currentTeamIndex].color,
      timestamp: new Date()
    }]);

    if (showToastMessages) {
      toast({
        title: "⚡ POWERPLAY ACTIVATED!",
        description: `${teams[currentTeamIndex].name} has ${powerplayDuration} minutes of powerplay!`
      });
    }
    void persistBackendQuizStateCheckpoint('powerplay_started', {
      powerplayPhase: 'active',
      powerplayActive: true,
      powerplayTeam: currentTeamIndex,
      powerplayUsed: newPowerplayUsed,
    });
    void broadcastYouTubeChatEvent(
      'powerplay_started',
      {
        quizTitle: branding.showTitle || '',
        teamName: teams[currentTeamIndex].name,
      },
      `powerplay_started:${frontendQuizGameId || streamFrontendQuizGameId || 'local'}:${currentTeamIndex}`
    );
    void broadcastTelegramEvent(
      'powerplay_started',
      {
        quizTitle: branding.showTitle || '',
        teamName: teams[currentTeamIndex].name,
      },
      `powerplay_started:${frontendQuizGameId || streamFrontendQuizGameId || 'local'}:${currentTeamIndex}`
    );
  };

  // Skip Question in Powerplay (only available during powerplay)
  const handleSkipQuestion = () => {
    if (!powerplayActive || !questionActive) return;

    timer.stop();

    // Log activity
    setActivities(prev => [...prev.slice(-99), {
      id: `${Date.now()}-skip`,
      type: "skip" as const,
      teamName: teams[currentTeamIndex].name,
      teamColor: teams[currentTeamIndex].color,
      timestamp: new Date()
    }]);

    playPass();

    // Close current question, keep turn with same team
    closeQuestion();
    setCurrentQuestion(null);
    setPassChain(null);
    setSelectedAnswer(null);
    setScreenFlash(false);
    resetReveal();
    setVerifyAnswerUsed(false);
    setVerifyAnswerResult(null);
    setCurrentQuestionDisplayIndex(null);
    setQuestionIdForPanel(null);
    timer.reset();

    if (showToastMessages) {
      toast({ title: "Question Skipped", description: "Choose another question from the grid." });
    }
  };

  // End Powerplay Mode
  const endPowerplay = async () => {
    const previousTeam = powerplayTeam;

    // Calculate and set powerplay stats before resetting
    if (previousTeam !== null) {
      const netScore = powerplayPointsScoredRef.current - powerplayPointsLostRef.current;
      setPowerplayStats({
        teamName: teams[previousTeam].name,
        teamColor: teams[previousTeam].color,
        correctAnswers: powerplayCorrectRef.current,
        wrongAnswers: powerplayWrongRef.current,
        lifelinesUsed: powerplayLifelinesRef.current,
        pointsScored: powerplayPointsScoredRef.current,
        pointsLost: powerplayPointsLostRef.current,
        netScore: netScore,
        questionsAttempted: powerplayQuestionsRef.current
      });
    }

    endPowerplayPhase();
    setPowerplayTeam(null);
    powerplayTimer.stop();
    powerplayTimer.reset();

    // Play end sound
    playRapidFireEnd();

    // Show end animation, then show summary popup after animation completes
    setPowerplayEndFlash(true);
    setTimeout(() => {
      setPowerplayEndFlash(false);
      // Show summary popup after end animation
      if (previousTeam !== null) {
        setShowPowerplaySummary(true);
      }
    }, 1500);

    // Log activity
    setActivities(prev => [...prev.slice(-99), {
      id: `${Date.now()}-powerplay-end`,
      type: "powerplay" as const,
      teamName: previousTeam !== null ? teams[previousTeam].name : "",
      teamColor: previousTeam !== null ? teams[previousTeam].color : "",
      message: "Powerplay mode ended",
      timestamp: new Date()
    }]);

    // Move to next team after powerplay team
    if (previousTeam !== null) {
      setCurrentTeamIndex((previousTeam + 1) % teams.length);
    }

    if (showToastMessages) {
      toast({
        title: "Powerplay Ended",
        description: "Normal gameplay resumes."
      });
    }
    void persistBackendQuizStateCheckpoint('powerplay_ended', {
      powerplayPhase: 'inactive',
      powerplayActive: false,
      powerplayTeam: null,
    });
    void broadcastYouTubeChatEvent(
      'powerplay_ended',
      {
        quizTitle: branding.showTitle || '',
        teamName: previousTeam !== null ? teams[previousTeam]?.name || '' : '',
      },
      `powerplay_ended:${frontendQuizGameId || streamFrontendQuizGameId || 'local'}:${previousTeam ?? 'na'}`
    );
    void broadcastTelegramEvent(
      'powerplay_ended',
      {
        quizTitle: branding.showTitle || '',
        teamName: previousTeam !== null ? teams[previousTeam]?.name || '' : '',
      },
      `powerplay_ended:${frontendQuizGameId || streamFrontendQuizGameId || 'local'}:${previousTeam ?? 'na'}`
    );
  };

  // Handle powerplay timer end
  useEffect(() => {
    if (powerplayTimer.isTimeUp && powerplayActive) {
      // If a question is active, wait for it to finish
      if (questionActive) {
        powerplayEndPendingRef.current = true;
      } else {
        endPowerplay();
      }
    }
  }, [powerplayTimer.isTimeUp, powerplayActive, questionActive]);

  // Handle timer expiry - auto pass only if no answer selected AND not in powerplay
  useEffect(() => {
    if (timer.isTimeUp && questionActive && passChain && !showCountdown && !showRevealAnimation && !powerplayActive) {
      // Only auto-pass if the team never selected an answer at all.
      // If they used "Verify Answer", selectedAnswer becomes null intentionally and should NOT trigger a pass.
      if (selectedAnswer === null && !verifyAnswerUsed) {
        handlePassAnswer();
      }
      // If answer is selected, just wait for reveal
    }
  }, [timer.isTimeUp, questionActive, passChain, selectedAnswer, verifyAnswerUsed, showCountdown, showRevealAnimation, powerplayActive]);

  // Play ticking sound during last 10 seconds of master timer
  useEffect(() => {
    if (gameStarted && !gameEnded && masterTimer.seconds > 0 && masterTimer.seconds <= 10 && masterTimer.isRunning) {
      playTick();
    }
  }, [masterTimer.seconds, gameStarted, gameEnded, masterTimer.isRunning, playTick]);

  // Handle master timer end
  useEffect(() => {
    if (masterTimer.isTimeUp && !gameEndHandledRef.current && gameStarted) {
      gameEndHandledRef.current = true;
      playBigReveal();
      playVictoryFanfare();
      endGame();
      const finalTeams = teams
        .map((team, index) => ({
          teamId: team.id,
          teamName: team.name,
          score: teamScores[index],
          rank: 0,
          color: team.color,
        }))
        .sort((a, b) => b.score - a.score)
        .map((team, index) => ({ ...team, rank: index + 1 }));
      saveFinalLeaderboardSnapshot({
        capturedAt: Date.now(),
        gameId: frontendQuizGameId || streamFrontendQuizGameId || null,
        teams: finalTeams,
        viewers: buildViewerLeaderboardRanks(viewerLeaderboard),
      });
      try {
        localStorage.removeItem('quizEndingAt');
        localStorage.removeItem('quizEndingDurationSec');
      } catch { /* ignore */ }
      closeQuestion();
      timer.stop();
      powerplayTimer.stop();
      void cleanupStreamsOnQuizEnd();
      void markQuizClosedLifecycle();

      // Close quiz game on backend
      closeQuizGame()
        .then(result => console.log('[Quiz] Game closed on backend:', result))
        .catch(console.error);

      // Save quiz results to backend
      const initialLifelineCount = readAdminNumber("teamLifelines", DEFAULT_QUIZ_SETTINGS.teamLifelines);
      const activeSession = getActiveSession();
      const runConfig = readActiveQuizRunConfigSync(frontendQuizGameId || streamFrontendQuizGameId || null);
      const quizStartTimeMs = Number(activeSession?.startedAt || runConfig?.runtime?.startedAtMs || Date.now());
      const quizHostChannel = readQuizHostChannel();
      const { episodeName, episodeNumber, quizShowName } = getResolvedEpisodeMeta();
      const resultsPayload = buildQuizResultsPayload({
        episodeName,
        episodeNumber,
        quizShowName,
        startedAt: new Date(Number.isFinite(quizStartTimeMs) ? quizStartTimeMs : Date.now()),
        endedAt: new Date(),
        totalQuestions: usedQuestions.size,
        status: 'completed',
        frontendQuizGameId: frontendQuizGameId || streamFrontendQuizGameId || null,
        applicationId: getStoredApplicationId(),
        analyticsOwnerId: getAnalyticsOwnerId(),
        quizHostChannel,
        teams,
        teamScores,
        teamStreaks,
        teamLifelines,
        initialLifelineCount,
        powerplayUsed,
        quizMasterScore,
        viewerLeaderboard,
      });
      if (isQuizAnalyticsEnabled() && backend.appMode !== 'offline') {
        saveQuizResults(resultsPayload)
          .then(result => console.log('[Quiz] Results saved to backend:', result))
          .catch(err => console.error('[Quiz] Failed to save results:', err));
      } else {
        console.log('[Quiz] Backend analytics disabled/offline; skipping /api/quiz-results/save');
      }

      // Persist final session snapshot — lifecycle handled by backend.
      if (!sessionClosedRef.current) {
        const sessionId = getActiveSession()?.sessionId;
        if (sessionId) {
          sessionClosedRef.current = true;
          const teamLeaderboard: QuizSessionTeamResult[] = teams
            .map((team, index) => ({
              teamId: team.id,
              teamName: team.name,
              members: team.members || [],
              finalScore: teamScores[index],
              rank: 0,
            }))
            .sort((a, b) => b.finalScore - a.finalScore)
            .map((team, index) => ({ ...team, rank: index + 1 }));
          const viewerLeaderboardWithRanks: QuizSessionViewerResult[] = buildViewerLeaderboardRanks(viewerLeaderboard);
          // Session close is now handled by the lifecycle API; no IndexedDB write needed
          Promise.resolve()
            .then(() => {
              // no-op: activeQuizSessionId no longer in localStorage
            })
            .catch((error) => {
              sessionClosedRef.current = false;
              console.error('[Quiz] Failed to persist final session backup:', error);
            });
        }
      }

      // Notify scoring engine of game close
      if (getAppMode() === 'backend_scoring' && frontendQuizGameId && isScoringEngineEnabled()) {
        notifyGameClose({ gameId: frontendQuizGameId });
      }
      void broadcastYouTubeChatEvent(
        'quiz_ended',
        {
          quizTitle: branding.showTitle || '',
        },
        `quiz_ended:${frontendQuizGameId || streamFrontendQuizGameId || 'local'}`
      );
      void broadcastTelegramEvent(
        'quiz_ended',
        {
          quizTitle: branding.showTitle || '',
        },
        `quiz_ended:${frontendQuizGameId || streamFrontendQuizGameId || 'local'}`
      );
      const topViewers = buildViewerLeaderboardRanks(viewerLeaderboard).slice(0, 3);
      if (topViewers.length > 0) {
        void broadcastYouTubeChatEvent(
          'top_scorers',
          {
            top1Name: topViewers[0]?.userName || '',
            top1Score: topViewers[0]?.totalScore || '',
            top2Name: topViewers[1]?.userName || '',
            top2Score: topViewers[1]?.totalScore || '',
            top3Name: topViewers[2]?.userName || '',
            top3Score: topViewers[2]?.totalScore || '',
          },
          `top_scorers:${frontendQuizGameId || streamFrontendQuizGameId || 'local'}`
        );
        void broadcastTelegramEvent(
          'top_scorers',
          {
            top1Name: topViewers[0]?.userName || '',
            top1Score: topViewers[0]?.totalScore || '',
            top2Name: topViewers[1]?.userName || '',
            top2Score: topViewers[1]?.totalScore || '',
            top3Name: topViewers[2]?.userName || '',
            top3Score: topViewers[2]?.totalScore || '',
          },
          `top_scorers:${frontendQuizGameId || streamFrontendQuizGameId || 'local'}`
        );
      }
    }
  }, [masterTimer.isTimeUp, gameStarted, playBigReveal, playVictoryFanfare, cleanupStreamsOnQuizEnd, markQuizClosedLifecycle, teams, teamScores, frontendQuizGameId, streamFrontendQuizGameId, viewerLeaderboard, branding.showTitle, broadcastYouTubeChatEvent, broadcastTelegramEvent]);

  // Close session and save stats
  const closeQuizSessionWithStats = useCallback(async (status: 'completed' | 'aborted' = 'completed') => {
    if (status === 'completed' && !lifecycleClosedPostedRef.current) {
      await markQuizClosedLifecycle();
    }
    if (!lifecycleFinalizedRef.current) {
      const lifecycleOk = await postQuizRunLifecycleEvent(status === 'completed' ? 'ended' : 'aborted');
      lifecycleFinalizedRef.current = lifecycleOk;
    }
    await persistBackendQuizStateCheckpoint(status === 'completed' ? 'quiz_ended' : 'quiz_aborted', {
      gamePhase: status === 'completed' ? 'ended' : 'aborted',
      questionPhase: questionActive ? 'revealed' : lifecycle.questionPhase,
    });
    if (sessionClosedRef.current) return;
    sessionClosedRef.current = true;

    const activeSession = getActiveSession();
    const sessionId = activeSession?.sessionId;
    if (!sessionId) return;

    // Build team leaderboard
    const teamLeaderboard: QuizSessionTeamResult[] = teams
      .map((team, index) => ({
        teamId: team.id,
        teamName: team.name,
        members: team.members || [],
        finalScore: teamScores[index],
        rank: 0,
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((team, index) => ({ ...team, rank: index + 1 }));

    // Build viewer leaderboard with ranks
    const viewerLeaderboardWithRanks: QuizSessionViewerResult[] = buildViewerLeaderboardRanks(viewerLeaderboard);

    if (status === 'completed') {
      const runId = frontendQuizGameId || streamFrontendQuizGameId || 'local';
      const endedKey = `ytChatEvent:quiz_ended:${runId}`;
      if (sessionStorage.getItem(endedKey) !== '1') {
        sessionStorage.setItem(endedKey, '1');
        void broadcastYouTubeChatEvent(
          'quiz_ended',
          {
            quizTitle: branding.showTitle || '',
          },
          endedKey
        );
        void broadcastTelegramEvent(
          'quiz_ended',
          {
            quizTitle: branding.showTitle || '',
          },
          endedKey
        );
      }

      if (viewerLeaderboardWithRanks.length > 0) {
        const topKey = `ytChatEvent:top_scorers:${runId}`;
        if (sessionStorage.getItem(topKey) !== '1') {
          sessionStorage.setItem(topKey, '1');
          void broadcastYouTubeChatEvent(
            'top_scorers',
            {
              top1Name: viewerLeaderboardWithRanks[0]?.userName || '',
              top1Score: viewerLeaderboardWithRanks[0]?.totalScore || '',
              top2Name: viewerLeaderboardWithRanks[1]?.userName || '',
              top2Score: viewerLeaderboardWithRanks[1]?.totalScore || '',
              top3Name: viewerLeaderboardWithRanks[2]?.userName || '',
              top3Score: viewerLeaderboardWithRanks[2]?.totalScore || '',
            },
            topKey
          );
          void broadcastTelegramEvent(
            'top_scorers',
            {
              top1Name: viewerLeaderboardWithRanks[0]?.userName || '',
              top1Score: viewerLeaderboardWithRanks[0]?.totalScore || '',
              top2Name: viewerLeaderboardWithRanks[1]?.userName || '',
              top2Score: viewerLeaderboardWithRanks[1]?.totalScore || '',
              top3Name: viewerLeaderboardWithRanks[2]?.userName || '',
              top3Score: viewerLeaderboardWithRanks[2]?.totalScore || '',
            },
            topKey
          );
        }
      }
    }

    try {
      // Session close handled by lifecycle API; no IndexedDB needed
      endActiveSession();
    } catch (error) {
      console.error('Failed to close quiz session:', error);
    }
  }, [teams, teamScores, viewerLeaderboard, postQuizRunLifecycleEvent, markQuizClosedLifecycle, frontendQuizGameId, streamFrontendQuizGameId, branding.showTitle, broadcastYouTubeChatEvent, broadcastTelegramEvent, persistBackendQuizStateCheckpoint, questionActive, lifecycle.questionPhase]);

  // Handle exit from quiz - cleanup session and navigate back
  const handleExitQuiz = useCallback(async (abortSession: boolean = false) => {
    if (abortSession) {
      const shouldComplete =
        gameEnded ||
        masterTimer.isTimeUp ||
        quizCloseInitiatedRef.current ||
        lifecycleClosedPostedRef.current;
      await closeQuizSessionWithStats(shouldComplete ? 'completed' : 'aborted');
    }
    
    // End the active session (clears sessionStorage)
    endActiveSession();

    // Runtime session identity is intentionally retained during quiz/final pages
    // and only cleared on explicit safe close.
    if (abortSession) {
      clearQuizRuntimeContext();
      setApiFrontendQuizGameId(null);
      clearFinalLeaderboardSnapshot();
      try {
        localStorage.removeItem('quizMirrorView');
        localStorage.removeItem('quizMirrorViewerState');
      } catch {
        // ignore storage failures
      }
    }
    
    // Navigate back to admin
    navigate('/admin');
  }, [navigate, closeQuizSessionWithStats, gameEnded, masterTimer.isTimeUp, clearQuizRuntimeContext]);

  // Handle navigation away - abort session
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Mark session for cleanup on next load
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    if (brandingLoading) return;
    const runId = frontendQuizGameId || streamFrontendQuizGameId;
    if (!runId) return;
    const quizTitle = String(pageTitle || '').trim();
    const channelName = String(branding.channelName || '').trim();
    if (!quizTitle || !channelName) return;
    const key = `ytChatEvent:quiz_started:${runId}`;
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    void broadcastYouTubeChatEvent(
      'quiz_started',
      {
        quizTitle,
        channelName,
        'Channel Name': channelName,
      },
      `quiz_started:${runId}`
    );
    void broadcastTelegramEvent(
      'quiz_started',
      {
        quizTitle,
        channelName,
        'Channel Name': channelName,
      },
      `quiz_started:${runId}`
    );
  }, [gameStarted, gameEnded, frontendQuizGameId, streamFrontendQuizGameId, pageTitle, branding.channelName, brandingLoading, broadcastYouTubeChatEvent, broadcastTelegramEvent]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  };

  // Calculate timer gradient based on remaining time
  const getTimerGradient = () => {
    const totalTime = passChain && passChain.teams.length > 1 ? passedQuestionTimer : timerDuration;
    const percentage = (timer.seconds / totalTime) * 100;

    if (percentage > 60) {
      return 'from-timer-safe via-timer-safe to-timer-safe';
    } else if (percentage > 30) {
      return 'from-timer-warning via-timer-warning to-timer-warning';
    } else {
      return 'from-timer-danger via-timer-danger to-timer-danger';
    }
  };

  const getTimerBarStyle = () => {
    const totalTime = passChain && passChain.teams.length > 1 ? passedQuestionTimer : timerDuration;
    const percentage = (timer.seconds / totalTime) * 100;

    if (percentage > 60) {
      return 'bg-emerald-500';
    } else if (percentage > 30) {
      return 'bg-amber-500';
    } else {
      return 'bg-red-500 animate-pulse';
    }
  };

  // TV Mode: Solid colors without gradients or animations
  const getTimerBarColorTV = () => {
    const totalTime = passChain && passChain.teams.length > 1 ? passedQuestionTimer : timerDuration;
    const percentage = (timer.seconds / totalTime) * 100;

    if (percentage > 60) {
      return 'bg-green-500';
    } else if (percentage > 30) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
    }
  };

  return (
    <>
      {/* Powerplay Fullscreen Flash Animation */}
      <AnimatePresence>
        {powerplayFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] pointer-events-none"
          >
            {/* Lightning flash overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 0.5, 1, 0.3, 0.8, 0],
                backgroundColor: ['hsl(40 100% 50%)', 'hsl(25 100% 60%)', 'hsl(40 100% 50%)']
              }}
              transition={{ duration: 1, times: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1] }}
              className="absolute inset-0 bg-yellow-400"
            />

            {/* Central lightning bolt */}
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: [0, 1.5, 1.2], rotate: [0, 5, 0] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Zap className="w-64 h-64 text-white drop-shadow-[0_0_60px_rgba(255,200,0,1)]" />
            </motion.div>

            {/* POWERPLAY text */}
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, type: "spring" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center mt-48">
                <motion.h1
                  animate={{
                    textShadow: [
                      '0 0 20px rgba(255,200,0,0.8)',
                      '0 0 60px rgba(255,100,0,1)',
                      '0 0 20px rgba(255,200,0,0.8)'
                    ]
                  }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="text-6xl md:text-8xl font-black text-white tracking-wider"
                  style={{ textShadow: '0 0 40px rgba(255,150,0,1), 0 4px 0 rgba(200,100,0,1)' }}
                >
                  ⚡ POWERPLAY ⚡
                </motion.h1>
              </div>
            </motion.div>

            {/* Electric particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0
                }}
                animate={{
                  x: `${20 + Math.random() * 60}%`,
                  y: `${20 + Math.random() * 60}%`,
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                className="absolute w-4 h-4 rounded-full bg-yellow-300 shadow-[0_0_20px_rgba(255,200,0,1)]"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Powerplay End Fullscreen Flash Animation */}
      <AnimatePresence>
        {powerplayEndFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] pointer-events-none"
          >
            {/* Fade out overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.8, 0.5, 0.3, 0],
                backgroundColor: ['hsl(220 20% 20%)', 'hsl(220 30% 15%)', 'hsl(220 20% 10%)']
              }}
              transition={{ duration: 1.2, times: [0, 0.2, 0.5, 0.8, 1] }}
              className="absolute inset-0 bg-slate-800"
            />

            {/* Central lightning bolt fading */}
            <motion.div
              initial={{ scale: 1.2, opacity: 1 }}
              animate={{ scale: [1.2, 0.8, 0], opacity: [1, 0.5, 0] }}
              transition={{ duration: 0.8, ease: "easeIn" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Zap className="w-64 h-64 text-gray-400 drop-shadow-[0_0_30px_rgba(100,100,120,0.5)]" />
            </motion.div>

            {/* POWERPLAY ENDED text */}
            <motion.div
              initial={{ scale: 1, opacity: 1, y: 0 }}
              animate={{ scale: [1, 1.1, 0.9], opacity: [1, 1, 0], y: [0, -20, 50] }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center mt-48">
                <motion.h1
                  animate={{
                    textShadow: [
                      '0 0 20px rgba(100,100,120,0.8)',
                      '0 0 10px rgba(80,80,100,0.5)',
                      '0 0 0px rgba(60,60,80,0)'
                    ]
                  }}
                  transition={{ duration: 1 }}
                  className="text-6xl md:text-8xl font-black text-gray-300 tracking-wider"
                  style={{ textShadow: '0 0 20px rgba(100,100,120,0.5), 0 4px 0 rgba(50,50,60,1)' }}
                >
                  POWERPLAY ENDED
                </motion.h1>
              </div>
            </motion.div>

            {/* Fading particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: `${20 + Math.random() * 60}%`,
                  y: `${20 + Math.random() * 60}%`,
                  scale: 1,
                  opacity: 0.8
                }}
                animate={{
                  x: `${10 + Math.random() * 80}%`,
                  y: `${70 + Math.random() * 20}%`,
                  scale: [1, 0.5, 0],
                  opacity: [0.8, 0.4, 0]
                }}
                transition={{ duration: 1, delay: i * 0.03 }}
                className="absolute w-3 h-3 rounded-full bg-gray-400 shadow-[0_0_10px_rgba(100,100,120,0.5)]"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Floating Decorative Elements */}

      {/* Powerplay Summary Popup */}
      <PowerplaySummary
        isOpen={showPowerplaySummary}
        onClose={() => setShowPowerplaySummary(false)}
        stats={powerplayStats}
      />

      {/* Quiz-only stream management sidebar */}
      <QuizStreamSidebar />

      {/* Pre-Game Countdown */}
      {showPreGameCountdown && (
        <PreGameCountdown
          teams={teams}
          episodeNumber={branding.episodeNumber}
          onComplete={() => {
            setShowPreGameCountdown(false);
            masterTimer.start(masterTimerDuration * 60);
            beginQuizSession();
            void persistBackendQuizStateCheckpoint('quiz_started', {
              gamePhase: 'running',
              questionPhase: 'idle',
              powerplayPhase: 'inactive',
            });
            // Game is already opened from Admin page
            console.log('[Quiz] Game started with ID:', streamFrontendQuizGameId);
            if (getAppMode() === 'backend_scoring' && frontendQuizGameId && isScoringEngineEnabled()) {
              notifyGameOpen({ gameId: frontendQuizGameId, gameTitle: branding.showTitle });
            }
          }}
        />
      )}

      <div className={`min-h-screen bg-background p-1 sm:p-2 lg:p-4 xl:p-6 transition-all duration-300 overflow-auto ${screenFlash ? 'animate-flash-wrong' : ''}`}>
        {/* Fullscreen overlay when question is active */}
        {questionActive && !tvModeEnabled && (
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-10 pointer-events-none" />
        )}
        {/* Header Banner */}
          <div className={`relative z-20 ${tvModeEnabled ? 'bg-primary border-4 border-primary/60 shadow-2xl' : 'bg-primary shadow-md'} text-primary-foreground ${tvModeEnabled ? 'p-2 md:p-3' : 'p-1 sm:p-1.5 md:p-2'} mb-1 sm:mb-2 rounded-lg sm:rounded-xl`}>
          <div className={`grid items-center ${tvModeEnabled ? 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4' : 'grid-cols-[auto_1fr] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-1.5 sm:gap-2'}`}>
            
            {/* LEFT SECTION: Logo + Channel Name + Show Title */}
            <div className={`flex items-center ${tvModeEnabled ? 'gap-3 justify-self-start' : 'gap-1.5 justify-self-start'} min-w-0`}>
              <img
                src={branding.logoUrl || getDefaultLogo()}
                alt={`${branding.showTitle} Logo`}
                className={`${tvModeEnabled ? 'h-16 w-16 md:h-20 md:w-20' : 'h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 lg:h-20 lg:w-20'} object-contain rounded-md sm:rounded-lg ${tvModeEnabled ? 'ring-2 ring-primary-foreground/30 shadow-lg' : 'drop-shadow-md'}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getDefaultLogo();
                }}
              />
              <div className="flex flex-col min-w-0">
                {branding.channelName && (
                  <span className={`${tvModeEnabled ? 'text-xl md:text-2xl tracking-wide' : 'text-[8px] sm:text-[10px] md:text-xs'} font-semibold text-primary-foreground/90 truncate`}>
                    {branding.channelName}
                  </span>
                )}
                <span className={`${tvModeEnabled ? 'text-2xl md:text-3xl tracking-tight' : 'text-[10px] sm:text-xs md:text-sm'} font-bold text-primary-foreground truncate`}>
                  {branding.showTitle}
                </span>
              </div>
            </div>

            {/* CENTER SECTION: Episode Info + Topic */}
            <div className={`flex flex-col items-center justify-self-center ${tvModeEnabled ? 'gap-1' : 'gap-0 sm:gap-0.5'}`}>
              <div className="text-center">
                <div className={`${tvModeEnabled ? 'text-3xl md:text-4xl font-extrabold tracking-tight' : 'text-xs sm:text-sm md:text-base lg:text-lg font-bold'} text-primary-foreground`}>
                  {branding.episodePrefix} #{branding.episodeNumber}
                </div>
                {branding.quizName && (
                  <div className={`${tvModeEnabled ? 'text-xl md:text-2xl mt-1 font-medium' : 'text-[10px] sm:text-xs md:text-sm'} text-primary-foreground/85 truncate max-w-[120px] sm:max-w-none`}>
                    {branding.quizName}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SECTION: Partner Logos Slideshow */}
            {branding.partnerLogos && branding.partnerLogos.length > 0 && (
              <div className={`flex-col items-center ${tvModeEnabled ? 'flex gap-1 justify-self-end' : 'hidden sm:flex gap-0.5 justify-self-end'} min-w-0`}>
                <PartnerLogosSlideshow 
                  logos={branding.partnerLogos} 
                  className={tvModeEnabled ? 'scale-100' : 'opacity-90 scale-75 sm:scale-90'}
                />
                <span className={`${tvModeEnabled ? 'text-sm md:text-base' : 'text-[8px] md:text-[10px]'} text-primary-foreground/70 font-medium tracking-wide`}>
                  powered by
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Save Indicator */}
        <AnimatePresence>
          {showSavedIndicator && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white border border-emerald-400/30"
            >
              <Save className="h-4 w-4" />
              <span className="text-sm font-medium">Game Saved</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-[1920px] w-full mx-auto space-y-1.5 sm:space-y-3 relative z-20">
          <div className="rounded-xl sm:rounded-[1.75rem] border border-border/35 bg-card/95 px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
            <div className="flex flex-wrap items-stretch justify-between gap-1.5 sm:gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 rounded-2xl border-border/30 bg-background/75 px-4 shadow-none"
                  >
                    <X className="h-4 w-4" />
                    Safely Close the App
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Safely Close the App?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will finalize the quiz session and return to the admin panel.
                      If quiz is already closed, status will be marked as ended; otherwise it will be marked aborted. Continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleExitQuiz(true)}>
                      Yes, Safely Close the App
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex flex-wrap items-stretch gap-2 rounded-2xl border border-border/20 bg-background/45 p-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="h-11 w-11 rounded-2xl border-border/30 bg-background/75 shadow-none"
                  title={isFullscreen ? "Exit full screen" : "Enter full screen"}
                >
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open('/quiz/mirror', '_blank', 'noopener,noreferrer,width=480,height=854')}
                  className="h-11 w-11 rounded-2xl border-border/30 bg-background/75 shadow-none"
                  title="Open vertical mirror (for portrait livestream)"
                  aria-label="Open vertical mirror window"
                >
                  <Smartphone className="h-5 w-5" />
                </Button>
                <LanguageSwitcher
                  size="sm"
                  showLabel={true}
                  className="h-11 rounded-2xl border-border/30 bg-background/75 px-4 shadow-none"
                />
              </div>
            </div>
          </div>

          {/* Active Question - Full Width with Enhanced Styling */}
          {questionActive && (
            <motion.div
              ref={questionSectionRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-30"
            >
              <Card className={`p-2 border-2 ${tvModeEnabled ? 'bg-card border-primary/50' : 'border-primary bg-card'}`}>
                <div className="space-y-4">
                  {/* Question Info Bar - Original Team & Pass Count (hidden for now) */}
                  {/* {passChain && (
                    <div className={`flex items-center justify-between p-3 ${tvModeEnabled ? 'bg-gray-900 border border-yellow-500/50' : 'bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 backdrop-blur-sm'} rounded-lg`}>
                      <div className="flex items-center gap-2">
                        <span className={`${tvModeEnabled ? 'text-lg text-yellow-400' : 'text-sm text-muted-foreground'} font-bold`}>Original Team:</span>
                        <Badge className={`${teams[passChain.originalTeam].color} ${tvModeEnabled ? 'text-xl px-4 py-2' : 'text-base px-3 py-1 shadow-sm'} font-bold`}>
                          {teams[passChain.originalTeam].name}
                        </Badge>
                        {powerplayActive && powerplayTeam === passChain.originalTeam && (
                          <Badge className={`${tvModeEnabled ? 'bg-orange-600 text-xl px-4 py-2' : 'bg-orange-500 animate-pulse'} text-white border-0`}>
                            <Zap className={`${tvModeEnabled ? 'w-5 h-5' : 'w-3 h-3'} mr-1`} />
                            POWERPLAY
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`${tvModeEnabled ? 'text-lg text-yellow-400' : 'text-sm text-muted-foreground'} font-bold`}>Passes:</span>
                        <Badge className={`${tvModeEnabled ? 'text-xl px-4 py-2 bg-orange-600' : 'text-base px-3 py-1 bg-amber-500'} text-primary-foreground border-0 font-bold`}>
                          {passChain.teams.length - 1} {passChain.teams.length - 1 === 1 ? 'Pass' : 'Passes'}
                        </Badge>
                      </div>
                    </div>
                  )} */}


                  <div className="space-y-2">
                    <div className={`text-center ${tvModeEnabled ? 'bg-gray-800 border border-border' : 'bg-gray-800 border border-border'} rounded-lg p-2 sm:p-4`}>
                      <div className="flex items-center justify-center gap-1.5 sm:gap-3 mb-2 sm:mb-4 flex-wrap">
                        {currentQuestionDisplayIndex && (
                          <Badge variant="outline" className={`${tvModeEnabled ? 'text-xl px-4 py-2 bg-yellow-500/20 text-yellow-400 border-yellow-500' : 'text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/20 text-primary border-primary/40'}`}>
                            Q{currentQuestionDisplayIndex}
                          </Badge>
                        )}
                        <h2 className={`${tvModeEnabled ? 'text-xl sm:text-2xl md:text-3xl text-white' : 'text-base sm:text-xl md:text-2xl lg:text-3xl text-foreground'} font-extrabold leading-tight`}>{currentQuestion?.text}</h2>
                        {showDifficultyBadge && currentQuestion?.difficulty && (
                          <Badge
                            variant="outline"
                            className={`${tvModeEnabled ? 'text-lg px-4 py-2' : 'text-sm px-3 py-1'} ${currentQuestion.difficulty === 'Easy'
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : currentQuestion.difficulty === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                : 'bg-red-100 text-red-800 border-red-300'
                              }`}
                          >
                            {currentQuestion.difficulty}
                          </Badge>
                        )}
                      </div>

                      {passChain && passChain.teams.length > 1 && (
                        <div className={`flex items-center justify-center gap-2 ${tvModeEnabled ? 'text-lg' : 'text-sm'} text-muted-foreground mb-4 p-3 ${tvModeEnabled ? 'bg-orange-900/50 border border-orange-500/50' : 'bg-amber-500/15 border border-amber-500/30'} rounded-lg`}>
                          <span className={`font-bold ${tvModeEnabled ? 'text-yellow-400' : 'text-foreground'}`}>Pass Chain:</span>
                          {passChain.teams.map((teamIndex, i) => (
                            <div key={teamIndex} className="flex items-center gap-1">
                              <Badge
                                variant={teamIndex === passChain.currentTeam ? "default" : "outline"}
                                className={`${tvModeEnabled ? 'text-lg px-3 py-1' : ''} font-bold ${teamIndex === passChain.currentTeam ? tvModeEnabled ? "ring-2 ring-yellow-400" : "ring-2 ring-primary shadow-md" : ""}`}
                              >
                                {teams[teamIndex].name}
                              </Badge>
                              {i < passChain.teams.length - 1 && <ArrowRight className={`${tvModeEnabled ? 'h-5 w-5' : 'h-3 w-3'} text-amber-500`} />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Question Timer Bar - Hidden during Powerplay */}
                    {!powerplayActive && (
                      <div className={`relative ${tvModeEnabled ? 'h-6' : 'h-4'} ${tvModeEnabled ? 'bg-gray-800 border border-yellow-500/30' : 'bg-muted/50 border border-border/30'} rounded-full overflow-hidden`}>
                        <motion.div
                          className={`h-full rounded-full ${tvModeEnabled ? getTimerBarColorTV() : getTimerBarStyle()}`}
                          initial={{ width: '100%' }}
                          animate={{
                            width: `${(timer.seconds / (passChain && passChain.teams.length > 1 ? passedQuestionTimer : timerDuration)) * 100}%`
                          }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`${tvModeEnabled ? 'text-xl font-black text-white' : 'text-sm font-extrabold text-foreground bg-background/30'} px-2 py-0.5 rounded`}>
                            {timer.seconds}s
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Question Content - Image + Options Layout */}
                    <div className={`${currentQuestion?.image ? 'flex flex-col lg:flex-row gap-6 items-start' : ''}`}>
                      {/* Question Image - Left Side */}
                      {currentQuestion?.image && (
                        <div className="lg:w-1/2 flex-shrink-0">
                          <div className={`rounded-lg overflow-hidden ${tvModeEnabled ? 'border-2 border-yellow-500' : 'border border-border shadow-md'}`}>
                            <img
                              src={currentQuestion.image}
                              alt="Question image"
                              className={`w-full h-auto ${tvModeEnabled ? 'max-h-[500px]' : 'max-h-[400px]'} object-contain bg-muted`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Multiple Choice Options - Right Side (or Full Width if no image) */}
                      <div className={`${currentQuestion?.image ? 'lg:w-1/2' : 'w-full'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 px-1 sm:px-2">
                          {(shuffleMap ? shuffleMap.shuffledOptions : currentQuestion?.options ?? []).map((option, displayIndex) => {
                            const originalIndex = shuffleMap ? shuffleMap.shuffledIndices[displayIndex] : displayIndex;
                            const label = shuffleMap ? shuffleMap.labels[displayIndex] : String.fromCharCode(65 + displayIndex);
                            const isCorrect = currentQuestion ? originalIndex === currentQuestion.correctAnswer : false;
                            const isSelected = selectedAnswer === originalIndex;
                            const isRevealing = showCountdown;
                            const isRevealed = showRevealAnimation;
                            const shouldDarken = isRevealed && !isCorrect;
                            const shouldHighlightCorrect = isRevealed && isCorrect;

                            // Determine animation state
                            let animationClass = "";
                            if (!tvModeEnabled) {
                              if (isRevealing) {
                                animationClass = "animate-[reveal-glow-rotate_0.3s_ease-in-out_infinite,reveal-blink_0.2s_ease-in-out_infinite]";
                              } else if (shouldHighlightCorrect) {
                                animationClass = "animate-[reveal-correct-glow_1s_ease-out]";
                              }
                            }

                            // Build button classes - TV Mode: solid colors, no gradients/shadows
                            let buttonStyle = `w-full text-left justify-start whitespace-normal font-bold transition-all duration-300 rounded-md border-2 ${tvModeEnabled ? 'min-h-[5rem]' : ''} `;

                            if (isRevealed) {
                              if (isCorrect) {
                                buttonStyle += tvModeEnabled
                                  ? "bg-green-600 border-green-400 text-white scale-[1.02] "
                                  : "bg-emerald-600/90 border-emerald-400 text-white shadow-[0_0_30px_hsl(142_70%_45%/0.6)] scale-[1.02] ";
                              } else if (isSelected) {
                                buttonStyle += tvModeEnabled
                                  ? "bg-red-800 border-red-500 text-red-200 opacity-60 "
                                  : "bg-red-800/80 border-red-500 text-red-200 opacity-60 ";
                              } else {
                                buttonStyle += tvModeEnabled
                                  ? "bg-gray-800 border-gray-600 text-gray-500 opacity-40 "
                                  : "bg-secondary/40 border-border/30 text-muted-foreground/50 opacity-40 ";
                              }
                            } else if (isRevealing) {
                              buttonStyle += tvModeEnabled
                                ? "bg-gray-700 border-yellow-500 text-white "
                                : "bg-secondary/60 border-primary/50 text-foreground ";
                            } else if (isSelected) {
                              buttonStyle += tvModeEnabled
                                ? "bg-yellow-600 border-yellow-400 text-black ring-2 ring-yellow-300 "
                                : "bg-primary/30 border-primary text-foreground ring-2 ring-primary/50 ";
                            } else {
                              buttonStyle += tvModeEnabled
                                ? "bg-gray-800 border-yellow-500/50 text-white hover:bg-gray-700 hover:border-yellow-400 "
                                : "bg-secondary/50 border-border/40 text-foreground hover:bg-secondary/70 hover:border-primary/50 ";
                            }

                            return (
                              <motion.div
                                key={displayIndex}
                                className={animationClass}
                                animate={shouldHighlightCorrect ? {
                                  scale: [1, 1.03, 1],
                                } : {}}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              >
                                <Button
                                  onClick={() => handleAnswerSelect(displayIndex)}
                                  disabled={false}
                                  variant="ghost"
                                  className={`${buttonStyle} h-auto min-h-[3rem] sm:min-h-[4rem] py-1.5 sm:py-2 px-2 sm:px-3`}
                                >
                                  <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                                    <span className="font-black text-base sm:text-xl md:text-2xl flex-shrink-0 w-7 sm:w-10">
                                      {label}.
                                    </span>
                                    <span className="flex-1 text-sm sm:text-xl md:text-2xl lg:text-3xl font-bold leading-tight">{option}</span>
                                    {shouldHighlightCorrect && (
                                      <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        className="flex items-center gap-1 flex-shrink-0"
                                      >
                                        <CheckCircle className="h-8 w-8 text-white" />
                                      </motion.div>
                                    )}
                                    {isSelected && !isCorrect && isRevealed && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex-shrink-0"
                                      >
                                        <XCircle className="h-7 w-7 text-red-300" />
                                      </motion.div>
                                    )}
                                  </div>
                                </Button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    {/* Control Buttons - Enhanced with Gradients */}
                    <div className="flex justify-center gap-2 sm:gap-4 pt-2 sm:pt-4 flex-wrap">
                      {/* Verify Answer, Change Answer & Reveal Answer - Show after selection */}
                      {selectedAnswer !== null && !showCountdown && !showRevealAnimation && (
                        <>
                          {/* Verify Answer Result Indicator */}
                          {verifyAnswerResult && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${verifyAnswerResult === 'correct'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                                }`}
                            >
                              {verifyAnswerResult === 'correct' ? (
                                <>
                                  <CheckCircle className="h-5 w-5" />
                                  <span>Correct!</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-5 w-5" />
                                  <span>Wrong!</span>
                                </>
                              )}
                            </motion.div>
                          )}

                          {/* Verify Answer Button - Only before verify is used */}
                          {!verifyAnswerUsed && (
                            <motion.div
                              initial={tvModeEnabled ? {} : { scale: 0, opacity: 0 }}
                              animate={tvModeEnabled ? {} : { scale: 1, opacity: 1 }}
                              transition={tvModeEnabled ? {} : { type: "spring", stiffness: 200 }}
                            >
                              <Button
                                onClick={handleVerifyAnswer}
                                className={tvModeEnabled
                                  ? "bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-400 text-xl px-6 py-3 relative overflow-hidden"
                                  : "bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 hover:from-sky-600 hover:via-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/30 border-0 relative overflow-hidden ring-2 ring-sky-300/50 animate-[pulse_2s_ease-in-out_infinite]"}
                                size="lg"
                                disabled={!timer.isTimeUp || powerplayActive || (passChain && teamLifelines[passChain.currentTeam] <= 0)}
                                title={!timer.isTimeUp ? "Available after timer runs out" : teamLifelines[passChain?.currentTeam ?? 0] <= 0 ? "No lifelines remaining" : ""}
                              >
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                <ShieldCheck className={tvModeEnabled ? "h-6 w-6 mr-2" : "h-5 w-5 mr-2 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"} />
                                <span className="flex items-center gap-1">
                                  ⚡ Verify Answer {!timer.isTimeUp && `(${timer.seconds}s)`}
                                </span>
                              </Button>
                            </motion.div>
                          )}

                          {/* Change Answer Button - Only after verify is used */}
                          {verifyAnswerUsed && (
                            <motion.div
                              initial={tvModeEnabled ? {} : { scale: 0, opacity: 0 }}
                              animate={tvModeEnabled ? {} : { scale: 1, opacity: 1 }}
                              transition={tvModeEnabled ? {} : { type: "spring", stiffness: 200 }}
                            >
                              <Button
                                onClick={handleChangeAnswerAfterVerify}
                                className={tvModeEnabled
                                  ? "bg-amber-600 hover:bg-amber-700 text-white border-2 border-amber-400 text-xl px-6 py-3"
                                  : "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600 text-white shadow-lg shadow-orange-500/30 border-0"}
                                size="lg"
                              >
                                <Shuffle className={tvModeEnabled ? "h-6 w-6 mr-2" : "h-4 w-4 mr-2"} />
                                Change Answer
                              </Button>
                            </motion.div>
                          )}

                          <motion.div
                            initial={tvModeEnabled ? {} : { scale: 0, opacity: 0 }}
                            animate={tvModeEnabled ? {} : { scale: 1, opacity: 1 }}
                            transition={tvModeEnabled ? {} : { type: "spring", stiffness: 200, delay: 0.1 }}
                          >
                            <Button
                              onClick={handleRevealAnswer}
                              className={tvModeEnabled
                                ? "bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-400 text-xl px-6 py-3"
                                : "bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500 hover:from-purple-600 hover:via-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 border-0"}
                              size="lg"
                            >
                              <Award className={tvModeEnabled ? "h-6 w-6 mr-2" : "h-4 w-4 mr-2"} />
                              Reveal Answer
                            </Button>
                          </motion.div>
                        </>
                      )}

                      {/* Grace wait indicator after reveal while late in-flight answers are accepted */}
                      {selectedAnswer !== null && !showCountdown && showRevealAnimation && isGraceWaiting && (
                        <motion.div
                          initial={tvModeEnabled ? {} : { scale: 0, opacity: 0 }}
                          animate={tvModeEnabled ? {} : { scale: 1, opacity: 1 }}
                          transition={tvModeEnabled ? {} : { type: "spring", stiffness: 200 }}
                        >
                          <Button
                            disabled
                            className={tvModeEnabled
                              ? "bg-blue-700 text-white border-2 border-blue-400 text-xl px-6 py-3"
                              : "bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500 text-white shadow-lg border-0"}
                            size="lg"
                          >
                            <Loader2 className={tvModeEnabled ? "h-6 w-6 mr-2 animate-spin" : "h-5 w-5 mr-2 animate-spin"} />
                            Collecting late answers... {Math.max(1, Math.ceil(graceRemainingMs / 1000))}s
                          </Button>
                        </motion.div>
                      )}

                      {/* Correct/Wrong Buttons - only after reveal countdown and grace window */}
                      {selectedAnswer !== null && !showCountdown && showRevealAnimation && !isGraceWaiting && (
                        <>
                          <motion.div
                            initial={tvModeEnabled ? {} : { scale: 0, opacity: 0 }}
                            animate={tvModeEnabled ? {} : { scale: 1, opacity: 1 }}
                            transition={tvModeEnabled ? {} : { type: "spring", stiffness: 200 }}
                          >
                            <Button
                              onClick={handleCorrectAnswer}
                              className={tvModeEnabled
                                ? "bg-green-600 hover:bg-green-700 text-white border-2 border-green-400 text-xl px-6 py-3"
                                : "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white shadow-lg shadow-green-500/30 border-0"}
                              size="lg"
                              disabled={selectedAnswer !== currentQuestion?.correctAnswer}
                            >
                              <CheckCircle className={tvModeEnabled ? "h-6 w-6 mr-2" : "h-4 w-4 mr-2"} />
                              Correct (+{correctAnswerScore})
                            </Button>
                          </motion.div>
                          <motion.div
                            initial={tvModeEnabled ? {} : { scale: 0, opacity: 0 }}
                            animate={tvModeEnabled ? {} : { scale: 1, opacity: 1 }}
                            transition={tvModeEnabled ? {} : { type: "spring", stiffness: 200, delay: 0.1 }}
                          >
                            <Button
                              onClick={handleWrongAnswer}
                              className={tvModeEnabled
                                ? "bg-red-600 hover:bg-red-700 text-white border-2 border-red-400 text-xl px-6 py-3"
                                : "bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 hover:from-red-600 hover:via-rose-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/30 border-0"}
                              size="lg"
                              disabled={selectedAnswer === currentQuestion?.correctAnswer}
                            >
                              <XCircle className={tvModeEnabled ? "h-6 w-6 mr-2" : "h-4 w-4 mr-2"} />
                              Wrong (-{wrongAnswerPenalty})
                            </Button>
                          </motion.div>
                        </>
                      )}
                      {/* Pass Button - Hidden during Powerplay */}
                      {!powerplayActive && (
                        <Button
                          onClick={handlePassAnswer}
                          className={tvModeEnabled
                            ? "bg-orange-600 hover:bg-orange-700 text-white border-2 border-orange-400 text-xl px-6 py-3"
                            : "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600 text-white shadow-lg shadow-orange-500/30 border-0"}
                          size="lg"
                          disabled={selectedAnswer !== null}
                        >
                          <ArrowRight className={tvModeEnabled ? "h-6 w-6 mr-2" : "h-4 w-4 mr-2"} />
                          Pass
                        </Button>
                      )}

                      {/* Skip Button - Only during Powerplay */}
                      {powerplayActive && (
                        <Button
                          onClick={handleSkipQuestion}
                          className={tvModeEnabled
                            ? "bg-teal-600 hover:bg-teal-700 text-white border-2 border-teal-400 text-xl px-6 py-3"
                            : "bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-600 hover:via-teal-600 hover:to-emerald-600 text-white shadow-lg shadow-teal-500/30 border-0"}
                          size="lg"
                          disabled={selectedAnswer !== null || showRevealAnimation}
                        >
                          <SkipForward className={tvModeEnabled ? "h-6 w-6 mr-2" : "h-4 w-4 mr-2"} />
                          Skip Question
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          if (timer.isRunning) timer.stop();
                          else timer.start(timer.seconds);
                        }}
                        className={tvModeEnabled
                          ? "bg-gray-600 hover:bg-gray-700 text-white border-2 border-gray-400 text-xl px-6 py-3"
                          : "bg-gradient-to-r from-slate-500 via-gray-500 to-zinc-500 hover:from-slate-600 hover:via-gray-600 hover:to-zinc-600 text-white shadow-lg shadow-gray-500/20 border-0"}
                        size="lg"
                        disabled={quizCloseInProgress || !masterTimer.isRunning || selectedAnswer !== null || showRevealAnimation || powerplayActive}
                      >
                        {timer.isRunning ? <Pause className={tvModeEnabled ? "mr-2 h-6 w-6" : "mr-2 h-4 w-4"} /> : <Play className={tvModeEnabled ? "mr-2 h-6 w-6" : "mr-2 h-4 w-4"} />}
                        Timer
                      </Button>
                      <Button
                        onClick={() => {
                          if (passChain && passChain.teams.length > 1) {
                            toast({ title: "Cannot Change", description: "Cannot change question for passed questions.", variant: "destructive" });
                            return;
                          }
                          const currentTeam = passChain?.currentTeam ?? currentTeamIndex;
                          if (teamLifelines[currentTeam] <= 0) {
                            toast({ title: "No Lifelines", description: "This team has no lifelines remaining.", variant: "destructive" });
                            return;
                          }
                          // Deduct lifeline
                          const newLifelines = [...teamLifelines];
                          newLifelines[currentTeam] = Math.max(0, newLifelines[currentTeam] - 1);
                          setTeamLifelines(newLifelines);
                          localStorage.setItem("teamLifelinesState", JSON.stringify(newLifelines));

                          // Apply penalty
                          const newScores = [...teamScores];
                          newScores[currentTeam] = Math.max(0, newScores[currentTeam] - lifelinePenalty);
                          setTeamScores(newScores);

                          // Save the current team before ending question
                          setChangeQuestionTeam(currentTeam);
                          setChangeQuestionMode(true);

                          // Close current question
                          closeQuestion();
                          setCurrentQuestion(null);
                          setPassChain(null);
                          setSelectedAnswer(null);
                          setScreenFlash(false);
                          resetReveal();
                          timer.reset();
                          closeQuestion();

                          toast({ title: "Change Question", description: `Lifeline used. Choose another question from the grid below.` });
                        }}
                        className={tvModeEnabled
                          ? "bg-yellow-600 hover:bg-yellow-700 text-white border-2 border-yellow-400 text-xl px-6 py-3 relative overflow-hidden"
                          : "bg-yellow-500 hover:bg-yellow-600 text-primary-foreground border-0 relative overflow-hidden ring-2 ring-yellow-300/50 animate-[pulse_2s_ease-in-out_infinite]"}
                        size="lg"
                        disabled={(passChain && passChain.teams.length > 1) || selectedAnswer !== null || showRevealAnimation || powerplayActive || teamLifelines[passChain?.currentTeam ?? currentTeamIndex] <= 0}
                        title={teamLifelines[passChain?.currentTeam ?? currentTeamIndex] <= 0 ? "No lifelines remaining" : ""}
                      >
                        <span className="absolute inset-0 bg-transparent pointer-events-none" />
                        <Shuffle className={tvModeEnabled ? "h-6 w-6 mr-2" : "h-5 w-5 mr-2 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"} />
                        <span className="flex items-center gap-1">
                          🔄 Change Question
                        </span>
                      </Button>
                    </div>
{/* YouTube Live Panel - Only in mixed/online modes and when not in powerplay */}
                    {appModeSupportsViewers && youtubeIntegrationEnabled && youtubePanelVisible && !powerplayActive && (
                      <div className="mt-4">
                        <YouTubeLivePanel
                          quizStartToken={quizStartToken}
                          isAnswerRevealed={showRevealAnimation}
                          correctAnswer={currentQuestion?.correctAnswer ?? null}
                          correctLabel={shuffleMap?.correctLabel ?? null}
                          labelToOriginalIndex={shuffleMap?.labelToOriginalIndex ?? null}
                          questionActive={questionActive}
                          questionId={questionIdForPanel ?? undefined}
                          questionIndex={currentBackendQuestionIndex}
                          questionOpenTime={questionOpenTime}
                          questionCloseTime={questionCloseTime}
                          onLeaderboardUpdate={backend.appMode === 'backend_scoring' ? mergeCumulativeViewerLeaderboard : undefined}
                          onQuestionFinalized={backend.appMode === 'frontend_scoring' ? handleViewerQuestionFinalized : undefined}
                          cumulativeLeaderboard={viewerLeaderboard}
                          onTeamSupporterCountsUpdate={setTeamSupporterCounts}
                          onResponsesUpdate={setViewerResponses}
                          onSSEStatusUpdate={(status, isConnected) => {
                            setSSEStatus(status);
                            setSSEIsConnected(isConnected);
                          }}
                          isPowerplayActive={powerplayActive}
                          maskResponses={maskViewerResponses}
                          onHide={() => setYoutubePanelVisible(false)}
                          onPredictionUpdate={(pred) => {
                            if (predictionsLocked) return;
                            setViewerPredictions(prev => {
                              const next = new Map(prev);
                              next.set(pred.odytChannelId, {
                                ...pred,
                                predictedAt: Date.now(),
                              });
                              return next;
                            });
                          }}
                          onEmojiReaction={(reaction) => {
                            const newReaction: EmojiReaction = {
                              id: `emoji-${emojiIdCounter.current++}`,
                              emoji: reaction.emoji,
                              userName: reaction.userName,
                              x: 10 + Math.random() * 80,
                            };
                            setEmojiReactions(prev => [...prev.slice(-29), newReaction]);
                          }}
                        />
                      </div>
                    )}

{/* Show YouTube Panel Button when hidden (only in non-powerplay, viewer-supporting modes) */}
                    {appModeSupportsViewers && youtubeIntegrationEnabled && !youtubePanelVisible && !powerplayActive && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setYoutubePanelVisible(true)}
                          className="gap-2"
                        >
                          <Youtube className="h-4 w-4 text-destructive" />
                          Show YouTube Panel
                        </Button>
                      </div>
                    )}

                    {/* Ticker Message */}
                    {tickerEnabled && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                       className={`mt-4 px-4 py-3 rounded-lg border-2 relative overflow-hidden
      ${powerplayActive
                            ? "bg-primary/15 border-primary/40"
                            : "bg-primary/15 border-primary/40"
                          }`}
                      >

                        <div className="flex items-center gap-3 relative z-10 overflow-hidden w-full">

                          {/* Message */}
                          <motion.p
                            className="text-base font-bold truncate"
                          >
                            {powerplayActive ? tickerMessagePowerplay : tickerMessageRegular}
                          </motion.p>


                          {/* Status indicators — right aligned */}
                          <div className="ml-auto flex items-center gap-3 flex-shrink-0">

                            {/* POWER PLAY indicator */}
                            <div className="flex items-center gap-2">
                              {/* Amber dot — ONLY during powerplay */}
                              {powerplayActive && (
                                <motion.span
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                                  transition={{ duration: 0.9, repeat: Infinity }}
                                  className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
                                />
                              )}

                              {/* POWER PLAY pill */}
                              <motion.div
                                animate={
                                  powerplayActive
                                    ? { opacity: [0.8, 1, 0.8] }
                                    : { opacity: 0.4 }
                                }
                                transition={
                                  powerplayActive
                                    ? { duration: 1.2, repeat: Infinity }
                                    : { duration: 0 }
                                }
                                className={`px-2 py-0.5 rounded-sm text-xs font-black tracking-wide shadow-md
        ${powerplayActive
                                    ? "bg-amber-500 text-black"
                                    : "bg-muted text-muted-foreground"
                                  }`}
                              >
                                POWER PLAY
                              </motion.div>
                            </div>

                            {/* LIVE indicator */}
                            <div className="flex items-center gap-2">
                              {/* Red dot — ONLY during non-powerplay */}



                              {/* LIVE pill */}
                              <motion.div
                                animate={
                                  powerplayActive
                                    ? { opacity: 0.4 }
                                    : { opacity: [0.8, 1, 0.8] }
                                }
                                transition={
                                  powerplayActive
                                    ? { duration: 0 }
                                    : { duration: 1.2, repeat: Infinity }
                                }
                                className={`px-2 py-0.5 rounded-sm text-xs font-black tracking-wide shadow-md
        ${powerplayActive
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-red-600 text-white"
                                  }`}
                              >
                                LIVE
                              </motion.div>
                            </div>

                          </div>

                        </div>


                      </motion.div>
                    )}

                    {showYouTubeAutoPostPanel && (youtubeChatBroadcastState.sending || youtubeChatBroadcastState.result) && (
                      <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Youtube className="h-4 w-4 text-rose-500" />
                            YouTube Chat Auto-Post
                          </div>
                          {youtubeChatBroadcastState.sending ? (
                            <Badge variant="secondary" className="gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Sending...
                            </Badge>
                          ) : youtubeChatBroadcastState.result?.queued ? (
                            <Badge variant="secondary" className="gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Queued for delivery
                            </Badge>
                          ) : youtubeChatBroadcastState.result?.skipped ? (
                            <Badge variant="outline">
                              Not sent
                            </Badge>
                          ) : youtubeChatBroadcastState.result?.success ? (
                            <Badge className="bg-emerald-600 text-white">
                              Sent to {youtubeChatBroadcastState.result.sentCount || 0} stream(s)
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Send failed
                            </Badge>
                          )}
                          {youtubeChatBroadcastState.result?.queued && youtubeChatBroadcastState.result?.partCount ? (
                            <Badge variant="outline">
                              {youtubeChatBroadcastState.result.partCount} part{youtubeChatBroadcastState.result.partCount === 1 ? '' : 's'}
                            </Badge>
                          ) : null}
                          {youtubeChatBroadcastState.result?.failedCount ? (
                            <Badge variant="outline">
                              Failed: {youtubeChatBroadcastState.result.failedCount}
                            </Badge>
                          ) : null}
                        </div>

                        {youtubeChatBroadcastState.result?.results?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {youtubeChatBroadcastState.result.results.map((item) => (
                              <span key={`${item.streamId}-${item.status}`} className="rounded-full border px-2 py-1">
                                {item.title || item.streamId}: {item.status}{item.error ? ` (${item.error})` : ''}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {youtubeChatBroadcastState.result?.error ? (
                          <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                            <span>{youtubeChatBroadcastState.result.error}</span>
                            {youtubeChatBroadcastState.result.reason === 'auth_required' ? (
                              <button
                                type="button"
                                className="ml-2 underline underline-offset-2 hover:no-underline"
                                onClick={() => {
                                  try {
                                    window.open(buildQuizAuthStartUrl('/admin'), 'shared-auth', 'width=720,height=780');
                                  } catch {}
                                }}
                              >
                                Sign in again
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {youtubeChatBroadcastState.result?.messageText ? (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Manual fallback message</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(youtubeChatBroadcastState.result?.messageText || '');
                                  toast({ title: 'Copied fallback message', description: 'Paste it into YouTube live chat manually if needed.' });
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy
                              </Button>
                            </div>
                            <pre className="whitespace-pre-wrap break-words rounded-md bg-background p-3 text-xs">
                              {youtubeChatBroadcastState.result.messageText}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    )}



                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          <div className="rounded-xl sm:rounded-[1.75rem] border border-border/35 bg-card/95 p-1.5 sm:p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85">
            <div className="flex flex-wrap items-stretch gap-1.5 sm:gap-2 xl:flex-nowrap">
              <div className="grid min-w-0 flex-1 gap-1.5 sm:gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(320px,max-content)_max-content]">
                {tvModeEnabled ? (
                  <div className={`flex h-[72px] lg:w-fit items-center justify-between rounded-[1.35rem] border border-border/25 bg-background/75 px-3.5 ${masterTimer.seconds <= 10 && masterTimer.seconds > 0 ? "ring-2 ring-timer-danger/70" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          Master Timer
                        </div>
                        <div className={`font-mono text-3xl font-black ${masterTimer.seconds <= 10 && masterTimer.seconds > 0 ? 'text-timer-danger' : 'text-foreground'}`}>
                          {formatTime(masterTimer.seconds)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          if (masterTimer.isRunning) {
                            masterTimer.stop();
                            if (timer.isRunning) timer.stop();
                          } else {
                            masterTimer.start(masterTimer.seconds);
                            if (questionActive && timer.seconds > 0) timer.start(timer.seconds);
                          }
                        }}
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-2xl border-border/30 bg-background/85 shadow-none"
                        disabled={quizCloseInProgress}
                      >
                        {masterTimer.isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            className="h-11 rounded-2xl border border-red-500/40 bg-red-600 px-4 text-sm font-semibold text-white shadow-none hover:bg-red-700"
                            disabled={gameEnded || quizCloseInProgress}
                          >
                            <Trophy className="mr-2 h-4 w-4" />
                            End the Quiz
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-xl border-red-500/30 bg-gradient-to-b from-background via-background to-red-500/5">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black tracking-tight text-center">End the Quiz Now?</AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-muted-foreground">
                              This will immediately move to final countdown and close the active question.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-red-300">
                              <Trophy className="h-4 w-4" />
                              Finalization Action
                            </div>
                            <p className="mt-1 text-red-100/90">
                              Timer will be set to 5 seconds and the quiz will end.
                            </p>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 text-white hover:bg-red-700"
                              onClick={() => {
                                quizCloseInitiatedRef.current = true;
                                try {
                                  localStorage.setItem('quizEndingAt', String(Date.now()));
                                  localStorage.setItem('quizEndingDurationSec', '5');
                                } catch { /* ignore */ }
                                void markQuizClosedLifecycle();
                                if (questionActive && getAppMode() === 'backend_scoring' && frontendQuizGameId && isScoringEngineEnabled()) {
                                  const qIdx = sessionStorage.getItem('currentQuestionIndex');
                                  notifyQuestionClose({
                                    gameId: frontendQuizGameId,
                                    questionIndex: parseInt(qIdx || '0', 10),
                                    closedAt: Date.now(),
                                  });
                                }
                                masterTimer.start(5); closeQuestion(); timer.stop();
                              }}
                            >
                              Yes, End the Quiz
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ) : (
                  <div className={`flex h-14 sm:h-[72px] lg:w-fit items-center justify-between rounded-xl sm:rounded-[1.35rem] border border-border/25 bg-background/75 px-2 sm:px-3.5 ${masterTimer.seconds <= 10 && masterTimer.seconds > 0 ? 'ring-2 ring-timer-danger/70' : ''}`}>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className={`hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl ${masterTimer.seconds <= 10 && masterTimer.seconds > 0 ? 'bg-red-500/15 text-timer-danger' : 'bg-primary/12 text-primary'}`}>
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          Master Timer
                        </div>
                        <div className={`font-mono text-lg sm:text-2xl font-black ${masterTimer.seconds <= 10 && masterTimer.seconds > 0 ? 'text-timer-danger' : 'text-foreground'}`}>
                          {formatTime(masterTimer.seconds)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Button
                        onClick={() => {
                          if (masterTimer.isRunning) {
                            masterTimer.stop();
                            if (timer.isRunning) timer.stop();
                          } else {
                            masterTimer.start(masterTimer.seconds);
                            if (questionActive && timer.seconds > 0) timer.start(timer.seconds);
                          }
                        }}
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl border-border/30 bg-background/85 shadow-none"
                        disabled={quizCloseInProgress}
                      >
                        {masterTimer.isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            className="h-9 sm:h-11 rounded-xl sm:rounded-2xl border border-red-500/40 bg-red-600 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow-none hover:bg-red-700"
                            disabled={gameEnded || quizCloseInProgress}
                          >
                            <Trophy className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">End the Quiz</span><span className="sm:hidden">End</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-xl border-red-500/30 bg-gradient-to-b from-background via-background to-red-500/5">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black tracking-tight text-center">End the Quiz Now?</AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-muted-foreground">
                              This will immediately move to final countdown and close the active question.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-red-300">
                              <Trophy className="h-4 w-4" />
                              Finalization Action
                            </div>
                            <p className="mt-1 text-red-100/90">
                              Timer will be set to 5 seconds and the quiz will end.
                            </p>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 text-white hover:bg-red-700"
                              onClick={() => {
                                quizCloseInitiatedRef.current = true;
                                try {
                                  localStorage.setItem('quizEndingAt', String(Date.now()));
                                  localStorage.setItem('quizEndingDurationSec', '5');
                                } catch { /* ignore */ }
                                void markQuizClosedLifecycle();
                                if (questionActive && getAppMode() === 'backend_scoring' && frontendQuizGameId && isScoringEngineEnabled()) {
                                  const qIdx = sessionStorage.getItem('currentQuestionIndex');
                                  notifyQuestionClose({
                                    gameId: frontendQuizGameId,
                                    questionIndex: parseInt(qIdx || '0', 10),
                                    closedAt: Date.now(),
                                  });
                                }
                                masterTimer.start(5); closeQuestion(); timer.stop();
                              }}
                            >
                              Yes, End the Quiz
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}

                <div className={`flex h-14 sm:h-[72px] w-full sm:w-fit min-w-[140px] sm:min-w-[196px] items-center justify-between rounded-xl sm:rounded-[1.35rem] border border-border/25 bg-background/75 px-2 sm:px-3.5 ${questionActive ? "ring-2 ring-primary/50" : ""}`}>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Users className={tvModeEnabled ? "h-6 w-6" : "h-5 w-5"} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Now Playing
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${teams[currentTeamIndex].color} rounded-lg sm:rounded-xl px-2 sm:px-4 py-1 sm:py-1.5 text-sm sm:text-base font-extrabold shadow-none`}>
                          {teams[currentTeamIndex].name}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-stretch gap-1.5 sm:gap-2 xl:w-auto xl:max-w-[700px] xl:flex-1 xl:justify-start">
                {powerplayActive ? (
                  <div className="flex h-14 sm:h-[72px] min-w-[120px] sm:min-w-[148px] flex-1 items-center justify-between rounded-xl sm:rounded-[1.35rem] border border-orange-500/30 bg-orange-500/12 px-2 sm:px-3.5 xl:max-w-[160px] xl:flex-none">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-500/80">
                          Power Play
                        </div>
                        <div className="font-mono text-2xl font-black text-orange-500">
                          {formatTime(powerplayTimer.seconds)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <Button
                  onClick={startPowerplay}
                  disabled={
                    powerplayUsed[currentTeamIndex] ||
                    powerplayActive ||
                    questionActive ||
                    !gameStarted ||
                    gameEnded
                  }
                  className={`h-14 sm:h-[72px] min-w-[120px] sm:min-w-[148px] flex-1 rounded-xl sm:rounded-[1.35rem] border px-2 sm:px-3.5 shadow-none xl:max-w-[160px] xl:flex-none ${powerplayUsed[currentTeamIndex]
                    ? "border-border/25 bg-background/55 text-muted-foreground hover:bg-background/55"
                    : "border-orange-500/35 bg-orange-500/92 text-white hover:bg-orange-600"
                  }`}
                >
                  <div className="flex w-full items-center justify-center gap-2">
                    <Zap className="h-5 w-5" />
                    <span className="text-sm font-bold uppercase tracking-[0.16em]">Power Play</span>
                  </div>
                </Button>

                <div className="flex h-14 sm:h-[72px] min-w-[120px] sm:min-w-[148px] flex-1 items-center justify-between rounded-xl sm:rounded-[1.35rem] border border-border/25 bg-background/75 px-2 sm:px-3.5 xl:max-w-[156px] xl:flex-none">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Admin Score
                      </div>
                      <div className="text-2xl font-black text-foreground">{quizMasterScore}</div>
                    </div>
                  </div>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-14 sm:h-[72px] min-w-[120px] sm:min-w-[148px] flex-1 rounded-xl sm:rounded-[1.35rem] border border-border/25 bg-background/75 px-2 sm:px-3.5 shadow-none xl:max-w-[176px] xl:flex-none"
                    >
                      <div className="flex w-full items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${musicPlaying ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {musicPlaying ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              Audio
                            </div>
                            <div className="text-base font-bold text-foreground">{Math.round(volume * 100)}%</div>
                          </div>
                        </div>
                        <div className="text-right text-xs font-medium text-muted-foreground">
                          {musicPlaying ? "On" : "Muted"}
                        </div>
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 rounded-2xl border border-border/40 bg-card/95 p-4 backdrop-blur">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">Audio Controls</div>
                        <div className="text-xs text-muted-foreground">
                          Adjust quiz sound level and background music from one place.
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Volume</span>
                          <span className="font-semibold text-foreground">{Math.round(volume * 100)}%</span>
                        </div>
                        <Slider
                          value={[Math.round(volume * 100)]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(values) => {
                            const [next = 0] = values;
                            setVolume(next / 100);
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={musicPlaying ? "secondary" : "outline"}
                          className="justify-start gap-2"
                          onClick={() => void toggleBackgroundMusic()}
                        >
                          {musicPlaying ? <Music2 className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                          {musicPlaying ? "Pause Music" : "Play Music"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={() => {
                            stopBackgroundMusic();
                            setVolume(0);
                          }}
                        >
                          <VolumeX className="h-4 w-4" />
                          Mute All
                        </Button>
                      </div>

                      {musicTrack ? (
                        <div className="rounded-xl border border-border/30 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                          Current track: <span className="font-medium text-foreground">{musicTrack}</span>
                        </div>
                      ) : null}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Combined Container: Subject Selection & Leaderboard */}
          <div className={`grid grid-cols-1 ${showActivityFeed ? 'lg:grid-cols-6' : 'lg:grid-cols-3'} gap-2 sm:gap-4`}>
            {/* Subject Selection and Question Grid - 1/3 width */}
            <div className={`${showActivityFeed ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
              <Card className="p-1.5 sm:p-2 bg-card/80 border border-border/50">
                <div className="mb-3 sm:mb-6">

                  <Select value={currentSubject} onValueChange={handleSubjectChange}>
                    <SelectTrigger className="h-10 sm:h-14 text-sm sm:text-lg font-bold">
                      <SelectValue placeholder="Choose a quiz" />
                    </SelectTrigger>

                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem
                          key={subject}
                          value={subject}
                          className="text-lg py-3 font-medium"
                        >
                          {`Quiz: ${subject}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Question Grid */}
                {!sessionReady ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="ml-4 text-xl font-bold text-muted-foreground">
                      Loading questions…
                    </span>
                  </div>
                ) : (
                  <QuestionGrid
                    subject={currentSubject}
                    questionPool={sessionPools[currentSubject] || []}
                    usedQuestions={usedQuestions}
                    questionActive={questionActive}
                    onQuestionSelect={showQuestion}
                    hideUsed={false}
                    shuffleEnabled={shuffleQuestions}
                    totalButtons={readAdminNumber("questionsPerCategory", DEFAULT_QUIZ_SETTINGS.questionsPerCategory)}
                    showSequenceNumbers={readAdminBoolean("showSequenceNumbers", DEFAULT_QUIZ_SETTINGS.showSequenceNumbers)}
                  />
                )}
              </Card>

            </div>

            {/* Leaderboard with maximize option - 2/3 width */}
            <div className={`${showActivityFeed ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
              <LeaderboardWithMaximize
                teams={teams}
                scores={teamScores}
                currentTeamIndex={currentTeamIndex}
                scoreChanges={scoreChanges}
                rapidFireUsed={powerplayUsed}
                rapidFireActiveTeam={powerplayActive ? powerplayTeam : null}
                teamStreaks={teamStreaks}
                teamLifelines={teamLifelines}
                teamSupporterCounts={teamSupporterCounts}
                fixedLeaderboard={fixedLeaderboard}
                viewerLeaderboard={viewerLeaderboard}
                questionResponses={viewerResponses}
                isAnswerRevealed={showRevealAnimation}
                correctAnswer={currentQuestion?.correctAnswer ?? null}
                maskResponses={maskViewerResponses}
                onShowHalftime={appModeSupportsViewers ? () => setShowHalftime(true) : undefined}
                onScoreChange={(teamIndex, newScore) => {
                  const newScores = [...teamScores];
                  newScores[teamIndex] = newScore;
                  setTeamScores(newScores);
                }}
              />
              {/* Engagement Heatmap & Predictions */}
              {appModeSupportsViewers && (
                <div className="space-y-3">
                  {showEngagementHeatmap && (
                    <EngagementHeatmap
                      history={engagementHistory}
                      currentQuestion={currentBackendQuestionIndex}
                      compact
                    />
                  )}
                  {showViewerPredictions && (
                    <ViewerPredictionSystem
                      predictions={viewerPredictions}
                      teams={teams}
                      scores={teamScores}
                      isLocked={predictionsLocked}
                      onLockToggle={() => setPredictionsLocked(l => !l)}
                      compact
                    />
                  )}
                </div>
              )}
              </div>

              {/* Activity Feed - Conditionally Rendered */}
              {showActivityFeed && (
                <div className="lg:col-span-1">
                  <ActivityFeed activities={activities} />
                </div>
              )}
            </div>


          {/* Team Switch Controls - Bottom Section (Hidden for now) */}
          {/* <Card className="p-6 mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Select
                onValueChange={(val) => setSelectedTeamForSwitch(Number(val))}
              >
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Select team to switch" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team, index) => (
                    <SelectItem key={team.id} value={index.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  if (selectedTeamForSwitch !== null) {
                    setCurrentTeamIndex(selectedTeamForSwitch);
                    toast({ title: "Team Changed", description: `Switched to ${teams[selectedTeamForSwitch].name}` });
                  }
                }}
                disabled={selectedTeamForSwitch === null}
                className="bg-orange-500 text-white hover:bg-orange-600"
              >
                🔁 Change Team
              </Button>
            </div>
          </Card> */}

          {/* Game End Alert Dialog */}
          <AlertDialog open={gameEnded} onOpenChange={(open) => { if (!open) clearGameEnd(); }}>
            <AlertDialogContent className="max-w-3xl border-primary/20 bg-gradient-to-b from-background via-background to-muted/40">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-3xl text-center font-black tracking-tight">Game Ended</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-base text-muted-foreground">
                  Final standings and winner announcement
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="my-4 space-y-4">
                {finalRankedTeams[0] && (
                  <div className="rounded-2xl border border-yellow-400/40 bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-transparent p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14 border-2 border-yellow-400/70 shadow-md">
                          <AvatarImage src={finalRankedTeams[0].avatar} alt={finalRankedTeams[0].name} />
                          <AvatarFallback className="bg-yellow-500/20 text-yellow-100 font-bold">
                            {getInitials(finalRankedTeams[0].name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-yellow-300">Champion</p>
                          <p className="text-2xl font-black text-primary">{finalRankedTeams[0].name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-yellow-300">{finalRankedTeams[0].score}</p>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">points</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {finalRankedTeams.map((team, rank) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-center text-lg font-bold text-muted-foreground">
                          {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}
                        </span>
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={team.avatar} alt={team.name} />
                          <AvatarFallback className="text-xs font-semibold">
                            {getInitials(team.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`rounded-md px-2 py-1 text-sm font-bold ${team.color}`}>{team.name}</span>
                      </div>
                      <span className="text-lg font-black text-primary">{team.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              <AlertDialogFooter className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    const id = frontendQuizGameId || streamFrontendQuizGameId || searchParams.get('gameId');
                    const query = id ? `?gameId=${encodeURIComponent(id)}` : "";
                    try { localStorage.setItem("quizMirrorView", "teams"); } catch { /* ignore */ }
                    navigate(`/quiz/end/teams${query}`);
                  }}
                >
                  Team Leaderboard
                </Button>
                {appModeSupportsViewers && (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      const id = frontendQuizGameId || streamFrontendQuizGameId || searchParams.get('gameId');
                      const query = id ? `?gameId=${encodeURIComponent(id)}` : "";
                      try { localStorage.setItem("quizMirrorView", "viewers"); } catch { /* ignore */ }
                      navigate(`/quiz/end/viewers${query}`);
                    }}
                  >
                    Viewer Leaderboard
                  </Button>
                )}
                <AlertDialogAction
                  onClick={() => {
                    try { localStorage.removeItem("quizMirrorView"); } catch { /* ignore */ }
                    clearGameEnd();
                  }}
                  className="flex-1 bg-primary"
                >
                  Close
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div >
      </div >

      {/* Question Result Panel - shown after Correct/Wrong - ONLY in viewer-supporting modes */}
      {appModeSupportsViewers && (
        <QuestionResultPanel
          isOpen={showResultPanel}
          onClose={() => setShowResultPanel(false)}
          question={lastQuestionForResult}
          correctAnswer={lastCorrectAnswerForResult}
          isCorrectResult={lastResultCorrect}
          allResponses={viewerResponses}
          leaderboard={viewerLeaderboard}
          questionNumber={lastQuestionNumberForResult ?? undefined}
        />
      )}

      {/* Halftime Show Modal */}
      <HalftimeShowModal
        open={showHalftime}
        onOpenChange={setShowHalftime}
        teams={teams}
        scores={teamScores}
        viewerLeaderboard={viewerLeaderboard}
        teamSupporterCounts={teamSupporterCounts}
        totalQuestions={Object.values(sessionPools).reduce((s, p) => s + p.length, 0)}
        questionsPlayed={usedQuestions.size}
        teamStreaks={teamStreaks}
      />

      {/* Audience Emoji Reactions Overlay */}
      <AudienceReactions reactions={emojiReactions} />

    </>
  );
};

// Wrapper component with provider
export const TeamQuiz = () => (
  <YouTubeUserProvider>
    <TeamQuizInner />
  </YouTubeUserProvider>
);
