import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { Save, Users, Activity, ArrowRight, XCircle, Image, Youtube, Zap, Radio, Tv, Clock, Target, Megaphone, Trophy, BookOpen, Play, BarChart3, LayoutDashboard, Palette, SlidersHorizontal, SatelliteDish, Database, ShieldCheck, LogOut } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DEFAULT_QUIZ_SETTINGS } from "@/config/quizSettings";
import { performFullReset, getDefaultTeamConfigs } from "@/config/defaults";
import { listQuizzes } from "@/lib/quizManagementDB";
import type { AdminConfig } from "@/services/adminConfigApi";
import { COLOR_THEMES } from "@/config/colorThemes";
import { useColorTheme } from "@/hooks/useColorTheme";
import { useBranding } from "@/hooks/useBranding";
import { clearAllQuizData } from "@/lib/gameStateManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeSelectorCard } from "@/components/ThemeSelectorCard";
import { BrandingEditorCard } from "@/components/BrandingEditorCard";
import { ShowConfigurationCard } from "@/components/ShowConfigurationCard";
import { YouTubeChatSenderCard } from "@/components/YouTubeChatSenderCard";
import { clearYouTubeLeaderboard } from "@/components/YouTubeLivePanel";
import { TelegramGroupSenderCard } from "@/components/TelegramGroupSenderCard";
import { SSEServerConfigCard } from "@/components/SSEServerConfigCard";
import { ScoringEngineConfigCard } from "@/components/ScoringEngineConfigCard";
import { AppModeSelector } from "@/components/AppModeSelector";
import { readMirroredAdminSetting, writeMirroredAdminSettings } from "@/lib/adminConfigPersistence";
import { SoundEffectsCard } from "@/components/SoundEffectsCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AdminStreamManager } from "@/components/AdminStreamManager";
import PrizePolicyPage from "@/pages/PrizePolicy";
import ObsBoards from "@/pages/ObsBoards";
import { setFrontendQuizGameId as setApiFrontendQuizGameId } from "@/config/apiConfig";
import { getAppMode, getBackendTarget, getSSEStreamUrl, isSSEEnabled, APP_MODE_CONFIGS, modeSupportsViewers, modeRequiresSSE } from '@/config/appMode';
import { useApp } from "@/context/AppContext";
import { useTranslation } from "@/hooks/useTranslation";
import { setQuizAnalyticsEnabled } from "@/lib/analyticsIdentity";
import { postQuizRunLifecycle } from "@/services/analyticsApi";
import { replaceQuizStateCheckpoint } from "@/services/quizResultsApi";
import { disconnectSharedYouTubeAuth, getYouTubeChatSenderStatus, logoutSharedAuthSession, type YouTubeChatSenderStatus } from "@/services/youtubeChatSenderApi";
import { fetchHostProfile, fetchHostLoginHistory, type HostProfile, type HostSession, type LoginAttempt } from "@/services/hostProfileApi";
import { readQuizHostChannel } from "@/lib/quizHostChannel";
import { getStoredApplicationId } from "@/config/hostProduct";
import { saveQuizSessionConfigSnapshot } from "@/lib/adminConfigPersistence";
import { startActiveSession } from "@/lib/quizActiveSession";
import { createSessionQuestions, clearSessionQuestions } from "@/lib/quizSessionManager";
import { useQuizGame } from "@/context/QuizGameContext";
import { saveQuizRunConfig, setActiveQuizRunConfig } from "@/lib/quizRunConfig";
import { optimizeImageUpload } from "@/lib/optimizeImageUpload";

interface TeamConfig {
  name: string;
  members: string[];
  avatar?: string;
}

interface LiveSyncDiagnostics {
  lastSyncAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  failureCount: number;
  restoreSource: string | null;
}

type AdminWorkspace =
  | "overview"
  | "quiz"
  | "branding"
  | "scoring"
  | "backup"
  | "boards"
  | "data"
  | "policy";

/**
 * Build a full AdminConfig from DEFAULT_QUIZ_SETTINGS so the load effect can
 * fall through the same apply-path whether a saved config exists or not.
 */
const buildDefaultAdminConfig = (): AdminConfig => {
  const d = DEFAULT_QUIZ_SETTINGS;
  return {
    teamConfigs: getDefaultTeamConfigs(),
    correctAnswerScore: d.correctAnswerScore,
    wrongAnswerPenalty: d.wrongAnswerPenalty,
    lifelinePenalty: d.lifelinePenalty,
    teamLifelines: d.teamLifelines,
    questionsPerCategory: d.questionsPerCategory,
    maxUsedCountThreshold: d.maxUsedCountThreshold,
    shuffleQuestions: d.shuffleQuestions,
    timerDuration: d.timerDuration,
    masterTimerDuration: d.masterTimerDuration,
    passedQuestionTimer: d.passedQuestionTimer,
    revealCountdownDuration: d.revealCountdownDuration,
    rapidFireDuration: d.rapidFireDuration,
    showActivityFeed: d.showActivityFeed,
    showDifficultyBadge: d.showDifficultyBadge,
    showSaveIndicator: d.showSaveIndicator,
    showToastMessages: d.showToastMessages,
    showIntroAnimation: d.showIntroAnimation,
    maskViewerResponses: d.maskViewerResponses,
    youtubeIntegrationEnabled: d.youtubeIntegrationEnabled,
    disableLivePanelDuringPowerplay: d.disableLivePanelDuringPowerplay,
    showYouTubeAutoPostPanel: d.showYouTubeAutoPostPanel,
    showEngagementHeatmap: d.showEngagementHeatmap,
    showViewerPredictions: d.showViewerPredictions,
    powerplayEnabled: d.powerplayEnabled,
    quizAnalyticsEnabled: d.quizAnalyticsEnabled,
    tickerEnabled: d.tickerEnabled,
    tickerMessageRegular: d.tickerMessageRegular,
    tickerMessagePowerplay: d.tickerMessagePowerplay,
    tvModeEnabled: d.tvModeEnabled,
    fixedLeaderboard: d.fixedLeaderboard,
    showSequenceNumbers: d.showSequenceNumbers,
    minimumCorrectScore: d.minimumCorrectScore,
  };
};

const normalizeStoredTeamConfigs = (rawTeams: unknown): TeamConfig[] => {
  const defaultTeams = getDefaultTeamConfigs();
  const candidates = Array.isArray(rawTeams) ? rawTeams : [];
  const resolvedCount = Math.max(
    2,
    Math.min(4, candidates.length || DEFAULT_QUIZ_SETTINGS.teamCount)
  );

  return Array.from({ length: resolvedCount }, (_, index) => {
    const fallback = defaultTeams[index] || { name: `Team ${index + 1}`, members: [] };
    const candidate = candidates[index];
    const source = candidate && typeof candidate === "object"
      ? (candidate as Partial<TeamConfig>)
      : undefined;

    return {
      name: String(source?.name || fallback.name || `Team ${index + 1}`).trim() || fallback.name,
      members: Array.isArray(source?.members)
        ? source.members.map((member) => String(member).trim()).filter(Boolean)
        : fallback.members,
      avatar: typeof source?.avatar === "string" && source.avatar.trim() ? source.avatar : fallback.avatar,
    };
  });
};

