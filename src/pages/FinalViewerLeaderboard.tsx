import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Trophy, Crown, Medal, Sparkles, Clock, Coins,
  Target, TrendingUp, Star, Award, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LiveLeaderboard, LeaderboardEntry } from "@/components/LiveLeaderboard";
import { usePrizeOverlay } from "@/hooks/usePrizeOverlay";
import { getQuizResults } from "@/services/quizResultsApi";
import { useApp } from "@/context/AppContext";
import { getAnalyticsQuizRuns, getViewerAnalytics } from "@/services/analyticsApi";
import { getPrizeAwards, PrizeType } from "@/services/prizeApi";
import { broadcastEventToYouTubeChat } from "@/services/youtubeChatSenderApi";
import { broadcastEventToTelegram } from "@/services/telegramSenderApi";
import { useBranding } from "@/hooks/useBranding";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

const RANKED_PRIZE_ORDER: Array<"quizfirst" | "quizsecond" | "quizthird"> = ["quizfirst", "quizsecond", "quizthird"];
const PRIZE_SLOT_BY_TYPE: Record<"quizfirst" | "quizsecond" | "quizthird", 1 | 2 | 3> = {
  quizfirst: 1,
  quizsecond: 2,
  quizthird: 3,
};
const QUIZ_MIRROR_VIEWER_STATE_KEY = "quizMirrorViewerState";

interface MirrorAwardState {
  assignedChannelId: string;
  prizeType: PrizeType;
  prizeInstance?: number;
  rank?: number | null;
  couponStatus?: string;
}

