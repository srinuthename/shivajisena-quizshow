import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Crown, Medal, Sparkles, Users, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFinalLeaderboardSnapshot, FinalTeamLeaderboardEntry } from "@/lib/finalLeaderboardSnapshot";
import confetti from "canvas-confetti";

const normalizeDirectionalTeamName = (name: string): string => {
  const raw = String(name || "").trim();
  const key = raw.replace(/\s+/g, "").toLowerCase();
  const map: Record<string, string> = {
    "#east": "#East",
    "east": "#East",
    "#west": "#West",
    "west": "#West",
    "#north": "#North",
    "north": "#North",
    "#south": "#South",
    "south": "#South",
  };
  return map[key] || raw;
};

const getPodiumColor = (rank: number) => {
  switch (rank) {
    case 1: return "from-yellow-500 via-amber-400 to-yellow-600";
    case 2: return "from-gray-400 via-gray-300 to-gray-500";
    case 3: return "from-amber-700 via-amber-600 to-amber-800";
    default: return "from-muted to-muted";
  }
};

const getPodiumHeight = (rank: number) => {
  switch (rank) {
    case 1: return "h-44";
    case 2: return "h-32";
    case 3: return "h-24";
    default: return "h-16";
  }
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-10 w-10 text-yellow-400 drop-shadow-[0_0_16px_rgba(250,204,21,0.8)]" />;
  if (rank === 2) return <Medal className="h-8 w-8 text-gray-300 drop-shadow-lg" />;
  if (rank === 3) return <Medal className="h-7 w-7 text-amber-600 drop-shadow-lg" />;
  return <Star className="h-5 w-5 text-muted-foreground" />;
};

const getRankEmoji = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

