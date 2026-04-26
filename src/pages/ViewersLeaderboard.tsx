import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Clock, Flame, Coins, Medal, TrendingUp, TrendingDown, Zap, Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBranding } from "@/hooks/useBranding";
import { useQuizStore } from "@/store/quizStore";

interface ViewerEntry {
  odytChannelId: string;
  userName: string;
  avatarUrl?: string;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  totalResponseTimeMs?: number;
  avgResponseTimeMs?: number;
  streak?: number;
}

interface GameState {
  currentQuestion: any;
  questionActive: boolean;
  timerSeconds: number;
  masterTimerSeconds: number;
  gameEnded: boolean;
  rapidFireActive?: boolean;
}

const formatTime = (ms?: number): string => {
  if (!ms || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatTimer = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Trophy className="w-8 h-8 text-yellow-400" />;
    case 2: return <Medal className="w-8 h-8 text-gray-300" />;
    case 3: return <Medal className="w-8 h-8 text-amber-600" />;
    default: return <span className="text-2xl font-bold text-muted-foreground">{rank}</span>;
  }
};

const getRankBackground = (rank: number): string => {
  switch (rank) {
    case 1: return "bg-yellow-500/10 border-yellow-500/40";
    case 2: return "bg-muted/50 border-border";
    case 3: return "bg-amber-600/10 border-amber-600/30";
    default: return "bg-card/70 border-border/30";
  }
};

