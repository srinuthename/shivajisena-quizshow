import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy,
  Crown,
  Medal,
  Users,
  Zap,
  Heart,
} from "lucide-react";
import { Team } from "@/types/quiz";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { TeamStreakBadge } from "./TeamStreakBadge";
import { useTranslation } from "@/hooks/useTranslation";

interface LeaderboardProps {
  teams: Team[];
  scores: number[];
  currentTeamIndex: number;
  scoreChanges: Map<number, number>;
  onScoreChange?: (teamIndex: number, newScore: number) => void;
  rapidFireUsed?: boolean[];
  rapidFireActiveTeam?: number | null;
  teamStreaks?: number[];
  teamLifelines?: number[];
  fixedLeaderboard?: boolean;
}

type RankedTeam = Team & {
  score: number;
  originalIndex: number;
  rank: number;
};

const getPositionIcon = (rank: number, highestScore: number, teamScore: number) => {
  if (teamScore === highestScore && highestScore > 0) {
    return <Crown className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]" />;
  }
  if (rank <= 2) {
    return <Medal className="h-6 w-6 text-slate-300 drop-shadow-[0_0_6px_rgba(148,163,184,0.4)]" />;
  }
  return (
    <span className="w-6 h-6 flex items-center justify-center text-lg font-black text-muted-foreground/60">
      {rank + 1}
    </span>
  );
};

export const Leaderboard = ({
  teams,
  scores,
  currentTeamIndex,
  scoreChanges,
  onScoreChange,
  rapidFireUsed = [],
  rapidFireActiveTeam,
  teamStreaks = [],
  teamLifelines = [],
  fixedLeaderboard = false,
}: LeaderboardProps) => {
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const { t } = useTranslation();

  const rankedTeams: RankedTeam[] = useMemo(() => {
    return teams
      .map((team, i) => ({
        ...team,
        score: scores[i] ?? 0,
        originalIndex: i,
      }))
      .sort((a, b) =>
        b.score === a.score ? a.originalIndex - b.originalIndex : b.score - a.score
      )
      .map((team, index, arr) => {
        const firstSameScoreIndex = arr.findIndex(
          (t) => t.score === team.score
        );
        return { ...team, rank: firstSameScoreIndex };
      });
  }, [teams, scores]);

  const highestScore = Math.max(...rankedTeams.map(t => t.score), 0);

  const displayTeams = fixedLeaderboard 
    ? [...rankedTeams].sort((a, b) => a.originalIndex - b.originalIndex)
    : rankedTeams;

  const handleScoreClick = (teamIndex: number, currentScore: number) => {
    if (onScoreChange) {
      setEditingTeamIndex(teamIndex);
      setEditValue(currentScore.toString());
    }
  };

  const handleScoreBlur = () => {
    if (editingTeamIndex !== null && onScoreChange) {
      const newScore = Number.isFinite(+editValue) ? +editValue : 0;
      onScoreChange(editingTeamIndex, newScore);
    }
    setEditingTeamIndex(null);
  };

  const handleScoreKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScoreBlur();
    } else if (e.key === "Escape") {
      setEditingTeamIndex(null);
    }
  };

  return (
    <Card className="h-fit leaderboard-glossy border-border/30 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/20">
        <CardTitle className="flex items-center gap-3">
          <div className="relative">
            <Trophy className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]" />
          </div>
          <span className="text-xl font-black text-foreground tracking-wide">
            {t.leaderboard}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 pt-3">
        {displayTeams.map((team) => {
          const isActiveTeam = team.originalIndex === currentTeamIndex;
          const scoreChange = scoreChanges.get(team.originalIndex);
          const isEditing = editingTeamIndex === team.originalIndex;

          return (
            <motion.div
              key={team.id}
              layout={!fixedLeaderboard}
              animate={{ scale: isActiveTeam ? 1.01 : 1 }}
              transition={{ duration: 0.2 }}
              className={`relative flex items-center justify-between p-4 rounded-xl overflow-hidden transition-all duration-300 ${
                isActiveTeam
                  ? "leaderboard-gold ring-2 ring-primary/50 ring-offset-1 ring-offset-background"
                  : "leaderboard-row-emboss"
              }`}
            >
              {/* Shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />

              <AnimatePresence>
                {scoreChange !== undefined && scoreChange !== 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 rounded-xl pointer-events-none ${
                      scoreChange > 0 ? "animate-flash-correct" : "animate-flash-wrong"
                    }`}
                  />
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3 flex-1 relative z-10">
                {getPositionIcon(team.rank, highestScore, team.score)}

                <div className="relative">
                  <Avatar className="h-11 w-11 border-2 border-border/30 shadow-lg ring-1 ring-white/10">
                    {team.avatar && <AvatarImage src={team.avatar} alt={team.name} />}
                    <AvatarFallback className="bg-muted text-foreground">
                      <Users className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <TeamStreakBadge streak={teamStreaks[team.originalIndex] || 0} size="sm" />
                </div>

                <div className="flex flex-col gap-1">
                  {(team.members?.length ? team.members : [team.name]).map(
                    (label, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-muted/50 border-border/50 text-foreground shadow-sm"
                      >
                        {label.trim()}
                      </Badge>
                    )
                  )}
                </div>

                {/* Lifelines */}
                {teamLifelines[team.originalIndex] !== undefined && teamLifelines[team.originalIndex] > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/15 border border-rose-500/25">
                    <Heart className="h-3 w-3 text-rose-400 fill-rose-400" />
                    <span className="text-xs font-bold text-rose-300">{teamLifelines[team.originalIndex]}</span>
                  </div>
                )}

                {/* Powerplay */}
                <div className="ml-2">
                  {rapidFireActiveTeam === team.originalIndex ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.6)]">
                      <Zap className="h-4 w-4" />
                      <span className="text-xs font-bold">{t.powerplay.toUpperCase()}</span>
                    </div>
                  ) : rapidFireUsed[team.originalIndex] ? (
                    <Zap className="h-3 w-3 opacity-40" />
                  ) : (
                    <Zap className="h-3 w-3 text-orange-500" />
                  )}
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-2">
                {isEditing ? (
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleScoreBlur}
                    onKeyDown={handleScoreKeyDown}
                    autoFocus
                    className="w-24 text-2xl h-12 text-center font-black bg-background/80 border-primary"
                  />
                ) : (
                  <span 
                    onClick={() => handleScoreClick(team.originalIndex, team.score)}
                    className={`font-black text-3xl min-w-[60px] text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] ${
                      onScoreChange ? 'cursor-pointer hover:text-primary transition-colors' : ''
                    }`}
                  >
                    {team.score}
                  </span>
                )}

                <AnimatePresence>
                  {scoreChange !== undefined && scoreChange !== 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -30, scale: 1.2 }}
                      exit={{ opacity: 0, y: -50, scale: 0.8 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={`absolute -top-2 right-0 font-bold text-lg px-2 py-1 rounded-lg backdrop-blur-sm ${
                        scoreChange > 0
                          ? "text-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                          : "text-red-400 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                      }`}
                    >
                      {scoreChange > 0 ? `+${scoreChange}` : scoreChange}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
};