const formatTime = (ms?: number): string => {
  if (!ms || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const getRankGradient = (rank: number) => {
  switch (rank) {
    case 1: return "from-yellow-500 via-amber-400 to-yellow-600";
    case 2: return "from-gray-400 via-gray-300 to-gray-500";
    case 3: return "from-amber-700 via-amber-600 to-amber-800";
    default: return "from-muted to-muted";
  }
};

const PodiumViewer = ({ entry, rank, index }: { entry: LeaderboardEntry; rank: number; index: number }) => {
  const sizes = rank === 1
    ? { avatar: "w-24 h-24", podium: "h-40 w-32 md:w-40", name: "text-xl", score: "text-3xl", icon: "h-10 w-10" }
    : rank === 2
    ? { avatar: "w-20 h-20", podium: "h-28 w-28 md:w-36", name: "text-base", score: "text-2xl", icon: "h-8 w-8" }
    : { avatar: "w-16 h-16", podium: "h-20 w-24 md:w-32", name: "text-sm", score: "text-xl", icon: "h-7 w-7" };

  const accuracy = entry.totalResponses > 0 ? Math.round((entry.correctAnswers / entry.totalResponses) * 100) : 0;

  return (
    <motion.div
      initial={{ y: 200, opacity: 0, scale: 0.5 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: 0.8 + index * 0.3, type: "spring", stiffness: 120, damping: 14 }}
      className="flex flex-col items-center"
    >
      {/* Rank icon */}
      <motion.div
        animate={rank === 1 ? { rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="mb-2"
      >
        {rank === 1 ? <Crown className={`${sizes.icon} text-yellow-400 drop-shadow-[0_0_16px_rgba(250,204,21,0.8)]`} /> :
         <Medal className={`${sizes.icon} ${rank === 2 ? "text-gray-300" : "text-amber-600"} drop-shadow-lg`} />}
      </motion.div>

      {/* Avatar */}
      <motion.div
        className={`relative rounded-full p-1 mb-2 bg-gradient-to-br ${getRankGradient(rank)}`}
        animate={rank === 1 ? { boxShadow: ["0 0 20px rgba(234,179,8,0.4)", "0 0 40px rgba(234,179,8,0.7)", "0 0 20px rgba(234,179,8,0.4)"] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Avatar className={`${sizes.avatar} border-2 border-background`}>
          <AvatarImage src={entry.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.odytChannelId}`} />
          <AvatarFallback className="text-lg font-bold bg-muted">{(entry.userName || "?").charAt(0)}</AvatarFallback>
        </Avatar>
      </motion.div>

      {/* Name */}
      <h3 className={`font-bold text-foreground mb-1 ${sizes.name} max-w-[140px] truncate`}>{entry.userName}</h3>

      {/* Stats */}
      <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
        <Target className="h-3 w-3" />
        <span>{entry.correctAnswers}/{entry.totalResponses} ({accuracy}%)</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <Clock className="h-3 w-3 text-cyan-400" />
        <span>{formatTime(entry.avgResponseTimeMs)}</span>
      </div>

      {/* Score */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2 + index * 0.3, type: "spring" }}
        className={`font-black mb-3 ${sizes.score} ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : "text-amber-500"}`}
      >
        <div className="flex items-center gap-1">
          <Coins className="h-5 w-5 text-yellow-500" />
          {entry.totalScore}
        </div>
      </motion.div>

      {/* Podium bar */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "auto" }}
        transition={{ delay: 1.5 + index * 0.2, duration: 0.8, type: "spring" }}
        className={`${sizes.podium} bg-gradient-to-b ${getRankGradient(rank)} rounded-t-xl shadow-2xl flex items-center justify-center relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave opacity-50" />
        <span className="text-4xl font-black text-white drop-shadow-lg relative z-10">{rank}</span>
      </motion.div>
    </motion.div>
  );
};

const FinalViewerLeaderboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { applicationId } = useApp();
  const { branding, pageTitle } = useBranding();
  const { toast } = useToast();
  const gameId = searchParams.get("gameId");
  const resolvedGameId = String(gameId || "").trim();
  const resolvedApplicationId = String(
    applicationId || localStorage.getItem("applicationId") || "quiz-app"
  ).trim();
  const [cumulativeEntries, setCumulativeEntries] = useState<LeaderboardEntry[]>([]);
  const [rankingLoadError, setRankingLoadError] = useState<string | null>(null);
  const [quizHostChannelId, setQuizHostChannelId] = useState<string | null>(null);
  const [podiumMode, setPodiumMode] = useState<"prize" | "rank">("rank");
  const [awardRefreshTick, setAwardRefreshTick] = useState(0);
  const [userBoardStatsByChannel, setUserBoardStatsByChannel] = useState<Record<string, {
    rank1: number;
    rank2: number;
    rank3: number;
    top10: number;
    prizeSlots: number[];
    lucky: number;
    anyPrize: number;
    xpLevel: number;
  }>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!resolvedGameId) {
        setCumulativeEntries([]);
        setRankingLoadError("Missing gameId in URL");
        return;
      }
      let lastError = "No backend final ranking available for this run.";
      for (let attempt = 1; attempt <= 6; attempt += 1) {
        // This page intentionally consumes backend result snapshots as reporting
        // data for a completed run. It does not participate in host config restore.
        const result = await getQuizResults(resolvedGameId);
        if (!active) return;
        const resolvedPayloadGameId = String(
          result.data?.liveLeaderboard?.episode?.frontendQuizGameId ||
          result.data?.panelLeaderboard?.episode?.frontendQuizGameId ||
          ''
        ).trim();
        if (result.success && resolvedPayloadGameId && resolvedPayloadGameId !== resolvedGameId) {
          lastError = `Mismatched quiz result returned for run ${resolvedGameId}`;
          if (attempt < 6) {
            await new Promise((resolve) => window.setTimeout(resolve, attempt * 500));
          }
          continue;
        }
        const hostChannelId = String(
          result.data?.liveLeaderboard?.episode?.quizHostChannel?.quizHostChannelId ||
          result.data?.panelLeaderboard?.episode?.quizHostChannel?.quizHostChannelId ||
          ''
        ).trim();
        if (hostChannelId) {
          setQuizHostChannelId(hostChannelId);
        }
        const viewers = result.data?.liveLeaderboard?.viewers || [];
        if (result.success && Array.isArray(viewers) && viewers.length > 0) {
          const mapped: LeaderboardEntry[] = viewers
            .map((viewer: any) => ({
              odytChannelId: String(viewer.odytChannelId || ""),
              userName: String(viewer.userName || "Viewer"),
              avatarUrl: viewer.avatarUrl || "",
              totalScore: Number(viewer.totalScore || 0),
              correctAnswers: Number(viewer.correctAnswers || 0),
              totalResponses: Number(viewer.totalResponses || 0),
              avgResponseTimeMs: Number(viewer.avgResponseTimeMs || 0),
            }))
            .filter((v) => v.odytChannelId)
            .sort((a, b) => (b.totalScore !== a.totalScore ? b.totalScore - a.totalScore : (a.avgResponseTimeMs || 0) - (b.avgResponseTimeMs || 0)));
          setCumulativeEntries(mapped);
          setRankingLoadError(null);
          return;
        }
        lastError = result.error || "No backend final ranking available for this run.";
        if (attempt < 6) {
          await new Promise((resolve) => window.setTimeout(resolve, attempt * 500));
        }
      }
      if (!active) return;
      setCumulativeEntries([]);
      setRankingLoadError(lastError);
    };
    void load();
    return () => {
      active = false;
    };
  }, [resolvedGameId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const appId = resolvedApplicationId;
      if (!appId || cumulativeEntries.length === 0 || !quizHostChannelId) {
        if (active) setUserBoardStatsByChannel({});
        return;
      }

      const channels = new Set(cumulativeEntries.map((e) => String(e.odytChannelId || "")).filter(Boolean));
      const stats: Record<string, {
        rank1: number;
        rank2: number;
        rank3: number;
        top10: number;
        prizeSlots: number[];
        lucky: number;
        anyPrize: number;
        xpLevel: number;
      }> = {};
      channels.forEach((channelId) => {
        stats[channelId] = {
          rank1: 0,
          rank2: 0,
          rank3: 0,
          top10: 0,
          prizeSlots: Array.from({ length: 10 }, () => 0),
          lucky: 0,
          anyPrize: 0,
          xpLevel: 0,
        };
      });

      let page = 1;
      let totalPages = 1;
      while (page <= totalPages) {
        const res = await getViewerAnalytics(page, 100, "", { quizHostChannelId });
        if (!res.success || !res.data) break;
        totalPages = Number(res.data.totalPages || 1);
        for (const viewer of res.data.viewers || []) {
          const channelId = String(viewer.odytChannelId || "");
          if (!channels.has(channelId)) continue;
          stats[channelId] = {
            ...stats[channelId],
            rank1: Number(viewer.firstPlaces || 0),
            rank2: Number(viewer.secondPlaces || 0),
            rank3: Number(viewer.thirdPlaces || 0),
            top10: Number((viewer as { top10Places?: number }).top10Places || 0),
            xpLevel: Number((viewer as { properParticipations?: number }).properParticipations || 0),
          };
        }
        page += 1;
      }

      const endedRunIds = new Set<string>();
      let runPage = 1;
      let runTotalPages = 1;
      while (runPage <= runTotalPages) {
        const runsRes = await getAnalyticsQuizRuns(runPage, 100, "ended", { quizHostChannelId });
        if (!runsRes.success || !runsRes.data) break;
        runTotalPages = Number(runsRes.data.totalPages || 1);
        for (const run of runsRes.data.runs || []) {
          const runId = String(run.frontendQuizGameId || "");
          if (runId) endedRunIds.add(runId);
        }
        runPage += 1;
      }

      const awardsRes = await getPrizeAwards({ applicationId: appId, limit: 5000 });
      if (awardsRes.success && awardsRes.data?.awards) {
        const toPrizeSlot = (prizeType: string, rank?: number | null): number | null => {
          if (prizeType === "quizfirst") return 1;
          if (prizeType === "quizsecond") return 2;
          if (prizeType === "quizthird") return 3;
          const r = Number(rank || 0);
          if (Number.isFinite(r) && r >= 1 && r <= 10) return r;
          return null;
        };
        for (const award of awardsRes.data.awards) {
          if (award.couponStatus === "revoked") continue;
          if (!endedRunIds.has(String(award.frontendQuizGameId || ""))) continue;
          const channelId = String(award.assignedChannelId || "");
          if (!channels.has(channelId) || !stats[channelId]) continue;
          stats[channelId].anyPrize += 1;
          const slot = toPrizeSlot(String(award.prizeType || ""), award.rank);
          if (slot && slot >= 1 && slot <= 10) {
            stats[channelId].prizeSlots[slot - 1] += 1;
          }
          if (award.prizeType === "luckydip") stats[channelId].lucky += 1;
        }
      }

      if (active) setUserBoardStatsByChannel(stats);
    };
    void run();
    return () => {
      active = false;
    };
  }, [resolvedApplicationId, cumulativeEntries, awardRefreshTick, quizHostChannelId]);

  const prizeOverlay = usePrizeOverlay({
    enabled: Boolean(resolvedGameId && cumulativeEntries.length > 0),
    applicationId: resolvedApplicationId,
    frontendQuizGameId: resolvedGameId,
    viewers: cumulativeEntries.map((entry, idx) => ({
      odytChannelId: entry.odytChannelId,
      userName: entry.userName,
      rank: idx + 1,
    })),
    pollMs: 0,
    refreshKey: resolvedGameId,
  });

  const [sparklePositions] = useState(() =>
    Array.from({ length: 30 }, () => ({ x: Math.random() * 100, y: Math.random() * 100 }))
  );

  const entriesByChannel = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    for (const entry of cumulativeEntries) {
      map.set(String(entry.odytChannelId || ""), entry);
    }
    return map;
  }, [cumulativeEntries]);

  function parsePrizeSlot(prizeType: string, rank?: number | null): number | null {
    if (prizeType === "quizfirst") return 1;
    if (prizeType === "quizsecond") return 2;
    if (prizeType === "quizthird") return 3;
    const r = Number(rank || 0);
    if (Number.isFinite(r) && r >= 1 && r <= 10) return r;
    return null;
  }

  const activeAwards = useMemo(() => {
    const currentAppId = resolvedApplicationId;
    return (prizeOverlay.awards || []).filter((award) => {
      if (award.couponStatus === "revoked") return false;
      if (String(award.frontendQuizGameId || "").trim() !== resolvedGameId) return false;
      if (currentAppId && String(award.applicationId || "").trim() !== currentAppId) return false;
      const assignedChannelId = String(award.assignedChannelId || "");
      return Boolean(assignedChannelId);
    });
  }, [resolvedApplicationId, resolvedGameId, prizeOverlay.awards]);

  const occupiedPrizeByType = useMemo(() => {
    const next: Partial<Record<PrizeType, string>> = {};
    for (const award of activeAwards) {
      if (award.prizeType === "quizfirst" || award.prizeType === "quizsecond" || award.prizeType === "quizthird") {
        next[award.prizeType] = String(award.assignedChannelId || "");
      }
    }
    return next;
  }, [activeAwards]);

  const autoSuggestedPrizeByType = useMemo(() => {
    const slots: Record<"quizfirst" | "quizsecond" | "quizthird", LeaderboardEntry | null> = {
      quizfirst: null,
      quizsecond: null,
      quizthird: null,
    };
    const types: Array<"quizfirst" | "quizsecond" | "quizthird"> = ["quizfirst", "quizsecond", "quizthird"];
    const assignedByType = new Map<PrizeType, string>();
    for (const award of activeAwards) {
      if (award.prizeType === "quizfirst" || award.prizeType === "quizsecond" || award.prizeType === "quizthird") {
        assignedByType.set(award.prizeType, String(award.assignedChannelId || ""));
      }
    }
    const alreadyUsed = new Set<string>();
    for (const t of types) {
      const assignedChannel = assignedByType.get(t);
      if (assignedChannel) alreadyUsed.add(assignedChannel);
    }
    for (const t of types) {
      if (assignedByType.get(t)) continue;
      const rankedCandidates = [...cumulativeEntries].sort((a, b) => {
        const aChannelId = String(a.odytChannelId || "");
        const bChannelId = String(b.odytChannelId || "");
        const aDecision = prizeOverlay.overlayByChannel[aChannelId]?.decisionsByPrizeType?.[t];
        const bDecision = prizeOverlay.overlayByChannel[bChannelId]?.decisionsByPrizeType?.[t];
        const aScore = Number(aDecision?.priorityScore ?? Number.NEGATIVE_INFINITY);
        const bScore = Number(bDecision?.priorityScore ?? Number.NEGATIVE_INFINITY);
        if (aScore !== bScore) return bScore - aScore;
        if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
        const aRank = Number.isFinite(Number(a.previousRank)) && Number(a.previousRank) > 0
          ? Number(a.previousRank)
          : Number.MAX_SAFE_INTEGER;
        const bRank = Number.isFinite(Number(b.previousRank)) && Number(b.previousRank) > 0
          ? Number(b.previousRank)
          : Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
        return (a.avgResponseTimeMs || Number.MAX_SAFE_INTEGER) - (b.avgResponseTimeMs || Number.MAX_SAFE_INTEGER);
      });
      for (const entry of rankedCandidates) {
        const channelId = String(entry.odytChannelId || "");
        if (!channelId || alreadyUsed.has(channelId)) continue;
        const decision = prizeOverlay.overlayByChannel[channelId]?.decisionsByPrizeType?.[t];
        if (decision?.eligibilityStatus !== "eligible") continue;
        slots[t] = entry;
        alreadyUsed.add(channelId);
        break;
      }
    }
    return slots;
  }, [activeAwards, cumulativeEntries, prizeOverlay.overlayByChannel]);

  const enabledRankedPrizeTypes = useMemo(
    () =>
      RANKED_PRIZE_ORDER.filter((type) =>
        prizeOverlay.policyEnabledTypes.includes(type)
      ),
    [prizeOverlay.policyEnabledTypes]
  );

  const suggestedPrizeByChannel = useMemo(() => {
    const next: Record<string, PrizeType[]> = {};
    const attach = (prizeType: PrizeType, entry: LeaderboardEntry | null) => {
      if (!entry) return;
      const channelId = String(entry.odytChannelId || "");
      if (!channelId) return;
      next[channelId] = [...(next[channelId] || []), prizeType];
    };
    for (const prizeType of enabledRankedPrizeTypes) {
      attach(prizeType, autoSuggestedPrizeByType[prizeType]);
    }
    return next;
  }, [autoSuggestedPrizeByType, enabledRankedPrizeTypes]);

  const displayBoardStatsByChannel = useMemo(() => {
    const next: Record<string, {
      rank1: number;
      rank2: number;
      rank3: number;
      top10: number;
      prizeSlots: number[];
      lucky: number;
      anyPrize: number;
      xpLevel: number;
    }> = {};
    for (const entry of cumulativeEntries) {
      const channelId = String(entry.odytChannelId || "");
      const base = userBoardStatsByChannel[channelId];
      next[channelId] = {
        rank1: Number(base?.rank1 || 0),
        rank2: Number(base?.rank2 || 0),
        rank3: Number(base?.rank3 || 0),
        top10: Number(base?.top10 || 0),
        prizeSlots: [...(base?.prizeSlots || Array.from({ length: 10 }, () => 0))].slice(0, 10),
        lucky: Number(base?.lucky || 0),
        anyPrize: Number(base?.anyPrize || 0),
        xpLevel: Number(base?.xpLevel || 0),
      };
    }
    return next;
  }, [cumulativeEntries, userBoardStatsByChannel]);

  const xpLevelByChannel = useMemo(() => {
    const next: Record<string, number> = {};
    for (const entry of cumulativeEntries) {
      const channelId = String(entry.odytChannelId || "");
      const overlayXP = Number(prizeOverlay.overlayByChannel[channelId]?.properParticipations);
      next[channelId] = Number.isFinite(overlayXP)
        ? overlayXP
        : Number(displayBoardStatsByChannel[channelId]?.xpLevel || 0);
    }
    return next;
  }, [cumulativeEntries, displayBoardStatsByChannel, prizeOverlay.overlayByChannel]);

  // Confetti on mount
  useEffect(() => {
    if (cumulativeEntries.length === 0) return;
    const timer = setTimeout(() => {
      const duration = 3500;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }, 1500);
    return () => clearTimeout(timer);
  }, [cumulativeEntries.length]);

  const top3 = cumulativeEntries.slice(0, 3);

  useEffect(() => {
    if (podiumMode === "prize" && enabledRankedPrizeTypes.length === 0) {
      setPodiumMode("rank");
    }
  }, [enabledRankedPrizeTypes.length, podiumMode]);

  const prizePodiumByRank = useMemo(() => {
    const pickByType = (prizeType: "quizfirst" | "quizsecond" | "quizthird"): LeaderboardEntry | null => {
      const candidates = activeAwards
        .filter((award) => award.prizeType === prizeType)
        .sort((a, b) => Number(a.prizeInstance || 1) - Number(b.prizeInstance || 1));
      for (const award of candidates) {
        const ch = String(award.assignedChannelId || "");
        if (!ch) continue;
        const entry = entriesByChannel.get(ch);
        if (entry) return entry;
      }
      return null;
    };

    const next: Partial<Record<1 | 2 | 3, LeaderboardEntry | null>> = {};
    for (const prizeType of enabledRankedPrizeTypes) {
      const slot = PRIZE_SLOT_BY_TYPE[prizeType];
      next[slot] = pickByType(prizeType) || autoSuggestedPrizeByType[prizeType] || null;
    }
    return next as Record<1 | 2 | 3, LeaderboardEntry | null>;
  }, [activeAwards, entriesByChannel, autoSuggestedPrizeByType, enabledRankedPrizeTypes]);

  const extraPrizeEntries = useMemo(() => {
    const bySlot = new Map<number, LeaderboardEntry>();
    const candidates = activeAwards
      .filter((award) => award.couponStatus !== "revoked" && award.prizeType !== "luckydip")
      .sort((a, b) => {
        const aSlot = parsePrizeSlot(String(a.prizeType || ""), a.rank) || 999;
        const bSlot = parsePrizeSlot(String(b.prizeType || ""), b.rank) || 999;
        return aSlot - bSlot;
      });
    for (const award of candidates) {
      const slot = parsePrizeSlot(String(award.prizeType || ""), award.rank);
      if (!slot || slot <= 3 || slot > 10 || bySlot.has(slot)) continue;
      const entry = entriesByChannel.get(String(award.assignedChannelId || ""));
      if (entry) bySlot.set(slot, entry);
    }
    return Array.from(bySlot.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([slot, entry]) => ({ slot, entry }));
  }, [activeAwards, entriesByChannel]);

  const rankPodiumByRank = useMemo(
    () =>
      ({
        1: top3[0] || null,
        2: top3[1] || null,
        3: top3[2] || null,
      } as Record<1 | 2 | 3, LeaderboardEntry | null>),
    [top3]
  );

  const winner = useMemo(() => {
    if (podiumMode === "prize") {
      for (const prizeType of enabledRankedPrizeTypes) {
        const slot = PRIZE_SLOT_BY_TYPE[prizeType];
        const entry = prizePodiumByRank[slot];
        if (entry) return entry;
      }
    }
    return rankPodiumByRank[1] || top3[0];
  }, [enabledRankedPrizeTypes, podiumMode, prizePodiumByRank, rankPodiumByRank, top3]);

  // Podium order: 2nd, 1st, 3rd
  const podiumEntries = useMemo(() => {
    const source = podiumMode === "prize" ? prizePodiumByRank : rankPodiumByRank;
    const rows: Array<{ entry: LeaderboardEntry; rank: 1 | 2 | 3 }> = [];
    const visibleRanks: Array<1 | 2 | 3> =
      podiumMode === "prize"
        ? ([2, 1, 3] as Array<1 | 2 | 3>).filter((rank) => {
            const type = RANKED_PRIZE_ORDER.find((candidate) => PRIZE_SLOT_BY_TYPE[candidate] === rank);
            return type ? enabledRankedPrizeTypes.includes(type) : false;
          })
        : [2, 1, 3];
    for (const rank of visibleRanks) {
      const entry = source[rank];
      if (entry) rows.push({ entry, rank });
    }
    return rows;
  }, [enabledRankedPrizeTypes, podiumMode, prizePodiumByRank, rankPodiumByRank]);

  const luckyWinners = useMemo(() => {
    return activeAwards
      .filter((award) => award.prizeType === "luckydip")
      .sort((a, b) => Number(a.prizeInstance || 1) - Number(b.prizeInstance || 1))
      .map((award) => {
        const entry = entriesByChannel.get(String(award.assignedChannelId || ""));
        return {
          awardId: award._id,
          luckyInstance: Number(award.prizeInstance || 1),
          channelId: String(award.assignedChannelId || ""),
          userName: entry?.userName || String(award.assignedChannelId || "Unknown"),
        };
      });
  }, [activeAwards, entriesByChannel]);

  const totalScore = useMemo(() => cumulativeEntries.reduce((s, e) => s + e.totalScore, 0), [cumulativeEntries]);
  const avgAccuracy = useMemo(() => {
    const correct = cumulativeEntries.reduce((s, e) => s + e.correctAnswers, 0);
    const total = cumulativeEntries.reduce((s, e) => s + e.totalResponses, 0);
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }, [cumulativeEntries]);
  const [luckyPicking, setLuckyPicking] = useState(false);
  const [luckyAssigning, setLuckyAssigning] = useState(false);
  const [luckyMessage, setLuckyMessage] = useState<string | null>(null);
  const pendingLucky = prizeOverlay.luckySelection;
  const nextLuckySlot = useMemo(() => {
    if (pendingLucky?.luckyInstance) return pendingLucky.luckyInstance;
    const maxAssigned = luckyWinners.reduce((max, w) => Math.max(max, Number(w.luckyInstance || 0)), 0);
    return maxAssigned + 1;
  }, [pendingLucky, luckyWinners]);

  useEffect(() => {
    try {
      localStorage.setItem(
        QUIZ_MIRROR_VIEWER_STATE_KEY,
        JSON.stringify({
          frontendQuizGameId: resolvedGameId,
          podiumMode,
          pendingLucky: pendingLucky
            ? {
                channelId: pendingLucky.channelId,
                userName: pendingLucky.userName,
                rank: pendingLucky.rank,
                luckyInstance: pendingLucky.luckyInstance,
              }
            : null,
          luckyPicking,
          awards: activeAwards.map((award): MirrorAwardState => ({
            assignedChannelId: String(award.assignedChannelId || ""),
            prizeType: award.prizeType,
            prizeInstance: Number(award.prizeInstance || 1),
            rank: Number.isFinite(Number(award.rank)) ? Number(award.rank) : null,
            couponStatus: String(award.couponStatus || ""),
          })),
          updatedAt: Date.now(),
        }),
      );
    } catch {
      // ignore mirror sync failures
    }
  }, [resolvedGameId, podiumMode, pendingLucky, luckyPicking, activeAwards]);

  const goBackToQuiz = async () => {
    const appId = resolvedApplicationId;
    if (appId && resolvedGameId && activeAwards.length > 0) {
      const summary = activeAwards
        .slice()
        .sort((a, b) => {
          const rankA = Number(a.rank || 999);
          const rankB = Number(b.rank || 999);
          if (rankA !== rankB) return rankA - rankB;
          return String(a.prizeType || "").localeCompare(String(b.prizeType || ""));
        })
        .map((award) => {
          const entry = entriesByChannel.get(String(award.assignedChannelId || ""));
          const name = entry?.userName || award.assignedChannelId;
          const label =
            award.prizeType === "quizfirst"
              ? "🏆1"
              : award.prizeType === "quizsecond"
                ? "🏆2"
                : award.prizeType === "quizthird"
                  ? "🏆3"
                  : award.prizeType === "luckydip"
                    ? `⭐${Number(award.prizeInstance || 1)}`
                    : "🎖️";
          return `${label} ${name}`;
        })
        .join(" | ");
      const signature = activeAwards
        .map((award) => `${award.prizeType}:${award.prizeInstance || 1}:${award.assignedChannelId}:${award.couponStatus}`)
        .sort()
        .join("|");
      const dedupeKey = `ytChatEvent:prize_winners:${resolvedGameId}:${signature}`;
      if (sessionStorage.getItem(dedupeKey) !== "1") {
        sessionStorage.setItem(dedupeKey, "1");
        await Promise.allSettled([
          broadcastEventToYouTubeChat({
            applicationId: appId,
            frontendQuizGameId: resolvedGameId,
            eventType: "prize_winners",
            eventKey: `prize_winners:${resolvedGameId}:${signature}`,
            tokens: {
              quizTitle: String(pageTitle || '').trim(),
              channelName: String(branding.channelName || '').trim(),
              'Channel Name': String(branding.channelName || '').trim(),
              prizeWinners: summary,
            },
          }),
          broadcastEventToTelegram({
            applicationId: appId,
            frontendQuizGameId: resolvedGameId,
            eventType: "prize_winners",
            eventKey: `prize_winners:${resolvedGameId}:${signature}`,
            tokens: {
              quizTitle: String(pageTitle || '').trim(),
              channelName: String(branding.channelName || '').trim(),
              'Channel Name': String(branding.channelName || '').trim(),
              prizeWinners: summary,
            },
          }),
        ]);
      }
    }
    if (gameId) { navigate(`/quiz?gameId=${encodeURIComponent(gameId)}`); return; }
    navigate("/quiz");
  };

  const handlePickLucky = async () => {
    setLuckyMessage(null);
    setLuckyPicking(true);
    try {
      const [selected] = await Promise.all([
        Promise.resolve(prizeOverlay.selectLuckyWinner()),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      if (!selected) {
        setLuckyMessage("No eligible lucky winner candidates are available.");
      }
    } finally {
      setLuckyPicking(false);
    }
  };

  const handleAssignLucky = async () => {
    setLuckyMessage(null);
    setLuckyAssigning(true);
    try {
      const result = await Promise.resolve(prizeOverlay.assignSelectedLucky());
      if (!result || ("success" in result && result.success === false)) {
        setLuckyMessage("Could not assign lucky winner. Please retry.");
        return;
      }
      setLuckyMessage(`Lucky Winner #${pendingLucky?.luckyInstance || nextLuckySlot} assigned.`);
      setAwardRefreshTick((prev) => prev + 1);
    } finally {
      setLuckyAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 relative overflow-hidden">
      {/* Floating sparkles */}
      {sparklePositions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none z-0"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          animate={{ opacity: [0, 0.7, 0], scale: [0, 1, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.15 }}
        >
          <Sparkles className="h-3 w-3 text-primary/40" />
        </motion.div>
      ))}

      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 p-4 md:p-8 mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.h1
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-3xl md:text-4xl font-black"
          >
            <Trophy className="h-8 w-8 text-primary animate-energy-pulse" />
            <span className="animate-text-shimmer">Final Viewer Leaderboard</span>
          </motion.h1>
          <Button variant="outline" onClick={goBackToQuiz} className="border-border/50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {cumulativeEntries.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground bg-card/60 backdrop-blur-sm border-border/30">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            {rankingLoadError || "No backend final viewer leaderboard available yet."}
          </Card>
        ) : (
          <>
            {/* Champion Announcement */}
            {winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-center mb-8"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-wrap items-center justify-center gap-3 text-2xl md:text-3xl font-black"
                >
                  <span className="text-muted-foreground">👑 Viewer Champion</span>
                  <span className="text-primary animate-text-shimmer">{winner.userName}</span>
                  <span className="text-foreground">{winner.totalScore} points</span>
                </motion.div>
              </motion.div>
            )}

            {/* Stats Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center gap-6 mb-8 flex-wrap"
            >
              <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border/30">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground">{cumulativeEntries.length}</span>
                <span className="text-muted-foreground text-sm">Viewers</span>
              </div>
              <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border/30">
                <Coins className="h-5 w-5 text-yellow-400" />
                <span className="font-bold text-foreground">{totalScore}</span>
                <span className="text-muted-foreground text-sm">Total Points</span>
              </div>
              <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-border/30">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-foreground">{avgAccuracy}%</span>
                <span className="text-muted-foreground text-sm">Avg Accuracy</span>
              </div>
            </motion.div>

            {/* Podium */}
            <div className="mb-3 flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant={podiumMode === "rank" ? "default" : "outline"}
                onClick={() => setPodiumMode("rank")}
              >
                Top Scores
              </Button>
              <Button
                size="sm"
                variant={podiumMode === "prize" ? "default" : "outline"}
                onClick={() => setPodiumMode("prize")}
                disabled={enabledRankedPrizeTypes.length === 0}
              >
                Prize Winners
              </Button>
            </div>
            <div className="flex items-end justify-center gap-4 md:gap-6 mb-10">
              {podiumEntries.map(({ entry, rank }, idx) => (
                <PodiumViewer key={`${rank}:${entry.odytChannelId}`} entry={entry} rank={rank} index={idx} />
              ))}
            </div>
            {podiumMode === "prize" && extraPrizeEntries.length > 0 ? (
              <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                {extraPrizeEntries.map(({ slot, entry }) => (
                  <div
                    key={`${slot}:${entry.odytChannelId}`}
                    className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/50 px-3 py-2"
                  >
                    <Trophy className="h-4 w-4 text-fuchsia-400" />
                    <span className="text-xs text-muted-foreground">Prize #{slot}</span>
                    <span className="text-sm font-semibold">{entry.userName}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {podiumMode === "prize" ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="mb-8 rounded-xl border border-border/30 bg-card/60 p-4 backdrop-blur-sm"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Star className="h-4 w-4 text-yellow-400" />
                    Lucky Winners
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingLucky ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={luckyAssigning || luckyPicking}
                          onClick={() => {
                            prizeOverlay.clearLuckySelection();
                            setLuckyMessage("Lucky selection rejected.");
                          }}
                        >
                          Reject
                        </Button>
                        <Button size="sm" disabled={luckyAssigning || luckyPicking} onClick={handleAssignLucky}>
                          {luckyAssigning ? "Assigning..." : `Assign Lucky #${pendingLucky.luckyInstance}`}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" disabled={luckyPicking || luckyAssigning} onClick={handlePickLucky}>
                        {luckyPicking ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Picking...
                          </>
                        ) : (
                          `Pick Lucky Winner #${nextLuckySlot}`
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="relative min-h-[120px] rounded-lg border border-border/20 bg-background/40 p-3">
                  {luckyPicking ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]">
                      <div className="flex items-center gap-3 rounded-full border border-border/40 bg-card/90 px-4 py-2 text-sm text-muted-foreground shadow-sm">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        Selecting Lucky Winner #{nextLuckySlot}...
                      </div>
                    </div>
                  ) : null}
                  {pendingLucky ? (
                    <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <Avatar className="h-14 w-14 border-2 border-primary/30">
                        <AvatarImage src={entriesByChannel.get(pendingLucky.channelId)?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingLucky.channelId}`} />
                        <AvatarFallback>{pendingLucky.userName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Lucky Winner #{pendingLucky.luckyInstance} (selected)</div>
                        <div className="truncate text-base font-bold text-foreground">{pendingLucky.userName}</div>
                        <div className="text-xs text-muted-foreground">Rank #{pendingLucky.rank}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground" title="XP Level">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                          <span>{Number(xpLevelByChannel[pendingLucky.channelId] || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ) : luckyWinners.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {luckyWinners.map((winner) => {
                        const entry = entriesByChannel.get(winner.channelId);
                        return (
                          <div
                            key={winner.awardId}
                            className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-gradient-to-br from-yellow-500/15 via-amber-500/10 to-orange-500/15 p-3"
                          >
                            <Avatar className="h-12 w-12 border border-yellow-300/30">
                              <AvatarImage src={entry?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${winner.channelId}`} />
                              <AvatarFallback>{winner.userName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-xs text-yellow-300">Lucky Winner #{winner.luckyInstance}</div>
                              <div className="truncate text-sm font-bold">{winner.userName}</div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground" title="XP Level">
                                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                                <span>{Number(xpLevelByChannel[winner.channelId] || 0)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-[96px] items-center justify-center text-sm text-muted-foreground">
                      No lucky winners selected yet.
                    </div>
                  )}
                </div>
                {luckyMessage ? <p className="mt-3 text-xs text-muted-foreground">{luckyMessage}</p> : null}
              </motion.div>
            ) : null}

            {/* Full Leaderboard with Prize Controls */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5 }}
            >
              <Card className="bg-card/60 backdrop-blur-sm border-border/30 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-primary" />
                  <span className="font-bold text-foreground text-lg">
                    {podiumMode === "rank" ? "Top Scores" : "Prize Winners"}
                  </span>
                  <Badge variant="secondary" className="ml-auto">{cumulativeEntries.length} participants</Badge>
                </div>
                <LiveLeaderboard
                  entries={cumulativeEntries}
                  isConnected={true}
                  isExpanded={true}
                  enablePrizeAdminControls={podiumMode === "prize"}
                  prizeTypeOptions={podiumMode === "prize" ? prizeOverlay.policyEnabledTypes : []}
                  prizeOverlayByChannel={podiumMode === "prize" ? prizeOverlay.overlayByChannel : {}}
                  selectedPrizeByChannel={podiumMode === "prize" ? prizeOverlay.selectedPrizeByChannel : {}}
                  assigningByChannel={podiumMode === "prize" ? prizeOverlay.assigningByChannel : {}}
                  occupiedPrizeByType={podiumMode === "prize" ? occupiedPrizeByType : {}}
                  onSelectPrizeType={podiumMode === "prize"
                    ? (channelId, prizeType) =>
                        prizeOverlay.setSelectedPrizeByChannel((prev) => ({ ...prev, [channelId]: prizeType }))
                    : undefined}
                  onAssignPrize={podiumMode === "prize"
                    ? (channelId, prizeType) => {
                        void (async () => {
                          const result = await prizeOverlay.assignForChannel({ channelId, prizeType });
                          if (result?.success) {
                            setAwardRefreshTick((prev) => prev + 1);
                            toast({
                              title: "Prize Assigned",
                              description: "The prize assignment has been saved.",
                            });
                            return;
                          }
                          toast({
                            title: "Prize Assignment Blocked",
                            description: String(result?.error || "Could not assign the selected prize."),
                            variant: "destructive",
                          });
                        })();
                      }
                    : undefined}
                  onRemoveAward={podiumMode === "prize"
                    ? (awardId) => {
                        void (async () => {
                          const result = await prizeOverlay.removeAward(awardId);
                          if (result?.success) {
                            setAwardRefreshTick((prev) => prev + 1);
                            toast({
                              title: "Prize Removed",
                              description: "The prize slot is now free to assign again.",
                            });
                            return;
                          }
                          toast({
                            title: "Prize Removal Failed",
                            description: String(result?.error || "Could not remove the assigned prize."),
                            variant: "destructive",
                          });
                        })();
                      }
                    : undefined}
                  suggestedPrizeByChannel={podiumMode === "prize" ? suggestedPrizeByChannel : {}}
                  userBoardStatsByChannel={podiumMode === "prize" ? displayBoardStatsByChannel : {}}
                  xpLevelByChannel={podiumMode === "prize" ? xpLevelByChannel : {}}
                />
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default FinalViewerLeaderboard;
