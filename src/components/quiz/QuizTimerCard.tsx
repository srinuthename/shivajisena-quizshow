import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Pause, Play, RotateCcw } from "lucide-react";
import { useTVMode } from "@/hooks/useTVMode";
import { useTranslation } from "@/hooks/useTranslation";
interface QuizTimerCardProps {
  seconds: number;
  isRunning: boolean;
  isTimeUp?: boolean;
  onToggle: () => void;
  onReset?: () => void;
  showControls?: boolean;
  label?: string;
  resetValue?: number;
  isDanger?: boolean;
}

export const QuizTimerCard = ({
  seconds,
  isRunning,
  isTimeUp = false,
  onToggle,
  onReset,
  showControls = true,
  label,
  resetValue = 0,
  isDanger = false,
}: QuizTimerCardProps) => {
  const { tvModeEnabled } = useTVMode();
  const { t } = useTranslation();
  const effectiveLabel = label ?? t.timeRemainingLabel;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const showDanger = isDanger || (seconds <= 10 && seconds > 0);

  if (tvModeEnabled) {
    return (
      <Card className="p-2 bg-gradient-to-br from-card via-muted/50 to-secondary/30">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-primary uppercase tracking-wide">{effectiveLabel}</span>
          <Clock className="h-10 w-10 text-primary" />
          <span className={`font-mono text-4xl font-bold ${showDanger ? 'text-timer-danger' : 'text-foreground'}`}>
            {formatTime(seconds)}
          </span>
          {showControls && (
            <Button
              onClick={onToggle}
              variant="outline"
              className="text-xl px-4 py-2 bg-gray-800 text-white border-yellow-500"
            >
              {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-card via-muted/30 to-secondary/20 border-border/50 shadow-lg">
      <div className="flex items-center gap-3">
        <Clock className={`h-6 w-6 ${showDanger ? 'text-timer-danger' : 'text-primary'}`} />
        <span className={`font-mono text-3xl font-bold ${showDanger ? 'text-timer-danger animate-pulse' : 'text-foreground'}`}>
          {formatTime(seconds)}
        </span>
        {showControls && (
          <div className="flex gap-1">
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            {onReset && (
              <Button
                onClick={onReset}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
