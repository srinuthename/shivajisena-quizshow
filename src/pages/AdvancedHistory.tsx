import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, Users, Calendar, Clock, CheckCircle, XCircle,
  ChevronRight, BarChart3, History, Medal, Download, Trash2,
  FileJson, FileSpreadsheet, Star, TrendingUp, Zap, Target, Flame, Award, Activity,
  Hash, Percent, Timer, Eye, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import type { QuizSessionRecord } from "@/hooks/useQuizSession";
interface AllTimeViewerRecord {
  odytChannelId: string;
  userName: string;
  avatarUrl: string;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  totalResponseTimeMs: number;
  quizzesParticipated: number;
  lastParticipatedAt: number;
  sessionIds: string[];
}
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format as formatDate, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AnimatedScore } from "@/components/AnimatedScore";
import {
  clearAllBackendQuizResultsHistory,
  deleteAbortedQuizResultsHistory,
  deleteQuizResultsEpisode,
  getQuizResults,
  getQuizResultsHistory,
} from "@/services/quizResultsApi";
import {
  getAnalyticsQuizRuns,
  postQuizRunLifecycle,
  type AnalyticsQuizRunRow,
} from "@/services/analyticsApi";
import type { SaveQuizResultsPayload } from "@/types/quizResults";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line
} from "recharts";

type HistorySession = QuizSessionRecord & {
  hasResultSnapshot: boolean;
  lifecycleStatus?: AnalyticsQuizRunRow["status"];
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 173 58% 39%))",
  "hsl(var(--chart-3, 197 37% 24%))",
  "hsl(var(--chart-4, 43 74% 66%))",
  "hsl(var(--chart-5, 27 87% 67%))",
];

const toSessionStatus = (status?: string | null): QuizSessionRecord["status"] => {
  if (status === "completed") return "completed";
  if (status === "aborted") return "aborted";
  return "active";
};

const toTimestamp = (value?: string | number | null): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};

const mapQuizResultToSession = (
  frontendQuizGameId: string,
  payload: SaveQuizResultsPayload
): HistorySession => {
  const panel = payload.panelLeaderboard;
  const live = payload.liveLeaderboard;
  const episode = panel?.episode || live?.episode;
  const createdAt = toTimestamp(episode?.startedAt);
  const endedAtRaw = episode?.endedAt ? toTimestamp(episode.endedAt) : null;
  return {
    id: String(episode?.frontendQuizGameId || frontendQuizGameId),
    frontendQuizGameId: episode?.frontendQuizGameId || frontendQuizGameId,
    createdAt,
    startedAt: createdAt,
    endedAt: endedAtRaw,
    status: toSessionStatus(episode?.status),
    episodeNumber: String(episode?.episodeNumber || episode?.episodeName || frontendQuizGameId),
    teamLeaderboard: (panel?.teams || []).map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      members: (team.members || []).map((member) => member.name),
      finalScore: team.finalScore,
      rank: team.rank,
    })),
    viewerLeaderboard: (live?.viewers || []).map((viewer) => ({
      odytChannelId: viewer.odytChannelId,
      userName: viewer.displayName || viewer.userName,
      avatarUrl: viewer.avatarUrl,
      totalScore: viewer.totalScore,
      correctAnswers: viewer.correctAnswers,
      totalResponses: viewer.totalResponses,
      avgResponseTimeMs: viewer.avgResponseTimeMs,
      rank: viewer.rank,
    })),
    currentQuestionLeaderboard: (live?.currentQuestionResponses || []).map((row) => ({
      id: row.id,
      odytChannelId: row.odytChannelId,
      userName: row.userName,
      avatarUrl: row.avatarUrl,
      answer: row.answer,
      responseTimeMs: row.responseTimeMs,
      isCorrect: row.isCorrect ?? undefined,
      score: row.score,
    })),
    currentCumulativeLeaderboard: (live?.viewers || []).map((viewer) => ({
      odytChannelId: viewer.odytChannelId,
      userName: viewer.displayName || viewer.userName,
      avatarUrl: viewer.avatarUrl,
      totalScore: viewer.totalScore,
      correctAnswers: viewer.correctAnswers,
      totalResponses: viewer.totalResponses,
      avgResponseTimeMs: viewer.avgResponseTimeMs,
      rank: viewer.rank,
    })),
    lastViewerBoardsUpdatedAt: endedAtRaw || createdAt,
    totalQuestions: episode?.totalQuestions || 0,
    totalViewerResponses: live?.totalResponses || 0,
    totalViewers: live?.totalUniqueViewers || 0,
    hasResultSnapshot: true,
    lifecycleStatus:
      episode?.status === "completed"
        ? "ended"
        : episode?.status === "aborted"
          ? "aborted"
          : "created",
  };
};

const mapQuizRunToSession = (run: AnalyticsQuizRunRow): HistorySession => {
  const createdAt = toTimestamp(run.createdAtServer);
  const endedAt = run.status === "ended" || run.status === "closed" || run.status === "aborted"
    ? toTimestamp(run.closedAtServer || run.updatedAt || run.createdAtServer)
    : null;

  return {
    id: run.frontendQuizGameId,
    frontendQuizGameId: run.frontendQuizGameId,
    createdAt,
    startedAt: createdAt,
    endedAt,
    status:
      run.status === "ended"
        ? "completed"
        : run.status === "aborted"
          ? "aborted"
          : "active",
    episodeNumber: String(run.episodeNumber || run.episodeName || run.frontendQuizGameId),
    teamLeaderboard: [],
    viewerLeaderboard: [],
    currentQuestionLeaderboard: [],
    currentCumulativeLeaderboard: [],
    lastViewerBoardsUpdatedAt: endedAt || createdAt,
    totalQuestions: 0,
    totalViewerResponses: 0,
    totalViewers: 0,
    hasResultSnapshot: false,
    lifecycleStatus: run.status,
  };
};

