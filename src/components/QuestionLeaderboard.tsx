import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Zap, Target, Medal, Eye, EyeOff, Crown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChatResponse } from "./YouTubeChatResponses";
import { cn } from "@/lib/utils";
import { TeamSupportBadge, SupportingTeam } from "./TeamSupportBadge";
import { useTVMode } from "@/hooks/useTVMode";
import { useTranslation } from "@/hooks/useTranslation";

interface QuestionLeaderboardProps {
    responses: ChatResponse[];
    isRevealed: boolean;
    correctAnswer: number | null;
    maskResponses?: boolean;
    isExpanded?: boolean;
}

interface QuestionEntry {
    odytChannelId: string;
    userName: string;
    avatarUrl: string;
    answer: string;
    responseTimeMs: number;
    isCorrect: boolean | null;
    score: number;
    rank: number;
    speedPercentile: number;
    correctRank: number | null;
    supportingTeam?: SupportingTeam;
}

const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
};

const getRankIcon = (rank: number, tvMode: boolean) => {
    const size = tvMode ? "w-6 h-6" : "w-4 h-4";
    switch (rank) {
        case 1: return <Crown className={`${size} text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]`} />;
        case 2: return <Medal className={`${size} text-slate-300 drop-shadow-[0_0_4px_rgba(148,163,184,0.4)]`} />;
        case 3: return <Medal className={`${size} text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]`} />;
        default: return null;
    }
};

const getRowStyle = (rank: number, isCorrect: boolean | null, isRevealed: boolean) => {
    if (isRevealed && isCorrect === true && rank <= 3) {
        if (rank === 1) return "leaderboard-gold";
        if (rank === 2) return "leaderboard-silver";
        if (rank === 3) return "leaderboard-bronze";
    }
    if (isRevealed && isCorrect === true) return "bg-emerald-500/8 border border-emerald-500/25";
    if (isRevealed && isCorrect === false) return "bg-rose-500/8 border border-rose-500/15";
    return "leaderboard-row-emboss";
};

