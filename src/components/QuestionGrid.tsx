import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTVMode } from "@/hooks/useTVMode";
import { useTranslation } from "@/hooks/useTranslation";

interface QuestionGridProps {
  subject: string;
  questionPool: number[];        // Array of question numbers (IDs)
  usedQuestions: Set<string>;
  questionActive: boolean;
  onQuestionSelect: (subject: string, questionNum: number, displayIndex: number) => void;
  hideUsed?: boolean;            // Option to completely hide vs show disabled
  shuffleEnabled?: boolean;      // Whether shuffle is enabled (affects button labels)
  totalButtons?: number;         // Total number of buttons to always display
  showSequenceNumbers?: boolean; // Whether to show Q1, Q2 labels on buttons
}

export const QuestionGrid = ({ 
  subject, 
  questionPool, 
  usedQuestions, 
  questionActive, 
  onQuestionSelect,
  hideUsed = false,              // Default to showing all buttons
  shuffleEnabled = true,
  totalButtons = 50,             // Default to 50 buttons
  showSequenceNumbers = true     // Show Q numbers by default
}: QuestionGridProps) => {
  const { tvModeEnabled } = useTVMode();
  const { t } = useTranslation();

  // Create array of button slots based on totalButtons
  const buttonSlots = useMemo(() => {
    return Array.from({ length: totalButtons }, (_, index) => {
      const displayIndex = index + 1;
      // Find the actual question number for this display index
      const actualQuestionNum = questionPool[index];
      const isAvailable = actualQuestionNum !== undefined;
      const isUsed = isAvailable && usedQuestions.has(`${subject}-${actualQuestionNum}`);
      
      return {
        displayIndex,
        actualQuestionNum,
        isAvailable,
        isUsed
      };
    });
  }, [questionPool, usedQuestions, subject, totalButtons]);

  if (questionPool.length === 0) {
    return (
      <div className={`text-center text-muted-foreground py-4 ${tvModeEnabled ? 'text-3xl font-bold' : ''}`}>
        {t.noQuestionsAvailable}
      </div>
    );
  }

  // TV Mode styles
  const gridCols = !tvModeEnabled ? "grid-cols-5 sm:grid-cols-8 md:grid-cols-10" : "grid-cols-5";
  const gap = !tvModeEnabled ? "gap-1.5 sm:gap-2 md:gap-3" : "gap-2";

  return (
    <div className={`grid ${gridCols} ${gap}`}>
      {buttonSlots.map((slot) => {
        // Determine button label
        const buttonLabel = showSequenceNumbers 
          ? (shuffleEnabled 
            ? `Q${slot.displayIndex}` 
            : slot.isAvailable ? `Q${slot.actualQuestionNum}` : `Q${slot.displayIndex}`)
          : '•';
        
        // TV Mode button styles
        const tvButtonBase = tvModeEnabled 
          ? "rounded-2xl text-2xl font-black h-16" 
          : "aspect-square";

        // Not available (no question in pool for this slot)
        if (!slot.isAvailable) {
          return (
            <Button
              key={slot.displayIndex}
              disabled
              variant="outline"
              className={`${tvButtonBase} opacity-20 cursor-not-allowed`}
            >
              {buttonLabel}
            </Button>
          );
        }
        
        // Used question - show as disabled/off
        if (slot.isUsed) {
          return (
            <Button
              key={slot.actualQuestionNum}
              disabled
              variant="outline"
              className={`${tvButtonBase} ${tvModeEnabled 
                ? "bg-muted/30 text-muted-foreground opacity-30 border-muted-foreground/10" 
                : "bg-muted/50 text-muted-foreground opacity-40 border-muted-foreground/20"}`}
            >
              {buttonLabel}
            </Button>
          );
        }
        
        // Available question - show with glow effect
        return (
          <Button
            key={slot.actualQuestionNum}
            onClick={() => onQuestionSelect(subject, slot.actualQuestionNum!, slot.displayIndex)}
            disabled={questionActive}
            variant="outline"
            className={`${tvButtonBase} transition-all ${tvModeEnabled ? 'duration-150' : 'duration-300'} ${
              questionActive 
                ? "opacity-40 cursor-not-allowed" 
                : tvModeEnabled
                  ? "bg-black text-white border-2 border-yellow-100 shadow-[0_0_25px_rgba(250,204,21,0.7)] hover:bg-yellow-400 hover:text-black hover:scale-105"
                  : "hover:bg-primary hover:text-primary-foreground shadow-[0_0_10px_2px_hsl(var(--primary)/0.4)] border-primary/50 hover:shadow-[0_0_15px_4px_hsl(var(--primary)/0.6)]"
            }`}
          >
            {buttonLabel}
          </Button>
        );
      })}
    </div>
  );
};
