// Game End Dialog Component
// Extracted from TeamQuiz for better maintainability

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Team } from "@/types/quiz";
import { useTranslation } from "@/hooks/useTranslation";

interface GameEndDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  teamScores: number[];
  onCelebrate: () => void;
}

export const GameEndDialog = ({
  isOpen,
  onClose,
  teams,
  teamScores,
  onCelebrate,
}: GameEndDialogProps) => {
  const { t } = useTranslation();

  const sortedTeams = teams
    .map((team, index) => ({ ...team, score: teamScores[index] }))
    .sort((a, b) => b.score - a.score);

  const winner = sortedTeams[0];

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-3xl text-center">
            🎮 {t.gameEnded}! 🎮
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-lg">
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-6">
          <h3 className="text-2xl font-bold text-center mb-4 text-primary">
            🏆 {t.winner}: {winner?.name} 🏆
          </h3>

          <div className="space-y-3">
            <h4 className="text-xl font-semibold text-center mb-3">
              {t.finalScoreboard}
            </h4>
            {sortedTeams.map((team, rank) => (
              <div
                key={team.id}
                className="flex justify-between items-center p-4 rounded-lg bg-muted text-5xl font-medium"
              >
                <div className="flex items-center gap-3">
                  <span className="text-center">
                    {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}.`}
                  </span>
                  <div className={team.color}>{team.name}</div>
                </div>
                <span>{team.score} {t.pts}</span>
              </div>
            ))}
          </div>
        </div>

        <AlertDialogFooter className="flex gap-2">
          <Button
            onClick={onCelebrate}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:scale-105 transition"
          >
            🎉 {t.celebrate}
          </Button>

          <AlertDialogAction
            onClick={onClose}
            className="flex-1 bg-primary"
          >
            {t.close}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
