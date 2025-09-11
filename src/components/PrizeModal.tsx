import { Gift, PenTool, CheckCircle, Award, Trophy, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GAME_CONSTANTS } from "@/constants/game";

interface PrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  questionsAnswered: number;
}

const prizeTable = [
  { answers: "Participation", prize: "Complimentary Pen", icon: <PenTool className="h-5 w-5 text-gray-400" />, key: "participation" },
  { answers: "7 Questions Correct", prize: "₹100 or equivalent", icon: <CheckCircle className="h-5 w-5 text-green-500" />, key: "q7" },
  { answers: "8 Questions Correct", prize: "₹150 or equivalent", icon: <Award className="h-5 w-5 text-blue-500" />, key: "q8" },
  { answers: "9 Questions Correct", prize: "₹200 or equivalent", icon: <Trophy className="h-5 w-5 text-yellow-500" />, key: "q9" },
  { answers: `> ${GAME_CONSTANTS.DEFAULT_TARGET_SCORE} score at the end of the Quiz`, prize: "Quiz Vijetha Title", icon: <Crown className="h-5 w-5 text-biblical-gold" />, key: "title" },
];

export function PrizeModal({ isOpen, onClose, score, questionsAnswered }: PrizeModalProps) {
  // Determine which prize the player gets
  let earnedPrizeKey = "participation";

  if (questionsAnswered >= 10) earnedPrizeKey = "q10";
  else if (questionsAnswered === 9) earnedPrizeKey = "q9";
  else if (questionsAnswered === 8) earnedPrizeKey = "q8";

  if (score >= GAME_CONSTANTS.DEFAULT_TARGET_SCORE) {
    earnedPrizeKey = "title"; // overrides others if title achieved
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
            <Gift className="h-6 w-6 text-biblical-gold" />
            Prize Structure
          </DialogTitle>
        </DialogHeader>
        
        <div className="glass-card rounded-xl p-6">
          <div className="space-y-4">
            {prizeTable.map((item) => {
              const isEarned = item.key === earnedPrizeKey;
              return (
                <div 
                  key={item.key} 
                  className={`flex justify-between items-center p-4 rounded-lg border 
                    ${isEarned 
                      ? "bg-biblical-gold/20 border-biblical-gold shadow-lg scale-[1.02]" 
                      : "bg-gradient-subtle border-white/10"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className={`font-medium text-lg ${isEarned ? "text-biblical-gold" : ""}`}>
                      {item.answers}
                    </span>
                  </div>
                  <span className={`font-semibold text-lg flex items-center gap-2 ${isEarned ? "text-biblical-gold" : "text-biblical-muted"}`}>
                    {item.prize}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
