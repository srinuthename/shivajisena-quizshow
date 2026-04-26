import { motion } from "framer-motion";
import { 
  Zap, 
  Crown, 
  Target, 
  Flame, 
  Star, 
  Trophy, 
  Rocket, 
  Shield,
  Sparkles
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type AchievementType = 
  | "speed_demon"      // Fastest response
  | "perfect_round"    // All correct in a round
  | "comeback_king"    // Climbed 5+ ranks
  | "first_blood"      // First correct answer
  | "streak_master"    // 5+ streak
  | "top_5_percent"    // Top 5% of participants
  | "top_10_percent"   // Top 10% of participants
  | "accuracy_king"    // 90%+ accuracy with 5+ answers
  | "lightning_fast";  // Under 1s response time

interface AchievementConfig {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  glowColor: string;
  bgGradient: string;
}

const ACHIEVEMENT_CONFIG: Record<AchievementType, AchievementConfig> = {
  speed_demon: {
    icon: Zap,
    label: "Speed Demon",
    description: "Fastest response this round!",
    color: "text-yellow-400",
    glowColor: "shadow-yellow-500/50",
    bgGradient: "from-yellow-500/20 to-amber-600/10",
  },
  perfect_round: {
    icon: Target,
    label: "Perfect Round",
    description: "All answers correct!",
    color: "text-emerald-400",
    glowColor: "shadow-emerald-500/50",
    bgGradient: "from-emerald-500/20 to-green-600/10",
  },
  comeback_king: {
    icon: Crown,
    label: "Comeback King",
    description: "Climbed 5+ ranks!",
    color: "text-purple-400",
    glowColor: "shadow-purple-500/50",
    bgGradient: "from-purple-500/20 to-violet-600/10",
  },
  first_blood: {
    icon: Flame,
    label: "First Blood",
    description: "First correct answer!",
    color: "text-rose-400",
    glowColor: "shadow-rose-500/50",
    bgGradient: "from-rose-500/20 to-red-600/10",
  },
  streak_master: {
    icon: Star,
    label: "Streak Master",
    description: "5+ correct streak!",
    color: "text-orange-400",
    glowColor: "shadow-orange-500/50",
    bgGradient: "from-orange-500/20 to-amber-600/10",
  },
  top_5_percent: {
    icon: Trophy,
    label: "Top 5%",
    description: "In the top 5% of all players!",
    color: "text-yellow-300",
    glowColor: "shadow-yellow-400/60",
    bgGradient: "from-yellow-400/30 to-amber-500/20",
  },
  top_10_percent: {
    icon: Shield,
    label: "Top 10%",
    description: "In the top 10% of all players!",
    color: "text-cyan-400",
    glowColor: "shadow-cyan-500/50",
    bgGradient: "from-cyan-500/20 to-blue-600/10",
  },
  accuracy_king: {
    icon: Sparkles,
    label: "Accuracy King",
    description: "90%+ accuracy!",
    color: "text-pink-400",
    glowColor: "shadow-pink-500/50",
    bgGradient: "from-pink-500/20 to-rose-600/10",
  },
  lightning_fast: {
    icon: Rocket,
    label: "Lightning Fast",
    description: "Response under 1 second!",
    color: "text-sky-400",
    glowColor: "shadow-sky-500/50",
    bgGradient: "from-sky-500/20 to-blue-600/10",
  },
};

interface ViewerAchievementBadgeProps {
  type: AchievementType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

export const ViewerAchievementBadge = ({
  type,
  size = "sm",
  showLabel = false,
  animate = true,
}: ViewerAchievementBadgeProps) => {
  const config = ACHIEVEMENT_CONFIG[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={animate ? { scale: 0, rotate: -180 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className={`
              ${sizeClasses[size]} 
              rounded-full 
              bg-gradient-to-br ${config.bgGradient}
              border border-white/20
              flex items-center justify-center
              shadow-lg ${config.glowColor}
              cursor-pointer
            `}
          >
            <Icon className={`${iconSizes[size]} ${config.color}`} />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card/95 backdrop-blur-sm border-border/50">
          <div className="flex flex-col gap-0.5">
            <span className={`font-bold text-sm ${config.color}`}>{config.label}</span>
            <span className="text-xs text-muted-foreground">{config.description}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface AchievementBadgeListProps {
  achievements: AchievementType[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
}

export const AchievementBadgeList = ({
  achievements,
  maxVisible = 4,
  size = "sm",
}: AchievementBadgeListProps) => {
  const visible = achievements.slice(0, maxVisible);
  const remaining = achievements.length - maxVisible;

  return (
    <div className="flex items-center gap-0.5">
      {visible.map((achievement, index) => (
        <motion.div
          key={achievement}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <ViewerAchievementBadge type={achievement} size={size} />
        </motion.div>
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-muted-foreground ml-1">+{remaining}</span>
      )}
    </div>
  );
};

// Helper function to calculate achievements based on viewer stats
export const calculateAchievements = (
  entry: {
    avgResponseTimeMs?: number;
    correctAnswers: number;
    totalResponses: number;
    streak?: number;
    previousRank?: number;
    isFirstCorrect?: boolean;
    isFastestResponse?: boolean;
  },
  rank: number,
  totalParticipants: number
): AchievementType[] => {
  const achievements: AchievementType[] = [];
  const accuracy = entry.totalResponses > 0 
    ? (entry.correctAnswers / entry.totalResponses) * 100 
    : 0;

  // Speed Demon - fastest response
  if (entry.isFastestResponse) {
    achievements.push("speed_demon");
  }

  // Lightning Fast - under 1s response
  if (entry.avgResponseTimeMs && entry.avgResponseTimeMs < 1000) {
    achievements.push("lightning_fast");
  }

  // Perfect Round - all correct (min 3 answers)
  if (entry.totalResponses >= 3 && entry.correctAnswers === entry.totalResponses) {
    achievements.push("perfect_round");
  }

  // Comeback King - climbed 5+ ranks
  if (entry.previousRank && entry.previousRank - rank >= 5) {
    achievements.push("comeback_king");
  }

  // First Blood - first correct answer
  if (entry.isFirstCorrect) {
    achievements.push("first_blood");
  }

  // Streak Master - 5+ streak
  if (entry.streak && entry.streak >= 5) {
    achievements.push("streak_master");
  }

  // Top 5%
  if (totalParticipants >= 10 && rank <= Math.ceil(totalParticipants * 0.05)) {
    achievements.push("top_5_percent");
  }
  // Top 10%
  else if (totalParticipants >= 10 && rank <= Math.ceil(totalParticipants * 0.1)) {
    achievements.push("top_10_percent");
  }

  // Accuracy King - 90%+ with 5+ answers
  if (accuracy >= 90 && entry.totalResponses >= 5) {
    achievements.push("accuracy_king");
  }

  return achievements;
};
