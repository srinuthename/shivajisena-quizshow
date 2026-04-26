import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  CheckCircle,
  XCircle,
  Heart,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTVMode } from "@/hooks/useTVMode";
import { useTranslation } from "@/hooks/useTranslation";

interface PowerplayStats {
  teamName: string;
  teamColor: string;
  correctAnswers: number;
  wrongAnswers: number;
  lifelinesUsed: number;
  pointsScored: number;
  pointsLost: number;
  netScore: number;
  questionsAttempted: number;
  supportCount?: number;
}

interface PowerplaySummaryProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PowerplayStats | null;
}

/* ---------------- TV STAT ROW ---------------- */

const StatRow = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "success" | "danger" | "warning" | "info";
}) => {
  const toneStyles = {
    success: "text-emerald-400",
    danger: "text-rose-400",
    warning: "text-amber-400",
    info: "text-sky-400",
  };

  return (
    <div className="flex items-center justify-between rounded-xl border-2 border-border bg-muted px-5 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`${tone ? toneStyles[tone] : ""} [&>svg]:h-8 [&>svg]:w-8`}
        >
          {icon}
        </span>
        <span className="text-xl font-bold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className="text-3xl font-black tabular-nums text-white">
        {value}
      </span>
    </div>
  );
};

/* ---------------- POWERPLAY SUMMARY ---------------- */

export const PowerplaySummary = ({
  isOpen,
  onClose,
  stats,
}: PowerplaySummaryProps) => {
  const { tvModeEnabled } = useTVMode();
  const { t } = useTranslation();
  if (!stats) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-background/95 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative w-full max-w-3xl max-h-[75vh] mx-6 rounded-2xl border-4 border-primary/40 bg-card overflow-hidden shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="px-8 py-4 border-b-2 border-yellow-400/30 text-center">
              <div className="flex items-center justify-center gap-3">
                <Zap className="h-11 w-11 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.7)]" />
                <h2 className="text-4xl font-black tracking-wide text-yellow-400">
                  POWER PLAY
                </h2>
              </div>
              <div className="mt-1 text-4xl font-bold text-white">
                {stats.teamName}
              </div>
            </div>

            {/* BODY */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <StatRow
                  icon={<Target />}
                  label={t.attempted}
                  value={stats.questionsAttempted}
                />
                <StatRow
                  icon={<Users />}
                  label={t.supporters}
                  value={stats.supportCount ?? 0}
                  tone="info"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StatRow
                  icon={<CheckCircle />}
                  label={t.correct}
                  value={stats.correctAnswers}
                  tone="success"
                />
                <StatRow
                  icon={<XCircle />}
                  label={t.wrong}
                  value={stats.wrongAnswers}
                  tone="danger"
                />
              </div>

             {/* <StatRow
                icon={<Heart />}
                label="Lifelines Used"
                value={stats.lifelinesUsed}
                tone="warning"
              />*/}

              <div className="my-3 border-t-2 border-white/10" />

              <div className="grid grid-cols-2 gap-4">
                <StatRow
                  icon={<TrendingUp />}
                  label={t.pointsScored}
                  value={`+${stats.pointsScored}`}
                  tone="success"
                />
                <StatRow
                  icon={<TrendingDown />}
                  label={t.pointsLost}
                  value={`-${stats.pointsLost}`}
                  tone="danger"
                />
              </div>

              {/* NET SCORE */}
              <div
                className={`mt-4 flex items-center justify-between rounded-xl border-4 px-6 py-4 ${
                  stats.netScore >= 0
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-rose-400 bg-rose-400/10"
                }`}
              >
                <span className="text-2xl font-black uppercase tracking-wide">
                  {t.netScore}
                </span>
                <span
                  className={`text-6xl font-black tabular-nums ${
                    stats.netScore >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {stats.netScore >= 0 ? "+" : ""}
                  {stats.netScore}
                </span>
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-8 pb-6">
              <Button
                onClick={onClose}
                size="lg"
                className="w-full py-6 text-2xl font-black bg-yellow-400 text-black hover:bg-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.6)]"
              >
                {t.continueText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
