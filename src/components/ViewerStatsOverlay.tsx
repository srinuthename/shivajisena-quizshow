import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Target, 
  Zap, 
  Trophy,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Minus
} from "lucide-react";
import { AchievementBadgeList, calculateAchievements, AchievementType } from "@/components/ViewerAchievementBadge";
import { StreakFlamesBadge } from "@/components/StreakFlames";

interface ViewerStats {
  rank: number;
  previousRank?: number;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  streak: number;
  avgResponseTimeMs: number;
  speedPercentile: number; // 0-100, higher is faster
  responseTimes: number[]; // History of response times for trend
  isFirstCorrect?: boolean;
  isFastestResponse?: boolean;
}

interface ViewerStatsOverlayProps {
  stats: ViewerStats;
  totalParticipants: number;
  userName: string;
  isVisible?: boolean;
}

export const ViewerStatsOverlay = ({
  stats,
  totalParticipants,
  userName,
  isVisible = true,
}: ViewerStatsOverlayProps) => {
  if (!isVisible) return null;

  const accuracy = stats.totalResponses > 0 
    ? Math.round((stats.correctAnswers / stats.totalResponses) * 100) 
    : 0;

  const rankChange = stats.previousRank ? stats.previousRank - stats.rank : 0;
  
  const achievements = calculateAchievements(
    stats,
    stats.rank,
    totalParticipants
  );

  // Calculate response time trend
  const getResponseTrend = () => {
    if (stats.responseTimes.length < 2) return "stable";
    const recent = stats.responseTimes.slice(-3);
    const older = stats.responseTimes.slice(-6, -3);
    if (older.length === 0) return "stable";
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const diff = (olderAvg - recentAvg) / olderAvg;
    if (diff > 0.1) return "faster";
    if (diff < -0.1) return "slower";
    return "stable";
  };

  const trend = getResponseTrend();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="w-full bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-md rounded-xl border border-primary/20 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/20 to-accent/10 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Your Stats</span>
            <span className="text-xs text-muted-foreground">• {userName}</span>
          </div>
          {stats.streak >= 3 && <StreakFlamesBadge streak={stats.streak} />}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Rank Card */}
          <motion.div 
            className="bg-card/50 rounded-lg p-3 border border-border/30"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Rank</span>
              {rankChange !== 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`flex items-center gap-0.5 text-xs font-bold ${
                    rankChange > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {rankChange > 0 ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {Math.abs(rankChange)}
                </motion.div>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">#{stats.rank}</span>
              <span className="text-xs text-muted-foreground">/ {totalParticipants}</span>
            </div>
          </motion.div>

          {/* Accuracy Card */}
          <motion.div 
            className="bg-card/50 rounded-lg p-3 border border-border/30"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Accuracy</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${
                accuracy >= 80 ? "text-emerald-400" : 
                accuracy >= 50 ? "text-amber-400" : "text-rose-400"
              }`}>
                {accuracy}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({stats.correctAnswers}/{stats.totalResponses})
              </span>
            </div>
          </motion.div>

          {/* Speed Percentile Card */}
          <motion.div 
            className="bg-card/50 rounded-lg p-3 border border-border/30"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Speed</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sky-400">
                Faster than {stats.speedPercentile}%
              </span>
              <span className="text-[10px] text-muted-foreground">of players</span>
            </div>
          </motion.div>

          {/* Response Trend Card */}
          <motion.div 
            className="bg-card/50 rounded-lg p-3 border border-border/30"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-1 mb-1">
              <BarChart3 className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Trend</span>
            </div>
            <div className="flex items-center gap-2">
              {trend === "faster" && (
                <>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">Getting Faster!</span>
                </>
              )}
              {trend === "slower" && (
                <>
                  <TrendingUp className="w-5 h-5 text-rose-400 rotate-180" />
                  <span className="text-sm font-bold text-rose-400">Slowing Down</span>
                </>
              )}
              {trend === "stable" && (
                <>
                  <Minus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-bold text-muted-foreground">Steady</span>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 pt-3 border-t border-border/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Achievements</span>
              <AchievementBadgeList achievements={achievements} maxVisible={5} size="md" />
            </div>
          </motion.div>
        )}

        {/* Mini Response Time Chart */}
        {stats.responseTimes.length >= 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 pt-3 border-t border-border/30"
          >
            <span className="text-xs text-muted-foreground mb-2 block">Response Times</span>
            <ResponseTimeSparkline times={stats.responseTimes.slice(-10)} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Mini sparkline chart for response times
const ResponseTimeSparkline = ({ times }: { times: number[] }) => {
  if (times.length < 2) return null;

  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);
  const range = maxTime - minTime || 1;

  const height = 40;
  const width = 100;
  const padding = 4;

  const points = times.map((time, i) => {
    const x = padding + (i / (times.length - 1)) * (width - padding * 2);
    const y = height - padding - ((time - minTime) / range) * (height - padding * 2);
    return { x, y, time };
  });

  const pathD = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    return `${acc} L ${point.x} ${point.y}`;
  }, "");

  // Determine if trend is improving (lower times = better)
  const isImproving = times[times.length - 1] < times[0];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Gradient fill */}
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isImproving ? "#10b981" : "#f59e0b"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isImproving ? "#10b981" : "#f59e0b"} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Fill area */}
      <path
        d={`${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`}
        fill="url(#sparklineGradient)"
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={isImproving ? "#10b981" : "#f59e0b"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="3"
        fill={isImproving ? "#10b981" : "#f59e0b"}
      />

      {/* Time labels */}
      <text
        x={points[points.length - 1].x}
        y={height - 2}
        textAnchor="end"
        fontSize="8"
        fill="hsl(var(--muted-foreground))"
      >
        {(times[times.length - 1] / 1000).toFixed(1)}s
      </text>
    </svg>
  );
};