const buildAllTimeLeaderboard = (sessions: QuizSessionRecord[]): AllTimeViewerRecord[] => {
  const aggregate = new Map<string, AllTimeViewerRecord>();
  sessions
    .filter((session) => session.status !== "aborted")
    .forEach((session) => {
      session.viewerLeaderboard.forEach((viewer) => {
        const key = viewer.odytChannelId;
        const existing = aggregate.get(key);
        if (existing) {
          existing.userName = viewer.userName || existing.userName;
          existing.avatarUrl = viewer.avatarUrl || existing.avatarUrl;
          existing.totalScore += viewer.totalScore || 0;
          existing.correctAnswers += viewer.correctAnswers || 0;
          existing.totalResponses += viewer.totalResponses || 0;
          existing.totalResponseTimeMs += viewer.avgResponseTimeMs * viewer.totalResponses || 0;
          existing.quizzesParticipated += 1;
          existing.lastParticipatedAt = Math.max(existing.lastParticipatedAt, session.endedAt || session.createdAt);
          const sid = String(session.frontendQuizGameId || session.id);
          if (!existing.sessionIds.includes(sid)) existing.sessionIds.push(sid);
        } else {
          aggregate.set(key, {
            odytChannelId: key,
            userName: viewer.userName || key,
            avatarUrl: viewer.avatarUrl,
            totalScore: viewer.totalScore || 0,
            correctAnswers: viewer.correctAnswers || 0,
            totalResponses: viewer.totalResponses || 0,
            totalResponseTimeMs: (viewer.avgResponseTimeMs || 0) * (viewer.totalResponses || 0),
            quizzesParticipated: 1,
            lastParticipatedAt: session.endedAt || session.createdAt,
            sessionIds: [String(session.frontendQuizGameId || session.id)],
          });
        }
      });
    });
  return Array.from(aggregate.values()).sort((a, b) =>
    b.totalScore - a.totalScore ||
    b.correctAnswers - a.correctAnswers ||
    a.userName.localeCompare(b.userName)
  );
};

