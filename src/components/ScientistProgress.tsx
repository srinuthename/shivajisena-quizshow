import { cn } from "@/lib/utils";
import { Award } from "lucide-react";

interface ScientistProgressProps {
  score: number;
  targetScore: number;
  answeredQuestions: boolean[];
  currentQuestion: number;
  readyForFinalAnimation: boolean;
  onTriggerFinalAnimation?: () => void;
}

const scientists = [
  { name: "Newton", icon: "🍎", description: "Laws of Motion" },
  { name: "Einstein", icon: "⚛️", description: "Theory of Relativity" },
  { name: "Curie", icon: "☢️", description: "Radioactivity Pioneer" },
  { name: "Darwin", icon: "🐢", description: "Evolution Theory" },
  { name: "Tesla", icon: "⚡", description: "Electrical Engineering" },
  { name: "Galileo", icon: "🔭", description: "Modern Astronomy" },
  { name: "Hawking", icon: "🌌", description: "Black Holes" },
  { name: "Turing", icon: "💻", description: "Computer Science" },
  { name: "Pasteur", icon: "🦠", description: "Microbiology" },
  { name: "Mendel", icon: "🧬", description: "Genetics" },
];

export function ScientistProgress({
  score, 
  targetScore, 
  answeredQuestions, 
  currentQuestion,
  readyForFinalAnimation,
  onTriggerFinalAnimation 
}: ScientistProgressProps) {
  const allCorrect = answeredQuestions.filter(Boolean).length === 10;
  const showFinalButton = allCorrect && readyForFinalAnimation;

  return (
    <div className="glass-card-academic rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-academic-text">
          Academic Achievement Progress
        </h3>
        <div className="flex items-center gap-1">
          <span className={cn(
            "text-xl font-bold",
            score >= targetScore && "text-academic-gold animate-pulse-academic"
          )}>
            {score}
          </span>
          <span className="text-sm text-academic-muted">/ {targetScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-10 gap-1 mb-2">
        {scientists.map((scientist, index) => {
          const isUnlocked = answeredQuestions[index];
          const isCurrent = index === currentQuestion;
          
          return (
            <div
              key={scientist.name}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-md transition-all duration-700",
                isUnlocked ? "bg-accent/20 shadow-academic" : "bg-academic-dark/40",
                isCurrent && "ring-1 ring-secondary animate-pulse"
              )}
            >
              <div
                className={cn(
                  "text-xl transition-all duration-700",
                  isUnlocked ? "animate-pulse-academic filter drop-shadow-academic" : "opacity-30 grayscale"
                )}
              >
                {scientist.icon}
              </div>
              {isUnlocked && (
                <div className="absolute -top-1 -right-1">
                  <Award className="h-3 w-3 text-academic-star animate-flicker" />
                </div>
              )}
              <span className={cn(
                "text-[10px] mt-0.5 text-center",
                isUnlocked ? "text-academic-text font-semibold" : "text-academic-muted"
              )}>
                {scientist.name}
              </span>
              {/* Question number indicator */}
              <span className={cn(
                "text-[8px]",
                isCurrent ? "text-secondary font-bold" : "text-academic-muted/60"
              )}>
                Q{index + 1}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative h-2 bg-academic-dark/30 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-1000",
            score >= targetScore ? "bg-gradient-to-r from-academic-gold to-academic-star" : 
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
            className="px-8 py-4 bg-gradient-to-r from-academic-gold to-academic-star text-black font-bold rounded-lg shadow-academic animate-pulse-academic hover:scale-105 transition-transform"
          >
            🎉Absolutely Awesome! All 10 medals have been achieved!!🎉
          </button>
        </div>
      )}

      { (answeredQuestions.filter(Boolean).length == 11) && (
        <div className="mt-4 text-center">
          <div className="text-lg font-bold text-academic-gold animate-pulse-academic">
            🎓 Academic Excellence Achieved! 🎓
          </div>
          <div className="text-sm text-academic-text mt-1">
            You have completed the journey through scientific history
          </div>
        </div>
      )}
    </div>
  );
}