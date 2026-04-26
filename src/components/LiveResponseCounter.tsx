import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface LiveResponseCounterProps {
  totalResponses: number;
  uniqueResponders: number;
  responseRate: number; // per second
  isActive: boolean;
}

export const LiveResponseCounter = memo(({
  totalResponses,
  uniqueResponders,
  responseRate,
  isActive,
}: LiveResponseCounterProps) => {
  const { t } = useTranslation();

  const activityLevel = useMemo(() => {
    if (responseRate > 5) return "high";
    if (responseRate > 2) return "medium";
    if (responseRate > 0) return "low";
    return "idle";
  }, [responseRate]);

  const activityColor = useMemo(() => {
    switch (activityLevel) {
      case "high":
        return "text-emerald-400";
      case "medium":
        return "text-amber-400";
      case "low":
        return "text-blue-400";
      default:
        return "text-muted-foreground";
    }
  }, [activityLevel]);

  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-card/50 rounded-lg border border-border/50">
      {/* Total Responses */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <div className="flex flex-col">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={totalResponses}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="text-lg font-bold leading-none"
            >
              {totalResponses}
            </motion.span>
          </AnimatePresence>
          <span className="text-[10px] text-muted-foreground">{t.responses}</span>
        </div>
      </div>

      {/* Unique Responders */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-400" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-none">{uniqueResponders}</span>
          <span className="text-[10px] text-muted-foreground">{t.users}</span>
        </div>
      </div>

      {/* Activity Indicator */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={isActive && activityLevel !== "idle" ? {
            scale: [1, 1.2, 1],
          } : {}}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: activityLevel === "high" ? 0.2 : activityLevel === "medium" ? 0.5 : 1,
          }}
        >
          <Zap className={cn("w-4 h-4", activityColor)} />
        </motion.div>
        <div className="flex flex-col">
          <span className={cn("text-sm font-semibold leading-none", activityColor)}>
            {responseRate.toFixed(1)}/s
          </span>
          <span className="text-[10px] text-muted-foreground">{t.rate}</span>
        </div>
      </div>

      {/* Activity Bar */}
      <div className="flex-1 max-w-20 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            activityLevel === "high" && "bg-emerald-500",
            activityLevel === "medium" && "bg-amber-500",
            activityLevel === "low" && "bg-blue-500",
            activityLevel === "idle" && "bg-muted-foreground/30"
          )}
          initial={{ width: 0 }}
          animate={{ 
            width: `${Math.min(100, (responseRate / 10) * 100)}%` 
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
});

LiveResponseCounter.displayName = "LiveResponseCounter";