const TeamPodiumCard = ({ team, index }: { team: FinalTeamLeaderboardEntry; index: number }) => {
  const rank = team.rank;

  return (
    <motion.div
      initial={{ y: 200, opacity: 0, scale: 0.5 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{
        delay: 0.8 + index * 0.3,
        type: "spring",
        stiffness: 120,
        damping: 14,
      }}
      className="flex flex-col items-center"
    >
      {/* Rank icon */}
      <motion.div
        animate={rank === 1 ? { rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="mb-2"
      >
        {getRankIcon(rank)}
      </motion.div>

      {/* Team avatar circle */}
      <motion.div
        className={`
          relative rounded-full p-1 mb-2
          ${rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500" :
            rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-400" :
              rank === 3 ? "bg-gradient-to-br from-amber-500 to-amber-700" :
                "bg-gradient-to-br from-primary/50 to-primary"}
        `}
        animate={rank === 1 ? { boxShadow: ["0 0 20px rgba(234,179,8,0.4)", "0 0 40px rgba(234,179,8,0.7)", "0 0 20px rgba(234,179,8,0.4)"] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className={`
          ${rank === 1 ? "h-20 w-20" : rank === 2 ? "h-16 w-16" : "h-14 w-14"}
          rounded-full bg-card border-2 border-background
          flex items-center justify-center
        `}>
          <Users className={`${rank === 1 ? "h-8 w-8" : "h-6 w-6"} text-primary`} />
        </div>
      </motion.div>

      {/* Team name */}
      <h3 className={`font-bold text-foreground mb-1 ${rank === 1 ? "text-xl" : "text-base"}`}>
        {team.teamName}
      </h3>

      {/* Score with animated counter feel */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.2 + index * 0.3, type: "spring" }}
        className={`text-lg font-black mb-3 ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-500" : "text-muted-foreground"}`}
      >
        {team.score} pts
      </motion.div>

      {/* Podium bar */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "auto" }}
        transition={{ delay: 1.5 + index * 0.2, duration: 0.8, type: "spring" }}
        className={`
          w-28 md:w-36 ${getPodiumHeight(rank)}
          bg-gradient-to-b ${getPodiumColor(rank)}
          rounded-t-xl shadow-2xl
          flex items-center justify-center
          relative overflow-hidden
        `}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave opacity-50" />
        <span className="text-4xl font-black text-white drop-shadow-lg relative z-10">{rank}</span>
      </motion.div>
    </motion.div>
  );
};

const FinalTeamLeaderboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("gameId");
  const snapshot = useMemo(() => getFinalLeaderboardSnapshot(), []);
  const teams = useMemo(() => {
    const rawTeams = snapshot?.teams || [];
    return [...rawTeams]
      .sort((a, b) => b.score - a.score)
      .map((team, _index, arr) => {
        const firstSameScoreIndex = arr.findIndex((t) => t.score === team.score);
        return { ...team, teamName: normalizeDirectionalTeamName(team.teamName), rank: firstSameScoreIndex + 1 };
      });
  }, [snapshot]);
  const [sparklePositions] = useState(() =>
    Array.from({ length: 30 }, () => ({ x: Math.random() * 100, y: Math.random() * 100 }))
  );

  // Confetti on mount
  useEffect(() => {
    if (teams.length === 0) return;
    const timer = setTimeout(() => {
      const duration = 3500;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }, 1500);
    return () => clearTimeout(timer);
  }, [teams.length]);

  const goBackToQuiz = () => {
    if (gameId) {
      navigate(`/quiz?gameId=${encodeURIComponent(gameId)}`);
      return;
    }
    navigate("/quiz");
  };

  // Sort for podium display: show top 3-4 in podium order (2nd, 1st, 3rd)
  const podiumTeams = useMemo(() => {
    const sorted = [...teams].sort((a, b) => a.rank - b.rank).slice(0, 4);
    if (sorted.length >= 3) {
      // Reorder: 2nd, 1st, 3rd, (4th if exists)
      const reordered = [sorted[1], sorted[0], sorted[2]];
      if (sorted[3]) reordered.push(sorted[3]);
      return reordered;
    }
    return sorted;
  }, [teams]);

  const topRankTeams = teams.filter((t) => t.rank === 1);
  const winner = topRankTeams[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 relative overflow-hidden">
      {/* Floating sparkles */}
      {sparklePositions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none z-0"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          animate={{ opacity: [0, 0.7, 0], scale: [0, 1, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.15 }}
        >
          <Sparkles className="h-3 w-3 text-primary/40" />
        </motion.div>
      ))}

      {/* Radial glow behind podium */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 p-4 md:p-8 mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.h1
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-3xl md:text-4xl font-black"
          >
            <Trophy className="h-8 w-8 text-primary animate-energy-pulse" />
            <span className="animate-text-shimmer">Final Team Standings</span>
          </motion.h1>
          <Button variant="outline" onClick={goBackToQuiz} className="border-border/50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {teams.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground bg-card/60 backdrop-blur-sm border-border/30">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            No final team leaderboard snapshot available yet.
          </Card>
        ) : (
          <>
            {/* Champion Announcement */}
            {winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-center mb-8"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-wrap items-center justify-center gap-3 text-2xl md:text-3xl font-black"
                >
                  <span className="text-muted-foreground">🏆 {topRankTeams.length > 1 ? "Champions" : "Champion"}</span>
                  <span className="text-primary animate-text-shimmer">
                    {topRankTeams.length > 1 ? topRankTeams.map((t) => t.teamName).join(" & ") : winner.teamName}
                  </span>
                  <span className="text-foreground">{winner.score} points</span>
                </motion.div>
              </motion.div>
            )}

            {/* Podium */}
            <div className="flex items-end justify-center gap-4 md:gap-6 mb-10">
              {podiumTeams.map((team, idx) => (
                <TeamPodiumCard key={team.teamId} team={team} index={idx} />
              ))}
            </div>

            {/* Full Standings Table */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5 }}
            >
              <Card className="bg-card/60 backdrop-blur-sm border-border/30 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">All Teams</span>
                </div>
                <div className="space-y-2">
                  {teams.map((team, i) => (
                    <motion.div
                      key={team.teamId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 2.7 + i * 0.1 }}
                      className="flex items-center justify-between rounded-xl border border-border/40 p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl w-8 text-center">{getRankEmoji(team.rank)}</span>
                        <span className="font-bold text-foreground">{team.teamName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Score bar */}
                        <div className="hidden md:block w-32 h-3 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${teams[0]?.score ? (team.score / teams[0].score) * 100 : 0}%` }}
                            transition={{ delay: 3 + i * 0.1, duration: 0.8 }}
                            className={`h-full rounded-full bg-gradient-to-r ${getPodiumColor(team.rank)}`}
                          />
                        </div>
                        <span className="text-lg font-black text-primary min-w-[60px] text-right">{team.score}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default FinalTeamLeaderboard;