const AdvancedHistory = ({ embedded = false }: { embedded?: boolean }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [quizRuns, setQuizRuns] = useState<AnalyticsQuizRunRow[]>([]);
  const [selectedSession, setSelectedSession] = useState<HistorySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<AllTimeViewerRecord[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<"sessions" | "alltime">("sessions");

  const loadData = async () => {
    try {
      const [history, runHistory] = await Promise.all([
        getQuizResultsHistory(),
        getAnalyticsQuizRuns(1, 250, ""),
      ]);
      if (!history.success || !history.episodes) {
        throw new Error(history.error || "Failed to load advanced history");
      }
      if (!runHistory.success || !runHistory.data?.runs) {
        throw new Error(runHistory.error || "Failed to load quiz run lifecycle");
      }
      const detailedResults = await Promise.all(
        history.episodes.map(async (episode) => {
          const runId = String(episode.frontendQuizGameId || '').trim();
          if (!runId) return null;
          const result = await getQuizResults(runId);
          if (!result.success || !result.data) return null;
          return mapQuizResultToSession(runId, result.data);
        })
      );
      const resultSessions = detailedResults.filter((session): session is HistorySession => Boolean(session));
      const mergedSessions = new Map<string, HistorySession>();

      resultSessions.forEach((session) => {
        const key = String(session.frontendQuizGameId || session.id);
        mergedSessions.set(key, session);
      });

      (runHistory.data.runs || []).forEach((run) => {
        const key = String(run.frontendQuizGameId || "").trim();
        if (!key) return;
        const existing = mergedSessions.get(key);
        if (!existing) {
          mergedSessions.set(key, mapQuizRunToSession(run));
          return;
        }
        mergedSessions.set(key, {
          ...existing,
          lifecycleStatus: run.status,
          createdAt: existing.createdAt || toTimestamp(run.createdAtServer),
          endedAt:
            existing.endedAt ||
            (run.status === "ended" || run.status === "closed" || run.status === "aborted"
              ? toTimestamp(run.closedAtServer || run.updatedAt || run.createdAtServer)
              : null),
          status:
            run.status === "ended"
              ? "completed"
              : run.status === "aborted"
                ? "aborted"
                : existing.status,
        });
      });

      const allSessions = Array.from(mergedSessions.values()).sort((a, b) => b.createdAt - a.createdAt);
      setSessions(allSessions);
      setAllTimeLeaderboard(buildAllTimeLeaderboard(allSessions));
      setQuizRuns(runHistory.data.runs);
    } catch (error) {
      console.error("Failed to load advanced history:", error);
      toast({
        title: "Advanced History Unavailable",
        description: error instanceof Error ? error.message : "Failed to load backend quiz history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const metricSessions = useMemo(() => {
    const nonAborted = sessions.filter((s) => s.status !== "aborted");
    const deduped = new Map<string, HistorySession>();
    nonAborted.forEach((session) => {
      const key = String(session.frontendQuizGameId || session.id);
      const existing = deduped.get(key);
      if (!existing || session.createdAt > existing.createdAt) {
        deduped.set(key, session);
      }
    });
    return Array.from(deduped.values());
  }, [sessions]);

  // ========= Computed Stats =========
  const summaryStats = useMemo(() => {
    const completed = metricSessions.filter(s => s.status === "completed");
    const totalViewers = metricSessions.reduce((s, x) => s + (x.totalViewers || 0), 0);
    const totalResponses = metricSessions.reduce((s, x) => s + (x.totalViewerResponses || 0), 0);
    const totalQuestions = metricSessions.reduce((s, x) => s + (x.totalQuestions || 0), 0);
    const avgDuration = completed.length > 0
      ? completed.reduce((s, x) => s + ((x.endedAt || x.createdAt) - x.createdAt), 0) / completed.length / 60000
      : 0;
    const avgViewersPerSession = metricSessions.length > 0 ? totalViewers / metricSessions.length : 0;
    const avgResponsesPerViewer = totalViewers > 0 ? totalResponses / totalViewers : 0;
    const completionRate = metricSessions.length > 0 ? (completed.length / metricSessions.length) * 100 : 0;
    return { completed: completed.length, total: metricSessions.length, totalViewers, totalResponses, totalQuestions, avgDuration, avgViewersPerSession, avgResponsesPerViewer, completionRate };
  }, [metricSessions]);

  // Team win distribution
  const teamWinData = useMemo(() => {
    const wins = new Map<string, { name: string; value: number }>();
    metricSessions.forEach((s) => {
      if (!Array.isArray(s.teamLeaderboard) || s.teamLeaderboard.length === 0) return;
      const winner = [...s.teamLeaderboard].sort((a, b) => (a.rank || 99) - (b.rank || 99))[0];
      if (!winner?.teamName) return;
      const existing = wins.get(winner.teamName);
      if (existing) existing.value += 1;
      else wins.set(winner.teamName, { name: winner.teamName, value: 1 });
    });
    return Array.from(wins.values()).sort((a, b) => b.value - a.value);
  }, [metricSessions]);

  const viewerWinData = useMemo(() => {
    const wins = new Map<string, { name: string; value: number }>();
    metricSessions.forEach((s) => {
      if (!Array.isArray(s.viewerLeaderboard) || s.viewerLeaderboard.length === 0) return;
      const winner = [...s.viewerLeaderboard].sort((a, b) => {
        if ((a.rank || 0) !== (b.rank || 0)) return (a.rank || 0) - (b.rank || 0);
        if ((b.totalScore || 0) !== (a.totalScore || 0)) return (b.totalScore || 0) - (a.totalScore || 0);
        return (a.avgResponseTimeMs || 0) - (b.avgResponseTimeMs || 0);
      })[0];
      if (!winner?.odytChannelId) return;
      const key = winner.odytChannelId;
      const existing = wins.get(key);
      if (existing) existing.value += 1;
      else wins.set(key, { name: winner.userName || winner.odytChannelId, value: 1 });
    });
    return Array.from(wins.values()).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  }, [metricSessions]);

  const participationTrend = useMemo(() => {
    return metricSessions
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-15)
      .map(s => ({
        label: `Ep ${s.episodeNumber}`,
        viewers: s.totalViewers || 0,
        responses: s.totalViewerResponses || 0,
        questions: s.totalQuestions || 0,
      }));
  }, [metricSessions]);

  // Score progression trend
  const scoreTrend = useMemo(() => {
    return metricSessions
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-15)
      .map(s => {
        const topScore = s.viewerLeaderboard.length > 0
          ? Math.max(...s.viewerLeaderboard.map(v => v.totalScore || 0))
          : 0;
        const avgScore = s.viewerLeaderboard.length > 0
          ? s.viewerLeaderboard.reduce((sum, v) => sum + (v.totalScore || 0), 0) / s.viewerLeaderboard.length
          : 0;
        return { label: `Ep ${s.episodeNumber}`, topScore, avgScore: Math.round(avgScore) };
      });
  }, [metricSessions]);

  // ========= Export & Delete Handlers =========
  const handleDeleteSession = async (sessionId: string) => {
    const result = await deleteQuizResultsEpisode(sessionId);
    if (!result.success) {
      toast({
        title: "Delete Failed",
        description: result.error || "Failed to delete backend session",
        variant: "destructive",
      });
      return;
    }
    await loadData();
    if (selectedSession?.id === sessionId) setSelectedSession(null);
    toast({ title: "Session Deleted", description: "Backend quiz session has been removed." });
  };

  const handleDeleteAbortedSessions = async () => {
    const result = await deleteAbortedQuizResultsHistory();
    if (!result.success) {
      toast({
        title: "Delete Failed",
        description: result.error || "Failed to delete aborted backend sessions",
        variant: "destructive",
      });
      return;
    }
    await loadData();
    if (selectedSession?.status === "aborted") setSelectedSession(null);
    toast({
      title: "Aborted Sessions Deleted",
      description: `${result.deletedRuns || 0} aborted backend session${result.deletedRuns === 1 ? "" : "s"} removed`,
    });
  };

  const handleRunLifecycleUpdate = async (
    run: AnalyticsQuizRunRow,
    eventType: "closed" | "ended" | "aborted"
  ) => {
    const runLabel = [
      run.episodeNumber ? `Ep ${run.episodeNumber}` : null,
      run.episodeName || null,
      run.frontendQuizGameId,
    ]
      .filter(Boolean)
      .join(" | ");
    const actionLabel =
      eventType === "closed"
        ? "mark this run as closed"
        : eventType === "ended"
          ? "mark this run as ended and make it count in Advanced Analytics"
          : "mark this run as aborted";
    if (!window.confirm(`This will ${actionLabel}.\n\n${runLabel}`)) return;

    const result = await postQuizRunLifecycle({
      frontendQuizGameId: run.frontendQuizGameId,
      applicationId: run.applicationId || undefined,
      analyticsOwnerId: run.analyticsOwnerId || undefined,
      eventType,
      clientTs: Date.now(),
      gameTitle: run.gameTitle || "",
      episodeName: run.episodeName || "",
      episodeNumber: run.episodeNumber || "",
    });

    if (!result.success) {
      toast({
        title: "Lifecycle Update Failed",
        description: result.error || "Failed to update quiz run lifecycle",
        variant: "destructive",
      });
      return;
    }

    await loadData();
    toast({
      title: "Lifecycle Updated",
      description:
        eventType === "ended"
          ? "Run marked as ended. It will now be included in strict advanced analytics."
          : eventType === "closed"
            ? "Run marked as closed."
            : "Run marked as aborted.",
    });
  };

  const handleDeleteRun = async (run: AnalyticsQuizRunRow) => {
    const runLabel = [
      run.episodeNumber ? `Ep ${run.episodeNumber}` : null,
      run.episodeName || null,
      run.frontendQuizGameId,
    ]
      .filter(Boolean)
      .join(" | ");
    if (
      !window.confirm(
        `This will permanently delete the run and related backend quiz history, analytics, actions, and prizes.\n\n${runLabel}`
      )
    ) {
      return;
    }

    const result = await deleteQuizResultsEpisode(run.frontendQuizGameId);
    if (!result.success) {
      toast({
        title: "Delete Failed",
        description: result.error || "Failed to delete backend run",
        variant: "destructive",
      });
      return;
    }

    await loadData();
    if (selectedSession?.frontendQuizGameId === run.frontendQuizGameId) setSelectedSession(null);
    toast({
      title: "Run Deleted",
      description: "Backend run and related data have been removed.",
    });
  };

  const exportAsJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportAsCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value ?? '';
      }).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleExportAllSessions = (fmt: 'json' | 'csv') => {
    if (fmt === 'json') {
      exportAsJSON(sessions, `quiz-history-${formatDate(new Date(), 'yyyy-MM-dd')}`);
    } else {
      const flat = sessions.map(s => ({
        id: s.id, episodeNumber: s.episodeNumber, status: s.status,
        createdAt: formatDate(s.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        endedAt: s.endedAt ? formatDate(s.endedAt, 'yyyy-MM-dd HH:mm:ss') : '',
        totalViewers: s.totalViewers, totalViewerResponses: s.totalViewerResponses,
        totalQuestions: s.totalQuestions, teamCount: s.teamLeaderboard.length,
      }));
      exportAsCSV(flat, `quiz-history-${formatDate(new Date(), 'yyyy-MM-dd')}`,
        ['id', 'episodeNumber', 'status', 'createdAt', 'endedAt', 'totalViewers', 'totalViewerResponses', 'totalQuestions', 'teamCount']);
    }
    toast({ title: "Exported", description: `Quiz history exported as ${fmt.toUpperCase()}` });
  };

  const handleExportSession = (session: QuizSessionRecord, fmt: 'json' | 'csv') => {
    const filename = `quiz-${session.episodeNumber}-${formatDate(session.createdAt, 'yyyy-MM-dd')}`;
    if (fmt === 'json') {
      exportAsJSON(session, filename);
    } else {
      const viewerData = session.viewerLeaderboard.map((v, i) => ({
        rank: i + 1, userName: v.userName, channelId: v.odytChannelId,
        totalScore: v.totalScore, correctAnswers: v.correctAnswers,
        totalResponses: v.totalResponses, avgResponseTimeMs: Math.round(v.avgResponseTimeMs),
      }));
      exportAsCSV(viewerData, `${filename}-viewers`,
        ['rank', 'userName', 'channelId', 'totalScore', 'correctAnswers', 'totalResponses', 'avgResponseTimeMs']);
    }
    toast({ title: "Exported", description: `Session exported as ${fmt.toUpperCase()}` });
  };

  const handleExportAllTime = (fmt: 'json' | 'csv') => {
    const filename = `alltime-leaderboard-${formatDate(new Date(), 'yyyy-MM-dd')}`;
    if (fmt === 'json') {
      exportAsJSON(allTimeLeaderboard, filename);
    } else {
      const data = allTimeLeaderboard.map((v, i) => ({
        rank: i + 1, userName: v.userName, channelId: v.odytChannelId,
        totalScore: v.totalScore, correctAnswers: v.correctAnswers,
        totalResponses: v.totalResponses, quizzesParticipated: v.quizzesParticipated,
        avgResponseTimeMs: v.totalResponses > 0 ? Math.round(v.totalResponseTimeMs / v.totalResponses) : 0,
        lastParticipated: formatDate(v.lastParticipatedAt, 'yyyy-MM-dd HH:mm:ss'),
      }));
      exportAsCSV(data, filename,
        ['rank', 'userName', 'channelId', 'totalScore', 'correctAnswers', 'totalResponses', 'quizzesParticipated', 'avgResponseTimeMs', 'lastParticipated']);
    }
    toast({ title: "Exported", description: `All-time leaderboard exported as ${fmt.toUpperCase()}` });
  };

  const getStatusBadge = (status: QuizSessionRecord["status"]) => {
    const map: Record<string, { cls: string; label: string }> = {
      completed: { cls: "bg-green-500/20 text-green-400 border-green-500/30", label: "Completed" },
      aborted: { cls: "bg-red-500/20 text-red-400 border-red-500/30", label: "Aborted" },
      active: { cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Active" },
    };
    const s = map[status] || map.active;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  const getRunStatusBadge = (status: AnalyticsQuizRunRow["status"]) => {
    const map: Record<AnalyticsQuizRunRow["status"], { cls: string; label: string }> = {
      created: { cls: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Created" },
      closed: { cls: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Closed" },
      ended: { cls: "bg-green-500/20 text-green-400 border-green-500/30", label: "Ended" },
      aborted: { cls: "bg-red-500/20 text-red-400 border-red-500/30", label: "Aborted" },
    };
    const entry = map[status] || map.created;
    return <Badge className={entry.cls}>{entry.label}</Badge>;
  };

  const editableRuns = useMemo(
    () =>
      [...quizRuns]
        .filter((run) => run.status !== "ended")
        .sort((a, b) => {
          const aTime = Date.parse(a.updatedAt || a.closedAtServer || a.createdAtServer || "");
          const bTime = Date.parse(b.updatedAt || b.closedAtServer || b.createdAtServer || "");
          return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
        }),
    [quizRuns]
  );

  const getDuration = (session: QuizSessionRecord) => {
    if (!session.endedAt) return "In progress";
    const ms = session.endedAt - session.createdAt;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const getRunDuration = (run: AnalyticsQuizRunRow) => {
    const createdMs = Date.parse(run.createdAtServer || "");
    if (!Number.isFinite(createdMs)) return "Unknown";

    const endMs =
      Date.parse(run.closedAtServer || "") ||
      Date.parse(run.updatedAt || "") ||
      Date.now();

    const safeEndMs = Number.isFinite(endMs) && endMs >= createdMs ? endMs : Date.now();
    const ms = Math.max(0, safeEndMs - createdMs);
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (run.status === "created") return `${minutes}m ${seconds}s so far`;
    return `${minutes}m ${seconds}s`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <span className="text-yellow-400">🥇</span>;
    if (rank === 2) return <span className="text-gray-300">🥈</span>;
    if (rank === 3) return <span className="text-amber-600">🥉</span>;
    return <span className="text-muted-foreground">#{rank}</span>;
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUpRight className="h-3 w-3 text-green-400" />;
    if (current < previous) return <ArrowDownRight className="h-3 w-3 text-red-400" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  // ========= Session detail computed =========
  const sessionAccuracy = selectedSession
    ? selectedSession.viewerLeaderboard.length > 0
      ? (selectedSession.viewerLeaderboard.reduce((s, v) => s + v.correctAnswers, 0) /
         Math.max(1, selectedSession.viewerLeaderboard.reduce((s, v) => s + v.totalResponses, 0)) * 100)
      : 0
    : 0;

  const sessionTeamChartData = selectedSession
    ? selectedSession.teamLeaderboard.map(t => ({ name: t.teamName, score: t.finalScore }))
    : [];

  // Session viewer accuracy distribution
  const sessionAccuracyDistribution = useMemo(() => {
    if (!selectedSession || selectedSession.viewerLeaderboard.length === 0) return [];
    const buckets = [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 },
    ];
    selectedSession.viewerLeaderboard.forEach(v => {
      const acc = v.totalResponses > 0 ? (v.correctAnswers / v.totalResponses) * 100 : 0;
      if (acc <= 20) buckets[0].count++;
      else if (acc <= 40) buckets[1].count++;
      else if (acc <= 60) buckets[2].count++;
      else if (acc <= 80) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [selectedSession]);

  // Session response time distribution
  const sessionResponseTimeDist = useMemo(() => {
    if (!selectedSession || selectedSession.viewerLeaderboard.length === 0) return [];
    const buckets = [
      { range: '< 3s', count: 0 },
      { range: '3-6s', count: 0 },
      { range: '6-10s', count: 0 },
      { range: '10-15s', count: 0 },
      { range: '15s+', count: 0 },
    ];
    selectedSession.viewerLeaderboard.forEach(v => {
      const sec = v.avgResponseTimeMs / 1000;
      if (sec < 3) buckets[0].count++;
      else if (sec < 6) buckets[1].count++;
      else if (sec < 10) buckets[2].count++;
      else if (sec < 15) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [selectedSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 flex items-center justify-center relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quiz history...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4 md:p-6 relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {!embedded && (
          <PageHeader
            title="Advanced History"
            icon={History}
            description="Backend-backed copy of quiz history using stored quiz result snapshots"
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 rounded-lg gap-2"><Download className="h-4 w-4" /> Export All</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExportAllSessions('json')}>
                    <FileJson className="h-4 w-4 mr-2" /> Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportAllSessions('csv')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        )}

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Total Sessions", value: summaryStats.total, icon: History, color: "text-primary" },
            { label: "Completed", value: summaryStats.completed, icon: CheckCircle, color: "text-green-400" },
            { label: "Completion %", value: `${summaryStats.completionRate.toFixed(0)}%`, icon: Percent, color: "text-emerald-400", raw: true },
            { label: "Total Viewers", value: summaryStats.totalViewers, icon: Users, color: "text-blue-400" },
            { label: "Total Responses", value: summaryStats.totalResponses, icon: Target, color: "text-amber-400" },
            { label: "Total Questions", value: summaryStats.totalQuestions, icon: Hash, color: "text-violet-400" },
            { label: "Avg Duration", value: `${summaryStats.avgDuration.toFixed(1)}m`, icon: Clock, color: "text-cyan-400", raw: true },
            { label: "Avg Viewers/Ep", value: Math.round(summaryStats.avgViewersPerSession), icon: TrendingUp, color: "text-purple-400" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="bg-card/60 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all hover:shadow-md">
                  <CardContent className="p-3 text-center">
                    <Icon className={`h-4 w-4 mx-auto mb-1.5 ${stat.color}`} />
                    <div className="text-xl font-bold text-foreground">
                      {'raw' in stat ? stat.value : <AnimatedScore value={stat.value as number} />}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Row - 3 columns */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Team Win Distribution */}
            {teamWinData.length > 0 && (
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" /> Team Wins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={teamWinData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                        {teamWinData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Viewer Win Distribution */}
            {viewerWinData.length > 0 && (
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Medal className="h-4 w-4 text-amber-400" /> Viewer Wins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={viewerWinData.slice(0, 6)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                        {viewerWinData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Participation Trend */}
            {participationTrend.length > 1 && (
              <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Participation Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={participationTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="viewers" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Viewers" />
                      <Area type="monotone" dataKey="responses" stroke="hsl(var(--chart-2, 173 58% 39%))" fill="hsl(var(--chart-2, 173 58% 39%) / 0.15)" name="Responses" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Score trend */}
        {scoreTrend.length > 1 && (
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" /> Score Progression Across Episodes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="topScore" stroke="hsl(var(--primary))" strokeWidth={2} name="Top Score" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="avgScore" stroke="hsl(var(--chart-4, 43 74% 66%))" strokeWidth={2} name="Avg Score" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as any)} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sessions" className="gap-2"><History className="h-4 w-4" /> Sessions ({sessions.length})</TabsTrigger>
            <TabsTrigger value="alltime" className="gap-2"><Star className="h-4 w-4" /> All-Time ({allTimeLeaderboard.length})</TabsTrigger>
          </TabsList>

        <TabsContent value="sessions" className="mt-6">
          <Card className="mb-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-primary" /> Session Editor
                  </CardTitle>
                  <CardDescription>
                    Strict mode is back: only runs with <code>QuizGameRun.status = ended</code> count in Advanced Analytics.
                    Use this editor to manually close, end, abort, or delete stale backend runs.
                  </CardDescription>
                </div>
                <Badge variant="outline">{editableRuns.length} open or stale run{editableRuns.length === 1 ? "" : "s"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {editableRuns.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  No created, closed, or aborted runs need manual attention right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {editableRuns.map((run) => (
                    <div
                      key={run.frontendQuizGameId}
                      className="rounded-lg border border-border/50 bg-background/40 p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {run.episodeNumber ? `Episode ${run.episodeNumber}` : "Unnumbered Run"}
                            </span>
                            {run.episodeName ? <span className="text-muted-foreground">• {run.episodeName}</span> : null}
                            {getRunStatusBadge(run.status)}
                          </div>
                          {run.gameTitle ? (
                            <div className="text-sm text-muted-foreground">Quiz: {run.gameTitle}</div>
                          ) : null}
                          <div className="text-xs text-muted-foreground break-all">
                            Run ID: {run.frontendQuizGameId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created: {run.createdAtServer ? formatDate(new Date(run.createdAtServer), "MMM d, yyyy h:mm a") : "n/a"}
                            {run.closedAtServer ? ` • Closed: ${formatDate(new Date(run.closedAtServer), "MMM d, yyyy h:mm a")}` : ""}
                            {run.updatedAt ? ` • Updated ${formatDistanceToNow(new Date(run.updatedAt), { addSuffix: true })}` : ""}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration: {getRunDuration(run)}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {run.status === "created" ? (
                            <Button variant="outline" size="sm" onClick={() => handleRunLifecycleUpdate(run, "closed")}>
                              Mark Closed
                            </Button>
                          ) : null}
                          {run.status !== "ended" ? (
                            <Button size="sm" onClick={() => handleRunLifecycleUpdate(run, "ended")}>
                              Mark Ended
                            </Button>
                          ) : null}
                          {run.status !== "aborted" ? (
                            <Button variant="outline" size="sm" onClick={() => handleRunLifecycleUpdate(run, "aborted")}>
                              Mark Aborted
                            </Button>
                          ) : null}
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteRun(run)}>
                            Delete Run
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Session List */}
              <Card className="lg:col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-primary" /> Sessions
                  </CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive"
                        disabled={!sessions.some((s) => s.status === "aborted")}>
                        <Trash2 className="h-4 w-4" /> Delete Aborted
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete All Aborted Backend Sessions?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all aborted quiz runs from backend history and related advanced analytics data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAbortedSessions}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Aborted</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    {sessions.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No quiz sessions yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/30">
                        {sessions.map((session, idx) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`relative p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                              selectedSession?.id === session.id ? "bg-primary/10 border-l-2 border-primary" : ""
                            }`}
                            onClick={() => setSelectedSession(session)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">Episode {session.episodeNumber}</span>
                                {!session.hasResultSnapshot ? (
                                  <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                                    No Result Snapshot
                                  </Badge>
                                ) : null}
                              </div>
                              {getStatusBadge(session.status)}
                            </div>
                            <div className="text-xs text-muted-foreground/70 font-mono mb-1 truncate" title={session.frontendQuizGameId}>
                              {session.frontendQuizGameId}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {formatDate(session.createdAt, "MMM d, yyyy h:mm a")}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {getDuration(session)}</span>
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {session.totalViewers}</span>
                                <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {session.totalViewerResponses}</span>
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"
                                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Backend Session?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete Episode {session.episodeNumber} from backend history and related advanced analytics data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteSession(session.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Session Details */}
              <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
                <AnimatePresence mode="wait">
                  {selectedSession ? (
                    <motion.div key={selectedSession.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-2xl flex items-center gap-3">
                              <Trophy className="h-6 w-6 text-primary" /> Episode {selectedSession.episodeNumber}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {formatDate(selectedSession.createdAt, "MMMM d, yyyy 'at' h:mm a")} •{" "}
                              {formatDistanceToNow(selectedSession.createdAt, { addSuffix: true })}
                            </CardDescription>
                            <div className="mt-1 font-mono text-xs text-muted-foreground/60 select-all" title="Quiz Game ID">
                              {selectedSession.frontendQuizGameId}
                            </div>
                            {!selectedSession.hasResultSnapshot ? (
                              <div className="mt-2">
                                <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                                  No Result Snapshot
                                </Badge>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              disabled={!selectedSession.frontendQuizGameId}
                              onClick={() => {
                                const gameId = String(selectedSession.frontendQuizGameId || "").trim();
                                if (!gameId) return;
                                navigate(`/quiz/end/viewers?gameId=${encodeURIComponent(gameId)}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              Final Viewers
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleExportSession(selectedSession, 'json')}>
                                  <FileJson className="h-4 w-4 mr-2" /> JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportSession(selectedSession, 'csv')}>
                                  <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {getStatusBadge(selectedSession.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {[
                            { icon: Clock, label: "Duration", value: getDuration(selectedSession), color: "text-primary" },
                            { icon: Users, label: "Viewers", value: selectedSession.totalViewers, color: "text-blue-400" },
                            { icon: CheckCircle, label: "Responses", value: selectedSession.totalViewerResponses, color: "text-green-400" },
                            { icon: Target, label: "Accuracy", value: `${sessionAccuracy.toFixed(1)}%`, color: "text-amber-400" },
                            { icon: Hash, label: "Questions", value: selectedSession.totalQuestions, color: "text-violet-400" },
                          ].map(s => {
                            const Icon = s.icon;
                            return (
                              <Card key={s.label} className="bg-muted/30 border-border/30">
                                <CardContent className="p-3 text-center">
                                  <Icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                                  <div className="text-xl font-bold">{s.value}</div>
                                  <div className="text-xs text-muted-foreground">{s.label}</div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        {/* Charts row for session */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Team Score Bar Chart */}
                          {sessionTeamChartData.length > 0 && (
                            <div className="rounded-lg border border-border/30 p-3 bg-muted/10">
                              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Team Scores</h3>
                              <ResponsiveContainer width="100%" height={120}>
                                <BarChart data={sessionTeamChartData} layout="vertical">
                                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} width={70} />
                                  <Tooltip />
                                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Accuracy Distribution */}
                          {sessionAccuracyDistribution.some(b => b.count > 0) && (
                            <div className="rounded-lg border border-border/30 p-3 bg-muted/10">
                              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Accuracy Distribution</h3>
                              <ResponsiveContainer width="100%" height={120}>
                                <BarChart data={sessionAccuracyDistribution}>
                                  <XAxis dataKey="range" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="hsl(var(--chart-2, 173 58% 39%))" radius={[4, 4, 0, 0]} name="Viewers" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Response Time Distribution */}
                          {sessionResponseTimeDist.some(b => b.count > 0) && (
                            <div className="rounded-lg border border-border/30 p-3 bg-muted/10">
                              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Response Time Distribution</h3>
                              <ResponsiveContainer width="100%" height={120}>
                                <BarChart data={sessionResponseTimeDist}>
                                  <XAxis dataKey="range" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="hsl(var(--chart-4, 43 74% 66%))" radius={[4, 4, 0, 0]} name="Viewers" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>

                        {/* Leaderboard Tabs */}
                        <Tabs defaultValue="teams" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="teams" className="flex items-center gap-2">
                              <Trophy className="h-4 w-4" /> Teams ({selectedSession.teamLeaderboard.length})
                            </TabsTrigger>
                            <TabsTrigger value="viewers" className="flex items-center gap-2">
                              <Users className="h-4 w-4" /> Viewers ({selectedSession.viewerLeaderboard.length})
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="teams">
                            <ScrollArea className="h-[300px]">
                              {selectedSession.teamLeaderboard.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No team data recorded</div>
                              ) : (
                                <div className="space-y-2">
                                  {selectedSession.teamLeaderboard.map((team, idx) => (
                                    <motion.div key={team.teamId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <div className="text-2xl w-8 text-center">{getRankIcon(team.rank)}</div>
                                        <div>
                                          <div className="font-semibold text-foreground">{team.teamName}</div>
                                          {team.members.length > 0 && (
                                            <div className="text-sm text-muted-foreground">{team.members.join(", ")}</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-2xl font-bold text-primary">{team.finalScore}</div>
                                        <div className="text-xs text-muted-foreground">points</div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </TabsContent>

                          <TabsContent value="viewers">
                            <ScrollArea className="h-[300px]">
                              {selectedSession.viewerLeaderboard.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No viewer participation data</div>
                              ) : (
                                <div className="space-y-2">
                                  {selectedSession.viewerLeaderboard.map((viewer, idx) => (
                                    <motion.div key={viewer.odytChannelId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <div className="text-xl w-8 text-center">{getRankIcon(idx + 1)}</div>
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={viewer.avatarUrl} referrerPolicy="no-referrer" crossOrigin="anonymous" loading="eager" />
                                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                            {viewer.userName.slice(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="font-medium text-foreground text-sm">{viewer.userName}</div>
                                          <div className="text-xs text-muted-foreground flex gap-2">
                                            <span className="text-green-400">{viewer.correctAnswers} correct</span>
                                            <span>•</span>
                                            <span>{viewer.totalResponses} total</span>
                                            {viewer.totalResponses > 0 && (
                                              <>
                                                <span>•</span>
                                                <span>{((viewer.correctAnswers / viewer.totalResponses) * 100).toFixed(0)}% acc</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-primary">{viewer.totalScore}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {Math.round(viewer.avgResponseTimeMs / 1000)}s avg
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                      <div className="text-center">
                        <Medal className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Select a session to view details</p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alltime" className="mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <Star className="h-6 w-6 text-yellow-400" /> All-Time Viewer Leaderboard
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Performance across all quiz sessions • {allTimeLeaderboard.length} viewers tracked
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleExportAllTime('json')}>
                          <FileJson className="h-4 w-4 mr-2" /> Export as JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportAllTime('csv')}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" /> Clear All
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear All Backend History?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all backend quiz history, viewer statistics, prize data, and derived advanced analytics. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              toast({
                                title: "Clearing Backend History…",
                                description: "Deleting all backend quiz history and derived advanced analytics.",
                              });
                              const result = await clearAllBackendQuizResultsHistory();
                              if (!result.success) {
                                toast({
                                  title: "Clear Failed",
                                  description: result.error || "Failed to clear backend history",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setSelectedSession(null);
                              await loadData();
                              toast({
                                title: "Backend History Cleared",
                                description: `${result.deletedRuns || 0} backend run${result.deletedRuns === 1 ? "" : "s"} deleted.`,
                              });
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Clear Backend History
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {allTimeLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No all-time data yet</p>
                    <p className="text-sm mt-2">Complete quizzes to build the all-time leaderboard</p>
                  </div>
                ) : (
                  <>
                    {/* All-time summary stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: "Total Score (All)", value: allTimeLeaderboard.reduce((s, v) => s + v.totalScore, 0), icon: Zap, color: "text-amber-400" },
                        { label: "Total Responses", value: allTimeLeaderboard.reduce((s, v) => s + v.totalResponses, 0), icon: Target, color: "text-green-400" },
                        { label: "Avg Accuracy", value: (() => {
                          const totC = allTimeLeaderboard.reduce((s, v) => s + v.correctAnswers, 0);
                          const totR = allTimeLeaderboard.reduce((s, v) => s + v.totalResponses, 0);
                          return totR > 0 ? `${((totC / totR) * 100).toFixed(1)}%` : '0%';
                        })(), icon: Percent, color: "text-cyan-400", raw: true },
                        { label: "Avg Quizzes/Viewer", value: (allTimeLeaderboard.reduce((s, v) => s + v.quizzesParticipated, 0) / allTimeLeaderboard.length).toFixed(1), icon: Activity, color: "text-purple-400", raw: true },
                      ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                          <Card key={stat.label} className="bg-muted/30 border-border/30">
                            <CardContent className="p-3 text-center">
                              <Icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
                              <div className="text-lg font-bold text-foreground">
                                {'raw' in stat ? stat.value : <AnimatedScore value={stat.value as number} />}
                              </div>
                              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Top 3 Podium */}
                    <div className="flex justify-center gap-6 mb-8">
                      {allTimeLeaderboard.slice(0, 3).map((viewer, idx) => {
                        const sizes = ["h-20 w-20", "h-16 w-16", "h-14 w-14"];
                        const borders = [
                          "ring-4 ring-yellow-400/50",
                          "ring-3 ring-gray-300/50",
                          "ring-3 ring-amber-600/50",
                        ];
                        const heights = ["pt-0", "pt-6", "pt-10"];
                        return (
                          <motion.div key={viewer.odytChannelId}
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: idx * 0.15, type: "spring", stiffness: 200 }}
                            className={`flex flex-col items-center gap-2 ${heights[idx]}`}>
                            <div className="text-2xl">{getRankIcon(idx + 1)}</div>
                            <Avatar className={`${sizes[idx]} ${borders[idx]}`}>
                              <AvatarImage src={viewer.avatarUrl} referrerPolicy="no-referrer" crossOrigin="anonymous" loading="eager" />
                              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                                {viewer.userName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                              <div className="font-bold text-sm text-foreground truncate max-w-[120px]">{viewer.userName}</div>
                              <div className="text-xl font-bold text-primary">{viewer.totalScore}</div>
                              <div className="text-xs text-muted-foreground">{viewer.quizzesParticipated} quizzes</div>
                              {viewer.totalResponses > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                  {((viewer.correctAnswers / viewer.totalResponses) * 100).toFixed(0)}% accuracy
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Full List */}
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {allTimeLeaderboard.map((viewer, idx) => (
                          <motion.div key={viewer.odytChannelId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                            className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                            <div className="flex items-center gap-4">
                              <div className="text-2xl w-10 text-center">{getRankIcon(idx + 1)}</div>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={viewer.avatarUrl} referrerPolicy="no-referrer" crossOrigin="anonymous" loading="eager" />
                                <AvatarFallback className="bg-primary/20 text-primary">
                                  {viewer.userName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-foreground">{viewer.userName}</div>
                                <div className="text-sm text-muted-foreground flex gap-3 flex-wrap">
                                  <span className="text-green-400">{viewer.correctAnswers} correct</span>
                                  <span>•</span>
                                  <span>{viewer.totalResponses} responses</span>
                                  <span>•</span>
                                  <span className="text-primary">{viewer.quizzesParticipated} quizzes</span>
                                  {viewer.totalResponses > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{((viewer.correctAnswers / viewer.totalResponses) * 100).toFixed(0)}% acc</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">{viewer.totalScore}</div>
                              <div className="text-xs text-muted-foreground">
                                {viewer.totalResponses > 0
                                  ? `${Math.round(viewer.totalResponseTimeMs / viewer.totalResponses / 1000)}s avg`
                                  : 'N/A'}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedHistory;
