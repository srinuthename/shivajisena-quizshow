import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TimerProps {
  timeLimit: number;
  isActive: boolean;
  paused?: boolean;   // ✅ controlled by Game
  onTimeUp: () => void;
  className?: string;
}

export interface TimerRef {
  reset: (newTime?: number) => void;
}

export const Timer = forwardRef<TimerRef, TimerProps>(
  ({ timeLimit, isActive, paused = false, onTimeUp, className }, ref) => {
    const [timeRemaining, setTimeRemaining] = useState(timeLimit);

    // Expose reset to parent (pause/resume are handled by props)
    useImperativeHandle(ref, () => ({
      reset: (newTime?: number) => {
        setTimeRemaining(newTime ?? timeLimit);
      },
    }));

    // Reset when timeLimit changes (new question)
    useEffect(() => {
      setTimeRemaining(timeLimit);
    }, [timeLimit]);

    // Countdown logic
    useEffect(() => {
      if (!isActive || paused || timeRemaining <= 0) return;

      const interval = setInterval(() => {
        setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);

      return () => clearInterval(interval);
    }, [isActive, paused]); // ✅ no timeRemaining dependency

    // Fire onTimeUp when timer hits 0
    useEffect(() => {
      if (timeRemaining === 0 && isActive && !paused) {
        onTimeUp();
      }
    }, [timeRemaining, isActive, paused, onTimeUp]);

    // Progress + colors
    const percentage = (timeRemaining / timeLimit) * 100;
    const isWarning = timeRemaining <= 10 && timeRemaining > 5;
    const isDanger = timeRemaining <= 5;

    const getTimerColor = () => {
      if (isDanger) return "text-timer-danger";
      if (isWarning) return "text-timer-warning";
      return "text-timer-safe";
    };

    return (
      <div className={cn("relative", className)}>
        <div className="relative w-24 h-24 mx-auto">
          <svg className="w-24 h-24 transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="48"
              cy="48"
              r="44"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-muted/30"
            />
            {/* Progress Circle */}
            <circle
              cx="48"
              cy="48"
              r="44"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - percentage / 100)}`}
              className={cn(
                "transition-all duration-1000",
                getTimerColor(),
                isDanger && "animate-pulse"
              )}
            />
          </svg>

          {/* Time Remaining */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "text-2xl font-bold tabular-nums",
                getTimerColor(),
                isDanger && "animate-pulse"
              )}
            >
              {timeRemaining}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

Timer.displayName = "Timer";