const QuestionEntryRow = React.forwardRef<HTMLDivElement, {
    entry: QuestionEntry;
    totalResponses: number;
    isRevealed: boolean;
    maskResponses?: boolean;
    isExpanded?: boolean;
    tvMode?: boolean;
}>(({ entry, totalResponses, isRevealed, maskResponses = false, isExpanded = false, tvMode = false }, ref) => {
    const effectiveTV = tvMode || isExpanded;
    
    const isTopThreeCorrect = isRevealed && entry.isCorrect === true && entry.correctRank !== null && entry.correctRank <= 3;
    const isFastest = isRevealed && entry.isCorrect === true && entry.correctRank === 1;

    const displayRank = isRevealed && entry.isCorrect === true && entry.correctRank !== null
        ? entry.correctRank
        : entry.rank;

    const correctRankForStyle = isRevealed && entry.isCorrect === true && entry.correctRank !== null
        ? entry.correctRank : 999;

    const sizes = {
        padding: effectiveTV ? "px-4 py-3" : "px-2 py-2",
        rankCircle: effectiveTV ? "w-14 h-14 text-xl" : "w-7 h-7 text-xs",
        avatar: effectiveTV ? "w-[70px] h-[70px]" : "w-9 h-9",
        avatarText: effectiveTV ? "text-lg" : "text-[11px]",
        zapIcon: effectiveTV ? "w-7 h-7" : "w-4 h-4",
        userName: effectiveTV ? "text-xl font-bold" : "text-sm font-semibold",
        badge: effectiveTV ? "text-sm px-2 py-0.5" : "text-[9px] px-1 py-0",
        stats: effectiveTV ? "text-base" : "text-[11px]",
        clockIcon: effectiveTV ? "w-5 h-5" : "w-3.5 h-3.5",
        answerBox: effectiveTV ? "w-14 h-14 text-xl" : "w-8 h-8 text-sm",
        scoreWidth: effectiveTV ? "min-w-[80px]" : "min-w-[48px]",
        score: effectiveTV ? "text-xl" : "text-sm",
    };

    return (
        <motion.div
            ref={ref}
            layout={!tvMode}
            initial={tvMode ? undefined : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={tvMode ? undefined : { opacity: 0, x: 20 }}
            transition={tvMode ? { duration: 0.1 } : { duration: 0.3 }}
            className={cn(
                "flex items-center gap-2 rounded-xl transition-all relative overflow-hidden",
                sizes.padding,
                getRowStyle(correctRankForStyle, entry.isCorrect, isRevealed)
            )}
        >
            {/* Shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

            {/* Rank */}
            <div className={cn(
                "rounded-full flex items-center justify-center font-black shrink-0 relative z-10",
                sizes.rankCircle,
                isTopThreeCorrect && entry.correctRank === 1 && "bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]",
                isTopThreeCorrect && entry.correctRank === 2 && "bg-gradient-to-br from-slate-300 to-slate-400 text-black",
                isTopThreeCorrect && entry.correctRank === 3 && "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
                (!isTopThreeCorrect) && "bg-muted/60 text-muted-foreground"
            )}>
                {isTopThreeCorrect && entry.correctRank ? (
                    getRankIcon(entry.correctRank, effectiveTV) || displayRank
                ) : displayRank}
            </div>

            {/* Avatar */}
            <div className="relative z-10 shrink-0">
                <Avatar className={cn(
                    "shadow-lg",
                    sizes.avatar,
                    isTopThreeCorrect ? "ring-2 ring-yellow-400/40" : "ring-1 ring-border/50"
                )}>
                    <AvatarImage src={entry.avatarUrl} alt={entry.userName} referrerPolicy="no-referrer" crossOrigin="anonymous" loading="eager" />
                    <AvatarFallback className={cn("bg-primary/20 font-bold", sizes.avatarText)}>
                        {entry.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                {isFastest && (
                    <div className="absolute -top-1 -right-1">
                        <Zap className={cn("text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]", sizes.zapIcon)} />
                    </div>
                )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center gap-2">
                    <span className={cn("truncate text-foreground", sizes.userName)}>
                        {entry.userName}
                    </span>
                    <TeamSupportBadge team={entry.supportingTeam} size={effectiveTV ? "lg" : "md"} />
                    {isFastest && (
                        <Badge variant="secondary" className={cn("bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-bold", sizes.badge)}>
                            ⚡ Fastest
                        </Badge>
                    )}
                </div>
                <div className={cn("flex items-center gap-2 text-muted-foreground", sizes.stats)}>
                    <Clock className={cn("text-cyan-400", sizes.clockIcon)} />
                    <span className="font-mono">{formatTime(entry.responseTimeMs)}</span>
                    <span className="text-primary/40">•</span>
                    <span>Top {100 - entry.speedPercentile}%</span>
                </div>
            </div>

            {/* Answer */}
            <div className={cn(
                "rounded-lg flex items-center justify-center font-black relative z-10 shadow-md",
                sizes.answerBox,
                !isRevealed && "bg-muted/70 text-foreground/60 border border-border/30",
                isRevealed && entry.isCorrect === true && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]",
                isRevealed && entry.isCorrect === false && "bg-gradient-to-br from-rose-500/80 to-rose-600/80 text-white"
            )}>
                {!isRevealed ? "?" : entry.answer}
            </div>

            {/* Score */}
            {isRevealed && entry.isCorrect !== null && (
                <div className={cn("text-right relative z-10", sizes.scoreWidth)}>
                    <div className={cn(
                        "font-black",
                        sizes.score,
                        entry.score > 0 ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]" : "text-muted-foreground"
                    )}>
                        +{entry.score}
                    </div>
                </div>
            )}
        </motion.div>
    );
});

QuestionEntryRow.displayName = "QuestionEntryRow";

export const QuestionLeaderboard = ({
    responses,
    isRevealed,
    correctAnswer,
    maskResponses = false,
    isExpanded = false
}: QuestionLeaderboardProps) => {
    const [showIncorrect, setShowIncorrect] = useState(false);
    const { tvModeEnabled } = useTVMode();
    const { t } = useTranslation();

    const effectiveTV = tvModeEnabled || isExpanded;

    const entries = useMemo(() => {
        if (!responses.length) return [];

        const seenUsers = new Set<string>();
        const deduped = responses.filter(r => {
            if (seenUsers.has(r.odytChannelId)) return false;
            seenUsers.add(r.odytChannelId);
            return true;
        });

        const sorted = [...deduped].sort((a, b) => a.responseTimeMs - b.responseTimeMs);

        const correctResponses = sorted.filter(r => r.isCorrect === true);
        const correctRankMap = new Map<string, number>();
        correctResponses.forEach((r, idx) => {
            correctRankMap.set(r.odytChannelId, idx + 1);
        });

        const totalCount = sorted.length;

        return sorted.map((r, idx): QuestionEntry => {
            const slowerCount = totalCount - idx - 1;
            const speedPercentile = Math.round((slowerCount / totalCount) * 100);

            return {
                odytChannelId: r.odytChannelId,
                userName: r.userName,
                avatarUrl: r.avatarUrl,
                answer: r.answer,
                responseTimeMs: r.responseTimeMs,
                isCorrect: r.isCorrect,
                score: r.score,
                rank: idx + 1,
                speedPercentile,
                correctRank: r.isCorrect === true ? (correctRankMap.get(r.odytChannelId) ?? null) : null,
                supportingTeam: r.supportingTeam,
            };
        });
    }, [responses]);

    const displayedEntries = useMemo(() => {
        if (!isRevealed || showIncorrect) return entries;
        return entries
            .filter(e => e.isCorrect === true)
            .sort((a, b) => (a.correctRank ?? 999) - (b.correctRank ?? 999));
    }, [entries, isRevealed, showIncorrect]);

    const stats = useMemo(() => {
        if (!isRevealed || !responses.length) return null;

        const correct = responses.filter(r => r.isCorrect === true);
        const avgTime = responses.reduce((sum, r) => sum + r.responseTimeMs, 0) / responses.length;
        const fastestCorrect = correct.length > 0
            ? Math.min(...correct.map(r => r.responseTimeMs))
            : null;

        return {
            totalResponses: responses.length,
            correctCount: correct.length,
            accuracy: Math.round((correct.length / responses.length) * 100),
            avgTime,
            fastestCorrect,
        };
    }, [responses, isRevealed]);

    const sizes = {
        statsRow: effectiveTV ? "p-5" : "px-3 py-2",
        statValue: effectiveTV ? "text-3xl" : "text-lg",
        statLabel: effectiveTV ? "text-sm" : "text-[9px]",
        header: effectiveTV ? "px-5 py-3" : "px-3 py-2",
        headerIcon: effectiveTV ? "w-6 h-6" : "w-5 h-5",
        headerText: effectiveTV ? "text-xl" : "text-sm",
        list: effectiveTV ? "p-3 space-y-1.5" : "p-2 space-y-1.5",
        empty: effectiveTV ? "text-xl" : "text-sm",
    };

    return (
        <div className={isExpanded ? "w-full h-full flex flex-col" : "w-full"}>
            <div className={cn(
                "leaderboard-glossy rounded-xl overflow-hidden flex flex-col",
                isExpanded && "h-full"
            )}>
                {/* Stats Bar */}
                {stats && (
                    <div className={cn(
                        "mx-2 mt-2 rounded-xl bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 border border-border/20 flex flex-row justify-around",
                        sizes.statsRow
                    )}>
                        <div className="text-center">
                            <div className={cn("font-black text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.3)]", sizes.statValue)}>{stats.totalResponses}</div>
                            <div className={cn("text-muted-foreground uppercase font-semibold tracking-wider", sizes.statLabel)}>{t.responses}</div>
                        </div>
                        <div className="text-center">
                            <div className={cn("font-black text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]", sizes.statValue)}>{stats.correctCount}</div>
                            <div className={cn("text-muted-foreground uppercase font-semibold tracking-wider", sizes.statLabel)}>{t.correct}</div>
                        </div>
                        <div className="text-center">
                            <div className={cn("font-black text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]", sizes.statValue)}>{stats.accuracy}%</div>
                            <div className={cn("text-muted-foreground uppercase font-semibold tracking-wider", sizes.statLabel)}>{t.accuracy}</div>
                        </div>
                        <div className="text-center">
                            <div className={cn("font-black text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.3)]", sizes.statValue)}>
                                {stats.fastestCorrect ? formatTime(stats.fastestCorrect) : "-"}
                            </div>
                            <div className={cn("text-muted-foreground uppercase font-semibold tracking-wider", sizes.statLabel)}>{t.fastest}</div>
                        </div>
                    </div>
                )}

                {/* Header with Toggle */}
                <div className={cn(
                    "border-b border-border/20 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 flex items-center justify-between",
                    sizes.header
                )}>
                    <div className="flex items-center gap-2">
                        <Target className={cn("text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]", sizes.headerIcon)} />
                        <span className={cn("font-black tracking-wide", sizes.headerText)}>{t.thisQuestion}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {isRevealed && (
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="show-incorrect"
                                    checked={showIncorrect}
                                    onCheckedChange={setShowIncorrect}
                                    className={effectiveTV ? "" : "scale-75"}
                                />
                                <Label
                                    htmlFor="show-incorrect"
                                    className={cn("text-muted-foreground cursor-pointer flex items-center gap-1", effectiveTV ? "text-base" : "text-xs")}
                                >
                                    {showIncorrect ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    <span className="hidden sm:inline">{showIncorrect ? t.all : t.correctOnly}</span>
                                </Label>
                            </div>
                        )}
                        <Badge variant="outline" className={cn(
                            "bg-primary/10 text-primary border-primary/30 font-bold",
                            effectiveTV ? "text-base px-4 py-1" : "text-xs"
                        )}>
                            {displayedEntries.length} {isRevealed && !showIncorrect ? t.correct.toLowerCase() : t.responses.toLowerCase()}
                        </Badge>
                    </div>
                </div>

                {/* List */}
                <div className={cn(
                    "overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
                    sizes.list,
                    isExpanded ? "flex-1" : "max-h-[400px]"
                )}>
                    <AnimatePresence mode="popLayout">
                        {displayedEntries.length === 0 ? (
                            <div className={cn("text-center text-muted-foreground py-8", sizes.empty)}>
                                <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                                {isRevealed && !showIncorrect ? t.noCorrectAnswers + "..." : t.noResponsesYet}
                            </div>
                        ) : (
                            displayedEntries.map((entry) => (
                                <QuestionEntryRow
                                    key={entry.odytChannelId}
                                    entry={entry}
                                    totalResponses={entries.length}
                                    isRevealed={isRevealed}
                                    maskResponses={maskResponses}
                                    isExpanded={isExpanded}
                                    tvMode={tvModeEnabled}
                                />
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