export const ViewersLeaderboard = () => {
  usePageTitle();
  const { pageTitle } = useBranding();
  
  const [entries, setEntries] = useState<ViewerEntry[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storeGameState = useQuizStore((state) => state.gameState);
  const storeLeaderboard = useQuizStore((state) => state.viewerLeaderboard);

  // Subscribe to shared store updates (no polling)
  useEffect(() => {
    if (storeGameState) {
      setGameState({
        currentQuestion: storeGameState.currentQuestion,
        questionActive: storeGameState.questionActive,
        timerSeconds: storeGameState.timerSeconds || 0,
        masterTimerSeconds: storeGameState.masterTimerSeconds || 0,
        gameEnded: storeGameState.gameEnded || false,
        rapidFireActive: storeGameState.powerplayActive,
      });
    }
    if (storeLeaderboard.length > 0) {
      const leaderboardEntries: ViewerEntry[] = storeLeaderboard.map((d) => ({
        odytChannelId: d.odytChannelId,
        userName: d.userName,
        avatarUrl: d.avatarUrl,
        totalScore: d.totalScore,
        correctAnswers: d.correctAnswers,
        totalResponses: d.totalResponses,
        totalResponseTimeMs: d.totalResponses * (d.avgResponseTimeMs || 0),
        avgResponseTimeMs: d.avgResponseTimeMs || 0,
      }));

      leaderboardEntries.sort((a, b) =>
        b.totalScore !== a.totalScore
          ? b.totalScore - a.totalScore
          : (a.avgResponseTimeMs || 0) - (b.avgResponseTimeMs || 0)
      );
      setEntries(leaderboardEntries);
    } else {
      setEntries([]);
    }

    setIsLoading(false);
  }, [storeGameState, storeLeaderboard]);

  // Top 3 for podium display
  const top3 = entries.slice(0, 3);
  const remaining = entries.slice(3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Trophy className="h-16 w-16 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (gameState?.gameEnded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-4xl"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Trophy className="h-32 w-32 text-primary mx-auto mb-8" />
          </motion.div>
          <h1 className="text-6xl font-bold text-primary mb-4">Game Over!</h1>
          {top3[0] && (
            <>
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Viewer Champion: {top3[0].userName}
              </h2>
              <div className="flex items-center justify-center gap-2 text-6xl font-bold text-primary">
                <Coins className="h-12 w-12 text-yellow-500" />
                {top3[0].totalScore}
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen max-h-screen bg-background p-4 lg:p-6 xl:p-8 overflow-hidden flex flex-col">
      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: (typeof window !== 'undefined' ? window.innerHeight : 1080) + 20
            }}
            animate={{
              y: -20,
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 mb-10"
      >
        <div className="max-w-[1920px] w-full mx-auto flex flex-wrap items-center justify-between gap-4 lg:gap-6 px-4 lg:px-6 py-4 lg:py-5 rounded-xl lg:rounded-2xl bg-card/70 border border-border shadow-lg">

          {/* Left: Title + Episode */}
          <div className="flex items-baseline gap-2 lg:gap-4 flex-wrap">
            <motion.h1
              className="text-3xl md:text-4xl font-bold text-primary whitespace-nowrap"
              animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundSize: "200%" }}
            >
              {pageTitle}
            </motion.h1>
          </div>

          {/* Center: Master Timer */}
          {gameState && (
            <motion.div
              className={`flex items-center gap-3 px-6 py-3 rounded-xl ${(gameState.masterTimerSeconds || 0) <= 60
                ? "bg-destructive/20 border-2 border-destructive"
                : "bg-muted/40 border border-border"
                }`}
              animate={
                (gameState.masterTimerSeconds || 0) <= 60
                  ? { scale: [1, 1.05, 1] }
                  : {}
              }
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Clock
                className={`h-6 w-6 ${(gameState.masterTimerSeconds || 0) <= 60
                  ? "text-red-500"
                  : "text-primary"
                  }`}
              />
              <span
                className={`text-2xl font-mono font-bold ${(gameState.masterTimerSeconds || 0) <= 60
                  ? "text-red-500"
                  : "text-foreground"
                  }`}
              >
                {formatTimer(gameState.masterTimerSeconds || 0)}
              </span>

              {gameState.rapidFireActive && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white ml-2">
                  <Zap className="h-4 w-4 mr-1" />
                  POWERPLAY
                </Badge>
              )}
            </motion.div>
          )}

          {/* Right: Participants + Question Active */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/40 border border-border">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">{entries.length}</span>
              <span className="text-muted-foreground">Participants</span>
            </div>

            {gameState?.questionActive && (
              <Badge className="px-4 py-2 text-sm bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Question Active
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center items-end gap-4 mb-12"
        >
          {/* 2nd Place */}
          {top3[1] && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <Avatar className="w-20 h-20 border-4 border-gray-400 shadow-xl mb-3">
                <AvatarImage src={top3[1].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[1].odytChannelId}`} />
                <AvatarFallback className="text-2xl bg-gray-400/20">{top3[1].userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="font-bold text-lg text-foreground">{top3[1].userName}</p>
              <div className="flex items-center gap-1 text-gray-300">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-xl">{top3[1].totalScore}</span>
              </div>
              <div className="w-24 h-32 bg-muted border border-border rounded-t-lg mt-3 flex items-center justify-center">
                <Medal className="w-12 h-12 text-gray-300" />
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Avatar className="w-28 h-28 border-4 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.5)] mb-3">
                  <AvatarImage src={top3[0].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[0].odytChannelId}`} />
                  <AvatarFallback className="text-3xl bg-yellow-400/20">{top3[0].userName.charAt(0)}</AvatarFallback>
                </Avatar>
              </motion.div>
              <p className="font-bold text-2xl text-foreground">{top3[0].userName}</p>
              <div className="flex items-center gap-1 text-yellow-400">
                <Coins className="w-6 h-6 text-yellow-500" />
                <span className="font-bold text-3xl">{top3[0].totalScore}</span>
              </div>
              <div className="w-28 h-44 bg-primary/20 border border-primary rounded-t-lg mt-3 flex items-center justify-center">
                <Trophy className="w-16 h-16 text-yellow-400" />
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <Avatar className="w-16 h-16 border-4 border-amber-600 shadow-xl mb-3">
                <AvatarImage src={top3[2].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[2].odytChannelId}`} />
                <AvatarFallback className="text-xl bg-amber-600/20">{top3[2].userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="font-bold text-base text-foreground">{top3[2].userName}</p>
              <div className="flex items-center gap-1 text-amber-600">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-lg">{top3[2].totalScore}</span>
              </div>
              <div className="w-20 h-24 bg-amber-600/20 border border-amber-600/40 rounded-t-lg mt-3 flex items-center justify-center">
                <Medal className="w-10 h-10 text-amber-600" />
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Remaining Participants - Scrollable List */}
      {remaining.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card/70 border border-border rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold">All Participants</h3>
            </div>
            <Badge variant="secondary">{remaining.length} more</Badge>
          </div>

          <div className="max-h-[520px] overflow-y-auto pr-2 pt-6">
            <motion.div
              className="flex flex-wrap justify-center gap-6 pb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AnimatePresence>
                {remaining.map((entry, index) => {
                  const rank = index + 4;

                  return (
                    <motion.div
                      key={entry.odytChannelId}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                      }}
                      className="relative overflow-visible"                    >
                      {/* Rank Badge */}
                      <div className="absolute -top-2 -right-2 z-10">
                        <Medal className="h-6 w-6 text-muted-foreground" />
                      </div>

                      <div
                        className="
                          bg-gradient-to-br from-card via-card to-muted/50
                          border border-border/50
                          rounded-t-2xl rounded-b-[40%]
                          p-3 pb-4
                          min-w-[150px] max-w-[170px]
                          shadow-lg
                          hover:scale-105 transition-transform
                        "
                      >
                        {/* Rank */}
                        <div className="absolute top-1 left-1 text-xs font-bold px-2 py-0.5 rounded-full bg-muted">
                          #{rank}
                        </div>

                        {/* Avatar */}
                        <div className="flex justify-center mt-3 mb-2">
                          <Avatar className="h-14 w-14 border-2 border-background">
                            <AvatarImage
                              src={
                                entry.avatarUrl ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.odytChannelId}`
                              }
                            />
                            <AvatarFallback className="font-bold">
                              {entry.userName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Name */}
                        <h4 className="text-center font-bold text-base truncate mb-1">
                          {entry.userName}
                        </h4>

                        {/* Stats */}
                        <div className="flex justify-center gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-cyan-400" />
                            <span className="font-mono font-bold">
                              {formatTime(entry.avgResponseTimeMs)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Coins className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold">
                              {entry.totalScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ViewersLeaderboard;
