import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Medal, Users, Flame, Zap, Star, TrendingUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Team } from "@/types/quiz";
import { LeaderboardEntry } from "./LiveLeaderboard";
import { TeamSupporterCounts } from "./TeamSupportBadge";
import { AnimatedScore } from "./AnimatedScore";
import eastlogo from "@/assets/teamlogos/eastlogo.png";
import westlogo from "@/assets/teamlogos/westlogo.png";
import northlogo from "@/assets/teamlogos/northlogo.png";
import southlogo from "@/assets/teamlogos/southlogo.png";

interface HalftimeShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  scores: number[];
  viewerLeaderboard: LeaderboardEntry[];
  teamSupporterCounts?: TeamSupporterCounts;
  totalQuestions: number;
  questionsPlayed: number;
  teamStreaks?: number[];
}

const getFallbackLogo = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("east")) return eastlogo;
  if (n.includes("west")) return westlogo;
  if (n.includes("north")) return northlogo;
  if (n.includes("south")) return southlogo;
  return undefined;
};

const StatCard = ({ icon: Icon, label, value, color, delay }: { icon: any; label: string; value: string | number; color: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 300, damping: 25 }}
    className="leaderboard-row-emboss rounded-xl p-4 flex flex-col items-center gap-2"
  >
    <Icon className={`w-6 h-6 ${color}`} />
    <span className="text-2xl font-black text-foreground">{value}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </motion.div>
);

export const HalftimeShowModal = memo(({
  open, onOpenChange, teams, scores, viewerLeaderboard,
  teamSupporterCounts, totalQuestions, questionsPlayed, teamStreaks = [],
}: HalftimeShowModalProps) => {
  const { t } = useTranslation();
  const topViewers = useMemo(() =>
    [...viewerLeaderboard].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5),
    [viewerLeaderboard]
  );

  const rankedTeams = useMemo(() =>
    teams.map((t, i) => ({ ...t, score: scores[i] ?? 0, idx: i }))
      .sort((a, b) => b.score - a.score),
    [teams, scores]
  );

  const totalViewers = viewerLeaderboard.length;
  const totalResponses = viewerLeaderboard.reduce((s, v) => s + v.totalResponses, 0);
  const totalSupporters = teamSupporterCounts
    ? teamSupporterCounts.east + teamSupporterCounts.west + teamSupporterCounts.north + teamSupporterCounts.south
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 w-screen h-screen max-w-none bg-gradient-to-br from-card via-card/95 to-muted/20 border-border backdrop-blur-md overflow-auto translate-x-0 translate-y-0" aria-describedby={undefined}>
        <VisuallyHidden><DialogTitle>{t.halfTime}</DialogTitle></VisuallyHidden>
        {/* Decorative overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-yellow-500/5 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="relative z-10 max-w-5xl mx-auto py-6 space-y-8">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-center space-y-2"
          >
            <div className="flex items-center justify-center gap-3">
              <Star className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]" />
              <h1 className="text-4xl font-black text-foreground tracking-tight">{t.halfTime}</h1>
              <Star className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]" />
            </div>
            <p className="text-muted-foreground text-lg">
              {questionsPlayed} {t.of} {totalQuestions} {t.questionsPlayed}
            </p>
          </motion.div>

          {/* Engagement stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Users} label={t.activeViewers} value={totalViewers} color="text-cyan-400" delay={0.1} />
            <StatCard icon={Zap} label={t.totalResponses} value={totalResponses} color="text-yellow-400" delay={0.2} />
            <StatCard icon={TrendingUp} label={t.teamSupporters} value={totalSupporters} color="text-purple-400" delay={0.3} />
            <StatCard icon={Flame} label={t.questionsLeft} value={totalQuestions - questionsPlayed} color="text-orange-400" delay={0.4} />
          </div>

          {/* Team standings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> {t.teamStandings}
            </h2>
            <div className="space-y-2">
              {rankedTeams.map((team, rank) => {
                const logo = team.avatar || getFallbackLogo(team.name);
                const streak = teamStreaks[team.idx] || 0;
                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + rank * 0.1 }}
                    className={`flex items-center gap-4 p-4 rounded-xl ${rank === 0 ? "leaderboard-gold" : "leaderboard-row-emboss"}`}
                  >
                    <div className="w-8 flex justify-center">
                      {rank === 0 ? <Crown className="w-7 h-7 text-yellow-400" /> :
                       rank === 1 ? <Medal className="w-6 h-6 text-slate-300" /> :
                       rank === 2 ? <Medal className="w-6 h-6 text-amber-500" /> :
                       <span className="text-lg font-bold text-muted-foreground">{rank + 1}</span>}
                    </div>
                    <Avatar className="h-12 w-12 ring-2 ring-border/50">
                      <AvatarImage src={logo} alt={team.name} className="object-contain" />
                      <AvatarFallback className="bg-primary/20 font-bold">{team.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-foreground">{team.name}</p>
                      {team.members && team.members.length > 0 && (
                        <p className="text-xs text-muted-foreground">{team.members.join(", ")}</p>
                      )}
                    </div>
                    {streak >= 2 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-orange-400">{streak}</span>
                      </div>
                    )}
                    <AnimatedScore
                      value={team.score}
                      className="text-3xl font-black text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Top viewers */}
          {topViewers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" /> {t.topViewers}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {topViewers.map((viewer, idx) => (
                  <motion.div
                    key={viewer.odytChannelId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.1 + idx * 0.1 }}
                    className="leaderboard-row-emboss rounded-xl p-3 flex flex-col items-center gap-2 text-center"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                        <AvatarImage
                          src={viewer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewer.odytChannelId}`}
                          alt={viewer.userName}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                        />
                        <AvatarFallback className="text-xs bg-primary/20 font-bold">{viewer.userName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {idx === 0 && <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400" />}
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate max-w-full">{viewer.userName}</p>
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/30">
                      {viewer.totalScore} pts
                    </Badge>
                    <p className="text-[10px] text-muted-foreground">{viewer.correctAnswers}/{viewer.totalResponses} {t.correct.toLowerCase()}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

HalftimeShowModal.displayName = "HalftimeShowModal";
