/**
 * QuizMirror — Portrait, read-only reflection of the live quiz.
 *
 * Vertical (9:16) screencast surface for YouTube vertical live.
 * Read-only — no controls. Mirrors host state via Zustand store
 * (cross-tab BroadcastChannel) + localStorage poll fallback.
 *
 * Layout (top → bottom, mobile-first):
 *   1. Teams scoreboard (always pinned at top)
 *   2. Question + options
 *        • shows team's selected option live (ring)
 *        • shows correct/wrong on reveal
 *   3. Question-scoped panel (only while a question is active OR just revealed):
 *        • Live: icon-only newest-first response avatars (no counter / no accuracy)
 *        • Reveal: fastest-correct list with score
 *   4. Top viewers (cumulative) — shown ONLY between questions / on idle
 *   5. Quiz-ending banner — when host clicks "End the Quiz", shows "Ending in N…"
 *   6. End-of-quiz: confetti + champion + 2-1-3 team podium + viewer podium
 *      + lucky winner spotlight + scrolling prize winners list
 *
 * Mirrors the visual language of /quiz/end/teams and /quiz/end/viewers
 * (same animations, gradients, sparkles, confetti) but optimized for
 * a 480-wide portrait viewport.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Medal, Sparkles, Trophy, Users, Zap, Star, Gift, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { readActiveQuizRunConfigIdSync } from "@/lib/quizRunConfig";
import { LuckySelection } from "@/hooks/usePrizeOverlay";
import { useQuizStore } from "@/store/quizStore";
import { getGameState, getViewerLeaderboard } from "@/lib/gameStateManager";
import {
  getFinalLeaderboardSnapshot,
  FinalTeamLeaderboardEntry,
  FinalViewerLeaderboardEntry,
} from "@/lib/finalLeaderboardSnapshot";
import { usePageTitle } from "@/hooks/usePageTitle";
import { readMirroredAdminSettingSync } from "@/lib/adminConfigPersistence";
import confetti from "canvas-confetti";
interface TeamConfig {
  name: string;
  members?: string[];
  avatar?: string;
}

const TEAM_TINTS = [
  "from-pink-500/30 to-rose-500/10 border-pink-500/40",
  "from-sky-500/30 to-blue-500/10 border-sky-500/40",
  "from-emerald-500/30 to-green-500/10 border-emerald-500/40",
  "from-amber-500/30 to-orange-500/10 border-amber-500/40",
];
const QUIZ_MIRROR_VIEWER_STATE_KEY = "quizMirrorViewerState";
const RANKED_PRIZE_ORDER: Array<"quizfirst" | "quizsecond" | "quizthird"> = ["quizfirst", "quizsecond", "quizthird"];
const PRIZE_SLOT_BY_TYPE: Record<"quizfirst" | "quizsecond" | "quizthird", 1 | 2 | 3> = {
  quizfirst: 1,
  quizsecond: 2,
  quizthird: 3,
};

const formatMs = (ms: number): string => {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const loadTeams = (): TeamConfig[] => {
  try {
    const parsed = readMirroredAdminSettingSync<unknown[]>("teamConfigs", []);
    return Array.isArray(parsed) ? (parsed as TeamConfig[]) : [];
  } catch {
    return [];
  }
};

const loadTeamLifelinesState = (): number[] => {
  try {
    const raw = localStorage.getItem("teamLifelinesState");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => Number(value || 0));
  } catch {
    return [];
  }
};

const loadEndingState = (): { active: boolean; remainingSec: number } => {
  try {
    const at = Number(localStorage.getItem("quizEndingAt") || "0");
    const dur = Number(localStorage.getItem("quizEndingDurationSec") || "5");
    if (!at) return { active: false, remainingSec: 0 };
    const elapsed = Math.floor((Date.now() - at) / 1000);
    const remaining = Math.max(0, dur - elapsed);
    return { active: true, remainingSec: remaining };
  } catch {
    return { active: false, remainingSec: 0 };
  }
};

interface MirrorViewerState {
  frontendQuizGameId: string | null;
  podiumMode: "rank" | "prize";
  pendingLucky: LuckySelection | null;
  luckyPicking: boolean;
  awards: Array<{
    assignedChannelId: string;
    prizeType: "quizfirst" | "quizsecond" | "quizthird" | "luckydip" | "custom";
    prizeInstance?: number;
    rank?: number | null;
    couponStatus?: string;
  }>;
}

const loadMirrorViewerState = (): MirrorViewerState => {
  try {
    const raw = localStorage.getItem(QUIZ_MIRROR_VIEWER_STATE_KEY);
    if (!raw) {
      return {
        frontendQuizGameId: null,
        podiumMode: "rank",
        pendingLucky: null,
        luckyPicking: false,
        awards: [],
      };
    }
    const parsed = JSON.parse(raw);
    return {
      frontendQuizGameId: String(parsed?.frontendQuizGameId || "").trim() || null,
      podiumMode: parsed?.podiumMode === "prize" ? "prize" : "rank",
      pendingLucky: parsed?.pendingLucky
        ? {
            channelId: String(parsed.pendingLucky.channelId || ""),
            userName: String(parsed.pendingLucky.userName || "Lucky Winner"),
            rank: Number(parsed.pendingLucky.rank || 0),
            luckyInstance: Number(parsed.pendingLucky.luckyInstance || 1),
          }
        : null,
      luckyPicking: Boolean(parsed?.luckyPicking),
      awards: Array.isArray(parsed?.awards)
        ? parsed.awards.map((award: Record<string, unknown>) => ({
            assignedChannelId: String(award.assignedChannelId || ""),
            prizeType:
              award.prizeType === "quizfirst" ||
              award.prizeType === "quizsecond" ||
              award.prizeType === "quizthird" ||
              award.prizeType === "luckydip" ||
              award.prizeType === "custom"
                ? award.prizeType
                : "custom",
            prizeInstance: Number(award.prizeInstance || 1),
            rank: Number.isFinite(Number(award.rank)) ? Number(award.rank) : null,
            couponStatus: String(award.couponStatus || ""),
          }))
        : [],
    };
  } catch {
    return {
      frontendQuizGameId: null,
      podiumMode: "rank",
      pendingLucky: null,
      luckyPicking: false,
      awards: [],
    };
  }
};

const parsePrizeSlot = (prizeType: string, rank?: number | null): number | null => {
  if (prizeType === "quizfirst") return 1;
  if (prizeType === "quizsecond") return 2;
  if (prizeType === "quizthird") return 3;
  const slot = Number(rank || 0);
  if (Number.isFinite(slot) && slot >= 1 && slot <= 10) return slot;
  return null;
};

const useAutoScroll = (
  rootRef: { current: HTMLElement | null },
  enabled: boolean,
  resetKey: string,
  mode: "bounce" | "loop" = "bounce",
) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;
    const viewport =
      (root.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null) || root;
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    if (maxScroll <= 8) return;
    const cycleHeight = mode === "loop" ? viewport.scrollHeight / 2 : maxScroll;

    let rafId = 0;
    let pauseId: number | undefined;
    let cancelled = false;
    let direction = 1;
    const speed = 0.55;
    const pauseMs = 1400;

    const tick = () => {
      if (cancelled) return;
      const nextMaxScroll = viewport.scrollHeight - viewport.clientHeight;
      if (nextMaxScroll <= 8) return;
      const nextTop = viewport.scrollTop + speed * direction;
      if (mode === "loop" && cycleHeight > 8 && nextTop >= cycleHeight) {
        viewport.scrollTop = nextTop - cycleHeight;
        rafId = window.requestAnimationFrame(tick);
        return;
      }
      if (nextTop >= nextMaxScroll) {
        if (mode === "loop") {
          viewport.scrollTop = 0;
          pauseId = window.setTimeout(() => {
            rafId = window.requestAnimationFrame(tick);
          }, 700);
          return;
        }
        viewport.scrollTop = nextMaxScroll;
        direction = -1;
        pauseId = window.setTimeout(() => {
          rafId = window.requestAnimationFrame(tick);
        }, pauseMs);
        return;
      }
      if (nextTop <= 0) {
        viewport.scrollTop = 0;
        direction = 1;
        pauseId = window.setTimeout(() => {
          rafId = window.requestAnimationFrame(tick);
        }, pauseMs);
        return;
      }
      viewport.scrollTop = nextTop;
      rafId = window.requestAnimationFrame(tick);
    };

    viewport.scrollTop = 0;
    pauseId = window.setTimeout(() => {
      rafId = window.requestAnimationFrame(tick);
    }, 900);

    return () => {
      cancelled = true;
      if (pauseId) window.clearTimeout(pauseId);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [rootRef, enabled, resetKey, mode]);
};

const getPodiumGradient = (rank: number) => {
  switch (rank) {
    case 1:
      return "from-yellow-500 via-amber-400 to-yellow-600";
    case 2:
      return "from-gray-400 via-gray-300 to-gray-500";
    case 3:
      return "from-amber-700 via-amber-600 to-amber-800";
    default:
      return "from-muted to-muted";
  }
};

const getPodiumHeight = (rank: number) => {
  switch (rank) {
    case 1:
      return "h-32";
    case 2:
      return "h-24";
    case 3:
      return "h-20";
    default:
      return "h-14";
  }
};

const TeamPodiumColumn = ({
  team,
  rank,
  index,
}: {
  team: FinalTeamLeaderboardEntry;
  rank: number;
  index: number;
}) => (
  <motion.div
    initial={{ y: 200, opacity: 0, scale: 0.5 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    transition={{ delay: 0.6 + index * 0.25, type: "spring", stiffness: 120, damping: 14 }}
    className="flex flex-1 max-w-[110px] flex-col items-center"
  >
    <motion.div
      animate={rank === 1 ? { rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] } : {}}
      transition={{ duration: 2.5, repeat: Infinity }}
      className="mb-1"
    >
      {rank === 1 ? (
        <Crown className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" />
      ) : (
        <Medal
          className={cn(
            "h-6 w-6 drop-shadow-lg",
            rank === 2 ? "text-gray-300" : "text-amber-600",
          )}
        />
      )}
    </motion.div>
    <motion.div
      className={cn(
        "relative mb-1 rounded-full bg-gradient-to-br p-0.5",
        rank === 1
          ? "from-yellow-400 to-amber-500"
          : rank === 2
            ? "from-gray-300 to-gray-400"
            : "from-amber-500 to-amber-700",
      )}
      animate={
        rank === 1
          ? {
              boxShadow: [
                "0 0 14px rgba(234,179,8,0.4)",
                "0 0 28px rgba(234,179,8,0.7)",
                "0 0 14px rgba(234,179,8,0.4)",
              ],
            }
          : {}
      }
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div
        className={cn(
          "rounded-full border-2 border-background bg-card flex items-center justify-center",
          rank === 1 ? "h-12 w-12" : "h-10 w-10",
        )}
      >
        <Users className={cn(rank === 1 ? "h-5 w-5" : "h-4 w-4", "text-primary")} />
      </div>
    </motion.div>
    <h3
      className={cn(
        "max-w-full truncate text-center font-bold text-foreground",
        rank === 1 ? "text-sm" : "text-xs",
      )}
    >
      {team.teamName}
    </h3>
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1 + index * 0.25, type: "spring" }}
      className={cn(
        "mb-1.5 text-base font-black tabular-nums",
        rank === 1
          ? "text-yellow-400"
          : rank === 2
            ? "text-gray-300"
            : "text-amber-500",
      )}
    >
      {team.score}
    </motion.div>
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: "auto" }}
      transition={{ delay: 1.2 + index * 0.2, duration: 0.7, type: "spring" }}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-b shadow-2xl",
        getPodiumHeight(rank),
        getPodiumGradient(rank),
      )}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      <span className="relative z-10 text-2xl font-black text-white drop-shadow-lg">
        {rank}
      </span>
    </motion.div>
  </motion.div>
);

const ViewerPodiumColumn = ({
  entry,
  rank,
  index,
}: {
  entry: FinalViewerLeaderboardEntry;
  rank: number;
  index: number;
}) => (
  <motion.div
    initial={{ y: 200, opacity: 0, scale: 0.5 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    transition={{ delay: 0.6 + index * 0.25, type: "spring", stiffness: 120, damping: 14 }}
    className="flex flex-1 max-w-[110px] flex-col items-center"
  >
    <motion.div
      animate={rank === 1 ? { rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] } : {}}
      transition={{ duration: 2.5, repeat: Infinity }}
      className="mb-1"
    >
      {rank === 1 ? (
        <Crown className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" />
      ) : (
        <Medal
          className={cn(
            "h-6 w-6 drop-shadow-lg",
            rank === 2 ? "text-gray-300" : "text-amber-600",
          )}
        />
      )}
    </motion.div>
    <motion.div
      className={cn(
        "relative mb-1 rounded-full bg-gradient-to-br p-0.5",
        rank === 1
          ? "from-yellow-400 to-amber-500"
          : rank === 2
            ? "from-gray-300 to-gray-400"
            : "from-amber-500 to-amber-700",
      )}
      animate={
        rank === 1
          ? {
              boxShadow: [
                "0 0 14px rgba(234,179,8,0.4)",
                "0 0 28px rgba(234,179,8,0.7)",
                "0 0 14px rgba(234,179,8,0.4)",
              ],
            }
          : {}
      }
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Avatar
        className={cn(
          "border-2 border-background",
          rank === 1 ? "h-14 w-14" : "h-11 w-11",
        )}
      >
        <AvatarImage
          src={entry.avatarUrl}
          alt={entry.userName}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          loading="eager"
        />
        <AvatarFallback className="bg-muted font-bold">
          {entry.userName?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
    </motion.div>
    <h3
      className={cn(
        "max-w-full truncate text-center font-bold text-foreground",
        rank === 1 ? "text-sm" : "text-xs",
      )}
    >
      {entry.userName}
    </h3>
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1 + index * 0.25, type: "spring" }}
      className={cn(
        "mb-1.5 text-base font-black tabular-nums",
        rank === 1
          ? "text-yellow-400"
          : rank === 2
            ? "text-gray-300"
            : "text-amber-500",
      )}
    >
      {entry.totalScore}
    </motion.div>
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: "auto" }}
      transition={{ delay: 1.2 + index * 0.2, duration: 0.7, type: "spring" }}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-b shadow-2xl",
        getPodiumHeight(rank),
        getPodiumGradient(rank),
      )}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
      <span className="relative z-10 text-2xl font-black text-white drop-shadow-lg">
        {rank}
      </span>
    </motion.div>
  </motion.div>
);

const QuizMirror = () => {
  usePageTitle();
  const { applicationId, frontendQuizGameId } = useApp();

  const gameState = useQuizStore((s) => s.gameState);
  const viewerLeaderboard = useQuizStore((s) => s.viewerLeaderboard);
  const hydrate = useQuizStore((s) => s.hydrateFromStorage);

  const [teams, setTeams] = useState<TeamConfig[]>(loadTeams);
  const [teamLifelines, setTeamLifelines] = useState<number[]>(loadTeamLifelinesState);
  const [endingState, setEndingState] = useState(loadEndingState);
  const [snapshot, setSnapshot] = useState(() => getFinalLeaderboardSnapshot());
  const [viewerMirrorState, setViewerMirrorState] = useState<MirrorViewerState>(loadMirrorViewerState);
  const [mirrorView, setMirrorView] = useState<"teams" | "viewers" | null>(() => {
    try {
      const v = localStorage.getItem("quizMirrorView");
      return v === "teams" || v === "viewers" ? v : null;
    } catch {
      return null;
    }
  });

  // Refresh helper used by both BroadcastChannel + storage poll fallback.
  const refreshMirrorSnapshot = useRef(() => {
    hydrate();
    setTeams(loadTeams());
    setTeamLifelines(loadTeamLifelinesState());
    setEndingState(loadEndingState());
    setSnapshot(getFinalLeaderboardSnapshot());
    setViewerMirrorState(loadMirrorViewerState());
    try {
      const v = localStorage.getItem("quizMirrorView");
      setMirrorView(v === "teams" || v === "viewers" ? v : null);
    } catch { /* ignore */ }
  });

  // BroadcastChannel listener — instant updates from the host tab via the
  // existing 'quiz-state-v1' channel. Polling stays as a 5s safety net for
  // when BC messages are missed (window opened mid-session, etc).
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('quiz-state-v1');
    const onMessage = () => {
      // Any message on this channel is a signal that mirror state may have changed.
      refreshMirrorSnapshot.current();
    };
    bc.addEventListener('message', onMessage);
    return () => {
      bc.removeEventListener('message', onMessage);
      bc.close();
    };
  }, []);

  // Poll localStorage as a fallback for missed BroadcastChannel messages.
  // Reduced from 1s to 5s since BC handles most updates instantly now.
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMirrorSnapshot.current();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key === "quizGameState" ||
        e.key === "viewerLeaderboard" ||
        e.key === "teamLifelinesState" ||
        e.key === "teamConfigs" ||
        e.key === "quizEndingAt" ||
        e.key === "quizEndingDurationSec" ||
        e.key === "finalLeaderboardSnapshot" ||
        e.key === "quizMirrorView" ||
        e.key === QUIZ_MIRROR_VIEWER_STATE_KEY ||
        e.key.startsWith("prize")
      ) {
        refreshMirrorSnapshot.current();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const fallback = useMemo(() => gameState ?? getGameState(), [gameState]);
  // Mirror should prefer the persisted leaderboard snapshot because cross-tab
  // local store state can lag by one question in some flows.
  const persistedViewerLeaderboard = getViewerLeaderboard();
  const cumulativeViewers = persistedViewerLeaderboard.length
    ? persistedViewerLeaderboard
    : viewerLeaderboard;

  const cumulativeViewerRanked = useMemo(
    () =>
      [...cumulativeViewers]
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((entry, idx) => ({
          ...entry,
          rank: idx + 1,
        })),
    [cumulativeViewers],
  );

  const currentQuestion = fallback?.currentQuestion ?? null;
  const responses = useMemo(() => fallback?.currentQuestionResponses ?? [], [fallback?.currentQuestionResponses]);
  const [displayedNewestResponses, setDisplayedNewestResponses] = useState<typeof responses>([]);
  const teamSelectedAnswer = fallback?.selectedAnswer ?? null;
  const questionPhase = fallback?.questionPhase ?? "idle";
  const isQuestionActive = !!fallback?.questionActive || questionPhase === "open";
  const isRevealed = !!fallback?.showRevealAnimation || questionPhase === "revealed";
  const showQuestionPanel = isQuestionActive || isRevealed;
  const teamScores = fallback?.teamScores ?? [];
  const currentTeamIndex = fallback?.currentTeamIndex ?? 0;
  const gameEnded = !!fallback?.gameEnded;
  const powerplayUsed: boolean[] = fallback?.powerplayUsed ?? [];
  const powerplayActive = !!fallback?.powerplayActive;
  const powerplayTeam = fallback?.powerplayTeam ?? null;
  const resolvedGameId = String(
    frontendQuizGameId ||
      localStorage.getItem("frontendQuizGameId") ||
      readActiveQuizRunConfigIdSync() ||
      "",
  ).trim();
  const snapshotForRun = useMemo(() => {
    const snapshotGameId = String(snapshot?.gameId || "").trim();
    if (!snapshot) return null;
    if (!resolvedGameId) return null;
    return snapshotGameId && snapshotGameId === resolvedGameId ? snapshot : null;
  }, [snapshot, resolvedGameId]);
  const mirrorStateApplies = Boolean(
    resolvedGameId &&
      viewerMirrorState.frontendQuizGameId &&
      viewerMirrorState.frontendQuizGameId === resolvedGameId,
  );

  // Prefer snapshot once the game ended (matches /quiz/end/teams sourcing)
  const finalTeamRanked = useMemo(() => {
    if (!gameEnded || !snapshotForRun?.teams?.length) return [];
    return [...snapshotForRun.teams]
      .sort((a, b) => b.score - a.score)
      .map((team, _i, arr) => ({
        ...team,
        rank: arr.findIndex((t) => t.score === team.score) + 1,
      }));
  }, [gameEnded, snapshotForRun]);

  const finalViewerRanked = useMemo(() => {
    if (!gameEnded) return [];
    if (snapshotForRun?.viewers?.length) {
      return [...snapshotForRun.viewers].sort((a, b) => a.rank - b.rank);
    }
    return [...cumulativeViewerRanked]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((v, idx) => ({
        odytChannelId: v.odytChannelId,
        userName: v.userName,
        avatarUrl: v.avatarUrl,
        totalScore: v.totalScore,
        correctAnswers: v.correctAnswers,
        totalResponses: v.totalResponses,
        avgResponseTimeMs: v.avgResponseTimeMs || 0,
        rank: idx + 1,
      }));
  }, [gameEnded, snapshotForRun, cumulativeViewerRanked]);

  // Newest-first list of unique responses, only icons in the row.
  const newestResponses = useMemo(() => {
    if (!responses.length) return [];
    const reversed = [...responses].reverse();
    const seen = new Set<string>();
    const unique = reversed.filter((r) => {
      if (seen.has(r.odytChannelId)) return false;
      seen.add(r.odytChannelId);
      return true;
    });
    return unique.slice(0, 60);
  }, [responses]);

  const liveRevealQueueRef = useRef<typeof responses>([]);
  const liveRevealTimerRef = useRef<number | null>(null);
  const displayedNewestResponsesRef = useRef<typeof responses>([]);

  useEffect(() => {
    displayedNewestResponsesRef.current = displayedNewestResponses;
  }, [displayedNewestResponses]);

  useEffect(() => {
    const responseKey = (entry: (typeof responses)[number]) =>
      String(entry?.id || `${entry?.odytChannelId || ""}:${entry?.answer || ""}:${entry?.responseTimeMs || 0}`);

    const clearQueue = () => {
      if (liveRevealTimerRef.current) {
        window.clearTimeout(liveRevealTimerRef.current);
        liveRevealTimerRef.current = null;
      }
      liveRevealQueueRef.current = [];
    };

    const scheduleNextReveal = () => {
      if (liveRevealTimerRef.current || !liveRevealQueueRef.current.length) return;
      liveRevealTimerRef.current = window.setTimeout(() => {
        liveRevealTimerRef.current = null;
        const nextEntry = liveRevealQueueRef.current.shift();
        if (!nextEntry) return;
        setDisplayedNewestResponses((prev) => {
          const nextKey = responseKey(nextEntry);
          const nextList = [nextEntry, ...prev.filter((entry) => responseKey(entry) !== nextKey)].slice(0, 60);
          displayedNewestResponsesRef.current = nextList;
          return nextList;
        });
        scheduleNextReveal();
      }, 170);
    };

    if (isRevealed || !isQuestionActive) {
      clearQueue();
      displayedNewestResponsesRef.current = [];
      setDisplayedNewestResponses([]);
      return () => clearQueue();
    }

    const source = newestResponses;
    const sourceKeySet = new Set(source.map(responseKey));
    const retained = displayedNewestResponsesRef.current.filter((entry) => sourceKeySet.has(responseKey(entry)));
    const retainedKeySet = new Set(retained.map(responseKey));
    const pending = source.filter((entry) => !retainedKeySet.has(responseKey(entry))).reverse();

    displayedNewestResponsesRef.current = retained;
    setDisplayedNewestResponses(retained);
    liveRevealQueueRef.current = pending;
    scheduleNextReveal();

    return () => {
      if (isRevealed || !isQuestionActive) clearQueue();
    };
  }, [newestResponses, isQuestionActive, isRevealed, currentQuestion?.text]);

  // Fastest-correct (only after reveal)
  const fastestCorrect = useMemo(() => {
    if (!isRevealed || !responses.length) return [];
    const seen = new Set<string>();
    const dedup = responses.filter((r) => {
      if (seen.has(r.odytChannelId)) return false;
      seen.add(r.odytChannelId);
      return true;
    });
    return dedup
      .filter((r) => r.isCorrect === true)
      .sort((a, b) => a.responseTimeMs - b.responseTimeMs)
      .slice(0, 8);
  }, [responses, isRevealed]);

  const rotatingFastestCorrect = useMemo(() => {
    if (fastestCorrect.length <= 4) return fastestCorrect;
    return [...fastestCorrect, ...fastestCorrect];
  }, [fastestCorrect]);

  const rotatingIdleCumulativeViewers = useMemo(() => {
    if (cumulativeViewerRanked.length <= 10) return cumulativeViewerRanked;
    return [...cumulativeViewerRanked, ...cumulativeViewerRanked];
  }, [cumulativeViewerRanked]);

  const correctChoiceIndex = currentQuestion?.correctAnswer ?? -1;

  const entriesByChannel = useMemo(() => {
    const map = new Map<string, FinalViewerLeaderboardEntry>();
    for (const entry of finalViewerRanked) {
      map.set(String(entry.odytChannelId || ""), entry);
    }
    return map;
  }, [finalViewerRanked]);

  const mirroredAwards = useMemo(
    () =>
      (viewerMirrorState.awards || []).filter(
        (award) => award.assignedChannelId && String(award.couponStatus || "") !== "revoked",
      ),
    [viewerMirrorState.awards],
  );

  const activeAwards = useMemo(() => {
    if (!mirrorStateApplies || mirroredAwards.length === 0) return [];
    return mirroredAwards
      .map((award) => ({
        assignedChannelId: String(award.assignedChannelId || ""),
        prizeType: award.prizeType,
        prizeInstance: Number(award.prizeInstance || 1),
        rank: award.rank ?? null,
        couponStatus: award.couponStatus || "assigned",
      }))
      .filter((award) => Boolean(award.assignedChannelId && entriesByChannel.has(award.assignedChannelId)));
  }, [mirrorStateApplies, mirroredAwards, entriesByChannel]);

  const enabledRankedPrizeTypes = useMemo(
    () =>
      RANKED_PRIZE_ORDER.filter((type) =>
        activeAwards.some((award) => award.prizeType === type),
      ),
    [activeAwards],
  );

  const prizePodiumByRank = useMemo(() => {
    const next: Partial<Record<1 | 2 | 3, FinalViewerLeaderboardEntry | null>> = {};
    for (const prizeType of enabledRankedPrizeTypes) {
      const slot = PRIZE_SLOT_BY_TYPE[prizeType];
      const assignedAward = activeAwards
        .filter((award) => award.prizeType === prizeType)
        .sort((a, b) => Number(a.prizeInstance || 1) - Number(b.prizeInstance || 1))[0];
      const assignedEntry = assignedAward ? entriesByChannel.get(String(assignedAward.assignedChannelId || "")) || null : null;
      next[slot] = assignedEntry || null;
    }
    return next as Record<1 | 2 | 3, FinalViewerLeaderboardEntry | null>;
  }, [activeAwards, enabledRankedPrizeTypes, entriesByChannel]);

  const rankPodiumByRank = useMemo(
    () =>
      ({
        1: finalViewerRanked[0] || null,
        2: finalViewerRanked[1] || null,
        3: finalViewerRanked[2] || null,
      } as Record<1 | 2 | 3, FinalViewerLeaderboardEntry | null>),
    [finalViewerRanked],
  );

  const viewerPodiumMode =
    mirrorStateApplies
      ? viewerMirrorState.podiumMode
      : "rank";
  const pendingLucky =
    mirrorStateApplies
      ? viewerMirrorState.pendingLucky
      : null;
  const luckyPicking =
    mirrorStateApplies
      ? viewerMirrorState.luckyPicking
      : false;

  const luckyWinners = useMemo(() => {
    return activeAwards
      .filter((award) => award.prizeType === "luckydip")
      .sort((a, b) => Number(a.prizeInstance || 1) - Number(b.prizeInstance || 1))
      .map((award) => {
        const entry = entriesByChannel.get(String(award.assignedChannelId || ""));
        return {
          channelId: String(award.assignedChannelId || ""),
          userName: entry?.userName || String(award.assignedChannelId || "Lucky Winner"),
          avatarUrl: entry?.avatarUrl || "",
          prizeType: String(award.prizeType || ""),
          prizeLabel: `Lucky Winner #${Number(award.prizeInstance || 1)}`,
          prizeInstance: Number(award.prizeInstance || 1),
          rank: entry?.rank ?? null,
        };
      });
  }, [activeAwards, entriesByChannel]);

  const rankedPrizes = useMemo(() => {
    return activeAwards
      .filter((award) => award.prizeType !== "luckydip")
      .sort((a, b) => {
        const aSlot = parsePrizeSlot(String(a.prizeType || ""), a.rank) || 999;
        const bSlot = parsePrizeSlot(String(b.prizeType || ""), b.rank) || 999;
        return aSlot - bSlot;
      })
      .map((award) => {
        const entry = entriesByChannel.get(String(award.assignedChannelId || ""));
        return {
          channelId: String(award.assignedChannelId || ""),
          userName: entry?.userName || String(award.assignedChannelId || "Winner"),
          avatarUrl: entry?.avatarUrl || "",
          prizeType: String(award.prizeType || ""),
          prizeLabel:
            award.prizeType === "quizfirst"
              ? "First Prize"
              : award.prizeType === "quizsecond"
                ? "Second Prize"
                : award.prizeType === "quizthird"
                  ? "Third Prize"
                  : `Prize #${parsePrizeSlot(String(award.prizeType || ""), award.rank) || Number(award.rank || 0)}`,
          prizeInstance: Number(award.prizeInstance || 1),
          rank: Number.isFinite(Number(award.rank)) ? Number(award.rank) : entry?.rank ?? null,
        };
      });
  }, [activeAwards, entriesByChannel]);

  const rotatingViewerEntries = useMemo(() => {
    if (viewerPodiumMode !== "rank") return finalViewerRanked;
    if (finalViewerRanked.length <= 10) return finalViewerRanked;
    return [...finalViewerRanked, ...finalViewerRanked];
  }, [finalViewerRanked, viewerPodiumMode]);

  // Sustained sparkles + side-cannon confetti while gameEnded — matches end pages
  const lastEndedRef = useRef<boolean>(false);
  useEffect(() => {
    if (gameEnded && !lastEndedRef.current) {
      lastEndedRef.current = true;
      const burstUntil = Date.now() + 3500;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < burstUntil) requestAnimationFrame(frame);
      };
      // tiny delay so the podium animation aligns with confetti
      setTimeout(frame, 600);
    }
    if (!gameEnded) lastEndedRef.current = false;
  }, [gameEnded]);

  const sparklePositions = useMemo(
    () =>
      Array.from({ length: 24 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
      })),
    [],
  );

  // Lucky winner reveal animation (replays whenever selection/assignment changes)
  const luckyAnimationRef = useRef("");
  const [luckyPulseKey, setLuckyPulseKey] = useState(0);
  useEffect(() => {
    const nextSignal = pendingLucky
      ? `pending:${pendingLucky.channelId}:${pendingLucky.luckyInstance}`
      : `awarded:${luckyWinners
          .map((winner) => `${winner.channelId}:${winner.prizeInstance || 1}`)
          .join("|")}`;
    if (nextSignal && nextSignal !== luckyAnimationRef.current) {
      setLuckyPulseKey((k) => k + 1);
      confetti({
        particleCount: 90,
        spread: 110,
        startVelocity: 35,
        colors: ["#f472b6", "#fbbf24", "#a78bfa"],
        origin: { y: 0.5 },
      });
    }
    luckyAnimationRef.current = nextSignal;
  }, [pendingLucky, luckyWinners]);

  const podiumTeamsOrdered = useMemo(() => {
    const sorted = [...finalTeamRanked].sort((a, b) => a.rank - b.rank).slice(0, 3);
    if (sorted.length >= 3) return [sorted[1], sorted[0], sorted[2]];
    if (sorted.length === 2) return [sorted[1], sorted[0]];
    return sorted;
  }, [finalTeamRanked]);

  const podiumViewersOrdered = useMemo(() => {
    const source =
      viewerPodiumMode === "prize"
        ? ({
            1: prizePodiumByRank[1] || null,
            2: prizePodiumByRank[2] || null,
            3: prizePodiumByRank[3] || null,
          } as Record<1 | 2 | 3, FinalViewerLeaderboardEntry | null>)
        : rankPodiumByRank;
    const visibleRanks: Array<1 | 2 | 3> =
      viewerPodiumMode === "prize"
        ? ([2, 1, 3] as Array<1 | 2 | 3>).filter((rank) => {
            const prizeType = RANKED_PRIZE_ORDER.find((candidate) => PRIZE_SLOT_BY_TYPE[candidate] === rank);
            return prizeType ? enabledRankedPrizeTypes.includes(prizeType) : false;
          })
        : [2, 1, 3];
    return visibleRanks
      .map((rank) => ({ entry: source[rank], displayRank: rank }))
      .filter((row): row is { entry: FinalViewerLeaderboardEntry; displayRank: 1 | 2 | 3 } => Boolean(row.entry));
  }, [enabledRankedPrizeTypes, prizePodiumByRank, rankPodiumByRank, viewerPodiumMode]);

  const champion = finalTeamRanked.find((t) => t.rank === 1);
  // The "ending" overlay — only meaningful while gameEnded === false
  const showEndingBanner = endingState.active && !gameEnded;
  const teamListRef = useRef<HTMLDivElement>(null);
  const idleViewerListRef = useRef<HTMLDivElement>(null);
  const viewerListRef = useRef<HTMLDivElement>(null);
  const prizeListRef = useRef<HTMLDivElement>(null);
  const topCorrectListRef = useRef<HTMLDivElement>(null);

  useAutoScroll(
    teamListRef,
    gameEnded && mirrorView !== "viewers" && finalTeamRanked.length > 4,
    `${mirrorView}:${finalTeamRanked.length}:${finalTeamRanked.map((team) => team.teamId).join("|")}`,
  );
  useAutoScroll(
    idleViewerListRef,
    !gameEnded && !showQuestionPanel && cumulativeViewerRanked.length > 10,
    `idle:${cumulativeViewerRanked.length}:${cumulativeViewerRanked.map((entry) => entry.odytChannelId).join("|")}`,
    "loop",
  );
  useAutoScroll(
    viewerListRef,
    gameEnded && mirrorView !== "teams" && finalViewerRanked.length > (mirrorView === "viewers" ? 8 : 6),
    `${viewerPodiumMode}:${mirrorView}:${finalViewerRanked.length}:${finalViewerRanked.map((entry) => entry.odytChannelId).join("|")}`,
    "loop",
  );
  useAutoScroll(
    prizeListRef,
    gameEnded && mirrorView !== "teams" && rankedPrizes.length > 5,
    `${rankedPrizes.length}:${rankedPrizes.map((winner) => `${winner.channelId}:${winner.prizeLabel}`).join("|")}`,
  );
  useAutoScroll(
    topCorrectListRef,
    !gameEnded && isRevealed && fastestCorrect.length > 4,
    `${fastestCorrect.map((entry) => `${entry.odytChannelId}:${entry.responseTimeMs}`).join("|")}`,
    "loop",
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/20 text-foreground">
      {/* Background sparkles — matches /quiz/end pages */}
      {gameEnded &&
        sparklePositions.map((pos, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute z-0"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            animate={{ opacity: [0, 0.7, 0], scale: [0, 1, 0], rotate: [0, 180, 360] }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          >
            <Sparkles className="h-3 w-3 text-primary/50" />
          </motion.div>
        ))}

      {/* Radial glow */}
      {gameEnded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[420px] w-[420px] rounded-full bg-primary/15 blur-[100px]" />
        </div>
      )}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[480px] flex-col gap-2 px-3 py-1.5">
        {/* 1) Teams scoreboard — pinned top */}
        {teams.length > 0 && !(gameEnded && mirrorView === "viewers") && (
          <div className="rounded-2xl border border-border/30 bg-card/70 px-2 py-1 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-foreground/70">
                Teams
              </span>
              {gameEnded && (
                <Badge className="bg-yellow-500/90 text-[10px] text-black">Final</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {teams.map((team, idx) => {
                const isActive = idx === currentTeamIndex && !gameEnded;
                const usedPP = !!powerplayUsed[idx];
                const inPP = powerplayActive && powerplayTeam === idx;
                const remainingLifelines = Math.max(
                  0,
                  Number(
                    teamLifelines[idx] ??
                      Number(readMirroredAdminSettingSync<number>("teamLifelines", 0)),
                  ) || 0,
                );
                return (
                  <div
                    key={`${team.name}-${idx}`}
                    className={cn(
                      "relative flex items-center justify-between gap-2 rounded-xl border bg-gradient-to-br px-2.5 py-1 transition-all",
                      TEAM_TINTS[idx % TEAM_TINTS.length],
                      isActive && "scale-[1.02] ring-2 ring-primary/60",
                      inPP && "ring-2 ring-fuchsia-400 shadow-[0_0_18px_hsl(290_85%_60%/0.55)]",
                    )}
                  >
                    {/* Powerplay marker */}
                    {(usedPP || inPP) && (
                      <span
                        className={cn(
                          "absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-[9px] font-black shadow-md ring-1 ring-background",
                          inPP
                            ? "bg-fuchsia-500 text-white animate-pulse"
                            : "bg-muted text-muted-foreground",
                        )}
                        title={inPP ? "Powerplay active" : "Powerplay used"}
                      >
                        <Zap className="h-3 w-3" />
                      </span>
                    )}
                    <span className="absolute -top-1 left-1 rounded-full bg-slate-900/85 px-1.5 py-[1px] text-[9px] font-black text-slate-100 ring-1 ring-background">
                       {remainingLifelines}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold">{team.name}</div>
                      {isActive && (
                        <div className="text-[9px] uppercase tracking-wider text-primary">
                          Now playing
                        </div>
                      )}
                      {inPP && !isActive && (
                        <div className="text-[9px] uppercase tracking-wider text-fuchsia-300">
                          Powerplay
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-black tabular-nums">
                      {teamScores[idx] ?? 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2) Quiz-ending banner — between End-click and full ended state */}
        {showEndingBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-500/25 to-rose-600/15 px-3 py-2 text-center"
          >
            <Clock className="mx-auto mb-1 h-6 w-6 animate-pulse text-red-300" />
            <div className="text-[10px] font-black uppercase tracking-wider text-red-200">
              Quiz Ending
            </div>
            <motion.div
              key={endingState.remainingSec}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-1 text-3xl font-black text-red-100 tabular-nums"
            >
              {endingState.remainingSec}s
            </motion.div>
            <div className="mt-1 text-[11px] text-red-100/80">
              Wrapping up the quiz…
            </div>
          </motion.div>
        )}

        {/* 3) Question + options — hidden when ended (we show podium instead) */}
        {!gameEnded && (
          <AnimatePresence mode="wait">
            {currentQuestion ? (
              <motion.div
                key={`q-${currentQuestion.text}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border-2 border-primary/30 bg-card/80 px-3 py-2 shadow-[0_0_30px_hsl(var(--primary)/0.18)] backdrop-blur"
              >
                {currentQuestion.category && (
                  <Badge variant="outline" className="mb-1 border-primary/40 text-[10px] uppercase">
                    {currentQuestion.category}
                  </Badge>
                )}
                <h2 className="text-balance text-xl font-black leading-snug sm:text-2xl">
                  {currentQuestion.text}
                </h2>
                <div className="mt-2 grid grid-cols-1 gap-1.5">
                  {(currentQuestion.options ?? []).map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isCorrect = idx === correctChoiceIndex;
                    const isTeamPick = teamSelectedAnswer === idx;
                    const showCorrect = isRevealed && isCorrect;
                    const showWrong = isRevealed && !isCorrect;
                    return (
                      <div
                        key={`${idx}-${opt}`}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border-2 px-3 py-1.5 transition-all",
                          !isRevealed && "border-border/40 bg-secondary/40",
                          isTeamPick &&
                            !isRevealed &&
                            "border-primary bg-primary/15 ring-2 ring-primary/40",
                          showCorrect &&
                            "border-emerald-400 bg-emerald-600/90 text-white shadow-[0_0_18px_hsl(142_70%_45%/0.55)]",
                          showWrong &&
                            isTeamPick &&
                            "border-rose-400 bg-rose-600/30 text-foreground",
                          showWrong && !isTeamPick && "border-border/30 bg-secondary/20 opacity-50",
                        )}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/60 text-base font-black">
                          {letter}
                        </span>
                        <span className="flex-1 text-xl font-bold leading-snug sm:text-2xl">
                          {opt}
                        </span>
                        {isTeamPick && (
                          <Badge
                            className={cn(
                              "shrink-0 px-1.5 py-0 text-[9px]",
                              isRevealed && isCorrect
                                ? "bg-emerald-500 text-white"
                                : isRevealed
                                  ? "bg-rose-500 text-white"
                                  : "bg-primary text-primary-foreground",
                            )}
                          >
                            Team
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              !showEndingBanner && (
                <div className="rounded-2xl border border-border/40 bg-card/60 px-4 py-3 text-center text-sm text-muted-foreground">
                  Waiting for the host to start a question…
                </div>
              )
            )}
          </AnimatePresence>
        )}

        {/* 4) Question-scoped panel — vertical newest-first feed live, fastest-correct on reveal */}
        {!gameEnded && showQuestionPanel && (
          <>
            {/* Live responses (newest on top, one-after-another) — shown while OPEN, before reveal */}
            {!isRevealed && displayedNewestResponses.length > 0 && (
              <div className="rounded-2xl border border-border/30 bg-card/70 px-2 py-1">
                <div className="mb-2 flex items-center justify-between px-2 pt-1">
                  <span className="text-xs font-black uppercase tracking-wider text-primary">
                    Live responses
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {responses.length}
                  </Badge>
                </div>
                <div className="max-h-[42vh] overflow-y-auto pr-1">
                  <ul className="space-y-1.5">
                    <AnimatePresence initial={false}>
                      {displayedNewestResponses.map((r) => (
                        <motion.li
                          key={r.id || r.odytChannelId}
                          layout
                          initial={{ opacity: 0, x: -16, scale: 0.92 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 16, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 380, damping: 28 }}
                          className="flex items-center gap-2 rounded-xl bg-muted/30 px-2 py-1.5"
                        >
                          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/30">
                            <AvatarImage
                              src={r.avatarUrl}
                              alt={r.userName}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              loading="eager"
                            />
                            <AvatarFallback className="bg-primary/20 text-[10px] font-bold">
                              {r.userName?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {r.userName}
                          </span>
                          <span className="grid h-6 min-w-[24px] place-items-center rounded-md bg-primary px-1.5 text-[11px] font-black text-primary-foreground">
                            {r.answer}
                          </span>
                          <span className="min-w-[44px] text-right font-mono text-[10px] text-muted-foreground">
                            {formatMs(r.responseTimeMs)}
                          </span>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              </div>
            )}

            {/* Fastest correct — only after reveal */}
            {isRevealed && fastestCorrect.length > 0 && (
              <div className="rounded-2xl border border-yellow-400/30 bg-card/70 px-2 py-1">
                <div className="mb-2 flex items-center justify-between px-2 pt-1">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-yellow-400">
                    <Zap className="h-3.5 w-3.5" /> Fastest correct
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {fastestCorrect.length}
                  </Badge>
                </div>
                <ScrollArea ref={topCorrectListRef} className={fastestCorrect.length > 4 ? "h-[28vh] pr-2" : undefined}>
                  <ul className="space-y-1.5">
                    {rotatingFastestCorrect.map((r, idx) => {
                    const rank = (idx % Math.max(fastestCorrect.length, 1)) + 1;
                    return (
                      <li
                        key={r.id || `${r.odytChannelId}-${idx}`}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-2 py-1.5",
                          rank === 1
                            ? "border border-yellow-400/40 bg-gradient-to-r from-yellow-500/25 to-yellow-500/5"
                            : "bg-muted/30",
                        )}
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background/60 text-[11px] font-black">
                          {rank === 1 ? <Crown className="h-3.5 w-3.5 text-yellow-400" /> : rank}
                        </span>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage
                            src={r.avatarUrl}
                            alt={r.userName}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            loading="eager"
                          />
                          <AvatarFallback className="bg-primary/20 text-[10px] font-bold">
                            {r.userName?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {r.userName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatMs(r.responseTimeMs)}
                        </span>
                        {typeof r.score === "number" && r.score > 0 && (
                          <span className="min-w-[36px] text-right text-sm font-black text-emerald-400">
                            +{r.score}
                          </span>
                        )}
                      </li>
                    );
                    })}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </>
        )}

        {/* 5) Cumulative top viewers — only between questions / idle / pre-game */}
        {!gameEnded && !showQuestionPanel && cumulativeViewerRanked.length > 0 && (
          <div className="rounded-2xl border border-border/30 bg-card/70 px-2 py-1">
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary">
                <Trophy className="h-3.5 w-3.5" /> Top viewers
              </span>
              <Badge variant="outline" className="text-[10px]">
                {cumulativeViewerRanked.length}
              </Badge>
            </div>
            <ScrollArea
              ref={idleViewerListRef}
              className={cumulativeViewerRanked.length > 10 ? "h-[46vh] pr-2" : undefined}
            >
              <ul className="space-y-1.5">
              {rotatingIdleCumulativeViewers.map((entry, idx) => {
                const rank = Number(entry.rank || ((idx % Math.max(cumulativeViewerRanked.length, 1)) + 1));
                return (
                  <li
                    key={`${entry.odytChannelId || "viewer"}-${idx}`}
                    className="flex items-center gap-2 rounded-xl bg-muted/30 px-2 py-1.5"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background/60 text-[11px] font-black">
                      {rank === 1 ? (
                        <Crown className="h-3.5 w-3.5 text-yellow-400" />
                      ) : rank <= 3 ? (
                        <Medal
                          className={cn(
                            "h-3.5 w-3.5",
                            rank === 2 ? "text-slate-300" : "text-amber-600",
                          )}
                        />
                      ) : (
                        rank
                      )}
                    </span>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage
                        src={entry.avatarUrl}
                        alt={entry.userName}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        loading="eager"
                      />
                      <AvatarFallback className="bg-primary/20 text-[10px] font-bold">
                        {entry.userName?.slice(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {entry.userName}
                    </span>
                    <span className="min-w-[54px] text-right text-[10px] text-muted-foreground">
                      {entry.correctAnswers}/{entry.totalResponses}
                    </span>
                    <span className="min-w-[44px] text-right text-sm font-black text-emerald-400">
                      {entry.totalScore}
                    </span>
                  </li>
                );
              })}
              </ul>
            </ScrollArea>
          </div>
        )}

        {/* 6) End-of-quiz layer — mirrors /quiz/end/teams + /quiz/end/viewers */}
        {gameEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            {/* Focused-view indicator — synced with host nav */}
            {mirrorView && (
              <motion.div
                key={mirrorView}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-center text-[11px] font-black uppercase tracking-wider",
                  mirrorView === "teams"
                    ? "border-yellow-400/50 bg-yellow-500/15 text-yellow-200"
                    : "border-primary/50 bg-primary/15 text-primary",
                )}
              >
                {mirrorView === "teams" ? "🏆 Team Leaderboard" : "⭐ Viewer Leaderboard"}
              </motion.div>
            )}

            {/* Champion banner — always shown */}
            {mirrorView !== "viewers" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="rounded-2xl border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-500/25 to-amber-600/10 p-4 text-center"
              >
                <Trophy className="mx-auto mb-1 h-7 w-7 animate-pulse text-yellow-300" />
                <div className="text-[10px] font-black uppercase tracking-wider text-yellow-200">
                  {champion ? "Champion" : "Quiz Complete"}
                </div>
                {champion && (
                  <>
                    <div className="mt-1 text-xl font-black text-yellow-300">
                      🏆 {champion.teamName}
                    </div>
                    <div className="text-sm font-bold text-foreground/90">
                      {champion.score} points
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Team podium 2-1-3 — shown unless viewer-focused */}
            {mirrorView !== "viewers" && podiumTeamsOrdered.length > 0 && (
              <div className="rounded-2xl border border-border/30 bg-card/70 px-2 py-1.5">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-foreground/70">
                  <Trophy className="h-3.5 w-3.5" /> Team Podium
                </div>
                <div className="flex items-end justify-center gap-2 pt-2">
                  {podiumTeamsOrdered.map((team, idx) => (
                    <TeamPodiumColumn
                      key={team.teamId}
                      team={team}
                      rank={team.rank}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Full team standings — shown unless viewer-focused */}
            {mirrorView !== "viewers" && finalTeamRanked.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="rounded-2xl border border-border/30 bg-card/60 px-2 py-1.5 backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-foreground/70">
                  <Zap className="h-3.5 w-3.5 text-primary" /> All Teams
                </div>
                <ScrollArea
                  ref={teamListRef}
                  className={mirrorView === "teams" ? "h-[55vh] pr-2" : "max-h-[40vh] pr-2"}
                >
                  <div className="space-y-1.5">
                    {finalTeamRanked.map((team, i) => {
                      const top = finalTeamRanked[0]?.score || 1;
                      return (
                        <motion.div
                          key={team.teamId}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 2 + i * 0.06 }}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-muted/20 p-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="w-6 text-center text-base">
                              {team.rank === 1
                                ? "🥇"
                                : team.rank === 2
                                  ? "🥈"
                                  : team.rank === 3
                                    ? "🥉"
                                    : `#${team.rank}`}
                            </span>
                            <span className="truncate text-sm font-bold">{team.teamName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="hidden h-2 w-16 overflow-hidden rounded-full bg-muted xs:block">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(team.score / top) * 100}%` }}
                                transition={{ delay: 2.3 + i * 0.06, duration: 0.6 }}
                                className={cn(
                                  "h-full rounded-full bg-gradient-to-r",
                                  getPodiumGradient(team.rank),
                                )}
                              />
                            </div>
                            <span className="min-w-[44px] text-right text-sm font-black text-primary">
                              {team.score}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </motion.div>
            )}

            {/* Viewer podium 2-1-3 — shown unless team-focused */}
            {mirrorView !== "teams" && podiumViewersOrdered.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.5 }}
                className="rounded-2xl border border-border/30 bg-card/70 px-2 py-1.5"
              >
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-primary">
                  <span className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" /> Viewer Podium
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      viewerPodiumMode === "prize"
                        ? "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200"
                        : "border-primary/40 bg-primary/10 text-primary",
                    )}
                  >
                    {viewerPodiumMode === "prize" ? "Prize Winners" : "Top Scores"}
                  </Badge>
                </div>
                <div className="flex items-end justify-center gap-2 pt-2">
                  {podiumViewersOrdered.map(({ entry, displayRank }, idx) => (
                    <ViewerPodiumColumn
                      key={entry.odytChannelId}
                      entry={entry}
                      rank={viewerPodiumMode === "prize" ? displayRank : entry.rank}
                      index={idx}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Cumulative viewer list — only for score mode */}
            {mirrorView !== "teams" && viewerPodiumMode === "rank" && finalViewerRanked.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3 }}
                className="rounded-2xl border border-border/30 bg-card/70 px-2 py-1"
              >
                <div className="mb-2 flex items-center justify-between gap-1.5 px-2 pt-1">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary">
                    <Users className="h-3.5 w-3.5" /> Final Viewers LeaderBoard
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {finalViewerRanked.length}
                  </Badge>
                </div>
                <ScrollArea
                  ref={viewerListRef}
                  className={mirrorView === "viewers" ? "h-[55vh] pr-2" : "max-h-[40vh] pr-2"}
                >
                  <ul className="space-y-1.5">
                    {rotatingViewerEntries.map((entry, idx) => (
                      <motion.li
                        key={`${entry.odytChannelId}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min((idx % Math.max(finalViewerRanked.length, 1)) * 0.04, 1.5) }}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-2 py-1.5",
                            "bg-muted/30",
                          )}
                        >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background/60 text-[11px] font-black">
                          {entry.rank === 1 ? (
                            <Crown className="h-3.5 w-3.5 text-yellow-400" />
                          ) : entry.rank <= 3 ? (
                            <Medal
                              className={cn(
                                "h-3.5 w-3.5",
                                entry.rank === 2 ? "text-slate-300" : "text-amber-600",
                              )}
                            />
                          ) : (
                            entry.rank
                          )}
                        </span>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage
                            src={entry.avatarUrl}
                            alt={entry.userName}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            loading="eager"
                          />
                          <AvatarFallback className="bg-primary/20 text-[10px] font-bold">
                            {entry.userName?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {entry.userName}
                        </span>
                        <span className="min-w-[54px] text-right text-[10px] text-muted-foreground">
                          {entry.correctAnswers}/{entry.totalResponses}
                        </span>
                        <span className="min-w-[44px] text-right text-sm font-black text-emerald-400">
                          {entry.totalScore}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </ScrollArea>
              </motion.div>
            )}

            {/* Lucky winner spotlight — prize mode only */}
            {mirrorView !== "teams" && viewerPodiumMode === "prize" && (pendingLucky || luckyPicking || luckyWinners.length > 0) && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={luckyPulseKey}
                  initial={{ scale: 0.7, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                  className="rounded-2xl border-2 border-pink-400/50 bg-gradient-to-br from-pink-500/25 to-fuchsia-600/15 p-4 text-center"
                >
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Gift className="mx-auto mb-1 h-7 w-7 text-pink-300" />
                  </motion.div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-pink-300">
                    {pendingLucky ? `Lucky Winner #${pendingLucky.luckyInstance}` : `Lucky Winner${luckyWinners.length > 1 ? "s" : ""}`}
                  </div>
                  <div className="mt-2 space-y-2">
                    {luckyPicking && !pendingLucky ? (
                      <motion.div
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                        className="rounded-xl border border-pink-400/20 bg-pink-500/10 px-3 py-4 text-sm font-semibold text-pink-100"
                      >
                        Selecting lucky winner...
                      </motion.div>
                    ) : pendingLucky ? (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <Avatar className="h-12 w-12 ring-2 ring-pink-400">
                          <AvatarImage
                            src={entriesByChannel.get(pendingLucky.channelId)?.avatarUrl}
                            alt={pendingLucky.userName}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            loading="eager"
                          />
                          <AvatarFallback>{pendingLucky.userName?.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <div className="text-base font-black">{pendingLucky.userName}</div>
                          <div className="text-xs text-pink-100/80">Rank #{pendingLucky.rank}</div>
                        </div>
                      </motion.div>
                    ) : luckyWinners.slice(0, 6).map((w, i) => (
                      <motion.div
                        key={(w.channelId || "") + i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <Avatar className="h-8 w-8 ring-2 ring-pink-400/80">
                          <AvatarImage
                            src={w.avatarUrl}
                            alt={w.userName}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            loading="eager"
                          />
                          <AvatarFallback className="text-[10px]">{w.userName?.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 text-left">
                          <div className="truncate text-sm font-black leading-tight">{w.userName}</div>
                          <div className="text-[10px] uppercase tracking-wide text-pink-100/75">
                            Lucky #{Number(w.prizeInstance || i + 1)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Prize winners list — prize mode only */}
            {mirrorView !== "teams" && viewerPodiumMode === "prize" && rankedPrizes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.4 }}
                className="rounded-2xl border border-amber-400/30 bg-card/70 px-2 py-1"
              >
                <div className="mb-2 flex items-center gap-1.5 px-2 pt-1 text-xs font-black uppercase tracking-wider text-amber-400">
                  <Gift className="h-3.5 w-3.5" /> Prize Winners
                </div>
                <ScrollArea ref={prizeListRef} className={rankedPrizes.length > 5 ? "h-[26vh] pr-2" : undefined}>
                  <ul className="space-y-1.5">
                    <AnimatePresence initial={false}>
                      {rankedPrizes.map((w, idx) => (
                      <motion.li
                        key={(w.channelId || "") + idx}
                        layout
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ delay: 3.5 + idx * 0.08, duration: 0.4 }}
                        className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-2 py-1.5"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage
                            src={w.avatarUrl}
                            alt={w.userName}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            loading="eager"
                          />
                          <AvatarFallback>{w.userName?.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {w.userName}
                        </span>
                        <Badge className="bg-amber-500/90 text-[10px] text-black">
                          {w.prizeLabel}
                        </Badge>
                      </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </ScrollArea>
              </motion.div>
            )}
          </motion.div>
        )}

        <div className="mt-auto pt-2 text-center text-[10px] text-muted-foreground/60">
          Vertical mirror — read-only
        </div>
      </div>
    </div>
  );
};

export default QuizMirror;
