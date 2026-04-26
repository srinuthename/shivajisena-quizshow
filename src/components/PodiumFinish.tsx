import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Sparkles, Medal, Users, Star, Zap } from "lucide-react";
import { Team, QuizUserStats } from "@/types/quiz";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Userboard } from "./Userboard";
import { LeaderboardEntry } from "./LiveLeaderboard";
import { ViewersPodiumDisplay } from "./ViewersPodiumDisplay";
import { TeamStreakBadge } from "./TeamStreakBadge";
import { clearAllQuizData } from "@/lib/gameStateManager";
import { endActiveSession, getActiveSession } from "@/lib/quizActiveSession";
import { QuizSessionTeamResult, QuizSessionViewerResult } from "@/types/quiz";
import { useTranslation } from "@/hooks/useTranslation";
import confetti from "canvas-confetti";

interface PodiumFinishProps {
  teams: Team[];
  scores: number[];
  onClose: () => void;
  onCelebrate?: () => void;
  userStats?: QuizUserStats[];
  viewerLeaderboard?: LeaderboardEntry[];
  teamStreaks?: number[];
  hideViewersStage?: boolean; // When true, skip viewers stage (offline mode)
}

export const PodiumFinish = ({
  teams,
  scores,
  onClose,
  onCelebrate,
  userStats = [],
  viewerLeaderboard = [],
  teamStreaks = [],
  hideViewersStage = false,
}: PodiumFinishProps) => {
  const { t } = useTranslation();
  const [showPodium, setShowPodium] = useState(false);
  const [stage, setStage] = useState<'teams' | 'viewers'>('teams');
  const [sparklePositions, setSparklePositions] = useState<
    Array<{ x: number; y: number }>
  >([]);

  const sortedTeams = teams
    .map((team, index) => ({ ...team, score: scores[index], originalIndex: index }))
    .sort((a, b) => b.score - a.score);

  const getRank = (teamIndex: number): number => {
    const team = sortedTeams[teamIndex];
    const higher = sortedTeams.filter((t) => t.score > team.score).length;
    return higher + 1;
  };

  const winners = sortedTeams.filter((_, idx) => getRank(idx) === 1);
  const isMultipleWinners = winners.length > 1;

  const buildPodiumOrder = () => {
    const podiumItems: Array<{
      team: typeof sortedTeams[0];
      position: number;
      height: string;
      delay: number;
      rank: number;
    }> = [];

    const rank1Teams = sortedTeams.filter((_, idx) => getRank(idx) === 1);
    const rank2Teams = sortedTeams.filter((_, idx) => getRank(idx) === 2);
    const rank3Teams = sortedTeams.filter((_, idx) => getRank(idx) === 3);

    rank1Teams.forEach((team, i) => {
      podiumItems.push({ team, position: 1, height: "h-36", delay: i * 0.2, rank: 1 });
    });

    rank2Teams.forEach((team, i) => {
      podiumItems.push({ team, position: 2, height: "h-24", delay: 0.5 + i * 0.2, rank: 2 });
    });

    rank3Teams.forEach((team, i) => {
      podiumItems.push({ team, position: 3, height: "h-20", delay: 1 + i * 0.2, rank: 3 });
    });

    return podiumItems.slice(0, 4);
  };

  const podiumOrder = buildPodiumOrder();

  useEffect(() => {
    const positions = Array.from({ length: 24 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setSparklePositions(positions);

    setTimeout(() => setShowPodium(true), 400);

    setTimeout(() => {
      const duration = 4000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({ particleCount: 2, angle: 60, spread: 50, origin: { x: 0 } });
        confetti({ particleCount: 2, angle: 120, spread: 50, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }, 1200);
  }, []);

  const getPositionIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-12 w-12 text-yellow-400 drop-shadow-[0_0_16px_rgba(250,204,21,0.8)]" />;
      case 2:
        return <Medal className="h-9 w-9 text-gray-300 drop-shadow-lg" />;
      case 3:
        return <Medal className="h-7 w-7 text-amber-600 drop-shadow-lg" />;
      default:
        return <Medal className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-500 via-amber-400 to-yellow-600";
      case 2:
        return "from-gray-400 via-gray-300 to-gray-500";
      case 3:
        return "from-amber-700 via-amber-600 to-amber-800";
      default:
        return "from-muted to-muted";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      <div className="absolute inset-0 bg-background/50" />

      {sparklePositions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
        >
          <Sparkles className="h-3 w-3 text-primary" />
        </motion.div>
      ))}

      <div className="relative text-center max-w-5xl mx-auto px-6">
        {stage === 'teams' && (
          <AnimatePresence>
            {showPodium && (
              <motion.div className="mb-10">
                <h2 className="text-2xl font-bold text-muted-foreground mb-1">
                  {isMultipleWinners ? t.champions : t.champion}
                </h2>
                <div className="text-4xl md:text-5xl font-black text-primary">
                  {isMultipleWinners ? winners.map((w) => w.name).join(" & ") : sortedTeams[0]?.name}
                </div>
                <div className="text-3xl font-bold text-foreground mt-3">
                  {sortedTeams[0]?.score} {t.points}
                  {isMultipleWinners && <span className="text-xl ml-2 text-muted-foreground">({t.tied})</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {stage === 'viewers' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <h2 className="text-2xl font-bold text-muted-foreground mb-1">{t.viewersLeaderboard}</h2>
            <div className="text-4xl md:text-5xl font-black text-primary">{t.viewers}</div>
          </motion.div>
        )}

        {stage === 'teams' && (
          <>
            <div className="flex items-end justify-center gap-3 mb-8">
              {podiumOrder.map(({ team, height, delay, rank }, index) => (
                <motion.div
                  key={team?.id || index}
                  initial={{ y: 150, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: delay + 1, type: "spring", bounce: 0.3 }}
                  className="flex flex-col items-center"
                >
                  <div className="mb-3 flex flex-col items-center gap-2">
                    {getPositionIcon(rank)}
                    <div className="relative">
                      <Avatar className={`${rank === 1 ? "h-16 w-16" : rank === 2 ? "h-12 w-12" : "h-10 w-10"} border-4 border-white shadow-xl`}>
                        {team?.avatar && <AvatarImage src={team.avatar} alt={team?.name} />}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl font-bold">
                          <Users className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      {team && <TeamStreakBadge streak={teamStreaks[team.originalIndex] || 0} size="md" />}
                    </div>
                  </div>
                  <div className="text-center mb-3">
                    <div className="text-lg font-bold text-foreground">{team?.name}</div>
                    <div className="text-base text-muted-foreground">{team?.score} pts</div>
                  </div>
                  <motion.div className={`w-24 md:w-32 ${height} bg-gradient-to-b ${getPodiumColor(rank)} rounded-t-lg shadow-2xl flex items-center justify-center`}>
                    <span className="text-3xl font-black text-white drop-shadow-lg">{rank}</span>
                  </motion.div>
                </motion.div>
              ))}
            </div>

            <div className="bg-card/60 rounded-2xl p-4 backdrop-blur-sm border border-border/30 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4" />
                <span className="font-semibold">{t.teamLeaderboard}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {sortedTeams.map((team, idx) => {
                  const rank = getRank(idx);
                  return (
                    <div key={team.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}</span>
                        <span className="font-bold">{team.name}</span>
                      </div>
                      <span className="text-lg font-bold text-primary">{team.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {stage === 'viewers' && (
          <div className="bg-card/60 rounded-2xl p-4 backdrop-blur-sm border border-border/30 mb-6">
            {viewerLeaderboard.length > 0 ? (
              <ViewersPodiumDisplay entries={viewerLeaderboard} />
            ) : userStats.length > 0 ? (
              <Userboard userStats={userStats} />
            ) : (
              <div className="text-center text-muted-foreground py-8">{t.noViewerData}</div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-center gap-3">
          <Button
            onClick={() => {
              onCelebrate?.();
              confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
            }}
            className="text-base px-6 py-4 rounded-2xl bg-primary/90"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {t.celebrate}
          </Button>
          <Button
            onClick={async () => {
              // Skip viewers stage if hideViewersStage is true (offline mode)
              if (stage === 'teams' && !hideViewersStage) {
                setStage('viewers');
                return;
              }

              // End the active session
              const sessionId = getActiveSession()?.sessionId;
              
              if (sessionId) {
                endActiveSession();
              }

              // Clear all quiz-related localStorage data
              clearAllQuizData();

              // Call the onClose callback
              onClose();

              // Try to close the window, but if that fails (scripts can't close windows they didn't open),
              // navigate back to admin page instead
              try {
                window.close();
              } catch {
                // Fallback: navigate to admin
              }
              // If window.close() didn't work, user stays on page - onClose already handled cleanup
            }}
            className="text-base px-6 py-4 rounded-2xl"
          >
            {stage === 'teams' && !hideViewersStage ? t.viewersLeaderboard : t.closeGame}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
