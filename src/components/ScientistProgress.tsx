import { CheckCircle, Crown, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface ScientistProgressProps {
  score: number;
  targetScore: number;
  answeredQuestions: boolean[];
  currentQuestion: number;
  readyForFinalAnimation: boolean;
  onTriggerFinalAnimation?: () => void;
}

const biblicalCharacters = [
  { name: "Lot", icon: "🏛️", description: "Righteous in Sodom" },
  { name: "Judah", icon: "🦁", description: "Lion of the Tribe" },
  { name: "Tamar", icon: "🌴", description: "Seeker of Justice" },
  { name: "Amnon", icon: "👑", description: "Prince of Israel" },
  { name: "Reuben", icon: "🌾", description: "Firstborn Son" },
  { name: "Jacob", icon: "✨", description: "Wrestling with God" },
  { name: "Bilhah", icon: "🕊️", description: "Mother of Tribes" },
  { name: "Absalom", icon: "👸", description: "Beautiful Prince" },
  { name: "David", icon: "🎵", description: "Shepherd King" },
  { name: "Bathsheba", icon: "💎", description: "Mother of Wisdom" },
];

export function ScientistProgress({
  score,
  targetScore,
  answeredQuestions,
  currentQuestion,
  readyForFinalAnimation,
  onTriggerFinalAnimation
}: ScientistProgressProps) {
  const { t } = useLanguage();
  const allCorrect = answeredQuestions.filter(Boolean).length === 10;
  const showFinalButton = allCorrect && readyForFinalAnimation;

  return (
    <div className="glass-card-biblical rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-biblical-text">
          Biblical Wisdom Progress
        </h3>
        <div className="flex items-center gap-1">
          <span className={cn(
            "text-xl font-bold",
            score >= targetScore && "text-biblical-gold animate-pulse-biblical"
          )}>
            {score}
          </span>
          <span className="text-sm text-biblical-muted">/ {targetScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-10 gap-1 mb-2">
        {biblicalCharacters.map((character, index) => {
          const isUnlocked = answeredQuestions[index];
          const isCurrent = index === currentQuestion;
          
          return (
            <div
              key={character.name}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-md transition-all duration-700",
                isUnlocked ? "bg-accent/20 shadow-biblical" : "bg-biblical-dark/40",
                isCurrent && "ring-1 ring-secondary animate-pulse"
              )}
            >
              <div
                className={cn(
                  "text-xl transition-all duration-700",
                  isUnlocked ? "animate-pulse-biblical filter drop-shadow-biblical" : "opacity-30 grayscale"
                )}
              >
                {character.icon}
              </div>
              {isUnlocked && (
                <div className="absolute -top-1 -right-1">
                  <Award className="h-3 w-3 text-biblical-crown animate-flicker" />
                </div>
              )}
              <div className="text-center mt-2">
                <p className="text-xs font-medium text-biblical-gold">
                  {t(character.name)}
                </p>
              </div>
              {/* Question number indicator */}
              <span className={cn(
                "text-[8px]",
                isCurrent ? "text-secondary font-bold" : "text-biblical-muted/60"
              )}>
                Q{index + 1}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative h-2 bg-biblical-dark/30 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-1000",
            score >= targetScore ? "bg-gradient-to-r from-biblical-gold to-biblical-crown" : 
            "bg-gradient-to-r from-primary to-secondary"
          )}
          style={{ width: `${Math.min((score / targetScore) * 100, 100)}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-shimmer" />
        </div>
      </div>

      {showFinalButton && (
        <div className="mt-4 text-center">
          <button
            onClick={onTriggerFinalAnimation}
            className="px-8 py-4 bg-gradient-to-r from-biblical-gold to-biblical-crown text-black font-bold rounded-lg shadow-biblical animate-pulse-biblical hover:scale-105 transition-transform"
          >
            🎉Divine Wisdom! All 10 biblical teachings mastered!🎉
          </button>
        </div>
      )}

      { (answeredQuestions.filter(Boolean).length == 11) && (
        <div className="mt-4 text-center">
          <div className="text-lg font-bold text-biblical-gold animate-pulse-biblical">
            ✝️ Divine Wisdom Achieved! ✝️
          </div>
          <div className="text-sm text-biblical-text mt-1">
            You have completed the journey through biblical teachings
          </div>
        </div>
      )}
    </div>
  );
}