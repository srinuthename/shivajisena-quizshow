import { motion, AnimatePresence } from "framer-motion";
import { memo, useEffect, useMemo, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Clock, Wifi, WifiOff, TrendingUp, TrendingDown, Coins, Crown, Sparkles, ShieldX, UserRoundPlus, Shield, ShieldCheck, Star } from "lucide-react";
import { LeaderboardSearch } from "@/components/LeaderboardSearch";
import { AnimatedScore } from "@/components/AnimatedScore";
import { StreakFlames, StreakFlamesBadge } from "@/components/StreakFlames";
import { AchievementBadgeList, calculateAchievements } from "@/components/ViewerAchievementBadge";
import { PercentileBadge } from "@/components/PercentileBadge";
import { TeamSupportBadge, SupportingTeam } from "./TeamSupportBadge";
import { useTVMode } from "@/hooks/useTVMode";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { PrizeType } from "@/services/prizeApi";
import { LuckySelection, PrizeOverlayEntry } from "@/hooks/usePrizeOverlay";

export interface LeaderboardEntry {
  odytChannelId: string;
  userName: string;
  avatarUrl?: string;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  avgResponseTimeMs?: number;
  previousRank?: number;
  streak?: number;
  lastScoreChange?: number;
  responseTimes?: number[];
  isFirstCorrect?: boolean;
  isFastestResponse?: boolean;
  supportingTeam?: SupportingTeam;
}

interface LiveLeaderboardProps {
  entries: LeaderboardEntry[];
  isConnected: boolean;
  maxEntries?: number;
  isExpanded?: boolean;
  defaultShowDecorativeBadges?: boolean;
  enablePrizeAdminControls?: boolean;
  prizeTypeOptions?: PrizeType[];
  prizeOverlayByChannel?: Record<string, PrizeOverlayEntry>;
  selectedPrizeByChannel?: Record<string, PrizeType>;
  assigningByChannel?: Record<string, boolean>;
  onSelectPrizeType?: (channelId: string, prizeType: PrizeType) => void;
  onAssignPrize?: (channelId: string, prizeType: PrizeType) => void;
  onSelectLuckyWinner?: () => LuckySelection | null | Promise<LuckySelection | null>;
  onAssignSelectedLucky?: () => Promise<{ success?: boolean } | void> | { success?: boolean } | void;
  onRemoveAward?: (awardId: string) => void;
  suggestedPrizeByChannel?: Record<string, PrizeType[]>;
  userBoardStatsByChannel?: Record<string, {
    rank1: number;
    rank2: number;
    rank3: number;
    top10: number;
    prizeSlots: number[];
    lucky: number;
    anyPrize: number;
  }>;
  xpLevelByChannel?: Record<string, number>;
  occupiedPrizeByType?: Partial<Record<PrizeType, string>>;
}

const PRIZE_TYPE_SELECT_LABEL: Record<PrizeType, string> = {
  quizfirst: "🏆1 First Prize",
  quizsecond: "🏆2 Second Prize",
  quizthird: "🏆3 Third Prize",
  luckydip: "⭐ Lucky Dip",
  custom: "🎖️ Custom",
};

const formatAwardChipLabel = (prizeType: PrizeType, prizeInstance?: number, rank?: number | null): string => {
  if (prizeType === "quizfirst") return "🏆1";
  if (prizeType === "quizsecond") return "🏆2";
  if (prizeType === "quizthird") return "🏆3";
  if (prizeType === "luckydip") return `⭐ #${Number(prizeInstance || 1)}`;
  const slot = Number(rank || 0);
  if (Number.isFinite(slot) && slot >= 1 && slot <= 10) return `🏆${slot}`;
  return "🎖️";
};

