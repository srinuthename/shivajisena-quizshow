import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Percent } from "lucide-react";
import { QuizUserStats } from "@/types/quiz";

interface UserboardProps {
  userStats: QuizUserStats[];
}

export const Userboard = ({ userStats }: UserboardProps) => {
  const getRank = (index: number, stats: QuizUserStats[]): number => {
    if (index === 0) return 1;
    const current = stats[index];
    const previous = stats[index - 1];
    if (current.correctAnswers === previous.correctAnswers) {
      return getRank(index - 1, stats);
    }
    return index + 1;
  };

  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  const getAccuracy = (correct: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  if (userStats.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No YouTube user responses recorded
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Trophy className="w-4 h-4 mr-1" />
          {userStats.length} Participants
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Target className="w-4 h-4 mr-1" />
          {userStats.reduce((sum, s) => sum + s.correctAnswers, 0)} Total Correct
        </Badge>
      </div>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-2 mb-6">
        {userStats.slice(0, 3).map((stat, idx) => {
          const rank = getRank(idx, userStats);
          const podiumHeight = rank === 1 ? "h-24" : rank === 2 ? "h-16" : "h-12";
          const avatarSize = rank === 1 ? "w-14 h-14" : "w-10 h-10";
          
          return (
            <motion.div
              key={stat.user.id}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.15, type: "spring" }}
              className="flex flex-col items-center"
            >
              <div className="text-2xl mb-1">{getRankEmoji(rank)}</div>
              <Avatar className={`${avatarSize} border-2 border-primary/50 shadow-lg mb-1`}>
                <AvatarImage src={stat.user.avatarUrl} alt={stat.user.userName} referrerPolicy="no-referrer" crossOrigin="anonymous" loading="eager" />
                <AvatarFallback className="text-sm font-bold bg-primary/20">
                  {stat.user.userName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-center truncate max-w-[70px]">
                {stat.user.userName}
              </span>
              <span className="text-lg font-bold text-primary">{stat.correctAnswers}</span>
              <div className={`w-16 ${podiumHeight} bg-gradient-to-t from-primary/60 to-primary/30 rounded-t-lg mt-1`} />
            </motion.div>
          );
        })}
      </div>

      {/* Full Rankings List */}
      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
        {userStats.map((stat, idx) => {
          const rank = getRank(idx, userStats);
          const accuracy = getAccuracy(stat.correctAnswers, stat.totalResponses);
          
          return (
            <motion.div
              key={stat.user.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="w-8 text-center font-bold text-sm">
                {getRankEmoji(rank)}
              </span>
              
              <Avatar className="w-8 h-8 border border-border">
                <AvatarImage src={stat.user.avatarUrl} alt={stat.user.userName} referrerPolicy="no-referrer" crossOrigin="anonymous" loading="eager" />
                <AvatarFallback className="text-xs bg-primary/20">
                  {stat.user.userName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <span className="flex-1 font-medium truncate text-sm">
                {stat.user.userName}
              </span>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Target className="w-3 h-3" />
                  <span className="font-bold">{stat.correctAnswers}</span>
                </div>
                
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Percent className="w-3 h-3" />
                  <span>{accuracy}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
