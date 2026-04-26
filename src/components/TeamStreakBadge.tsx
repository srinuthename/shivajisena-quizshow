import { memo } from "react";
import { motion } from "framer-motion";
import { Flame, Zap, Star } from "lucide-react";

interface TeamStreakBadgeProps {
  streak: number;
  size?: "sm" | "md" | "lg";
  showAnimation?: boolean;
}

export const TeamStreakBadge = memo(({ streak, size = "md", showAnimation = true }: TeamStreakBadgeProps) => {
  if (streak < 2) return null;

  const sizeClasses = {
    sm: "w-5 h-5 text-[10px]",
    md: "w-7 h-7 text-xs",
    lg: "w-9 h-9 text-sm"
  };

  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3.5 h-3.5",
    lg: "w-4.5 h-4.5"
  };

  // Different tiers based on streak
  const getTierStyles = () => {
    if (streak >= 10) {
      return {
        gradient: "from-yellow-400 via-orange-500 to-red-600",
        shadow: "shadow-[0_0_15px_rgba(234,179,8,0.7)]",
        icon: Star,
        tier: "legendary"
      };
    } else if (streak >= 5) {
      return {
        gradient: "from-orange-400 via-red-500 to-rose-600",
        shadow: "shadow-[0_0_12px_rgba(249,115,22,0.6)]",
        icon: Zap,
        tier: "epic"
      };
    } else if (streak >= 3) {
      return {
        gradient: "from-orange-400 to-red-500",
        shadow: "shadow-[0_0_8px_rgba(249,115,22,0.5)]",
        icon: Flame,
        tier: "hot"
      };
    } else {
      return {
        gradient: "from-amber-400 to-orange-500",
        shadow: "shadow-[0_0_6px_rgba(251,191,36,0.4)]",
        icon: Flame,
        tier: "warming"
      };
    }
  };

  const { gradient, shadow, icon: Icon, tier } = getTierStyles();

  return (
    <motion.div
      initial={showAnimation ? { scale: 0, rotate: -180 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className="absolute -top-1 -right-1 z-10"
    >
      <motion.div
        animate={showAnimation && tier !== "warming" ? { 
          scale: [1, 1.1, 1],
          rotate: tier === "legendary" ? [0, 5, -5, 0] : undefined
        } : {}}
        transition={{ 
          duration: tier === "legendary" ? 1.5 : 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          bg-gradient-to-br ${gradient} 
          ${shadow}
          flex items-center justify-center
          border-2 border-background
          font-bold text-white
        `}
      >
        {streak >= 5 ? (
          <div className="flex items-center gap-0.5">
            <Icon className={iconSizes[size]} />
            {size !== "sm" && <span>{streak}</span>}
          </div>
        ) : (
          <span>{streak}</span>
        )}
      </motion.div>

      {/* Fire particles for legendary tier */}
      {tier === "legendary" && showAnimation && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-yellow-400"
              style={{ 
                top: "50%", 
                left: "50%",
              }}
              animate={{
                x: [0, (i - 1) * 8],
                y: [0, -12, -20],
                opacity: [1, 0.8, 0],
                scale: [0.5, 1, 0.3]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeOut"
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
});

TeamStreakBadge.displayName = "TeamStreakBadge";
