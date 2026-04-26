import { memo } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

interface TeamSupporterBadgeProps {
  count: number;
  teamName: string;
  size?: "sm" | "md" | "lg";
  showAnimation?: boolean;
}

const getTeamColor = (teamName: string) => {
  const name = teamName.toLowerCase();
  if (name.includes("east")) return {
    gradient: "from-orange-400 to-amber-500",
    shadow: "shadow-[0_0_10px_rgba(251,146,60,0.6)]",
  };
  if (name.includes("west")) return {
    gradient: "from-purple-400 to-violet-500",
    shadow: "shadow-[0_0_10px_rgba(167,139,250,0.6)]",
  };
  if (name.includes("north")) return {
    gradient: "from-cyan-400 to-sky-500",
    shadow: "shadow-[0_0_10px_rgba(34,211,238,0.6)]",
  };
  if (name.includes("south")) return {
    gradient: "from-rose-400 to-red-500",
    shadow: "shadow-[0_0_10px_rgba(251,113,133,0.6)]",
  };
  return {
    gradient: "from-slate-400 to-gray-500",
    shadow: "shadow-[0_0_8px_rgba(148,163,184,0.5)]",
  };
};

export const TeamSupporterBadge = memo(({ 
  count, 
  teamName, 
  size = "md", 
  showAnimation = true 
}: TeamSupporterBadgeProps) => {
  // Show badge even with 0 count to indicate team position

  const sizeClasses = {
    sm: "min-w-5 h-5 text-[9px] px-1",
    md: "min-w-7 h-7 text-[11px] px-1.5",
    lg: "min-w-9 h-9 text-sm px-2"
  };

  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const { gradient, shadow } = getTeamColor(teamName);

  return (
    <motion.div
      initial={showAnimation ? { scale: 0, rotate: -180 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className="absolute -bottom-1 -right-1 z-10"
    >
      <motion.div
        animate={showAnimation && count >= 10 ? { 
          scale: [1, 1.05, 1],
        } : {}}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          bg-gradient-to-br ${gradient} 
          ${shadow}
          flex items-center justify-center gap-0.5
          border-2 border-background
          font-bold text-white
        `}
      >
        <span>{count}</span>
      </motion.div>
    </motion.div>
  );
});

TeamSupporterBadge.displayName = "TeamSupporterBadge";