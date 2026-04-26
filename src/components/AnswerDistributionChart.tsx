import { motion } from "framer-motion";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle } from "lucide-react";

/* ================= TYPES ================= */

interface AnswerDistributionChartProps {
  counts: Record<string, number>;
  labels?: string[];
  correctLabel?: string | null;
  /** @deprecated Use correctLabel instead */
  correctAnswer?: number | null;
  isRevealed?: boolean;
}

const ANSWER_COLORS = {
  default: [
    "from-rose-500 to-rose-600",
    "from-sky-500 to-sky-600",
    "from-amber-500 to-amber-600",
    "from-emerald-500 to-emerald-600",
  ],
  correct: "from-emerald-400 to-emerald-600",
  incorrect: "from-gray-400 to-gray-500",
};

/* ================= COMPONENT ================= */

export const AnswerDistributionChart = ({
  counts,
  labels,
  correctLabel,
  correctAnswer,
  isRevealed = false,
}: AnswerDistributionChartProps) => {
  /* ===== Derived data (memoized) ===== */

  const { total, data, maxCount } = useMemo(() => {
    const effectiveLabels = labels && labels.length > 0
      ? labels
      : Object.keys(counts).length > 0
        ? Object.keys(counts).sort()
        : ["A", "B", "C", "D"];

    const totalVotes = Object.values(counts).reduce((sum, c) => sum + c, 0);

    const mapped = effectiveLabels.map((label, position) => {
      const count = counts[label] || 0;
      const rawPct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
      const resolvedCorrectLabel = correctLabel ?? (correctAnswer !== null && correctAnswer !== undefined ? effectiveLabels[correctAnswer] : null);

      return {
        label,
        index: position,
        count,
        percentage: count > 0 ? Math.max(1, Math.round(rawPct)) : 0,
        isCorrect: label === resolvedCorrectLabel,
      };
    });

    const max = Math.max(...mapped.map((d) => d.count), 1);

    return { total: totalVotes, data: mapped, maxCount: max };
  }, [counts, labels, correctLabel, correctAnswer]);

  const getBarColor = (index: number, isCorrect: boolean) => {
    if (isRevealed) {
      return isCorrect
        ? ANSWER_COLORS.correct
        : ANSWER_COLORS.incorrect;
    }
    return ANSWER_COLORS.default[index % ANSWER_COLORS.default.length];
  };

  /* ================= UI ================= */

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-md rounded-xl border border-border/50 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2 border-b border-border/50 bg-gradient-to-r from-violet-500/20 to-purple-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <span className="font-bold text-sm">
              Answer Distribution
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {total} votes
          </Badge>
        </div>

        {/* Chart */}
        <div className="p-4 space-y-3">
          {data.map(
            ({ label, index, count, percentage, isCorrect }) => (
              <div key={label} className="space-y-1">
                {/* Label row */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold w-5 ${
                        isRevealed && isCorrect
                          ? "text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {label}
                    </span>
                    {isRevealed && isCorrect && (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {count}
                    </span>
                    <span
                      className={`font-medium min-w-[40px] text-right ${
                        isRevealed && isCorrect
                          ? "text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="h-6 bg-muted/30 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={false}
                    animate={{
                      width: `${(count / maxCount) * 100}%`,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 22,
                    }}
                    className={`h-full rounded-full bg-gradient-to-r ${getBarColor(
                      index,
                      isCorrect
                    )} relative`}
                  >
                    {/* Shine */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
                  </motion.div>
                </div>
              </div>
            )
          )}

          {total === 0 && (
            <div className="text-center text-muted-foreground text-sm py-4">
              Waiting for responses…
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
