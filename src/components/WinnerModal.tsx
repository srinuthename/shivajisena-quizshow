import { Button } from "@/components/ui/button";
import { Trophy, Gift, Star } from "lucide-react";
import { Confetti } from "./Confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  quizTitle: string;
  score: number;
  correctAnswers: number;
}

const prizeTable = [
  { answers: "Participation", prize: "Complimentary pen" },
  { answers: "8 correct answers", prize: "₹100 or equivalent" },
  { answers: "9 correct answers", prize: "₹150 or equivalent" },
  { answers: "10 correct answers", prize: "₹200 or equivalent" },
  { answers: "11 correct answers", prize: "Quiz Vijetha Title" },
];

export function WinnerModal({ 
  isOpen, 
  onClose, 
  onContinue, 
  quizTitle, 
  score, 
  correctAnswers 
}: WinnerModalProps) {
  return (
    <>
      {isOpen && <Confetti isActive={true} />}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="text-center">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-biblical-gold to-biblical-crown opacity-50 rounded-full animate-pulse" />
              <div className="text-6xl relative z-10 animate-biblical-glow">🏆</div>
            </div>
            
            <DialogTitle className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-biblical-gold to-biblical-crown bg-clip-text text-transparent">
              Quiz Vijetha!
            </DialogTitle>
            
            <p className="text-xl text-biblical-text mb-6">
              Congratulations! on your achievement.
            </p>
          </DialogHeader>
          
          {/* Current Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-5 w-5 text-timer-warning" />
                <span className="text-sm text-muted-foreground">Current Score</span>
              </div>
              <span className="text-2xl font-bold text-primary">{score}</span>
            </div>
            
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-accent" />
                <span className="text-sm text-muted-foreground">Correct Answers</span>
              </div>
              <span className="text-2xl font-bold text-secondary">{correctAnswers}</span>
            </div>
          </div>
          
          {/* Prize Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-biblical-gold" />
              Prize Structure
            </h3>
            <div className="glass-card rounded-xl p-4">
              <div className="space-y-3">
                {prizeTable.map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                      (index === 0) || // Participation prize for everyone
                      (index === 1 && correctAnswers >= 8) ||
                      (index === 2 && correctAnswers >= 9) ||
                      (index === 3 && correctAnswers >= 10) ||
                      (index === 4 && correctAnswers >= 11)
                        ? 'bg-biblical-gold/20 border border-biblical-gold/30' 
                        : 'bg-muted/20'
                    }`}
                  >
                    <span className="font-medium">{item.answers}</span>
                    <span className="text-biblical-gold font-semibold">{item.prize}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              OK
            </Button>
            <Button
              onClick={onContinue}
              className="flex-1 gradient-primary text-primary-foreground hover:shadow-hover"
            >
              Continue Playing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}