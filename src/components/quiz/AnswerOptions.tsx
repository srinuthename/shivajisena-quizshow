import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTVMode } from "@/hooks/useTVMode";

interface AnswerOptionsProps {
  options: string[];
  correctAnswer: number;
  selectedAnswer: number | null;
  showCountdown: boolean;
  showRevealAnimation: boolean;
  onSelect: (index: number) => void;
  disabled?: boolean;
}

export const AnswerOptions = ({
  options,
  correctAnswer,
  selectedAnswer,
  showCountdown,
  showRevealAnimation,
  onSelect,
  disabled = false,
}: AnswerOptionsProps) => {
  const { tvModeEnabled } = useTVMode();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-2">
      {options.map((option, index) => {
        const isCorrect = index === correctAnswer;
        const isSelected = selectedAnswer === index;
        const isRevealing = showCountdown;
        const isRevealed = showRevealAnimation;
        const shouldHighlightCorrect = isRevealed && isCorrect;

        // Determine animation state
        let animationClass = "";
        if (!tvModeEnabled) {
          if (isRevealing) {
            animationClass = "animate-[reveal-glow-rotate_0.3s_ease-in-out_infinite,reveal-blink_0.2s_ease-in-out_infinite]";
          } else if (shouldHighlightCorrect) {
            animationClass = "animate-[reveal-correct-glow_1s_ease-out]";
          }
        }

        // Build button classes
        let buttonStyle = `w-full text-left justify-start whitespace-normal font-bold transition-all duration-300 rounded-md border-2 ${tvModeEnabled ? 'min-h-[5rem]' : ''} `;

        if (isRevealed) {
          if (isCorrect) {
            buttonStyle += tvModeEnabled
              ? "bg-green-600 border-green-400 text-white scale-[1.02] "
              : "bg-emerald-600/90 border-emerald-400 text-white shadow-[0_0_30px_hsl(142_70%_45%/0.6)] scale-[1.02] ";
          } else if (isSelected) {
            buttonStyle += tvModeEnabled
              ? "bg-red-800 border-red-500 text-red-200 opacity-60 "
              : "bg-red-800/80 border-red-500 text-red-200 opacity-60 ";
          } else {
            buttonStyle += tvModeEnabled
              ? "bg-gray-800 border-gray-600 text-gray-500 opacity-40 "
              : "bg-secondary/40 border-border/30 text-muted-foreground/50 opacity-40 ";
          }
        } else if (isRevealing) {
          buttonStyle += tvModeEnabled
            ? "bg-gray-700 border-yellow-500 text-white "
            : "bg-secondary/60 border-primary/50 text-foreground ";
        } else if (isSelected) {
          buttonStyle += tvModeEnabled
            ? "bg-yellow-600 border-yellow-400 text-black ring-2 ring-yellow-300 "
            : "bg-primary/30 border-primary text-foreground ring-2 ring-primary/50 ";
        } else {
          buttonStyle += tvModeEnabled
            ? "bg-gray-800 border-yellow-500/50 text-white hover:bg-gray-700 hover:border-yellow-400 "
            : "bg-secondary/50 border-border/40 text-foreground hover:bg-secondary/70 hover:border-primary/50 ";
        }

        return (
          <motion.div
            key={index}
            className={animationClass}
            animate={shouldHighlightCorrect ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Button
              onClick={() => onSelect(index)}
              disabled={disabled}
              variant="ghost"
              className={`${buttonStyle} h-auto min-h-[4rem] py-2 px-3`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="font-black text-xl sm:text-2xl flex-shrink-0 w-10">
                  {String.fromCharCode(65 + index)}.
                </span>
                <span className="flex-1 text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
                  {option}
                </span>
              </div>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
};
