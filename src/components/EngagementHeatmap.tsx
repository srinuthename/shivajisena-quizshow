import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import { TeamSupporterCounts } from "./TeamSupportBadge";

interface EngagementHeatmapProps {
  /** Per-question team activity: array index = question number */
  history: TeamSupporterCounts[];
  /** Current question index (0-based) */
  currentQuestion: number;
  /** Compact mode for sidebar */
  compact?: boolean;
}

const TEAM_KEYS = ["east", "west", "north", "south"] as const;

const TEAM_COLORS: Record<string, { bg: string; glow: string; label: string }> = {
  east: { bg: "bg-amber-500", glow: "shadow-[0_0_8px_rgba(245,158,11,0.6)]", label: "East" },
  west: { bg: "bg-violet-500", glow: "shadow-[0_0_8px_rgba(139,92,246,0.6)]", label: "West" },
  north: { bg: "bg-cyan-500", glow: "shadow-[0_0_8px_rgba(6,182,212,0.6)]", label: "North" },
  south: { bg: "bg-rose-500", glow: "shadow-[0_0_8px_rgba(244,63,94,0.6)]", label: "South" },
};

const getIntensity = (count: number, max: number): number => {
  if (max === 0) return 0;
  return Math.min(1, count / max);
};

export const EngagementHeatmap = memo(({ history, currentQuestion, compact = false }: EngagementHeatmapProps) => {
  // Only show last N questions
  const visibleCount = compact ? 8 : 15;
  const startIdx = Math.max(0, history.length - visibleCount);
  const visible = history.slice(startIdx);

  const maxCount = useMemo(() => {
    let m = 1;
    for (const h of history) {
      for (const k of TEAM_KEYS) {
        if (h[k] > m) m = h[k];
      }
    }
    return m;
  }, [history]);

  // Find most active team overall
  const mostActive = useMemo(() => {
    const totals = { east: 0, west: 0, north: 0, south: 0 };
    for (const h of history) {
      for (const k of TEAM_KEYS) totals[k] += h[k];
    }
    let best: typeof TEAM_KEYS[number] = "east";
    let bestVal = 0;
    for (const k of TEAM_KEYS) {
      if (totals[k] > bestVal) { bestVal = totals[k]; best = k; }
    }
    return bestVal > 0 ? best : null;
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No engagement data yet
      </div>
    );
  }

  return (
    <div className="leaderboard-glossy rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold text-foreground">Engagement Heatmap</span>
        </div>
        {mostActive && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span className={TEAM_COLORS[mostActive].bg.replace("bg-", "text-").replace("-500", "-400")}>
              {TEAM_COLORS[mostActive].label}
            </span>
            <span>most active</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {TEAM_KEYS.map(k => (
          <div key={k} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-sm ${TEAM_COLORS[k].bg}`} />
            <span>{TEAM_COLORS[k].label}</span>
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-0.5 overflow-x-auto scrollbar-none">
        {visible.map((entry, idx) => {
          const qIdx = startIdx + idx;
          const isCurrent = qIdx === currentQuestion;
          return (
            <div key={qIdx} className="flex flex-col gap-0.5 min-w-[18px]">
              {TEAM_KEYS.map(team => {
                const intensity = getIntensity(entry[team], maxCount);
                const opacity = Math.max(0.08, intensity * 0.9 + 0.1);
                return (
                  <motion.div
                    key={team}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.02, type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-4 h-4 rounded-sm ${TEAM_COLORS[team].bg} ${intensity > 0.7 ? TEAM_COLORS[team].glow : ""}`}
                    style={{ opacity }}
                    title={`Q${qIdx + 1} - ${TEAM_COLORS[team].label}: ${entry[team]} responses`}
                  />
                );
              })}
              {/* Question number */}
              <span className={`text-[8px] text-center ${isCurrent ? "text-primary font-bold" : "text-muted-foreground/50"}`}>
                {qIdx + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

EngagementHeatmap.displayName = "EngagementHeatmap";
