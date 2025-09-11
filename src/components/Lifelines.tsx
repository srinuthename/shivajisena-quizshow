import { Button } from "@/components/ui/button";
import { CheckCircle2, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { Lifeline } from "@/types/game";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LifelinesProps {
  lifelines: Lifeline;
  onCheckAnswer: () => void;
  onFiftyFifty: () => void;
  disabled: boolean;
  checkAnswerResult?: 'correct' | 'incorrect' | null;
}

export function Lifelines({ 
  lifelines, 
  onCheckAnswer, 
  onFiftyFifty, 
  disabled,
  checkAnswerResult
}: LifelinesProps) {
  return (
    <div className="glass-card rounded-lg p-3">
      <h3 className="text-xs font-semibold text-muted-foreground mb-2">Lifelines (Once Per Game)</h3>
      <div className="grid grid-cols-2 gap-2">
        <TooltipProvider>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onCheckAnswer}
                disabled={disabled || !lifelines.checkAnswer}
                className={cn(
                  "flex flex-col items-center gap-1 h-12 transition-all relative",
                  !lifelines.checkAnswer && "opacity-50",
                  lifelines.checkAnswer && !disabled && "hover:bg-secondary/10 hover:border-secondary",
                  checkAnswerResult === 'correct' && "border-timer-safe bg-timer-safe/10",
                  checkAnswerResult === 'incorrect' && "border-timer-danger bg-timer-danger/10"
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[10px]">Check</span>
                {checkAnswerResult && (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-3 h-3 rounded-full",
                    checkAnswerResult === 'correct' ? "bg-timer-safe" : "bg-timer-danger"
                  )} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Check if your answer is correct (no scoring impact)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onFiftyFifty}
                disabled={disabled || !lifelines.fiftyFifty}
                className={cn(
                  "flex flex-col items-center gap-1 h-12 transition-all",
                  !lifelines.fiftyFifty && "opacity-50",
                  lifelines.fiftyFifty && !disabled && "hover:bg-accent/10 hover:border-accent"
                )}
              >
                <Scissors className="h-4 w-4" />
                <span className="text-[10px]">50-50</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remove 2 incorrect answers</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}