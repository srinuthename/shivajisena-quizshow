import { motion } from "framer-motion";
import { useTVMode } from "@/hooks/useTVMode";

interface QuestionTimerBarProps {
  seconds: number;
  totalTime: number;
  isPowerplayActive?: boolean;
}

export const QuestionTimerBar = ({
  seconds,
  totalTime,
  isPowerplayActive = false,
}: QuestionTimerBarProps) => {
  const { tvModeEnabled } = useTVMode();

  // Don't render during powerplay
  if (isPowerplayActive) return null;

  const percentage = (seconds / totalTime) * 100;

  // Get timer bar style based on percentage
  const getTimerBarStyle = () => {
    if (percentage > 60) {
      return 'bg-emerald-500';
    } else if (percentage > 30) {
      return 'bg-amber-500';
    } else {
      return 'bg-red-500 animate-pulse';
    }
  };

  // TV Mode: Solid colors without gradients or animations
  const getTimerBarColorTV = () => {
    if (percentage > 60) {
      return 'bg-green-500';
    } else if (percentage > 30) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
    }
  };

  return (
    <div className={`relative ${tvModeEnabled ? 'h-6' : 'h-4'} ${tvModeEnabled ? 'bg-gray-800 border border-yellow-500/30' : 'bg-muted/50 border border-border/30'} rounded-full overflow-hidden`}>
      <motion.div
        className={`h-full rounded-full ${tvModeEnabled ? getTimerBarColorTV() : getTimerBarStyle()}`}
        initial={{ width: '100%' }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${tvModeEnabled ? 'text-xl font-black text-white' : 'text-sm font-extrabold text-foreground bg-background/30'} px-2 py-0.5 rounded`}>
          {seconds}s
        </span>
      </div>
    </div>
  );
};
