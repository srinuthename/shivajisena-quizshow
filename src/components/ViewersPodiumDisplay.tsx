import { motion, AnimatePresence } from "framer-motion";
import { memo, useMemo, useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, Medal, Clock, Coins, Users, TrendingUp, Sparkles, Target } from "lucide-react";
import { LeaderboardEntry } from "./LiveLeaderboard";
import { StreakFlamesBadge } from "./StreakFlames";
import { TeamSupportBadge } from "./TeamSupportBadge";
import { PercentileBadge } from "./PercentileBadge";
import { AchievementBadgeList, calculateAchievements } from "./ViewerAchievementBadge";
import { useTranslation } from "@/hooks/useTranslation";

interface ViewersPodiumDisplayProps {
  entries: LeaderboardEntry[];
}

const formatTime = (ms?: number): string => {
  if (!ms || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

// Shield/Card component matching QuestionResultPanel and CumulativeUserLeaderboardModal style
const ViewerCard = memo(({
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
  const { t } = useTranslation();
  
  const achievements = useMemo(() => {
    return calculateAchievements(entry, rank, totalParticipants);
  }, [entry, rank, totalParticipants]);

  const accuracy = entry.totalResponses > 0 
    ? Math.round((entry.correctAnswers / entry.totalResponses) * 100) 
    : 0;

  const avatarSeed = entry.odytChannelId || entry.userName;

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

      {/* Shield/Memento shaped card */}
      <div
        className={`
          relative overflow-hidden
          bg-gradient-to-br from-card via-card to-muted/50
          border-2 border-border/50
          rounded-t-2xl rounded-b-[40%]
          p-4 pb-6
          min-w-[180px] max-w-[200px]
          ${getCardGlow()}
          hover:scale-105 transition-all duration-300
          leaderboard-row-emboss
        `}
      >
        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

        {/* Rank number badge */}
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

        {/* Avatar */}
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
                src={entry.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} 
                alt={entry.userName} 
              />
              <AvatarFallback className="text-lg font-bold bg-muted">
                {(entry.userName || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Name */}
        <h3 className="text-center font-bold text-sm text-foreground truncate px-2 mb-2">
          {entry.userName}
        </h3>

        {/* Stats Row */}
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

        {/* Accuracy Row */}
        <div className="flex items-center justify-center gap-2 mb-2 text-xs text-muted-foreground">
          <Target className="h-3 w-3" />
          <span>{entry.correctAnswers}/{entry.totalResponses} ({accuracy}%)</span>
        </div>

        {/* Team Support Badge */}
        {entry.supportingTeam && (
          <div className="flex justify-center mb-2">
            <TeamSupportBadge team={entry.supportingTeam} size="md" />
          </div>
        )}

        {/* Streak badge */}
        {entry.streak && entry.streak >= 2 && (
          <div className="flex justify-center mb-2">
            <StreakFlamesBadge streak={entry.streak} />
          </div>
        )}

        {/* Achievement badges */}
        {achievements.length > 0 && (
          <div className="flex justify-center">
            <AchievementBadgeList achievements={achievements} maxVisible={3} size="md" />
          </div>
        )}

        {/* Percentile Badge */}
        <div className="flex justify-center mt-2">
          <PercentileBadge rank={rank} totalParticipants={totalParticipants} size="sm" />
        </div>
      </div>
    </motion.div>
  );
});
ViewerCard.displayName = "ViewerCard";

export const ViewersPodiumDisplay = ({ entries }: ViewersPodiumDisplayProps) => {
  const { t } = useTranslation();
  const [sparklePositions, setSparklePositions] = useState<Array<{ x: number; y: number }>>([]);

  const sortedEntries = useMemo(() => 
    [...entries].sort((a, b) => 
      b.totalScore !== a.totalScore 
        ? b.totalScore - a.totalScore 
        : (a.avgResponseTimeMs || 0) - (b.avgResponseTimeMs || 0)
    ), 
    [entries]
  );

  const totalCoins = useMemo(() => 
    entries.reduce((sum, e) => sum + e.totalScore, 0), 
    [entries]
  );

  const avgAccuracy = useMemo(() => {
    const totalCorrect = entries.reduce((sum, e) => sum + e.correctAnswers, 0);
    const totalResponses = entries.reduce((sum, e) => sum + e.totalResponses, 0);
    return totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : 0;
  }, [entries]);

  // Generate sparkle positions once on mount
  useEffect(() => {
    const positions = Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setSparklePositions(positions);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {t.noViewerData}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Animated background sparkles */}
      {sparklePositions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none z-0"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.2
          }}
        >
          <Sparkles className="h-3 w-3 text-primary/40" />
        </motion.div>
      ))}

      {/* Stats Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center gap-4 md:gap-8 mb-6 flex-wrap"
      >
        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
          <Users className="h-5 w-5 text-blue-400" />
          <span className="text-foreground font-bold">{entries.length}</span>
          <span className="text-muted-foreground text-sm">{t.participants}</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
          <Coins className="h-5 w-5 text-yellow-400" />
          <span className="text-foreground font-bold">{totalCoins}</span>
          <span className="text-muted-foreground text-sm">{t.totalScore}</span>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
          <TrendingUp className="h-5 w-5 text-green-400" />
          <span className="text-foreground font-bold">{avgAccuracy}%</span>
          <span className="text-muted-foreground text-sm">Accuracy</span>
        </div>
      </motion.div>

      {/* Viewer Cards Grid */}
      <ScrollArea className="max-h-[60vh]">
        <div className="pt-6">
          <motion.div
            className="flex flex-wrap justify-center gap-6 pb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {sortedEntries.map((entry, index) => (
              <ViewerCard
                key={entry.odytChannelId}
                entry={entry}
                rank={index + 1}
                totalParticipants={sortedEntries.length}
                index={index}
              />
            ))}
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
};
