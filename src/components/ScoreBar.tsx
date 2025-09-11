import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface ScoreBarProps {
  score: number;
  targetScore: number;
}

export function ScoreBar({ score, targetScore }: ScoreBarProps) {
  const percentage = Math.min((score / targetScore) * 100, 100);
  const isClose = score >= targetScore * 0.8;
  const hasWon = score >= targetScore;
  
  return (
    <div className="glass-card rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">Score</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xl font-bold",
            hasWon && "text-timer-safe animate-pulse-glow"
          )}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/ {targetScore}</span>
          {hasWon && <Trophy className="h-4 w-4 text-timer-safe animate-pulse" />}
        </div>
      </div>
      
      <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-1000",
            hasWon ? "bg-gradient-to-r from-timer-safe to-accent" : 
            isClose ? "bg-gradient-to-r from-primary to-secondary" :
            "bg-gradient-to-r from-secondary to-accent"
          )}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>
      
      {hasWon && (
        <div className="mt-1 text-center text-xs font-medium text-timer-safe animate-pulse">
          🎉 WINNER! 🎉
        </div>
      )}

    </div>
  );
}