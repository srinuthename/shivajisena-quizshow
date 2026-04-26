import { useState, useMemo } from "react";
import { getAppMode } from "@/config/appMode";
import { LeaderboardSparkles } from "./LeaderboardSparkles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatedScore } from "@/components/AnimatedScore";
import eastlogo from "@/assets/teamlogos/eastlogo.png";
import westlogo from "@/assets/teamlogos/westlogo.png";
import northlogo from "@/assets/teamlogos/northlogo.png";
import southlogo from "@/assets/teamlogos/southlogo.png";
import { TeamSupporterCounts } from "./TeamSupportBadge";
import { useTVMode } from "@/hooks/useTVMode";
import { useTranslation } from "@/hooks/useTranslation";

import {
  Trophy,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightCircle,
  ArrowLeftCircle,
  Users,
  Zap,
  Heart,
  Flame,
  Maximize2,
  BarChart3,
  Sparkles,
  Star,
} from "lucide-react";
import { Team } from "@/types/quiz";
import { LeaderboardEntry } from "./LiveLeaderboard";
import { ChatResponse } from "./YouTubeChatResponses";
import { ViewerBoardsTabs } from "./ViewerBoardsTabs";
import { motion, AnimatePresence } from "framer-motion";
import { usePrizeOverlay } from "@/hooks/usePrizeOverlay";
import { useApp } from "@/context/AppContext";

interface LeaderboardWithMaximizeProps {
  teams: Team[];
  scores: number[];
  currentTeamIndex: number;
  scoreChanges: Map<number, number>;
  onScoreChange?: (teamIndex: number, newScore: number) => void;
  rapidFireUsed?: boolean[];
  rapidFireActiveTeam?: number | null;
  teamStreaks?: number[];
  teamLifelines?: number[];
  teamSupporterCounts?: TeamSupporterCounts;
  fixedLeaderboard?: boolean;
  viewerLeaderboard?: LeaderboardEntry[];
  questionResponses?: ChatResponse[];
  isAnswerRevealed?: boolean;
  correctAnswer?: number | null;
  maskResponses?: boolean;
  onShowHalftime?: () => void;
}

type RankedTeam = Team & {
  score: number;
  originalIndex: number;
  rank: number;
  displayOrder: number;
};

const getTeamFallbackLogo = (teamName: string) => {
  const name = teamName.toLowerCase();
  if (name.includes("east")) return eastlogo;
  if (name.includes("west")) return westlogo;
  if (name.includes("north")) return northlogo;
  if (name.includes("south")) return southlogo;
  return undefined;
};

const getDirectionMeta = (teamName: string, tvMode: boolean) => {
  const name = teamName.toLowerCase();
  const iconSize = tvMode ? "h-8 w-8" : "h-5 w-5";

  if (name.includes("east"))
    return {
      icon: <ArrowRightCircle className={`${iconSize} text-direction-east`} />,
      bg: "bg-direction-east-bg",
      border: "border-direction-east",
      text: "text-direction-east",
    };

  if (name.includes("west"))
    return {
      icon: <ArrowLeftCircle className={`${iconSize} text-direction-west`} />,
      bg: "bg-direction-west-bg",
      border: "border-direction-west",
      text: "text-direction-west",
    };

  if (name.includes("north"))
    return {
      icon: <ArrowUpCircle className={`${iconSize} text-direction-north`} />,
      bg: "bg-direction-north-bg",
      border: "border-direction-north",
      text: "text-direction-north",
    };

  if (name.includes("south"))
    return {
      icon: <ArrowDownCircle className={`${iconSize} text-direction-south`} />,
      bg: "bg-direction-south-bg",
      border: "border-direction-south",
      text: "text-direction-south",
    };

  return {
    icon: null,
    bg: "bg-secondary/30",
    border: "border-border",
    text: "text-foreground",
  };
};

