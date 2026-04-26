import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Crown,
  Sparkles,
  Clock,
  Medal,
  X,
  Users,
  Coins,
  Target,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { StreakFlamesBadge } from "./StreakFlames";
import { LeaderboardEntry } from "./LiveLeaderboard";
import { TeamSupportBadge } from "./TeamSupportBadge";
import { PercentileBadge } from "./PercentileBadge";
import { AchievementBadgeList, calculateAchievements } from "./ViewerAchievementBadge";
import { useEffect, useState, useMemo } from "react";
import confetti from "canvas-confetti";

interface CumulativeUserLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardEntry[];
}

const formatTime = (ms?: number): string => {
  if (!ms || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const UserCard = ({
  entry,
  rank,
  totalParticipants,
  index,
}: {
  entry: LeaderboardEntry;
  rank: number;
  totalParticipants: number;
  index: number;
}) => {
  const achievements = useMemo(() => {
    return calculateAchievements(entry, rank, totalParticipants);
  }, [entry, rank, totalParticipants]);

  const accuracy = entry.totalResponses > 0 
    ? Math.round((entry.correctAnswers / entry.totalResponses) * 100) 
    : 0;

  const getCardGlow = () => {
    if (rank === 1) return "shadow-[0_0_30px_rgba(234,179,8,0.5)]";
    if (rank === 2) return "shadow-[0_0_20px_rgba(156,163,175,0.4)]";
    if (rank === 3) return "shadow-[0_0_20px_rgba(217,119,6,0.4)]";
    return "shadow-lg";
  };

  const getRankBadge = () => {
    if (rank === 1) return (
      <div className="absolute -top-3 -right-3 z-10">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Crown className="h-8 w-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
        </motion.div>
      </div>
    );
    if (rank === 2) return (
      <div className="absolute -top-2 -right-2 z-10">
        <Medal className="h-6 w-6 text-gray-300" />
      </div>
    );
    if (rank === 3) return (
      <div className="absolute -top-2 -right-2 z-10">
        <Medal className="h-6 w-6 text-amber-600" />
      </div>
    );
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: Math.min(index * 0.05, 1),
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      className="relative"
    >
      {getRankBadge()}

      <div
        className={`
          relative overflow-hidden
          bg-gradient-to-br from-card via-card to-muted/50
          border-2 border-border/50
          rounded-t-2xl rounded-b-[40%]
          p-4 pb-6
          min-w-[180px] max-w-[200px]
          ${getCardGlow()}
          hover:scale-105 transition-transform duration-300
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="absolute top-2 left-2">
          <span className={`
            text-xs font-bold px-2 py-0.5 rounded-full
            ${rank <= 3
              ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border border-yellow-500/50'
              : 'bg-muted text-muted-foreground border border-border'}
          `}>
            #{rank}
          </span>
        </div>

        <div className="flex justify-center mb-3 mt-4">
          <div className={`
            relative rounded-full p-1
            ${rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
              rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                rank === 3 ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                  'bg-gradient-to-br from-primary/50 to-primary'}
          `}>
            <Avatar className="h-16 w-16 border-2 border-background">
              <AvatarImage 
                src={entry.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.odytChannelId}`} 
                alt={entry.userName} 
              />
              <AvatarFallback className="text-lg font-bold bg-muted">
                {(entry.userName || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <h3 className="text-center font-bold text-sm text-foreground truncate px-2 mb-2">
          {entry.userName}
        </h3>

        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3 text-cyan-400" />
            <span className="text-cyan-300 font-mono font-bold">
              {formatTime(entry.avgResponseTimeMs)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Coins className="h-3 w-3 text-yellow-400" />
            <span className="text-yellow-300 font-bold">
              {entry.totalScore}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-2 text-xs text-muted-foreground">
          <Target className="h-3 w-3" />
          <span>{entry.correctAnswers}/{entry.totalResponses} ({accuracy}%)</span>
        </div>

        {entry.supportingTeam && (
          <div className="flex justify-center mb-2">
            <TeamSupportBadge team={entry.supportingTeam} size="md" />
          </div>
        )}

        {entry.streak && entry.streak >= 2 && (
          <div className="flex justify-center mb-2">
            <StreakFlamesBadge streak={entry.streak} />
          </div>
        )}

        {achievements.length > 0 && (
          <div className="flex justify-center">
            <AchievementBadgeList achievements={achievements} maxVisible={3} size="md" />
          </div>
        )}

        <div className="flex justify-center mt-2">
          <PercentileBadge rank={rank} totalParticipants={totalParticipants} size="sm" />
        </div>
      </div>
    </motion.div>
  );
};

export const CumulativeUserLeaderboardModal = ({
  isOpen,
  onClose,
  leaderboard,
}: CumulativeUserLeaderboardModalProps) => {
  const [sparklePositions, setSparklePositions] = useState<Array<{ x: number; y: number }>>([]);

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return (a.avgResponseTimeMs || Infinity) - (b.avgResponseTimeMs || Infinity);
    });
  }, [leaderboard]);

  const totalCoins = useMemo(() => 
    leaderboard.reduce((sum, entry) => sum + entry.totalScore, 0), 
    [leaderboard]
  );

  const avgAccuracy = useMemo(() => {
    const totalCorrect = leaderboard.reduce((sum, entry) => sum + entry.correctAnswers, 0);
    const totalResponses = leaderboard.reduce((sum, entry) => sum + entry.totalResponses, 0);
    return totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : 0;
  }, [leaderboard]);

  useEffect(() => {
    if (isOpen) {
      const positions = Array.from({ length: 30 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
      }));
      setSparklePositions(positions);

      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.3 },
          colors: ['#ffd700', '#ff6b35', '#22c55e', '#3b82f6', '#a855f7']
        });
      }, 300);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 border-2 border-primary/30 bg-background/98 backdrop-blur-xl overflow-hidden"
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Cumulative Leaderboard</DialogTitle>
        </VisuallyHidden>

        {sparklePositions.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none z-0"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0, 1.2, 0],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.15
            }}
          >
            <Sparkles className="h-4 w-4 text-primary/60" />
          </motion.div>
        ))}

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-muted/50 hover:bg-muted"
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="relative z-10 h-full flex flex-col p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <Trophy className="h-12 w-12 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    boxShadow: ['0 0 10px rgba(234,179,8,0.3)', '0 0 20px rgba(234,179,8,0.5)', '0 0 10px rgba(234,179,8,0.3)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground">
                Cumulative Leaderboard
              </h2>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-8 mb-6"
          >
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-foreground font-bold">{leaderboard.length}</span>
              <span className="text-muted-foreground text-sm">Participants</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
              <Coins className="h-5 w-5 text-yellow-400" />
              <span className="text-foreground font-bold">{totalCoins}</span>
              <span className="text-muted-foreground text-sm">Total Coins</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-foreground font-bold">{avgAccuracy}%</span>
              <span className="text-muted-foreground text-sm">Avg Accuracy</span>
            </div>
          </motion.div>

          <ScrollArea className="flex-1 px-4">
            <div className="pt-10">
              {sortedLeaderboard.length > 0 ? (
                <motion.div
                  className="flex flex-wrap justify-center gap-6 pb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {sortedLeaderboard.map((entry, index) => (
                    <UserCard
                      key={entry.odytChannelId}
                      entry={entry}
                      rank={index + 1}
                      totalParticipants={sortedLeaderboard.length}
                      index={index}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  No participants yet
                </div>
              )}
            </div>
          </ScrollArea>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center pt-4"
          >
            <Button
              onClick={onClose}
              size="lg"
              className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground px-8 py-3 text-lg font-bold shadow-lg shadow-primary/30"
            >
              Close
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
