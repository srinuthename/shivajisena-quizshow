import { cn } from "@/lib/utils";
import { ViewerVote } from "@/types/game";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X } from "lucide-react";

interface AnswerOptionsProps {
  options: string[];
  guestAnswer: number | null;
  finalAnswer: number | null;
  correctAnswer?: number;
  viewerVotes: ViewerVote[];
  viewerVotePercentages?: number[];
  isRevealed: boolean;
  onSelectAnswer: (index: number) => void;
  disabled?: boolean;
  eliminatedOptions?: number[];
}

const optionLabels = ["A", "B", "C", "D", "E"];

export function AnswerOptions({
  options,
  guestAnswer,
  finalAnswer,
  correctAnswer,
  viewerVotes,
  viewerVotePercentages = [],
  isRevealed,
  onSelectAnswer,
  disabled,
  eliminatedOptions = [],
}: AnswerOptionsProps) {
  const getOptionClass = (index: number) => {
    if (eliminatedOptions.includes(index)) {
      return "opacity-40 cursor-not-allowed border-2 border-muted bg-muted/10 relative";
    }
    if (isRevealed && correctAnswer === index) {
      return "border-4 border-academic-gold bg-academic-gold/20 shadow-lg ring-4 ring-academic-gold/30 glow-success";
    }
    if (isRevealed && finalAnswer === index && correctAnswer !== index) {
      return "border-4 border-destructive bg-destructive/20 shadow-lg ring-4 ring-destructive/30";
    }
    if (finalAnswer === index) {
      return "border-4 border-primary bg-primary/25 shadow-lg ring-4 ring-primary/40 glow-primary transform scale-[1.02]";
    }
    if (guestAnswer === index) {
      return "border-4 border-secondary bg-gradient-to-r from-secondary/30 to-accent/20 shadow-lg ring-4 ring-secondary/50 glow-secondary transform scale-[1.02]";
    }
    return "border-2 border-border/30 hover:border-primary/60 hover:bg-primary/10 hover:shadow-md transition-all duration-300";
  };
  
  function getViewersForOption(optionIdx: number) {
    return viewerVotes.filter(v => v.choice === optionIdx);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 relative">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => !eliminatedOptions.includes(index) && onSelectAnswer(index)}
          disabled={disabled || isRevealed || eliminatedOptions.includes(index)}
            className={cn(
              "relative overflow-hidden rounded-lg p-3 text-left transition-all duration-500",
              "glass-card backdrop-blur-sm",
              getOptionClass(index),
              !disabled && !isRevealed && "cursor-pointer hover:scale-[1.02] hover:shadow-hover",
              "animate-slide-up"
            )}
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          {/* Viewer vote bar */}
          {viewerVotes.length > 0 && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent/10 transition-all duration-1000"
              style={{
                width: `${viewerVotePercentages[index]}%`,
              }}
            />
          )}
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 font-bold text-primary text-sm">
                {optionLabels[index]}
              </span>
              <span className="text-base font-medium">{option}</span>
            </div>
            
            {/* Icons for correct/wrong */}
            {isRevealed && correctAnswer === index && (
              <div className="relative">
                <div className="absolute inset-0 bg-academic-gold blur-lg animate-pulse-academic" />
                <Check className="relative h-6 w-6 text-academic-gold" />
              </div>
            )}
            {isRevealed && finalAnswer === index && correctAnswer !== index && (
              <X className="h-6 w-6 text-destructive" />
            )}
          </div>
          
          {/* Viewer percentage and avatars */}
          {viewerVotes.length > 0 && (
            <>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-academic-muted">Viewer votes</span>
                <span className="font-bold text-academic-gold">
                  {viewerVotePercentages[index]}%
                </span>
              </div>
              <div className="flex -space-x-2 mt-2">
                {getViewersForOption(index).slice(0, 8).map((voter, avatarIndex) => (
                  <Avatar key={avatarIndex} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={voter.avatar.url} alt={voter.fullname} />
                    <AvatarFallback className={cn(voter.avatar.color, "text-white text-xs")}>
                      {voter.avatar.initial}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {getViewersForOption(index).length > 8 && (
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-academic-dark/60 text-academic-text text-xs border-2 border-background">
                    +{getViewersForOption(index).length - 8}
                  </div>
                )}
              </div>
            </>
          )}
        </button>
      ))}
    </div>
  );
}