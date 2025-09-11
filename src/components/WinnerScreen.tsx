import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star, Sparkles, Crown } from "lucide-react";
import { Confetti } from "./Confetti";
import { PrizeModal } from "./PrizeModal";

interface WinnerScreenProps {
  score: number;
  questionsAnswered: number;
  onClose: () => void;
}

export function WinnerScreen({ score, questionsAnswered, onClose }: WinnerScreenProps) {
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  return (
    <>
      <Confetti isActive={true} />
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-12 max-w-2xl w-full text-center animate-slide-up">
          {/* Achievement Icon */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-biblical-gold to-biblical-crown opacity-50 rounded-full animate-pulse" />
            <Crown className="h-20 w-20 text-biblical-gold relative z-10 animate-bounce" />
          </div>

          {/* Winner Text */}
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-biblical-gold to-biblical-crown bg-clip-text text-transparent animate-pulse-biblical">
            Kudos!
          </h1>

          {/* Congratulations */}
          <p className="text-xl text-biblical-text mb-2">
            on your wonderful <span className="font-semibold">participation</span>!
          </p>
          <p className="text-lg text-biblical-muted mb-8">
            Don’t forget to collect your Prize 🎁
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-5 w-5 text-timer-warning" />
                <span className="text-sm text-muted-foreground">Final Score</span>
              </div>
              <span className="text-3xl font-bold text-primary">{score}</span>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <span className="text-sm text-muted-foreground">Questions Correct</span>
              </div>
              <span className="text-3xl font-bold text-secondary">{questionsAnswered}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onClose}
              size="lg"
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              Close
            </Button>

            <Button
              onClick={() => setShowPrizeModal(true)}
              size="lg"
              variant="outline"
              className="border-biblical-gold text-biblical-gold hover:bg-biblical-gold/10"
            >
              View Prize
            </Button>
          </div>
        </div>
      </div>

      {/* Prize Modal */}
      <PrizeModal
        isOpen={showPrizeModal}
        onClose={() => setShowPrizeModal(false)}
        score={score}
        questionsAnswered={questionsAnswered}
      />
    </>
  );
}
