import { motion } from "framer-motion";
import { Crown, Star, Shield, Award } from "lucide-react";

interface PercentileBadgeProps {
  rank: number;
  totalParticipants: number;
  size?: "sm" | "md" | "lg";
}

export const PercentileBadge = ({ 
  rank, 
  totalParticipants,
  size = "sm" 
}: PercentileBadgeProps) => {
  if (totalParticipants < 10) return null;

  const percentile = (rank / totalParticipants) * 100;

  let config: {
    label: string;
    icon: React.ElementType;
    gradient: string;
    textColor: string;
    glowColor: string;
  } | null = null;

  if (percentile <= 1) {
    config = {
      label: "Top 1%",
      icon: Crown,
      gradient: "from-yellow-400 via-amber-300 to-yellow-500",
      textColor: "text-yellow-900",
      glowColor: "shadow-yellow-400/60",
    };
  } else if (percentile <= 5) {
    config = {
      label: "Top 5%",
      icon: Star,
      gradient: "from-amber-400 to-orange-500",
      textColor: "text-amber-100",
      glowColor: "shadow-amber-500/50",
    };
  } else if (percentile <= 10) {
    config = {
      label: "Top 10%",
      icon: Shield,
      gradient: "from-cyan-400 to-blue-500",
      textColor: "text-cyan-100",
      glowColor: "shadow-cyan-500/50",
    };
  } else if (percentile <= 25) {
    config = {
      label: "Top 25%",
      icon: Award,
      gradient: "from-purple-400 to-violet-500",
      textColor: "text-purple-100",
      glowColor: "shadow-purple-500/40",
    };
  }

  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-[9px] px-1.5 py-0.5 gap-0.5",
    md: "text-[10px] px-2 py-1 gap-1",
    lg: "text-xs px-2.5 py-1 gap-1.5",
  };

  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`
        inline-flex items-center rounded-full font-bold
        bg-gradient-to-r ${config.gradient}
        ${config.textColor}
        shadow-lg ${config.glowColor}
        ${sizeClasses[size]}
      `}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </motion.div>
  );
};

// Compact inline version
export const PercentileIndicator = ({ 
  rank, 
  totalParticipants 
}: { 
  rank: number; 
  totalParticipants: number 
}) => {
  if (totalParticipants < 5) return null;

  const percentile = Math.round((rank / totalParticipants) * 100);

  let colorClass = "text-muted-foreground";
  if (percentile <= 5) colorClass = "text-yellow-400";
  else if (percentile <= 10) colorClass = "text-cyan-400";
  else if (percentile <= 25) colorClass = "text-purple-400";

  return (
    <span className={`text-[10px] font-medium ${colorClass}`}>
      Top {percentile}%
    </span>
  );
};