const getPositionIcon = (rank: number, highestScore: number, teamScore: number, tvMode: boolean) => {
  const iconSize = tvMode ? "h-10 w-10" : "h-6 w-6";
  const textSize = tvMode ? "text-3xl" : "text-lg";

  // Trophy for team(s) with highest score
  if (teamScore === highestScore && highestScore > 0) {
    return <Trophy className={`${iconSize} text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]`} />;
  }

  // Numbers for all other positions
  return (
    <span className={`${tvMode ? 'w-10 h-10' : 'w-6 h-6'} flex items-center justify-center font-bold ${textSize} text-muted-foreground`}>
      {rank + 1}
    </span>
  );
};

const LeaderboardContent = ({
  rankedTeams,
  currentTeamIndex,
  scoreChanges,
  onScoreChange,
  rapidFireUsed = [],
  rapidFireActiveTeam,
  teamStreaks = [],
  teamLifelines = [],
  teamSupporterCounts,
  isMaximized = false,
  tvMode = false,
  fixedLeaderboard = false,
}: {
  rankedTeams: RankedTeam[];
  currentTeamIndex: number;
  scoreChanges: Map<number, number>;
  onScoreChange?: (teamIndex: number, newScore: number) => void;
  rapidFireUsed?: boolean[];
  rapidFireActiveTeam?: number | null;
  teamStreaks?: number[];
  teamLifelines?: number[];
  teamSupporterCounts?: TeamSupporterCounts;
  isMaximized?: boolean;
  tvMode?: boolean;
  fixedLeaderboard?: boolean;
}) => {
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Get supporter count for a team by name
  const getSupporterCount = (teamName: string): number | null => {
    if (!teamSupporterCounts) return null;
    const name = teamName.toLowerCase();
    if (name.includes("east")) return teamSupporterCounts.east;
    if (name.includes("west")) return teamSupporterCounts.west;
    if (name.includes("north")) return teamSupporterCounts.north;
    if (name.includes("south")) return teamSupporterCounts.south;
    return null;
  };

  const effectiveTV = tvMode || isMaximized;

  // Find highest score for trophy display
  const highestScore = Math.max(...rankedTeams.map(t => t.score), 0);

  // Sort teams for display - if fixed, use original order; otherwise use rank order
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
    <div className={`space-y-${effectiveTV ? '3' : '2'}`}>
      {displayTeams.map((team, displayIdx) => {
        const isActiveTeam = team.originalIndex === currentTeamIndex;
        const scoreChange = scoreChanges.get(team.originalIndex);
        const dir = getDirectionMeta(team.name, effectiveTV);
        const fallbackLogo = getTeamFallbackLogo(team.name);
        const isEditing = editingTeamIndex === team.originalIndex;
        const supporterCount = getSupporterCount(team.name) || 0;

        // Get embossed card style based on state
        const getCardStyle = () => {
          if (isActiveTeam) {
            return "leaderboard-gold ring-2 ring-primary/50 ring-offset-1 ring-offset-background";
          }
          return "leaderboard-row-emboss hover:brightness-110 transition-all duration-300";
        };


        return (
          <motion.div
            key={team.id}
            layout={!tvMode && !fixedLeaderboard}
            initial={false}
            animate={{ scale: isActiveTeam ? 1.01 : 1 }}
            transition={tvMode || fixedLeaderboard ? { duration: 0.1 } : { duration: 0.2 }}
            whileHover={!tvMode ? { scale: 1.015, transition: { duration: 0.2 } } : undefined}
            className={`relative flex items-center justify-between ${effectiveTV ? 'p-3' : 'p-3'
              } rounded-xl ${getCardStyle()} overflow-hidden`}
          >

            {!tvMode && (
              <AnimatePresence>
                {scoreChange !== undefined && scoreChange !== 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 rounded-xl pointer-events-none ${scoreChange > 0
                      ? "animate-flash-correct"
                      : "animate-flash-wrong"
                      }`}
                  />
                )}
              </AnimatePresence>
            )}

            <div className={`flex items-center ${effectiveTV ? 'gap-3' : 'gap-3'} flex-1 relative z-10`}>
              {getPositionIcon(team.rank, highestScore, team.score, effectiveTV)}

              {/* Avatar with Supporter Count Badge Next to it */}
              <div className="flex items-center gap-2">
                <Avatar className={`${effectiveTV ? "h-14 w-14" : "h-11 w-11"} border-2 border-border/50 shadow-lg ring-1 ring-white/10`}>
                  <AvatarImage
                    src={team.avatar || fallbackLogo}
                    alt={team.name}
                    className="object-contain"
                  />
                  <AvatarFallback className={`${dir.bg} ${dir.text} p-1`}>
                    {fallbackLogo ? (
                      <img
                        src={fallbackLogo}
                        alt={team.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Users className={`${effectiveTV ? "h-7 w-7" : "h-5 w-5"}`} />
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Supporter Badge Next to Logo */}
                {supporterCount > 0 && (
                  <div className={`flex items-center gap-1 ${effectiveTV ? 'px-2.5 py-1.5' : 'px-2 py-1'} rounded-full bg-purple-500/15 border border-purple-500/30`}>
                    <Users className={`${effectiveTV ? 'h-4 w-4' : 'h-3 w-3'} text-purple-400`} />
                    <span className={`${effectiveTV ? 'text-sm' : 'text-xs'} font-bold text-purple-300`}>{supporterCount}</span>
                  </div>
                )}
              </div>

              {dir.icon && <div className="ml-1">{dir.icon}</div>}

              <div className="flex flex-col gap-1">
                {(team.members?.length ? team.members : [team.name]).map(
                  (label, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`bg-muted/50 border-border/50 text-foreground shadow-sm ${effectiveTV ? 'text-lg px-4 py-1.5' : ''}`}
                    >
                      {label.trim()}
                    </Badge>
                  )
                )}
              </div>

              {/* Answer Streak Badge - moved inline */}
              {(teamStreaks[team.originalIndex] || 0) >= 2 && (
                <div className={`flex items-center gap-1 ${effectiveTV ? 'px-4 py-2' : 'px-2 py-1'} rounded-full bg-orange-500/15 border border-orange-500/30`}>
                  <Flame className={`${effectiveTV ? 'h-6 w-6' : 'h-3 w-3'} text-orange-500`} />
                  <span className={`${effectiveTV ? 'text-lg' : 'text-xs'} font-bold text-orange-400`}>{teamStreaks[team.originalIndex]}</span>
                </div>
              )}

              {/* Lifelines Badge */}
              {teamLifelines[team.originalIndex] !== undefined && teamLifelines[team.originalIndex] > 0 && (
                <div className={`flex items-center gap-1 ${effectiveTV ? 'px-4 py-2' : 'px-2 py-1'} rounded-full bg-rose-500/15 border border-rose-500/30`}>
                  <Heart className={`${effectiveTV ? 'h-6 w-6' : 'h-3 w-3'} text-rose-500 fill-rose-500`} />
                  <span className={`${effectiveTV ? 'text-lg' : 'text-xs'} font-bold text-rose-400`}>{teamLifelines[team.originalIndex]}</span>
                </div>
              )}

              <div className="ml-2">
                {rapidFireActiveTeam === team.originalIndex ? (
                  <div className={`flex items-center gap-1 ${effectiveTV ? 'px-4 py-2' : 'px-2 py-1'} rounded-full bg-orange-500 text-white ${tvMode ? '' : 'animate-pulse'}`}>
                    <Zap className={`${effectiveTV ? 'h-6 w-6' : 'h-4 w-4'}`} />
                    <span className={`${effectiveTV ? 'text-base' : 'text-xs'} font-bold`}>PP</span>
                  </div>
                ) : rapidFireUsed[team.originalIndex] ? (
                  <Zap className={`${effectiveTV ? 'h-5 w-5' : 'h-3 w-3'} opacity-50`} />
                ) : (
                  <Zap className={`${effectiveTV ? 'h-5 w-5' : 'h-3 w-3'} text-orange-500`} />
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
                  className={`${effectiveTV ? 'w-32 text-4xl h-16' : 'w-24 text-2xl h-12'} text-center font-black bg-background/80 border-primary`}
                />
              ) : (
                <div onClick={() => handleScoreClick(team.originalIndex, team.score)}>
                  <AnimatedScore
                    value={team.score}
                    className={`font-black ${effectiveTV ? 'text-6xl min-w-[100px]' : 'text-3xl min-w-[60px]'} text-center ${onScoreChange ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                  />
                </div>
              )}

              {!tvMode && (
                <AnimatePresence>
                  {scoreChange !== undefined && scoreChange !== 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -30, scale: 1.2 }}
                      exit={{ opacity: 0, y: -50, scale: 0.8 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    className={`absolute -top-2 right-0 font-bold ${effectiveTV ? 'text-xl' : 'text-lg'} px-2 py-1 rounded-lg ${scoreChange > 0
                        ? "text-emerald-400 bg-emerald-500/20"
                        : "text-red-400 bg-red-500/20"
                        }`}
                    >
                      {scoreChange > 0 ? `+${scoreChange}` : scoreChange}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export const LeaderboardWithMaximize = ({
  teams,
  scores,
  currentTeamIndex,
  scoreChanges,
  onScoreChange,
  rapidFireUsed = [],
  rapidFireActiveTeam,
  teamStreaks = [],
  teamLifelines = [],
  teamSupporterCounts,
  fixedLeaderboard = false,
  viewerLeaderboard = [],
  questionResponses = [],
  isAnswerRevealed = false,
  correctAnswer = null,
  maskResponses = false,
  onShowHalftime,
}: LeaderboardWithMaximizeProps) => {
  const { frontendQuizGameId, applicationId } = useApp();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isViewerBoardsOpen, setIsViewerBoardsOpen] = useState(false);
  const { tvModeEnabled } = useTVMode();
  const { t } = useTranslation();
  const isDev = import.meta.env.DEV;
  const isOffline = getAppMode() === "offline";

  const rankedTeams: RankedTeam[] = useMemo(() => {
    return teams
      .map((team, i) => ({
        ...team,
        score: scores[i] ?? 0,
        originalIndex: i,
        displayOrder: i,
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

  const prizeOverlay = usePrizeOverlay({
    enabled: !isOffline && Boolean(frontendQuizGameId && viewerLeaderboard.length > 0),
    applicationId,
    frontendQuizGameId: String(frontendQuizGameId || ""),
    viewers: viewerLeaderboard.map((entry, idx) => ({
      odytChannelId: entry.odytChannelId,
      userName: entry.userName,
      rank: idx + 1,
    })),
    pollMs: 0,
    refreshKey: isAnswerRevealed ? "revealed" : "open",
  });

  const xpLevelByChannel = useMemo(() => {
    const next: Record<string, number> = {};
    for (const entry of viewerLeaderboard) {
      const channelId = String(entry.odytChannelId || "");
      next[channelId] = Number(prizeOverlay.overlayByChannel[channelId]?.properParticipations || 0);
    }
    return next;
  }, [viewerLeaderboard, prizeOverlay.overlayByChannel]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
      <Card className="h-fit bg-card border border-border relative overflow-hidden">

        <CardHeader className={`${tvModeEnabled ? 'pb-4' : 'pb-3'} relative z-10`}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className={`${tvModeEnabled ? 'h-10 w-10' : 'h-6 w-6'} text-yellow-500`} />
              <span className={`${tvModeEnabled ? 'text-3xl' : 'text-xl'} font-black text-foreground`}>
                {t.panelLeaderboard}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsViewerBoardsOpen(true);
                }}
                title="Cumulative Leaderboard"
                className={`${tvModeEnabled ? 'h-10 w-10' : 'h-8 w-8'} hover:bg-primary/20 transition-colors ${isOffline ? 'hidden' : ''}`}
              >
                <BarChart3 className={tvModeEnabled ? 'h-6 w-6' : 'h-4 w-4'} />
              </Button>
              {onShowHalftime && !isOffline ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onShowHalftime}
                  title="Half-time Show"
                  className={`${tvModeEnabled ? 'h-10 w-10' : 'h-8 w-8'} hover:bg-primary/20 transition-colors`}
                >
                  <Star className={tvModeEnabled ? 'h-6 w-6 text-yellow-400' : 'h-4 w-4 text-yellow-400'} />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMaximized(true)}
                title={t.maximizeTeamLeaderboard}
                className={`${tvModeEnabled ? 'h-10 w-10' : 'h-8 w-8'} hover:bg-primary/20 transition-colors`}
              >
                <Maximize2 className={tvModeEnabled ? 'h-6 w-6' : 'h-4 w-4'} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-3">
          <LeaderboardContent
            rankedTeams={rankedTeams}
            currentTeamIndex={currentTeamIndex}
            scoreChanges={scoreChanges}
            onScoreChange={onScoreChange}
            rapidFireUsed={rapidFireUsed}
            rapidFireActiveTeam={rapidFireActiveTeam}
            teamStreaks={teamStreaks}
            teamLifelines={teamLifelines}
            teamSupporterCounts={teamSupporterCounts}
            tvMode={tvModeEnabled}
            fixedLeaderboard={fixedLeaderboard}
          />
        </CardContent>
      </Card>
      </motion.div>
      {/* Maximized Dialog */}
      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent
          className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 border-2 border-border bg-background overflow-hidden"
          aria-describedby={undefined}
        >
          <VisuallyHidden>
            <DialogTitle>{t.panelLeaderboard}</DialogTitle>
          </VisuallyHidden>
          <div className="relative z-10 h-full flex flex-col p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="flex items-center gap-4">
                <Trophy className="h-12 w-12 text-yellow-500" />
                <h2 className="text-2xl md:text-3xl font-black text-foreground">
                  {t.panelLeaderboard}
                </h2>
              </div>
            </motion.div>

            <ScrollArea className="flex-1 px-4">
              <LeaderboardContent
                rankedTeams={rankedTeams}
                currentTeamIndex={currentTeamIndex}
                scoreChanges={scoreChanges}
                onScoreChange={onScoreChange}
                rapidFireUsed={rapidFireUsed}
                rapidFireActiveTeam={rapidFireActiveTeam}
                teamStreaks={teamStreaks}
                teamLifelines={teamLifelines}
                teamSupporterCounts={teamSupporterCounts}
                isMaximized={true}
                fixedLeaderboard={fixedLeaderboard}
              />
            </ScrollArea>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center pt-4"
            >
              <Button
                onClick={() => setIsMaximized(false)}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-bold shadow-lg"
              >
                Close
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewerBoardsOpen} onOpenChange={setIsViewerBoardsOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 border-2 border-primary/30 bg-background/98 backdrop-blur-xl overflow-hidden" aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>Viewer Leaderboards</DialogTitle>
          </VisuallyHidden>
          <div className="h-full min-h-0 flex flex-col p-6 overflow-hidden">
            <ViewerBoardsTabs
              questionResponses={questionResponses}
              cumulativeEntries={viewerLeaderboard}
              isAnswerRevealed={isAnswerRevealed}
              correctAnswer={correctAnswer}
              maskResponses={maskResponses}
              isExpanded={true}
              tab="cumulative"
              showTabs={false}
              showDevDebug={isDev}
              enablePrizeAdminControls={false}
              prizeTypeOptions={prizeOverlay.policyEnabledTypes}
              prizeOverlayByChannel={prizeOverlay.overlayByChannel}
              selectedPrizeByChannel={prizeOverlay.selectedPrizeByChannel}
              assigningByChannel={prizeOverlay.assigningByChannel}
              xpLevelByChannel={xpLevelByChannel}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