const Admin = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    applicationId, 
    frontendQuizGameId, 
    setFrontendQuizGameId,
    createNewQuizGame, 
    clearQuizRuntimeContext,
    setApplicationId,
  } = useApp();
  const { connectedStreams } = useQuizGame();
  const { branding } = useBranding(false);
  const { t, setLanguage } = useTranslation();

  // Admin page defaults to English.
  useEffect(() => {
    setLanguage('en');
  }, [setLanguage]);

  const [teams, setTeams] = useState<TeamConfig[]>(getDefaultTeamConfigs);
  const [teamCount, setTeamCount] = useState<number>(DEFAULT_QUIZ_SETTINGS.teamCount);
  const [memberInputs, setMemberInputs] = useState<string[]>(() =>
    getDefaultTeamConfigs().map((team) => team.members?.join(", ") ?? "")
  );

  const [correctAnswerScore, setCorrectAnswerScore] = useState(DEFAULT_QUIZ_SETTINGS.correctAnswerScore);

  const [questionsPerCategory, setQuestionsPerCategory] = useState<number>(DEFAULT_QUIZ_SETTINGS.questionsPerCategory);
  const [questionsPerCategoryReady, setQuestionsPerCategoryReady] = useState(false);

  const [maxUsedCountThreshold, setMaxUsedCountThreshold] = useState<number>(DEFAULT_QUIZ_SETTINGS.maxUsedCountThreshold);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.shuffleQuestions);

  const [dbLoading, setDbLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [dbSubjects, setDbSubjects] = useState<string[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [availableByThreshold, setAvailableByThreshold] = useState<
    Record<string, { available: number; total: number }>
  >({});
  const [avgUsedCountBySubject, setAvgUsedCountBySubject] = useState<Record<string, number>>({});
  const [topicSettings, setTopicSettings] = useState<Record<string, boolean>>({});
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalAvailableByThreshold, setTotalAvailableByThreshold] = useState(0);

  // Topic settings are now just in-memory React state, persisted via admin config API
  const loadTopicSettings = () => ({} as Record<string, boolean>);

  const [wrongAnswerPenalty, setWrongAnswerPenalty] = useState(DEFAULT_QUIZ_SETTINGS.wrongAnswerPenalty);
  const [lifelinePenalty, setLifelinePenalty] = useState(DEFAULT_QUIZ_SETTINGS.lifelinePenalty);
  const [teamLifelines, setTeamLifelinesAdmin] = useState(DEFAULT_QUIZ_SETTINGS.teamLifelines);

  const [timerDuration, setTimerDuration] = useState<number>(DEFAULT_QUIZ_SETTINGS.timerDuration);
  const [masterTimerDuration, setMasterTimerDuration] = useState<number>(DEFAULT_QUIZ_SETTINGS.masterTimerDuration);
  const [passedQuestionTimer, setPassedQuestionTimer] = useState<number>(DEFAULT_QUIZ_SETTINGS.passedQuestionTimer);
  const [revealCountdownDuration, setRevealCountdownDuration] = useState<number>(DEFAULT_QUIZ_SETTINGS.revealCountdownDuration);
  const [rapidFireDuration, setRapidFireDuration] = useState<number>(DEFAULT_QUIZ_SETTINGS.rapidFireDuration);
  const [showActivityFeed, setShowActivityFeed] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.showActivityFeed);

  const [showDifficultyBadge, setShowDifficultyBadge] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.showDifficultyBadge);
  const [showSaveIndicator, setShowSaveIndicator] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.showSaveIndicator);
  const [showToastMessages, setShowToastMessages] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.showToastMessages);
  const [showIntroAnimation, setShowIntroAnimation] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.showIntroAnimation);
  const [maskViewerResponses, setMaskViewerResponses] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.maskViewerResponses);
  const [youtubeIntegrationEnabled, setYoutubeIntegrationEnabled] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.youtubeIntegrationEnabled);
  const [disableLivePanelDuringPowerplay, setDisableLivePanelDuringPowerplay] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.disableLivePanelDuringPowerplay);
  const [showYouTubeAutoPostPanel, setShowYouTubeAutoPostPanel] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.showYouTubeAutoPostPanel);
  const [showEngagementHeatmap, setShowEngagementHeatmap] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.showEngagementHeatmap);
  const [showViewerPredictions, setShowViewerPredictions] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.showViewerPredictions);
  const [powerplayEnabled, setPowerplayEnabled] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.powerplayEnabled);
  const [quizAnalyticsEnabled, setQuizAnalyticsEnabledState] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.quizAnalyticsEnabled);
  const [liveSyncDiagnostics, setLiveSyncDiagnostics] = useState<LiveSyncDiagnostics>(() => ({
    lastSyncAt: localStorage.getItem("liveLeaderboardLastSyncAt"),
    lastErrorAt: localStorage.getItem("liveLeaderboardLastSyncErrorAt"),
    lastError: localStorage.getItem("liveLeaderboardLastSyncError"),
    failureCount: Number(localStorage.getItem("liveLeaderboardSyncFailureCount") || "0"),
    restoreSource: localStorage.getItem("liveLeaderboardLastRestoreSource"),
  }));
  const [activeWorkspace, setActiveWorkspace] = useState<AdminWorkspace>(() => {
    const raw = String(searchParams.get("workspace") || "overview");
    if (["overview", "quiz", "branding", "scoring", "backup", "boards", "data", "policy"].includes(raw)) {
      return raw as AdminWorkspace;
    }
    return "overview";
  });
  const [hostAuthStatus, setHostAuthStatus] = useState<YouTubeChatSenderStatus | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [hostSession, setHostSession] = useState<HostSession | null>(null);
  const [hostLoginHistory, setHostLoginHistory] = useState<LoginAttempt[]>([]);
  const [hostProfileLoading, setHostProfileLoading] = useState(false);
  const [hostActionLoading, setHostActionLoading] = useState<"signout" | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetInProgress, setResetInProgress] = useState(false);
  const refreshHostAuthStatus = useCallback(async () => {
    if (getBackendTarget() === "none" || !applicationId) {
      setHostAuthStatus(null);
      return;
    }
    try {
      const next = await getYouTubeChatSenderStatus(applicationId);
      setHostAuthStatus(next);
    } catch (error) {
      console.error("[Admin] Failed to load host auth status", error);
    }
  }, [applicationId]);

  useEffect(() => {
    void refreshHostAuthStatus();
  }, [refreshHostAuthStatus]);

  const handleHostSignOut = async () => {
    setHostActionLoading("signout");
    // Set the explicit-logout flag *before* clearing the token so that the
    // RequireAuth guard on this page sees it in the same render cycle and
    // suppresses the OAuth popup that it would otherwise fire when user→null.
    try { sessionStorage.setItem("quizExplicitLogout", "1"); } catch (_e) { /* storage unavailable */ }
    try {
      const result = await logoutSharedAuthSession();
      if (!result.success) {
        // Roll back the flag if we're not actually navigating away.
        try { sessionStorage.removeItem("quizExplicitLogout"); } catch (_e) { /* storage unavailable */ }
        toast({
          title: "Sign Out Failed",
          description: result.error || "Failed to end this host browser session.",
          variant: "destructive",
        });
        return;
      }
      navigate("/", { replace: true });
    } finally {
      setHostActionLoading(null);
    }
  };

  const handleConfirmedResetToDefaults = async () => {
    setResetInProgress(true);
    try {
      await resetToDefaults();
      setConfirmResetOpen(false);
    } finally {
      setResetInProgress(false);
    }
  };

  // Load host profile + login history when the data workspace is opened
  useEffect(() => {
    if (activeWorkspace !== "data") return;
    if (getAppMode() === "offline") return;
    let cancelled = false;
    const load = async () => {
      setHostProfileLoading(true);
      try {
        const [profileResp, historyResp] = await Promise.all([
          fetchHostProfile(),
          fetchHostLoginHistory(50),
        ]);
        if (cancelled) return;
        if (profileResp?.success) {
          setHostProfile(profileResp.profile);
          setHostSession(profileResp.session);
        }
        if (historyResp?.success) {
          setHostLoginHistory(historyResp.attempts || []);
        }
      } catch {
        // silently ignore — not critical
      } finally {
        if (!cancelled) setHostProfileLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [activeWorkspace]);

  const [tickerMessageRegular, setTickerMessageRegular] = useState<string>(DEFAULT_QUIZ_SETTINGS.tickerMessageRegular);
  const [tickerMessagePowerplay, setTickerMessagePowerplay] = useState<string>(DEFAULT_QUIZ_SETTINGS.tickerMessagePowerplay);
  const [tickerEnabled, setTickerEnabled] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.tickerEnabled);
  const [tvModeEnabled, setTvModeEnabled] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.tvModeEnabled);
  const [fixedLeaderboard, setFixedLeaderboard] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.fixedLeaderboard);
  const [showSequenceNumbers, setShowSequenceNumbers] = useState<boolean>(DEFAULT_QUIZ_SETTINGS.showSequenceNumbers);
  const [minimumCorrectScore, setMinimumCorrectScore] = useState<number>(DEFAULT_QUIZ_SETTINGS.minimumCorrectScore);

  // Track SSE enabled state and app mode for conditional rendering
  const [sseEnabled, setSseEnabled] = useState(isSSEEnabled);
  const [currentAppMode, setCurrentAppMode] = useState(getAppMode);
  const [savedQuizConfigSignature, setSavedQuizConfigSignature] = useState<string>('');
  
  useEffect(() => {
    const handleSSEChange = () => setSseEnabled(isSSEEnabled());
    const handleModeChange = () => setCurrentAppMode(getAppMode());
    
    window.addEventListener('sseEnabledChanged', handleSSEChange);
    window.addEventListener('appModeChanged', handleModeChange);
    return () => {
      window.removeEventListener('sseEnabledChanged', handleSSEChange);
      window.removeEventListener('appModeChanged', handleModeChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateTeams = async () => {
      const storedTeams = await readMirroredAdminSetting<unknown>("teamConfigs", getDefaultTeamConfigs()).catch(
        () => getDefaultTeamConfigs()
      );
      if (cancelled) return;
      const normalizedTeams = normalizeStoredTeamConfigs(storedTeams);
      setTeams(normalizedTeams);
      setTeamCount(normalizedTeams.length);
      setMemberInputs(normalizedTeams.map((team) => team.members.join(", ")));
    };

    void hydrateTeams();

    return () => {
      cancelled = true;
    };
  }, []);



  // Timer/flag useEffects removed — config is persisted from saveAllSettings

  useEffect(() => {
    setQuizAnalyticsEnabled(quizAnalyticsEnabled);
  }, [quizAnalyticsEnabled]);

  useEffect(() => {
    const refreshDiagnostics = () => {
      setLiveSyncDiagnostics({
        lastSyncAt: localStorage.getItem("liveLeaderboardLastSyncAt"),
        lastErrorAt: localStorage.getItem("liveLeaderboardLastSyncErrorAt"),
        lastError: localStorage.getItem("liveLeaderboardLastSyncError"),
        failureCount: Number(localStorage.getItem("liveLeaderboardSyncFailureCount") || "0"),
        restoreSource: localStorage.getItem("liveLeaderboardLastRestoreSource"),
      });
    };
    refreshDiagnostics();
    const id = window.setInterval(refreshDiagnostics, 2000);
    window.addEventListener("focus", refreshDiagnostics);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", refreshDiagnostics);
    };
  }, []);

  // Ticker values are persisted from saveAllSettings
  useEffect(() => {
    setQuestionsPerCategoryReady(true);
    setInitializing(false);
  }, []);

  const refreshQuestionStats = useCallback(async () => {
    setDbLoading(true);
    try {
      const quizzes = await listQuizzes();
      const topicSettingsMap = loadTopicSettings();
      const counts: Record<string, number> = {};
      const available: Record<string, { available: number; total: number }> = {};
      const averages: Record<string, number> = {};
      let total = 0;
      let totalAvailable = 0;

      quizzes.forEach((quiz) => {
        const questionIds = new Set(
          quiz.rounds.flatMap((round) => round.questionIds)
        );
        const totalCount = questionIds.size;
        total += totalCount;

        const eligibleCount = totalCount;
        totalAvailable += eligibleCount;

        counts[quiz.id] = totalCount;
        available[quiz.id] = { available: eligibleCount, total: totalCount };
        averages[quiz.id] = 0;
      });

      setDbSubjects(quizzes.map((quiz) => quiz.id));
      setTopicSettings(topicSettingsMap);
      setQuestionCounts(counts);
      setAvailableByThreshold(available);
      setAvgUsedCountBySubject(averages);
      setTotalQuestions(total);
      setTotalAvailableByThreshold(totalAvailable);
    } catch (error) {
      console.warn('[Admin] Failed to refresh question stats', error);
      setDbSubjects([]);
      setQuestionCounts({});
      setAvailableByThreshold({});
      setAvgUsedCountBySubject({});
      setTotalQuestions(0);
      setTotalAvailableByThreshold(0);
      toast({
        title: 'Question Bank Unavailable',
        description: 'The browser-local question bank could not be loaded.',
        variant: 'destructive',
      });
    } finally {
      setDbLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refreshQuestionStats();
  }, [refreshQuestionStats]);

  const handleTeamCountChange = (count: number) => {
    const newCount = Math.max(2, Math.min(4, count));
    setTeamCount(newCount);

    const updated = [...teams];
    const updatedInputs = [...memberInputs];

    if (newCount > teams.length) {
      // Add new teams
      const defaultNames = DEFAULT_QUIZ_SETTINGS.defaultTeamNames;
      for (let i = teams.length; i < newCount; i++) {
        updated.push({ name: defaultNames[i] || `Team ${i + 1}`, members: [] });
        updatedInputs.push("");
      }
    } else if (newCount < teams.length) {
      // Remove teams
      updated.splice(newCount);
      updatedInputs.splice(newCount);
    }
    setTeams(updated);
    setMemberInputs(updatedInputs);
  };

  const handleMembersChange = (index: number, value: string) => {
    // Update the input string immediately for smooth typing
    const updatedInputs = [...memberInputs];
    updatedInputs[index] = value;
    setMemberInputs(updatedInputs);

    // Update the teams array with parsed members
    const updated = [...teams];
    updated[index].members = value.split(",").map(m => m.trim()).filter(m => m);
    setTeams(updated);
  };

  const handleTeamNameChange = (index: number, name: string) => {
    const updated = [...teams];
    updated[index].name = name;
    setTeams(updated);
  };

  const resetToDefaults = async () => {
    const runIdToAbort = frontendQuizGameId;
    const appId = applicationId || getStoredApplicationId();
    if (currentAppMode !== 'offline' && appId && runIdToAbort) {
      await Promise.allSettled([
        postQuizRunLifecycle({
          frontendQuizGameId: runIdToAbort,
          applicationId: appId,
          consentEnabled: true,
          eventType: 'aborted',
          clientTs: Date.now(),
        }),
        replaceQuizStateCheckpoint({
          applicationId: appId,
          frontendQuizGameId: runIdToAbort,
          checkpointType: 'reset_to_defaults',
          state: {
            gamePhase: 'aborted',
            source: 'admin_reset_to_defaults',
            resetAtClient: Date.now(),
          },
        }),
      ]);
    }

    // Use centralized reset from defaults.ts
    await performFullReset();
    clearQuizRuntimeContext();
    setFrontendQuizGameId(null);
    setApiFrontendQuizGameId(null);
    setSavedQuizConfigSignature('');
    
    // Update local state to reflect defaults
    const defaults = DEFAULT_QUIZ_SETTINGS;

    // Reset team count and teams with translated names
    setTeamCount(defaults.teamCount);
    const defaultTeams = getDefaultTeamConfigs();
    setTeams(defaultTeams);
    setMemberInputs(Array.from({ length: defaults.teamCount }, () => ""));

    // Reset episode and scoring
    setCorrectAnswerScore(defaults.correctAnswerScore);
    setWrongAnswerPenalty(defaults.wrongAnswerPenalty);
    setLifelinePenalty(defaults.lifelinePenalty);

    // Reset timer durations
    setTimerDuration(defaults.timerDuration);
    setMasterTimerDuration(defaults.masterTimerDuration);
    setPassedQuestionTimer(defaults.passedQuestionTimer);
    setRevealCountdownDuration(defaults.revealCountdownDuration);
    setRapidFireDuration(defaults.rapidFireDuration);
    setShowActivityFeed(defaults.showActivityFeed);
    setShowDifficultyBadge(defaults.showDifficultyBadge);
    setShowSaveIndicator(defaults.showSaveIndicator);
    setShowToastMessages(defaults.showToastMessages);
    setShowIntroAnimation(defaults.showIntroAnimation);
    setMaskViewerResponses(defaults.maskViewerResponses);
    setYoutubeIntegrationEnabled(defaults.youtubeIntegrationEnabled);
    setDisableLivePanelDuringPowerplay(defaults.disableLivePanelDuringPowerplay);
    setShowYouTubeAutoPostPanel(defaults.showYouTubeAutoPostPanel);
    setShowEngagementHeatmap(defaults.showEngagementHeatmap);
    setShowViewerPredictions(defaults.showViewerPredictions);
    setPowerplayEnabled(defaults.powerplayEnabled);
    setQuizAnalyticsEnabledState(defaults.quizAnalyticsEnabled);
    setTickerMessageRegular(defaults.tickerMessageRegular);
    setTickerMessagePowerplay(defaults.tickerMessagePowerplay);
    setTickerEnabled(defaults.tickerEnabled);
    setTvModeEnabled(defaults.tvModeEnabled);
    setFixedLeaderboard(defaults.fixedLeaderboard);

    setQuestionsPerCategory(defaults.questionsPerCategory);
    setMaxUsedCountThreshold(defaults.maxUsedCountThreshold);
    setShuffleQuestions(defaults.shuffleQuestions);

    setTeamLifelinesAdmin(defaults.teamLifelines);

    toast({
      title: t.success,
      description: "All settings reset to defaults and sessions cleared.",
    });
  };


  // Validation state
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check Episode Number
    const episodeNum = branding.episodeNumber;
    if (episodeNum === "0" || episodeNum.trim() === "") {
      errors.push("Episode Number must be set to a valid value (not '0')");
    }

    return { errors, warnings };
  }, [branding.episodeNumber]);

  const streamConfigSignature = useMemo(() => JSON.stringify(
    [...connectedStreams]
      .map((stream) => ({
        streamId: String(stream.streamId || '').trim(),
        videoId: String(stream.videoId || '').trim(),
        title: String(stream.title || '').trim(),
        channelTitle: String(stream.channelTitle || '').trim(),
        transformMode: String(stream.transformMode || '').trim(),
        isStopped: Boolean(stream.isStopped),
      }))
      .sort((left, right) => {
        const leftKey = `${left.videoId}:${left.streamId}:${left.transformMode}`;
        const rightKey = `${right.videoId}:${right.streamId}:${right.transformMode}`;
        return leftKey.localeCompare(rightKey);
      })
  ), [connectedStreams]);

  const quizConfigSignature = useMemo(() => JSON.stringify({
    currentAppMode,
    branding,
    teams,
    teamCount,
    memberInputs,
    correctAnswerScore,
    wrongAnswerPenalty,
    lifelinePenalty,
    teamLifelines,
    timerDuration,
    masterTimerDuration,
    passedQuestionTimer,
    revealCountdownDuration,
    rapidFireDuration,
    questionsPerCategory,
    maxUsedCountThreshold,
    shuffleQuestions,
    topicSettings,
    showActivityFeed,
    showDifficultyBadge,
    showSaveIndicator,
    showToastMessages,
    showIntroAnimation,
    maskViewerResponses,
    youtubeIntegrationEnabled,
    disableLivePanelDuringPowerplay,
    powerplayEnabled,
    quizAnalyticsEnabled,
    tickerMessageRegular,
    tickerMessagePowerplay,
    tickerEnabled,
    tvModeEnabled,
    fixedLeaderboard,
    showSequenceNumbers,
    minimumCorrectScore,
    streams: JSON.parse(streamConfigSignature),
  }), [
    currentAppMode,
    branding,
    teams,
    teamCount,
    memberInputs,
    correctAnswerScore,
    wrongAnswerPenalty,
    lifelinePenalty,
    teamLifelines,
    timerDuration,
    masterTimerDuration,
    passedQuestionTimer,
    revealCountdownDuration,
    rapidFireDuration,
    questionsPerCategory,
    maxUsedCountThreshold,
    shuffleQuestions,
    topicSettings,
    showActivityFeed,
    showDifficultyBadge,
    showSaveIndicator,
    showToastMessages,
    showIntroAnimation,
    maskViewerResponses,
    youtubeIntegrationEnabled,
    disableLivePanelDuringPowerplay,
    powerplayEnabled,
    quizAnalyticsEnabled,
    tickerMessageRegular,
    tickerMessagePowerplay,
    tickerEnabled,
    tvModeEnabled,
    fixedLeaderboard,
    showSequenceNumbers,
    minimumCorrectScore,
    streamConfigSignature,
  ]);

  const isQuizConfigSaved = Boolean(frontendQuizGameId) && savedQuizConfigSignature === quizConfigSignature;
  const canStartQuiz = validationErrors.errors.length === 0 && isQuizConfigSaved;
  const startQuizLabel =
    validationErrors.errors.length > 0
      ? "Fix Validation Errors"
      : !frontendQuizGameId
        ? "Save Quiz First"
        : !isQuizConfigSaved
          ? "Save Quiz First"
          : "Start Quiz";

  const saveAllSettings = async () => {
    // Check for validation errors first
    if (validationErrors.errors.length > 0) {
      toast({
        title: "Cannot Save Settings",
        description: validationErrors.errors[0],
        variant: "destructive",
      });
      return;
    }

    const appId = applicationId || getStoredApplicationId();
    await writeMirroredAdminSettings({
      teamConfigs: teams,
      quizBranding: branding,
      episodeNumber: branding.episodeNumber,
      correctAnswerScore,
      wrongAnswerPenalty,
      lifelinePenalty,
      teamLifelines,
      timerDuration,
      masterTimerDuration,
      passedQuestionTimer,
      revealCountdownDuration,
      rapidFireDuration,
      questionsPerCategory,
      maxUsedCountThreshold,
      shuffleQuestions,
      showActivityFeed,
      showDifficultyBadge,
      showSaveIndicator,
      showToastMessages,
      showIntroAnimation,
      maskViewerResponses,
      youtubeIntegrationEnabled,
      disableLivePanelDuringPowerplay,
      showYouTubeAutoPostPanel,
      showEngagementHeatmap,
      showViewerPredictions,
      powerplayEnabled,
      quizAnalyticsEnabled,
      tickerEnabled,
      tickerMessageRegular,
      tickerMessagePowerplay,
      tvModeEnabled,
      fixedLeaderboard,
      showSequenceNumbers,
      minimumCorrectScore,
      topicSettings,
    });

    // Generate a quiz game ID on save if one doesn't exist yet,
    // so streams can be configured before the quiz starts.
    let gameId = frontendQuizGameId;
    if (!gameId) {
      gameId = createNewQuizGame();
      console.log('[Admin] Pre-generated quiz game ID on save:', gameId);
    }
    setApiFrontendQuizGameId(gameId);

    saveQuizRunConfig({
      frontendQuizGameId: gameId,
      applicationId: appId || null,
      savedAt: Date.now(),
      episodeName: `${branding.showTitle || 'Quiz Show'} Episode #${branding.episodeNumber}`,
      episodeNumber: branding.episodeNumber,
      quizShowName: branding.showTitle || 'Quiz Show',
      branding,
      teams,
      topicSettings,
      settings: {
        correctAnswerScore,
        wrongAnswerPenalty,
        lifelinePenalty,
        timerDuration,
        masterTimerDuration,
        passedQuestionTimer,
        revealCountdownDuration,
        rapidFireDuration,
        questionsPerCategory,
        maxUsedCountThreshold,
        shuffleQuestions,
        teamLifelines,
        showActivityFeed,
        showDifficultyBadge,
        showSaveIndicator,
        showToastMessages,
        showIntroAnimation,
        maskViewerResponses,
        youtubeIntegrationEnabled,
        disableLivePanelDuringPowerplay,
        showYouTubeAutoPostPanel,
        showEngagementHeatmap,
        showViewerPredictions,
        powerplayEnabled,
        quizAnalyticsEnabled,
        tickerEnabled,
        tickerMessageRegular,
        tickerMessagePowerplay,
        tvModeEnabled,
        fixedLeaderboard,
        showSequenceNumbers,
        minimumCorrectScore,
      },
      streams: connectedStreams,
      runtime: {
        appMode: currentAppMode,
        sseEnabled: isSSEEnabled(),
        sseStreamUrl: getBackendTarget() === 'none' ? '' : getSSEStreamUrl(),
      },
    });

    setSavedQuizConfigSignature(quizConfigSignature);
    if (gameId) {
      setFrontendQuizGameId(gameId);
    }

    const appMode = getAppMode();
    const config = APP_MODE_CONFIGS[appMode];
    const modeLabel = config.label;
    
    toast({
      title: `✓ Settings Saved (${modeLabel})`,
      description: gameId
        ? `Configuration saved. Game ID: ${gameId.slice(0, 8)}… — you can now add streams.`
        : "Configuration saved. Click 'Start Quiz' to begin a new game.",
    });
  };

  const handleAvatarUpload = async (teamIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    try {
      const dataUrl = await optimizeImageUpload(file, {
        maxWidth: 96,
        maxHeight: 96,
        maxBytes: 35 * 1024,
        quality: 0.7,
      });
      const updated = [...teams];
      updated[teamIndex].avatar = dataUrl;
      setTeams(updated);
      toast({
        title: "Success",
        description: `Avatar uploaded for ${updated[teamIndex].name}`,
      });
    } catch {
      toast({
        title: "Upload Failed",
        description: "Could not optimize this team avatar.",
        variant: "destructive",
      });
    }
  };

  const removeAvatar = (teamIndex: number) => {
    const updated = [...teams];
    delete updated[teamIndex].avatar;
    setTeams(updated);
    toast({
      title: "Avatar Removed",
      description: `Avatar removed for ${updated[teamIndex].name}`,
    });
  };

  const workspaceItems: Array<{
    id: AdminWorkspace;
    label: string;
    description: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: "overview", label: "Overview", description: "Run flow and quick workspace shortcuts", icon: LayoutDashboard },
    { id: "quiz", label: "Quiz Configuration", description: "Question Bank, show setup, and teams", icon: BookOpen },
    { id: "branding", label: "Brand & Display", description: "Show look, ticker, and visuals", icon: Palette },
    { id: "scoring", label: "Scoring & Timing", description: "Points, penalties, and timers", icon: SlidersHorizontal },
    { id: "data", label: "Mode & Analytics", description: "App mode, live integration, streams, and storage", icon: Database },
    { id: "policy", label: "Prizing Policy", description: "Prize suggestion rules and qualification tuning", icon: Trophy },
    { id: "backup", label: "Backup Quiz Flow", description: "YouTube auto-post and Telegram mirror", icon: SatelliteDish },
    { id: "boards", label: "Boards", description: "OBS launch shortcuts and board outputs", icon: Tv },
  ];

  useEffect(() => {
    const raw = String(searchParams.get("workspace") || "");
    if (!raw) return;
    if (["overview", "quiz", "branding", "scoring", "backup", "boards", "data", "policy"].includes(raw)) {
      setActiveWorkspace(raw as AdminWorkspace);
    }
  }, [searchParams]);

  const mainContentNodeRef = useRef<HTMLElement | null>(null);
  const mainContentRef = useCallback((node: HTMLElement | null) => {
    if (node) mainContentNodeRef.current = node;
  }, []);

  const activateWorkspace = (next: AdminWorkspace) => {
    setActiveWorkspace(next);
    const params = new URLSearchParams(searchParams);
    if (next === "overview") params.delete("workspace");
    else params.set("workspace", next);
    setSearchParams(params, { replace: true });
    // Scroll to top of main content area
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  return (
    <>
      <div className="relative z-10 min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_30%),radial-gradient(circle_at_top_right,_hsl(var(--accent)/0.14),_transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] p-3 md:p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Card className="overflow-hidden border-primary/20 bg-card/80 shadow-2xl backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-transparent to-accent/20 px-5 py-5 md:px-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">Host Console</Badge>
                    <Badge variant={isQuizConfigSaved ? "default" : "secondary"}>
                      {frontendQuizGameId ? (isQuizConfigSaved ? "Saved Run Ready" : "Unsaved Changes") : "No Saved Run"}
                    </Badge>
                    <Badge variant="outline">{APP_MODE_CONFIGS[currentAppMode].label}</Badge>
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl">{t.admin}</h1>
                    <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                      A focused host workspace for preparing the quiz run, managing live streams, and keeping the operational controls easy to scan.
                    </p>
                  </div>
                    <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Workflow</p>
                        <p className="mt-1.5 text-base font-semibold">Save-first</p>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">Make changes, save the run, then start from the locked config.</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Run</p>
                        <p className="mt-1.5 text-base font-semibold truncate">{frontendQuizGameId ? frontendQuizGameId.slice(0, 12) : "Not saved yet"}</p>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{frontendQuizGameId ? "Saving again refreshes the working host config." : "Save Quiz creates the host run ID."}</p>
                      </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Question Bank</p>
                      <p className="mt-1.5 text-2xl font-semibold text-primary">{totalQuestions}</p>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{dbSubjects.length} quizzes loaded, {totalAvailableByThreshold} usable</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Teams</p>
                      <p className="mt-1.5 text-2xl font-semibold">{teamCount}</p>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{teamLifelines} lifelines each, {questionsPerCategory} questions</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3 col-span-2 lg:col-span-1">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Host Status</p>
                      <p className="mt-1.5 text-base font-semibold">{canStartQuiz ? "Ready to start" : startQuizLabel}</p>
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{validationErrors.errors.length > 0 ? validationErrors.errors[0] : "Save first, then start when the run is ready."}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:w-[360px] xl:self-stretch">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <LanguageSwitcher size="sm" />
                    <ThemeToggle />
                  </div>
                  <div className="rounded-3xl border border-border/60 bg-background/70 p-3 shadow-sm">
                    <div className="mb-3 px-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Run Actions</p>
                      <p className="mt-1 text-sm text-muted-foreground">Use this sequence to lock the config and launch the run cleanly.</p>
                    </div>
                    <div className="grid gap-3">
                    <Button
                      onClick={saveAllSettings}
                      variant="info"
                      className="h-11 justify-start gap-2 rounded-xl px-4 text-left text-sm font-semibold"
                      disabled={isQuizConfigSaved}
                    >
                      <Save className="h-4 w-4" />
                      {isQuizConfigSaved ? "Saved" : t.save}
                    </Button>
                    <Button
                      onClick={async () => {
                        clearAllQuizData();
                        clearSessionQuestions();

                        const appMode = getAppMode();
                        if (appMode !== 'offline') {
                          clearYouTubeLeaderboard();
                        }

                        const savedGameId = frontendQuizGameId;
                        if (!savedGameId) {
                          toast({
                            title: "Save Quiz First",
                            description: "Save the quiz configuration before starting.",
                            variant: "destructive",
                          });
                          return;
                        }
                        const runStartedAt = Date.now();

                        const sessionConfigSnapshot = {
                          applicationId: applicationId || getStoredApplicationId() || DEFAULT_QUIZ_SETTINGS.applicationId,
                          frontendQuizGameId: savedGameId,
                          episodeNumber: branding.episodeNumber,
                          branding,
                          teams,
                          topicSettings,
                          quizHostChannel: readQuizHostChannel(),
                          streams: connectedStreams,
                          settings: {
                            correctAnswerScore,
                            wrongAnswerPenalty,
                            lifelinePenalty,
                            timerDuration,
                            masterTimerDuration,
                            passedQuestionTimer,
                            revealCountdownDuration,
                            rapidFireDuration,
                            questionsPerCategory,
                            maxUsedCountThreshold,
                            shuffleQuestions,
                            teamLifelines,
                            showActivityFeed,
                            showDifficultyBadge,
                            showSaveIndicator,
                            showToastMessages,
                            showIntroAnimation,
                            maskViewerResponses,
                            youtubeIntegrationEnabled,
                            disableLivePanelDuringPowerplay,
                            showYouTubeAutoPostPanel,
                            showEngagementHeatmap,
                            showViewerPredictions,
                            powerplayEnabled,
                            quizAnalyticsEnabled,
                            tickerEnabled,
                            tickerMessageRegular,
                            tickerMessagePowerplay,
                            tvModeEnabled,
                            fixedLeaderboard,
                            showSequenceNumbers,
                            minimumCorrectScore,
                          },
                        };
                        saveQuizRunConfig({
                          frontendQuizGameId: savedGameId,
                          applicationId: applicationId || getStoredApplicationId() || null,
                          savedAt: Date.now(),
                          episodeName: `${branding.showTitle || 'Quiz Show'} Episode #${branding.episodeNumber}`,
                          episodeNumber: branding.episodeNumber,
                          quizShowName: branding.showTitle || 'Quiz Show',
                          branding,
                          teams,
                          topicSettings,
                          settings: sessionConfigSnapshot.settings,
                          streams: connectedStreams,
                          runtime: {
                            appMode,
                            sseEnabled: isSSEEnabled(),
                            sseStreamUrl: getBackendTarget() === 'none' ? '' : getSSEStreamUrl(),
                            startedAtMs: runStartedAt,
                            skipInitialBackendRestore: true,
                          },
                        });
                        const sessionId = crypto.randomUUID();
                        await saveQuizSessionConfigSnapshot(sessionId, sessionConfigSnapshot);

                        startActiveSession(sessionId, savedGameId, branding.episodeNumber, {
                          startedAt: runStartedAt,
                          skipInitialBackendRestore: true,
                        });
                        setActiveQuizRunConfig(savedGameId);
                        setApiFrontendQuizGameId(savedGameId);

                        await createSessionQuestions(
                          questionsPerCategory,
                          maxUsedCountThreshold,
                          shuffleQuestions
                        );

                        toast({
                          title: "New Quiz Started",
                          description: `Session created. Game ID: ${savedGameId.slice(-8)}...`,
                        });

                        navigate(`/quiz?gameId=${savedGameId}`);
                      }}
                      variant="default"
                      className="h-11 justify-start gap-2 rounded-xl bg-primary px-4 text-left text-sm font-bold text-primary-foreground shadow-md transition-all hover:brightness-110 hover:shadow-lg"
                      disabled={!canStartQuiz}
                    >
                      <Play className="h-4 w-4" />
                      {startQuizLabel}
                    </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Host Workspaces</CardTitle>
                <CardDescription>Switch between grouped admin tools instead of one long settings page.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-1 xl:space-y-0" role="tablist" aria-label="Admin workspaces" aria-orientation="vertical">
                {workspaceItems.map(({ id, label, description, icon: Icon }) => {
                  const active = activeWorkspace === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={`${label}: ${description}`}
                      onClick={() => activateWorkspace(id)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        active
                          ? "border-primary/40 bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/60 hover:border-primary/20 hover:bg-muted/40 hover:-translate-y-px"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 rounded-lg p-1.5 ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2 xl:line-clamp-none">{description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Shared Auth Session
                </CardTitle>
                <CardDescription>
                  This browser is now isolated from other hosts using the same backend.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Channel</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {hostAuthStatus?.channelTitle || "Not connected"}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {hostAuthStatus?.channelId || "No connected channel"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                  <p className="mt-2 font-mono text-xs text-foreground break-all">
                    {hostAuthStatus?.resolvedApplicationId || applicationId || "n/a"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Session: {hostAuthStatus?.sessionAuthenticated ? "Authenticated" : "Not authenticated"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expires: {hostAuthStatus?.sessionExpiresAt
                      ? new Date(String(hostAuthStatus.sessionExpiresAt)).toLocaleString()
                      : "n/a"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => void refreshHostAuthStatus()} disabled={hostActionLoading !== null}>
                    <ShieldCheck className="h-4 w-4" />
                    Refresh Host Status
                  </Button>
                  <Button variant="destructive" className="gap-2" onClick={() => void handleHostSignOut()} disabled={hostActionLoading !== null}>
                    <LogOut className="h-4 w-4" />
                    {hostActionLoading === "signout" ? "Signing Out…" : "Sign Out"}
                  </Button>
                  <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
                    <Button
                      variant="outline"
                      className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => setConfirmResetOpen(true)}
                      disabled={hostActionLoading !== null || resetInProgress}
                    >
                      <XCircle className="h-4 w-4" />
                      {resetInProgress ? "Resetting…" : t.resetToDefaults}
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset all admin settings to defaults?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will clear current admin settings for this workspace and replace them with defaults.
                          Use this only when you intentionally want to restart configuration.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={resetInProgress}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void handleConfirmedResetToDefaults()}
                          disabled={resetInProgress}
                        >
                          {resetInProgress ? "Resetting…" : "Yes, Reset"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-5" role="tabpanel" aria-label={`${workspaceItems.find(w => w.id === activeWorkspace)?.label || 'Overview'} workspace`}>
            {activeWorkspace === "overview" && (
              <>
                <Card className="overflow-hidden border-amber-400/50 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 shadow-[0_18px_50px_-24px_rgba(217,119,6,0.55)] dark:border-amber-500/30 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-rose-950/20">
                  <CardHeader className="border-b border-amber-300/40 bg-white/55 backdrop-blur-sm dark:border-amber-500/20 dark:bg-black/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <Badge className="w-fit border-amber-500/30 bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-800 hover:bg-amber-500/15 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                          Host Control Lane
                        </Badge>
                        <CardTitle className="flex items-center gap-2 text-lg text-amber-950 dark:text-amber-50">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                            <Zap className="h-4 w-4" />
                          </span>
                          Host Run Flow
                        </CardTitle>
                      </div>
                      <div className="rounded-full border border-amber-400/40 bg-white/70 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-amber-700 dark:border-amber-400/20 dark:bg-amber-950/30 dark:text-amber-200">
                        Save Before Start
                      </div>
                    </div>
                    <CardDescription>
                      Keep the run workflow simple and consistent every time you prepare a quiz.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 py-5">
                    <div className="rounded-2xl border border-amber-300/40 bg-white/65 p-3 text-sm text-amber-900 shadow-sm dark:border-amber-400/20 dark:bg-black/10 dark:text-amber-100">
                      This is the safest sequence for every host session. Keep resets as a separate recovery action and focus this lane on run preparation.
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 rounded-xl border border-slate-300/70 bg-slate-100/90 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">1. Make Changes</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 shadow-sm">
                        <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">2. Save Quiz</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 shadow-sm">
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">3. Start Quiz</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed border-border/60 bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Current Quiz Run</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {frontendQuizGameId ? "Saved run ready" : "No saved run yet"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {frontendQuizGameId
                          ? frontendQuizGameId
                          : "Save Quiz to create the current host run ID before starting."}
                      </p>
                    </div>
                    <Badge variant={frontendQuizGameId ? (isQuizConfigSaved ? "default" : "secondary") : "outline"}>
                      {frontendQuizGameId ? (isQuizConfigSaved ? "Saved" : "Unsaved Changes") : "No Saved Run"}
                    </Badge>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {workspaceItems
                    .filter((item) => item.id !== "overview")
                    .map(({ id, label, description, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => activateWorkspace(id)}
                        className="group rounded-2xl border border-border/60 bg-card/80 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-primary/10 p-2 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{label}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </>
            )}

            {activeWorkspace === "quiz" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Quiz Configuration
                    </CardTitle>
                    <CardDescription>
                      View question stats and control how session questions are selected.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">Manage the full quiz library</p>
                        <p className="text-xs text-muted-foreground">
                          Open Quiz Bank to create, edit, import, or export quiz sets.
                        </p>
                      </div>
                      <Button asChild variant="outline" className="gap-2">
                        <Link to="/quiz-management">
                          <BookOpen className="h-4 w-4" />
                          Quiz Bank
                        </Link>
                      </Button>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div className="p-2 bg-background rounded">
                          <p className="text-muted-foreground">Total Questions</p>
                          <p className="text-2xl font-bold text-primary">{totalQuestions}</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-muted-foreground">Quizzes</p>
                          <p className="text-2xl font-bold text-primary">{dbSubjects.length}</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-muted-foreground text-xs">Excluded (used ≥{maxUsedCountThreshold}x)</p>
                          <p className="text-2xl font-bold text-orange-600">{totalQuestions - totalAvailableByThreshold}</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-muted-foreground text-xs">Available (used &lt;{maxUsedCountThreshold}x)</p>
                          <p className="text-2xl font-bold text-green-600">{totalAvailableByThreshold}</p>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <p className="text-muted-foreground">Status</p>
                          <p className="text-lg font-bold text-green-600">{dbLoading ? "Loading..." : "Ready"}</p>
                        </div>
                      </div>

                      {dbSubjects.length > 0 && (
                        <div className="mt-4 pt-3 border-t space-y-3">
                          <p className="text-sm font-medium">Available by Quiz (usedCount &lt; {maxUsedCountThreshold}):</p>
                          {dbSubjects.map((subject) => {
                            const total = questionCounts[subject] || 0;
                            const thresholdData = availableByThreshold[subject];
                            const available = thresholdData?.available || 0;
                            const availablePercent = total > 0 ? (available / total) * 100 : 0;
                            const avgUsedCount = avgUsedCountBySubject[subject] || 0;
                            const isActive = topicSettings[subject] !== false;

                            return (
                              <div key={subject} className={`space-y-1 p-2 rounded-lg transition-all ${!isActive ? "bg-muted/50 opacity-60" : ""}`}>
                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={isActive}
                                      onCheckedChange={async (checked) => {
                                        const next = { ...topicSettings, [subject]: checked };
                                        setTopicSettings(next);
                                      }}
                                      className="scale-75"
                                    />
                                    <span className={`font-medium ${!isActive ? "line-through text-muted-foreground" : ""}`}>{subject}</span>
                                  </div>
                                  <span className="text-muted-foreground">
                                    <span className={`font-semibold ${isActive ? "text-green-600" : "text-muted-foreground"}`}>{available} available</span> / {total} total (avg usage: {avgUsedCount})
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted-foreground/20 overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${isActive ? "bg-green-500" : "bg-muted-foreground/40"}`}
                                    style={{ width: `${availablePercent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <div className="pt-2 border-t">
                            <p className="text-sm font-semibold">
                              Total Available: <span className="text-green-600">{totalAvailableByThreshold}</span> / {totalQuestions} questions
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Toggle topics off to exclude them from quiz generation.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-muted rounded-lg space-y-4">
                      <p className="font-semibold">Session Filters</p>

                      <div>
                        <Label htmlFor="questionsPerCategory">Questions per Quiz (Displayed)</Label>
                        <Input
                          id="questionsPerCategory"
                          type="number"
                          min="10"
                          max="100"
                          value={questionsPerCategory}
                          onChange={(e) =>
                            setQuestionsPerCategory(
                              parseInt(e.target.value) || DEFAULT_QUIZ_SETTINGS.questionsPerCategory
                            )
                          }
                          className="mt-2 max-w-xs"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Only this many random questions will be shown per quiz during gameplay.
                        </p>
                      </div>

                      <div className="pt-2 border-t">
                        <Label htmlFor="max-used-count">Show questions used less than ___ times</Label>
                        <Input
                          id="max-used-count"
                          type="number"
                          min="1"
                          max="100"
                          value={maxUsedCountThreshold}
                          onChange={(e) =>
                            setMaxUsedCountThreshold(
                              Math.max(
                                1,
                                parseInt(e.target.value) || DEFAULT_QUIZ_SETTINGS.maxUsedCountThreshold
                              )
                            )
                          }
                          className="mt-2 max-w-xs"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Default is 1 (only fresh questions). Set to 2 to include questions used once, etc.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="space-y-0.5">
                          <Label htmlFor="shuffle-questions">Shuffle Questions</Label>
                          <p className="text-sm text-muted-foreground">
                            When ON, questions are randomized. When OFF, Q1 = Question ID 1, Q2 = Question ID 2, etc.
                          </p>
                        </div>
                        <Switch
                          id="shuffle-questions"
                          checked={shuffleQuestions}
                          onCheckedChange={setShuffleQuestions}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
                  <ShowConfigurationCard />
                  <BrandingEditorCard />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Teams Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure team names and member names (comma-separated)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <Label htmlFor="team-count">Number of Teams (2-4 teams)</Label>
                        <Input
                          id="team-count"
                          type="number"
                          min="2"
                          max="4"
                          value={teamCount}
                          onChange={(e) => handleTeamCountChange(parseInt(e.target.value) || 4)}
                          className="mt-2 max-w-xs"
                        />
                      </div>
                      {teams.map((team, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                          <div className="flex flex-col items-center gap-2">
                            <Label>Team Avatar</Label>
                            <div className="relative">
                              {team.avatar ? (
                                <div className="relative group">
                                  <img
                                    src={team.avatar}
                                    alt={team.name}
                                    className="w-20 h-20 rounded-full object-cover border-2 border-border shadow-md"
                                  />
                                  <button
                                    onClick={() => removeAvatar(index)}
                                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                                  <Image className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleAvatarUpload(index, e)}
                              />
                              <span className="text-xs text-primary hover:underline">
                                {team.avatar ? 'Change' : 'Upload'}
                              </span>
                            </label>
                          </div>
                          <div>
                            <Label htmlFor={`team-name-${index}`}>Team {index + 1} Name</Label>
                            <Input
                              id={`team-name-${index}`}
                              value={team.name}
                              onChange={(e) => handleTeamNameChange(index, e.target.value)}
                              placeholder={`Team ${index + 1}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`team-members-${index}`}>Members (comma-separated)</Label>
                            <Input
                              id={`team-members-${index}`}
                              value={memberInputs[index] || ""}
                              onChange={(e) => handleMembersChange(index, e.target.value)}
                              placeholder="John, Jane, Bob"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {modeSupportsViewers(currentAppMode) && (
                  <Card className="border-primary/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Radio className="h-5 w-5 text-destructive" />
                        YouTube Live Integration
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Configure viewer intake and stream sources as part of the core quiz setup flow.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="youtube-integration">Enable YouTube Integration</Label>
                          <p className="text-xs text-muted-foreground">
                            When enabled, the quiz will show the YouTube Live panel and collect viewer responses from SSE stream
                          </p>
                        </div>
                        <Switch
                          id="youtube-integration"
                          checked={youtubeIntegrationEnabled}
                          onCheckedChange={(checked) => {
                            setYoutubeIntegrationEnabled(checked);
                            window.dispatchEvent(new CustomEvent("youtubeIntegrationChanged", { detail: checked }));
                            toast({
                              title: checked ? "YouTube Integration Enabled" : "YouTube Integration Disabled",
                              description: checked 
                                ? "YouTube Live panel will be shown during quiz" 
                                : "Quiz will run in standalone mode without YouTube",
                            });
                          }}
                          disabled={!sseEnabled}
                        />
                      </div>

                      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                        <div>
                          <Label>Streams</Label>
                          <p className="text-xs text-muted-foreground">
                            Manage the active live sources here. Auto-discovered channel lives and manual stream URLs both belong to this host flow.
                          </p>
                        </div>
                        <AdminStreamManager />
                      </div>

                      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                        <div>
                          <Label>Viewer Widgets</Label>
                          <p className="text-xs text-muted-foreground">
                            Control optional viewer-side widgets shown in the quiz UI. Keep incomplete features hidden until they are production-ready.
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <Label htmlFor="show-engagement-heatmap">Show Engagement Heatmap</Label>
                            <p className="text-xs text-muted-foreground">
                              Hides the “No engagement data yet” card when this experimental widget is not in use.
                            </p>
                          </div>
                          <Switch
                            id="show-engagement-heatmap"
                            checked={showEngagementHeatmap}
                            onCheckedChange={setShowEngagementHeatmap}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <Label htmlFor="show-viewer-predictions">Show Viewer Predictions</Label>
                            <p className="text-xs text-muted-foreground">
                              Keeps the unfinished viewer prediction panel hidden from the quiz UI until the full flow is implemented.
                            </p>
                          </div>
                          <Switch
                            id="show-viewer-predictions"
                            checked={showViewerPredictions}
                            onCheckedChange={setShowViewerPredictions}
                          />
                        </div>
                      </div>

                      {!sseEnabled && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            Enable SSE Stream first to use YouTube integration.
                          </p>
                        </div>
                      )}

                      {youtubeIntegrationEnabled && sseEnabled && (
                        <div className="p-3 rounded-lg bg-muted/50 border border-muted-foreground/20">
                          <p className="text-sm text-muted-foreground">
                            <strong>Note:</strong> YouTube Live panel is automatically hidden during Powerplay to avoid scoring latency issues.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {activeWorkspace === "branding" && (
              <>
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                  <ThemeSelectorCard />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-primary" />
                      Ticker Messages
                    </CardTitle>
                    <CardDescription>
                      Customize messages shown in the ticker below question options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="ticker-enabled">Enable Ticker</Label>
                        <p className="text-sm text-muted-foreground">
                          Show ticker messages below question options during quiz
                        </p>
                      </div>
                      <Switch
                        id="ticker-enabled"
                        checked={tickerEnabled}
                        onCheckedChange={setTickerEnabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticker-regular">Regular Question Message</Label>
                      <Input
                        id="ticker-regular"
                        value={tickerMessageRegular}
                        onChange={(e) => setTickerMessageRegular(e.target.value)}
                        placeholder="Message for regular questions..."
                        disabled={!tickerEnabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticker-powerplay">Powerplay Message</Label>
                      <Input
                        id="ticker-powerplay"
                        value={tickerMessagePowerplay}
                        onChange={(e) => setTickerMessagePowerplay(e.target.value)}
                        placeholder="Message during powerplay..."
                        disabled={!tickerEnabled}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Display Settings
                    </CardTitle>
                    <CardDescription>
                      Configure what is displayed during the quiz
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="activity-feed">Activity Feed</Label>
                        <p className="text-sm text-muted-foreground">
                          Show live activity log of game events (answers, passes, etc.)
                        </p>
                      </div>
                      <Switch
                        id="activity-feed"
                        checked={showActivityFeed}
                        onCheckedChange={setShowActivityFeed}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="difficulty-badge">Difficulty Badge</Label>
                        <p className="text-sm text-muted-foreground">
                          Show difficulty level (Easy/Medium/Hard) next to question text
                        </p>
                      </div>
                      <Switch
                        id="difficulty-badge"
                        checked={showDifficultyBadge}
                        onCheckedChange={setShowDifficultyBadge}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="save-indicator">Save Indicator</Label>
                        <p className="text-sm text-muted-foreground">
                          Show "Game Saved" indicator when game state auto-saves
                        </p>
                      </div>
                      <Switch
                        id="save-indicator"
                        checked={showSaveIndicator}
                        onCheckedChange={setShowSaveIndicator}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="toast-messages">Toast Messages</Label>
                        <p className="text-sm text-muted-foreground">
                          Show popup notifications for quiz events (errors, warnings, etc.)
                        </p>
                      </div>
                      <Switch
                        id="toast-messages"
                        checked={showToastMessages}
                        onCheckedChange={setShowToastMessages}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="intro-animation">Intro Animation</Label>
                        <p className="text-sm text-muted-foreground">
                          Show pre-game countdown animation before quiz starts
                        </p>
                      </div>
                      <Switch
                        id="intro-animation"
                        checked={showIntroAnimation}
                        onCheckedChange={setShowIntroAnimation}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg border border-red-500/30">
                      <div className="space-y-0.5">
                        <Label htmlFor="mask-viewer-responses" className="flex items-center gap-2">
                          <Youtube className="h-4 w-4 text-red-500" />
                          Mask Viewer Responses before Answer Reveal
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Hide viewer's answer choices (A/B/C/D) with "?" until answer is revealed (applies to Live & Q-Board tabs)
                        </p>
                      </div>
                      <Switch
                        id="mask-viewer-responses"
                        checked={maskViewerResponses}
                        onCheckedChange={setMaskViewerResponses}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/30">
                      <div className="space-y-0.5">
                        <Label htmlFor="tv-mode" className="flex items-center gap-2">
                          <Tv className="h-4 w-4 text-blue-500" />
                          TV Mode
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Optimize interface for TV/large screen viewing with bigger text, icons, and minimal visual effects
                        </p>
                      </div>
                      <Switch
                        id="tv-mode"
                        checked={tvModeEnabled}
                        onCheckedChange={setTvModeEnabled}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-lg border border-amber-500/30">
                      <div className="space-y-0.5">
                        <Label htmlFor="fixed-leaderboard" className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-amber-500" />
                          Fixed Leaderboard
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Keep teams in fixed positions (no reordering when scores change)
                        </p>
                      </div>
                      <Switch
                        id="fixed-leaderboard"
                        checked={fixedLeaderboard}
                        onCheckedChange={setFixedLeaderboard}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-lg border border-indigo-500/30">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-sequence-numbers" className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-indigo-500" />
                          Show Sequence Numbers
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Display question numbers (Q1, Q2...) on the question grid buttons
                        </p>
                      </div>
                      <Switch
                        id="show-sequence-numbers"
                        checked={showSequenceNumbers}
                        onCheckedChange={setShowSequenceNumbers}
                      />
                    </div>
                  </CardContent>
                </Card>

                <SoundEffectsCard />
              </>
            )}

            {activeWorkspace === "scoring" && (
              <>
                {currentAppMode === 'backend_scoring' && <ScoringEngineConfigCard />}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Scoring Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="correctAnswerScore">Correct Answer Score (points)</Label>
                      <Input
                        id="correctAnswerScore"
                        type="number"
                        min="0"
                        value={correctAnswerScore}
                        onChange={(e) => setCorrectAnswerScore(parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wrongAnswerPenalty">Wrong Answer Penalty (points)</Label>
                      <Input
                        id="wrongAnswerPenalty"
                        type="number"
                        min="0"
                        value={wrongAnswerPenalty}
                        onChange={(e) => setWrongAnswerPenalty(parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lifelinePenalty">Lifeline Penalty (points)</Label>
                      <Input
                        id="lifelinePenalty"
                        type="number"
                        min="0"
                        value={lifelinePenalty}
                        onChange={(e) => setLifelinePenalty(parseInt(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground">Applies to "Verify Answer" and "Change Question" lifelines</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teamLifelines">Team Lifelines (per team)</Label>
                      <Input
                        id="teamLifelines"
                        type="number"
                        min="0"
                        max="20"
                        value={teamLifelines}
                        onChange={(e) => setTeamLifelinesAdmin(parseInt(e.target.value) || 5)}
                      />
                      <p className="text-xs text-muted-foreground">Number of lifelines each team starts with. Used for "Verify Answer" and "Change Question".</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-lg border border-emerald-500/30 space-y-2">
                      <Label htmlFor="minimumCorrectScore" className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-emerald-500" />
                        Minimum Correct Answer Score (Viewers)
                      </Label>
                      <Input
                        id="minimumCorrectScore"
                        type="number"
                        min="0"
                        max="500"
                        value={minimumCorrectScore}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          setMinimumCorrectScore(Number.isFinite(value) ? value : 100);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum score awarded to viewers for correct answers regardless of response time. Default: 100
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Timer Settings
                    </CardTitle>
                    <CardDescription>
                      Configure timer durations for the game
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-muted rounded-lg">
                      <label className="text-sm font-medium mb-2 block">
                        Master Game Timer (minutes)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="300"
                        value={masterTimerDuration}
                        onChange={(e) => setMasterTimerDuration(parseInt(e.target.value) || 100)}
                        placeholder="100"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Total game duration. The game will end when this timer reaches zero.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Question Timer Duration (seconds)
                      </label>
                      <Input
                        type="number"
                        min="10"
                        max="300"
                        value={timerDuration}
                        onChange={(e) => setTimerDuration(parseInt(e.target.value) || 90)}
                        placeholder="90"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Time for the original team to answer a question.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Passed Question Timer (seconds)
                      </label>
                      <Input
                        type="number"
                        min="5"
                        max="60"
                        value={passedQuestionTimer}
                        onChange={(e) => setPassedQuestionTimer(parseInt(e.target.value) || 15)}
                        placeholder="15"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Time for teams to answer when a question is passed to them.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Answer Reveal Countdown (seconds)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="15"
                        value={revealCountdownDuration}
                        onChange={(e) => setRevealCountdownDuration(parseInt(e.target.value) || 5)}
                        placeholder="5"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Duration of countdown before revealing if an answer is correct.
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/30">
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-500" />
                        Powerplay Duration (minutes)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={rapidFireDuration}
                        onChange={(e) => setRapidFireDuration(parseInt(e.target.value) || 5)}
                        placeholder="5"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Duration of powerplay mode where one team answers all questions continuously without time limit.
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-orange-500/20">
                        <div className="space-y-0.5">
                          <Label htmlFor="powerplay-enabled">Enable Powerplay</Label>
                          <p className="text-xs text-muted-foreground">
                            Allow teams to activate powerplay mode during quiz
                          </p>
                        </div>
                        <Switch
                          id="powerplay-enabled"
                          checked={powerplayEnabled}
                          onCheckedChange={setPowerplayEnabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeWorkspace === "backup" && (
              <>
                {modeSupportsViewers(currentAppMode) && (
                  <Card className="border-border/60">
                    <CardContent className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-youtube-autopost-panel">Show YouTube Auto-Post panel in Quiz UI</Label>
                        <p className="text-xs text-muted-foreground">
                          This only controls the quiz-side status card. Backend YouTube messaging still runs even while the panel stays hidden.
                        </p>
                      </div>
                      <Switch
                        id="show-youtube-autopost-panel"
                        checked={showYouTubeAutoPostPanel}
                        onCheckedChange={setShowYouTubeAutoPostPanel}
                      />
                    </CardContent>
                  </Card>
                )}

                {modeSupportsViewers(currentAppMode) && (
                  <Card className="border-dashed border-border/60 bg-muted/20">
                    <CardContent className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Current Quiz Run</p>
                        <p className="text-xs text-muted-foreground">
                          {frontendQuizGameId
                            ? isQuizConfigSaved
                              ? `Saved run ready: ${frontendQuizGameId}`
                              : `Run ${frontendQuizGameId} has unsaved Admin changes. Save Quiz before starting.`
                            : "No saved quiz run yet. Save Quiz to create the run ID, then Start Quiz."}
                        </p>
                      </div>
                      <Badge variant={frontendQuizGameId ? (isQuizConfigSaved ? "default" : "secondary") : "outline"}>
                        {frontendQuizGameId ? (isQuizConfigSaved ? "Saved" : "Unsaved Changes") : "No Saved Run"}
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {modeSupportsViewers(currentAppMode) && <YouTubeChatSenderCard />}
                {modeSupportsViewers(currentAppMode) && <TelegramGroupSenderCard />}
              </>
            )}

            {activeWorkspace === "data" && (
              <>
                <div className="grid gap-5 xl:grid-cols-2">
                  <AppModeSelector />
                  {modeRequiresSSE(currentAppMode) ? <SSEServerConfigCard /> : null}
                </div>

                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Viewer Analytics Storage
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Consent toggle for storing final live leaderboard snapshots in orchestrator MongoDB.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                      <div className="space-y-0.5">
                        <Label htmlFor="quiz-analytics-enabled-dup">Enable Backend Analytics</Label>
                        <p className="text-xs text-muted-foreground">
                          ON: writes completed quiz final leaderboard to MongoDB for analytics. OFF: keeps only local IndexedDB backup.
                        </p>
                      </div>
                      <Switch
                        id="quiz-analytics-enabled-dup"
                        checked={quizAnalyticsEnabled}
                        onCheckedChange={(checked) => {
                          setQuizAnalyticsEnabledState(checked);
                          toast({
                            title: checked ? "Backend Analytics Enabled" : "Backend Analytics Disabled",
                            description: checked
                              ? "Completed quiz final viewer stats will be sent to orchestrator MongoDB."
                              : "Completed quiz stats will stay local (IndexedDB backup only).",
                          });
                        }}
                      />
                    </div>
                    <div className="mt-3 rounded-lg border border-border/60 p-3 bg-muted/40">
                      <div className="text-xs font-semibold mb-1">Live Leaderboard Sync Diagnostics</div>
                      <div className="text-xs text-muted-foreground">
                        Last Sync: {liveSyncDiagnostics.lastSyncAt ? new Date(liveSyncDiagnostics.lastSyncAt).toLocaleString() : "n/a"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last Restore Source: {liveSyncDiagnostics.restoreSource || "n/a"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Failures: {liveSyncDiagnostics.failureCount}
                      </div>
                      {liveSyncDiagnostics.lastError && (
                        <div className="text-xs text-destructive mt-1">
                          Last Error ({liveSyncDiagnostics.lastErrorAt ? new Date(liveSyncDiagnostics.lastErrorAt).toLocaleString() : "n/a"}): {liveSyncDiagnostics.lastError}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* ── Host Account ─────────────────────────────────────── */}
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Host Account &amp; Login History
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Google OAuth profile and recent login attempts stored by the auth service.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {hostProfileLoading && (
                      <div className="text-sm text-muted-foreground py-4 text-center">Loading host profile…</div>
                    )}
                    {!hostProfileLoading && hostProfile && (
                      <div className="space-y-4">
                        {/* Profile summary */}
                        <div className="flex items-start gap-4 p-4 bg-muted rounded-lg border border-border">
                          {hostProfile.profilePicture && (
                            <img
                              src={hostProfile.profilePicture}
                              alt={hostProfile.name}
                              className="w-12 h-12 rounded-full flex-shrink-0"
                            />
                          )}
                          <div className="space-y-1 min-w-0">
                            <div className="font-semibold text-sm">{hostProfile.name}</div>
                            <div className="text-xs text-muted-foreground">{hostProfile.email}</div>
                            <div className="text-xs text-muted-foreground">
                              Auth: <span className="font-medium">{hostProfile.authProvider}</span>
                            </div>
                            {hostProfile.lastLoginAt && (
                              <div className="text-xs text-muted-foreground">
                                Last login: {new Date(hostProfile.lastLoginAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* YouTube channel info */}
                        {hostProfile.youtubeChannel?.id ? (
                          <div className="p-4 bg-muted rounded-lg border border-border space-y-1">
                            <div className="text-xs font-semibold flex items-center gap-1.5">
                              <Youtube className="h-3.5 w-3.5 text-red-500" />
                              YouTube Channel
                            </div>
                            {hostProfile.youtubeChannel.thumbnail && (
                              <img src={hostProfile.youtubeChannel.thumbnail} alt="" className="w-10 h-10 rounded-full" />
                            )}
                            <div className="text-xs font-medium">{hostProfile.youtubeChannel.title}</div>
                            <div className="text-xs text-muted-foreground">ID: {hostProfile.youtubeChannel.id}</div>
                            {hostProfile.youtubeChannel.subscriberCount != null && (
                              <div className="text-xs text-muted-foreground">
                                Subscribers: {hostProfile.youtubeChannel.subscriberCount.toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg border border-border">
                            No YouTube channel linked.
                          </div>
                        )}

                        {/* Session info */}
                        {hostSession && (
                          <div className="p-4 bg-muted rounded-lg border border-border space-y-1">
                            <div className="text-xs font-semibold">Current Session</div>
                            <div className="text-xs text-muted-foreground">User ID: {hostSession.userId}</div>
                            <div className="text-xs text-muted-foreground">Roles: {hostSession.roles.join(", ") || "none"}</div>
                            {hostSession.tokenExpiresAt && (
                              <div className="text-xs text-muted-foreground">
                                Token expires: {new Date(hostSession.tokenExpiresAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {!hostProfileLoading && !hostProfile && (
                      <div className="text-xs text-muted-foreground p-4 bg-muted rounded-lg border border-border">
                        Host profile unavailable — ensure the auth service is reachable.
                      </div>
                    )}

                    {/* Login history table */}
                    {hostLoginHistory.length > 0 && (
                      <div className="mt-5">
                        <div className="text-xs font-semibold mb-2">Recent Login Attempts ({hostLoginHistory.length})</div>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-xs">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold">Time</th>
                                <th className="text-left px-3 py-2 font-semibold">Result</th>
                                <th className="text-left px-3 py-2 font-semibold">Type</th>
                                <th className="text-left px-3 py-2 font-semibold">IP</th>
                                <th className="text-left px-3 py-2 font-semibold">Device</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hostLoginHistory.map((attempt) => (
                                <tr key={attempt._id} className="border-t border-border hover:bg-muted/50">
                                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                    {new Date(attempt.createdAt).toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={attempt.success ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                                      {attempt.success ? "Success" : "Failed"}
                                    </span>
                                    {attempt.failureReason && (
                                      <span className="text-muted-foreground ml-1">({attempt.failureReason})</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">{attempt.authType}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{attempt.ip}</td>
                                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]" title={attempt.userAgent || ""}>
                                    {attempt.userAgent ? attempt.userAgent.substring(0, 60) + (attempt.userAgent.length > 60 ? "…" : "") : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeWorkspace === "policy" && <PrizePolicyPage embedded />}

            {activeWorkspace === "boards" && <ObsBoards embedded />}
          </main>
        </div>
      </div>
    </div>
    </>
  );
};

export default Admin;