const formatTime = (ms?: number): string => {
  if (!ms || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const getRankStyle = (rank: number): string => {
  switch (rank) {
    case 1: return "leaderboard-gold";
    case 2: return "leaderboard-silver";
    case 3: return "leaderboard-bronze";
    default: return "leaderboard-row-emboss";
  }
};

const getRankIcon = (rank: number, size: string) => {
  if (rank === 1) return <Crown className={`${size} text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]`} />;
  if (rank === 2) return <Medal className={`${size} text-slate-300 drop-shadow-[0_0_6px_rgba(148,163,184,0.5)]`} />;
  if (rank === 3) return <Medal className={`${size} text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]`} />;
  return null;
};

interface RowProps {
  entry: LeaderboardEntry;
  rank: number;
  totalParticipants: number;
  isExpanded?: boolean;
  tvMode?: boolean;
  showDecorativeBadges?: boolean;
  enablePrizeAdminControls?: boolean;
  prizeTypeOptions?: PrizeType[];
  prizeOverlay?: PrizeOverlayEntry;
  selectedPrizeType?: PrizeType;
  assigning?: boolean;
  onSelectPrizeType?: (channelId: string, prizeType: PrizeType) => void;
  onAssignPrize?: (channelId: string, prizeType: PrizeType) => void;
  onRemoveAward?: (awardId: string) => void;
  suggestedPrizeTypes?: PrizeType[];
  userBoardStats?: {
    rank1: number;
    rank2: number;
    rank3: number;
    top10: number;
    prizeSlots: number[];
    lucky: number;
    anyPrize: number;
  };
  xpLevel?: number;
  occupiedPrizeByType?: Partial<Record<PrizeType, string>>;
}

const LeaderboardRow = memo(({ entry, rank, totalParticipants, isExpanded = false, tvMode = false, showDecorativeBadges = true, enablePrizeAdminControls = false, prizeTypeOptions = [], prizeOverlay, selectedPrizeType, assigning = false, onSelectPrizeType, onAssignPrize, onRemoveAward, suggestedPrizeTypes = [], userBoardStats, xpLevel, occupiedPrizeByType = {} }: RowProps) => {
  const avatarSeed = entry.odytChannelId || entry.userName;
  const accuracy = entry.totalResponses > 0 ? Math.round((entry.correctAnswers / entry.totalResponses) * 100) : 0;
  
  const rankChange = entry.previousRank ? entry.previousRank - rank : 0;

  const achievements = useMemo(() => 
    (!tvMode && !isExpanded) ? calculateAchievements(entry, rank, totalParticipants) : [],
    [entry, rank, totalParticipants, tvMode, isExpanded]
  );

  const showFlames = entry.streak && entry.streak >= 3;
  const rankedEligible = prizeOverlay
    ? Object.entries(prizeOverlay.decisionsByPrizeType || {}).some(
        ([prizeType, decision]) =>
          prizeType !== "luckydip" && decision?.eligibilityStatus === "eligible"
      )
    : false;
  const luckyEligible = prizeOverlay?.decisionsByPrizeType?.luckydip?.eligibilityStatus === "eligible";
  const participationProgress =
    prizeOverlay && prizeOverlay.requiredProperParticipations > 0
      ? `${prizeOverlay.properParticipations}/${prizeOverlay.requiredProperParticipations}`
      : null;
  const nonWinningHistory = prizeOverlay ? prizeOverlay.nonWinningProperParticipations : null;

  const effectiveTV = tvMode || isExpanded;
  const activeAssignedAwards = (prizeOverlay?.assignedAwards || []).filter((award) => award.couponStatus !== "revoked");
  const alreadyHasPrize = activeAssignedAwards.length > 0;
  const availablePrizeTypeOptions = useMemo(() => {
    if (alreadyHasPrize) return [] as PrizeType[];
    return (prizeTypeOptions || []).filter((type) => {
      if (type === "quizfirst" || type === "quizsecond" || type === "quizthird") {
        const occupiedBy = String(occupiedPrizeByType[type] || "");
        return !occupiedBy || occupiedBy === String(entry.odytChannelId || "");
      }
      return true;
    });
  }, [alreadyHasPrize, prizeTypeOptions, occupiedPrizeByType, entry.odytChannelId]);
  const effectiveSelectedPrizeType =
    availablePrizeTypeOptions.includes(selectedPrizeType || "quizfirst")
      ? (selectedPrizeType || "quizfirst")
      : availablePrizeTypeOptions[0];
  const slotOccupiedByAnotherViewer =
    Boolean(effectiveSelectedPrizeType) &&
    (effectiveSelectedPrizeType === "quizfirst" ||
      effectiveSelectedPrizeType === "quizsecond" ||
      effectiveSelectedPrizeType === "quizthird") &&
    Boolean(occupiedPrizeByType[effectiveSelectedPrizeType]) &&
    String(occupiedPrizeByType[effectiveSelectedPrizeType] || "") !== String(entry.odytChannelId || "");
  const sizes = useMemo(() => ({
    padding: effectiveTV ? 'px-4 py-3' : 'px-2 py-1.5',
    rankWidth: effectiveTV ? 'w-14' : 'w-8',
    rankIcon: effectiveTV ? 'w-8 h-8' : 'w-5 h-5',
    rankText: effectiveTV ? 'text-xl' : 'text-xs',
    changeIcon: effectiveTV ? 'w-6 h-6' : 'w-3.5 h-3.5',
    avatar: effectiveTV ? 'w-[62px] h-[62px]' : 'w-9 h-9',
    avatarText: effectiveTV ? 'text-lg' : 'text-[11px]',
    userName: effectiveTV ? 'text-xl font-bold' : 'text-sm font-semibold',
    stats: effectiveTV ? 'text-base' : 'text-[11px]',
    clockIcon: effectiveTV ? 'w-5 h-5' : 'w-3.5 h-3.5',
    coinIcon: effectiveTV ? 'w-7 h-7' : 'w-4 h-4',
    score: effectiveTV ? 'text-2xl' : 'text-base',
    scoreWidth: effectiveTV ? 'min-w-[90px]' : 'min-w-[56px]',
    scoreChange: effectiveTV ? 'text-lg' : 'text-[11px]',
  }), [effectiveTV]);

  const shouldAnimate = !tvMode && !isExpanded;

  // Avatar ring color by rank
  const avatarRing = rank === 1 ? 'ring-2 ring-yellow-400/60' :
    rank === 2 ? 'ring-2 ring-slate-300/50' :
    rank === 3 ? 'ring-2 ring-amber-500/50' : 'ring-1 ring-border/50';

  return (
    <motion.div
      layout={shouldAnimate ? "position" : false}
      initial={shouldAnimate ? { opacity: 0, x: -20 } : false}
      animate={{ opacity: 1, x: 0 }}
      exit={shouldAnimate ? { opacity: 0, x: 20 } : undefined}
      transition={shouldAnimate ? { type: "spring", stiffness: 500, damping: 30 } : { duration: 0.1 }}
      className={`group flex items-center gap-2 ${sizes.padding} rounded-xl ${getRankStyle(rank)} transition-all duration-200 hover:brightness-110`}
    >
      {/* Rank */}
      <div className={`${sizes.rankWidth} flex items-center justify-center shrink-0`}>
        {getRankIcon(rank, sizes.rankIcon) || (
          <span className={`${sizes.rankText} font-black text-muted-foreground/70 min-w-[1.5rem] text-center`}>
            {rank}
          </span>
        )}
      </div>

      {/* Rank change indicator */}
      {rankChange !== 0 && !tvMode && (
        <div className={`${effectiveTV ? 'w-6' : 'w-4'} flex items-center justify-center shrink-0`}>
          {rankChange > 0 ? (
            <TrendingUp className={`${sizes.changeIcon} text-emerald-400`} />
          ) : (
            <TrendingDown className={`${sizes.changeIcon} text-rose-400`} />
          )}
        </div>
      )}

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className={`${sizes.avatar} ${avatarRing} shadow-lg`}>
          <AvatarImage src={entry.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt={entry.userName} referrerPolicy="no-referrer" crossOrigin="anonymous" loading="eager" />
          <AvatarFallback className={`${sizes.avatarText} bg-primary/20 font-bold`}>{entry.userName.charAt(0)}</AvatarFallback>
        </Avatar>
        {showFlames && !tvMode && <StreakFlames streak={entry.streak!} size="sm" />}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`${sizes.userName} ${effectiveTV ? '' : 'truncate max-w-[90px]'} text-foreground`}>{entry.userName}</p>
          {showDecorativeBadges ? <TeamSupportBadge team={entry.supportingTeam} size={effectiveTV ? "lg" : "md"} /> : null}
          {showDecorativeBadges && (prizeOverlay || Number.isFinite(xpLevel)) ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-cyan-500/30 bg-cyan-500/5" title={`XP Level — ${Number(Number.isFinite(xpLevel) ? xpLevel : prizeOverlay?.properParticipations || 0)} proper quiz participations`}>
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span className="text-cyan-300 font-semibold">XP {Number(Number.isFinite(xpLevel) ? xpLevel : prizeOverlay?.properParticipations || 0)}</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && rankedEligible ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/30 bg-emerald-500/5" title="Eligible for at least one ranked prize type">
              <Trophy className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-300">Ranked Eligible</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && luckyEligible ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-fuchsia-500/30 bg-fuchsia-500/5" title="Eligible for lucky draw">
              <Star className="h-3 w-3 text-fuchsia-400" />
              <span className="text-fuchsia-300">Lucky Eligible</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && participationProgress ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-sky-500/30 bg-sky-500/5" title="Proper participations compared with the ranked prize threshold">
              <Sparkles className="h-3 w-3 text-sky-400" />
              <span className="text-sky-300">PP {participationProgress}</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && Number.isFinite(nonWinningHistory) && nonWinningHistory ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-violet-500/30 bg-violet-500/5" title="Proper participations without a prize win">
              <ShieldCheck className="h-3 w-3 text-violet-400" />
              <span className="text-violet-300">Non-Win {nonWinningHistory}</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && prizeOverlay?.isIneligible ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-rose-500/30 bg-rose-500/5" title="Not eligible for prizes">
              <ShieldX className="h-3 w-3 text-rose-400" />
              <span className="text-rose-300">Ineligible</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && prizeOverlay?.reasonCodes?.includes("account_too_new") ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/30 bg-amber-500/5" title="Account is too new to qualify">
              <UserRoundPlus className="h-3 w-3 text-amber-400" />
              <span className="text-amber-300">New</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && prizeOverlay?.reasonCodes?.includes("cooldown_active") ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-orange-500/30 bg-orange-500/5" title="Recent prize winner — cooldown active">
              <Shield className="h-3 w-3 text-orange-400" />
              <span className="text-orange-300">Cooldown</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && userBoardStats?.rank1 ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-yellow-500/30 bg-yellow-500/5" title={`Won 1st place ${userBoardStats.rank1} time(s)`}>
              <Crown className="h-3 w-3 text-yellow-400" />
              <span className="text-yellow-300">🥇×{userBoardStats.rank1}</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && userBoardStats?.rank2 ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-slate-400/30 bg-slate-400/5" title={`Won 2nd place ${userBoardStats.rank2} time(s)`}>
              <Medal className="h-3 w-3 text-slate-300" />
              <span className="text-slate-300">🥈×{userBoardStats.rank2}</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && userBoardStats?.rank3 ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-amber-600/30 bg-amber-600/5" title={`Won 3rd place ${userBoardStats.rank3} time(s)`}>
              <Medal className="h-3 w-3 text-amber-500" />
              <span className="text-amber-400">🥉×{userBoardStats.rank3}</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && userBoardStats?.anyPrize ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/30 bg-emerald-500/5" title={`Won ${userBoardStats.anyPrize} prize(s) total`}>
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-300">🏅×{userBoardStats.anyPrize}</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && userBoardStats?.lucky ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-pink-500/30 bg-pink-500/5" title={`Won lucky draw ${userBoardStats.lucky} time(s)`}>
              <Star className="h-3 w-3 text-pink-400" />
              <span className="text-pink-300">🎰×{userBoardStats.lucky}</span>
            </Badge>
          ) : null}
          {showDecorativeBadges && showFlames && !tvMode && <StreakFlamesBadge streak={entry.streak!} />}
          {showDecorativeBadges && !tvMode && <PercentileBadge rank={rank} totalParticipants={totalParticipants} size="sm" />}
        </div>
        <div className="flex items-center gap-2">
          <p className={`${sizes.stats} text-muted-foreground`}>{entry.correctAnswers}/{entry.totalResponses} • {accuracy}%</p>
          {showDecorativeBadges && achievements.length > 0 && !tvMode && (
            <AchievementBadgeList achievements={achievements} maxVisible={3} size="sm" />
          )}
        </div>
      </div>

      {/* Score section */}
      <div className="flex items-center gap-3 text-right shrink-0">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className={`${sizes.clockIcon} text-cyan-400`} />
          <span className={`${sizes.stats} font-mono`}>{formatTime(entry.avgResponseTimeMs)}</span>
        </div>
        <div className={`${sizes.scoreWidth} relative flex items-center gap-1 justify-end`}>
          <Coins className={`${sizes.coinIcon} text-yellow-500 drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]`} />
          <AnimatedScore
            value={entry.totalScore}
            className={`${sizes.score} font-black ${rank <= 3 ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]" : "text-foreground"}`}
          />
          {entry.lastScoreChange && entry.lastScoreChange > 0 && !tvMode && (
            <motion.span
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -12 }}
              transition={{ duration: 1.5 }}
              className={`absolute -top-3 right-0 ${sizes.scoreChange} text-emerald-400 font-bold`}
            >
              +{entry.lastScoreChange}
            </motion.span>
          )}
        </div>
      </div>
      {showDecorativeBadges && (prizeOverlay || enablePrizeAdminControls) ? (
        <div className="ml-2 flex max-w-[320px] flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-1">
            {(prizeOverlay?.reasonTags || [])
              .filter((tag) => tag !== "New Account" && tag !== "Non-Eligible")
              .slice(0, 3)
              .map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            {(prizeOverlay?.softFlagTags || [])
              .slice(0, 2)
              .map((tag) => (
                <Badge key={`soft-${tag}`} variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/5">
                  {tag}
                </Badge>
              ))}
            {(prizeOverlay?.positiveSignalTags || [])
              .slice(0, 3)
              .map((tag) => (
                <Badge key={`positive-${tag}`} variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-500/5 text-emerald-300">
                  {tag}
                </Badge>
              ))}
            {(prizeOverlay?.assignedAwards || []).map((award) => {
              return (
                <span key={award._id} className="inline-flex items-center gap-1">
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <span>{formatAwardChipLabel(award.prizeType, award.prizeInstance, award.rank)}</span>
                    <span className="text-muted-foreground">Assigned</span>
                  </Badge>
                  {enablePrizeAdminControls ? (
                    <button
                      type="button"
                      className="h-4 w-4 rounded-full border border-destructive/40 text-[10px] leading-none text-destructive hover:bg-destructive/10"
                      title="Remove assigned prize"
                      onClick={() => onRemoveAward?.(award._id)}
                    >
                      x
                    </button>
                  ) : null}
                </span>
              );
            })}
            {suggestedPrizeTypes
              .filter((prizeType) =>
                !(prizeOverlay?.assignedAwards || []).some((award) => award.prizeType === prizeType && award.couponStatus !== "revoked")
              )
              .map((prizeType) => (
                <Badge key={`suggested-${prizeType}`} variant="outline" className="text-[10px] border-primary/40 text-primary">
                  {formatAwardChipLabel(prizeType)} Suggest
                </Badge>
              ))}
            {slotOccupiedByAnotherViewer ? (
              <Badge variant="outline" className="text-[10px] border-amber-500/40 bg-amber-500/5 text-amber-300">
                Slot already assigned
              </Badge>
            ) : alreadyHasPrize ? (
              <Badge variant="outline" className="text-[10px] border-rose-500/40 bg-rose-500/5 text-rose-300">
                Prize already assigned
              </Badge>
            ) : null}
          </div>
          {enablePrizeAdminControls && availablePrizeTypeOptions.length > 0 ? (
            <div className="flex items-center gap-1">
              <select
                className="h-7 rounded border bg-background px-2 text-[10px]"
                value={effectiveSelectedPrizeType}
                onChange={(e) => onSelectPrizeType?.(entry.odytChannelId, e.target.value as PrizeType)}
              >
                {availablePrizeTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {PRIZE_TYPE_SELECT_LABEL[type] || type}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                className="h-7 px-2 text-[10px]"
                disabled={assigning}
                onClick={() => effectiveSelectedPrizeType && onAssignPrize?.(entry.odytChannelId, effectiveSelectedPrizeType)}
              >
                {assigning ? "Assigning..." : "Assign Prize"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
});

LeaderboardRow.displayName = "LeaderboardRow";

export const LiveLeaderboard = ({
  entries,
  isConnected,
  maxEntries,
  isExpanded = false,
  defaultShowDecorativeBadges = true,
  enablePrizeAdminControls = false,
  prizeTypeOptions = [],
  prizeOverlayByChannel = {},
  selectedPrizeByChannel = {},
  assigningByChannel = {},
  onSelectPrizeType,
  onAssignPrize,
  onSelectLuckyWinner,
  onAssignSelectedLucky,
  onRemoveAward,
  suggestedPrizeByChannel = {},
  userBoardStatsByChannel = {},
  xpLevelByChannel = {},
  occupiedPrizeByType = {},
}: LiveLeaderboardProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDecorativeBadges, setShowDecorativeBadges] = useState(defaultShowDecorativeBadges);
  const [luckyPickerBusy, setLuckyPickerBusy] = useState(false);
  const [luckyCandidate, setLuckyCandidate] = useState<LuckySelection | null>(null);
  const [luckyInfo, setLuckyInfo] = useState<string | null>(null);
  const [luckySpinnerPreview, setLuckySpinnerPreview] = useState<LeaderboardEntry | null>(null);
  const { tvModeEnabled } = useTVMode();
  const { t } = useTranslation();

  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = entries.filter(e => e.userName.toLowerCase().includes(query));
    }
    if (!isExpanded && maxEntries) {
      return filtered.slice(0, maxEntries);
    }
    return filtered;
  }, [entries, searchQuery, isExpanded, maxEntries]);

  useEffect(() => {
    if (!luckyPickerBusy) {
      setLuckySpinnerPreview(null);
      return;
    }

    const pool = entries.length > 0 ? entries : filteredEntries;
    if (pool.length === 0) {
      setLuckySpinnerPreview(null);
      return;
    }

    let index = 0;
    let cancelled = false;
    let timeoutId: number | null = null;
    const startedAt = Date.now();
    const durationMs = 1800;

    const tick = () => {
      if (cancelled) return;
      index = (index + 1) % pool.length;
      setLuckySpinnerPreview(pool[index]);

      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      const nextDelay = Math.round(70 + progress * progress * 230);
      timeoutId = window.setTimeout(tick, nextDelay);
    };

    setLuckySpinnerPreview(pool[0]);
    timeoutId = window.setTimeout(tick, 70);

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [luckyPickerBusy, entries, filteredEntries]);

  const effectiveTV = tvModeEnabled || isExpanded;

  return (
    <motion.div 
      initial={tvModeEnabled ? undefined : { opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={isExpanded ? "w-full h-full flex flex-col" : "w-full"}
    >
      <div className={`leaderboard-glossy rounded-xl overflow-hidden ${isExpanded ? "flex flex-col h-full" : ""}`}>
        {/* Header */}
        <div className={`${effectiveTV ? 'px-5 py-3' : 'px-3 py-2'} border-b border-border/30 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Trophy className={`${effectiveTV ? 'w-7 h-7' : 'w-5 h-5'} text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]`} />
            </div>
            <span className={`font-black ${effectiveTV ? 'text-lg' : 'text-sm'} text-foreground tracking-wide`}>{t.liveLeaderboard}</span>
            {enablePrizeAdminControls && onSelectLuckyWinner ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px]"
                disabled={luckyPickerBusy}
                onClick={async () => {
                  if (!onSelectLuckyWinner) return;
                  setLuckyInfo(null);
                  setLuckyPickerBusy(true);
                  let selected: LuckySelection | null = null;
                  try {
                    const [resolved] = await Promise.all([
                      Promise.resolve(onSelectLuckyWinner()),
                      new Promise((resolve) => setTimeout(resolve, 1800)),
                    ]);
                    selected = resolved;
                    if (!selected) {
                      setLuckyInfo("No eligible lucky winner candidates are available.");
                      return;
                    }
                  } finally {
                    setLuckyPickerBusy(false);
                  }
                  setLuckyCandidate(selected);
                }}
              >
                Select Lucky Winner
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-[11px]"
              onClick={() => setShowDecorativeBadges((value) => !value)}
            >
              {showDecorativeBadges ? "Hide badges" : "Show badges"}
            </Button>
            {isConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className={`${effectiveTV ? 'text-sm' : 'text-xs'} text-emerald-400 font-semibold`}>{t.live}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-500/15 border border-rose-500/30">
                <WifiOff className={`${effectiveTV ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-rose-400`} />
                <span className={`${effectiveTV ? 'text-sm' : 'text-xs'} text-rose-400 font-semibold`}>{t.offline}</span>
              </div>
            )}
            <Badge variant="secondary" className={`${effectiveTV ? 'text-sm px-3 py-1' : 'text-xs'} bg-primary/10 text-primary border-primary/30`}>
              {filteredEntries.length} {t.viewers}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className={`${effectiveTV ? 'p-3' : 'p-2'} overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent ${isExpanded ? "flex-1" : "max-h-[400px]"}`}>
          {isExpanded && (
            <LeaderboardSearch
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalEntries={entries.length}
            />
          )}
          
          <AnimatePresence initial={false} mode="sync">
            {filteredEntries.length === 0 ? (
              <div className={`text-center text-muted-foreground ${effectiveTV ? 'text-lg' : 'text-sm'} py-8`}>
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                {searchQuery ? t.noMatchingUsers : t.noScoresYet}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredEntries.map((entry, index) => (
                  <LeaderboardRow 
                    key={entry.odytChannelId} 
                    entry={entry} 
                    rank={index + 1} 
                    totalParticipants={entries.length}
                    isExpanded={isExpanded}
                    tvMode={tvModeEnabled}
                    showDecorativeBadges={showDecorativeBadges}
                    enablePrizeAdminControls={enablePrizeAdminControls}
                    prizeTypeOptions={prizeTypeOptions}
                    prizeOverlay={prizeOverlayByChannel[entry.odytChannelId]}
                    selectedPrizeType={selectedPrizeByChannel[entry.odytChannelId]}
                    assigning={Boolean(assigningByChannel[entry.odytChannelId])}
                    onSelectPrizeType={onSelectPrizeType}
                    onAssignPrize={onAssignPrize}
                    onRemoveAward={onRemoveAward}
                    suggestedPrizeTypes={suggestedPrizeByChannel[entry.odytChannelId] || []}
                    userBoardStats={userBoardStatsByChannel[entry.odytChannelId]}
                    xpLevel={xpLevelByChannel[entry.odytChannelId]}
                    occupiedPrizeByType={occupiedPrizeByType}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {(luckyPickerBusy || luckyCandidate) ? (
        <div className="mt-3 rounded-xl border border-border/30 bg-card/60 p-3">
          {luckyPickerBusy && !luckyCandidate ? (
            <div className="py-4 text-center">
              <div className="flex items-center justify-center gap-3 text-sm font-medium text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                Selecting Lucky Winner...
              </div>
              {luckySpinnerPreview ? (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Draw Preview</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{luckySpinnerPreview.userName}</p>
                  <p className="text-xs text-muted-foreground break-all">{luckySpinnerPreview.odytChannelId}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          {luckyCandidate ? (
            <div className="relative space-y-3">
              <h3 className="text-sm font-bold">Lucky Winner Selected</h3>
              <div className="space-y-1 text-xs md:text-sm">
                <div><span className="text-muted-foreground">Winner:</span> {luckyCandidate.userName}</div>
                <div><span className="text-muted-foreground">Rank:</span> #{luckyCandidate.rank}</div>
                <div><span className="text-muted-foreground">Lucky Instance:</span> #{luckyCandidate.luckyInstance}</div>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{Number(prizeOverlayByChannel[luckyCandidate.channelId]?.properParticipations || 0)}</span>
                </div>
                <div className="break-all"><span className="text-muted-foreground">Channel ID:</span> {luckyCandidate.channelId}</div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setLuckyCandidate(null)}>
                  Reject
                </Button>
                <Button
                  onClick={async () => {
                    const result = await Promise.resolve(onAssignSelectedLucky?.());
                    if (result && "success" in result && result.success === false) return;
                    setLuckyInfo(`Lucky Winner #${luckyCandidate.luckyInstance} assigned.`);
                    setLuckyCandidate(null);
                  }}
                >
                  Assign
                </Button>
              </div>
            </div>
          ) : null}
          {luckyInfo ? <p className="mt-2 text-xs text-muted-foreground">{luckyInfo}</p> : null}
        </div>
      ) : null}
    </motion.div>
  );
};
