import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Coins, Trophy, Medal, Star, Clock, CheckCircle2, XCircle, Gift, ChevronRight, Loader2, AlertCircle, Youtube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth";
import { PageHeader } from "@/components/PageHeader";
import { CouponsSection } from "@/components/CouponsSection";
import {
  getLoyaltyChannels,
  getLoyaltyChannelDetail,
  type LoyaltyChannelSummary,
  type LoyaltyChannelDetail,
  type LoyaltyQuiz,
} from "@/services/loyaltyApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCoins = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const fmtMs = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const ordinal = (n: number | null) => {
  if (n === null || n === undefined) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const prizeLabel = (type: string) => {
  const map: Record<string, string> = {
    quizfirst: "🥇 1st Place",
    quizsecond: "🥈 2nd Place",
    quizthird: "🥉 3rd Place",
    luckydip: "🎲 Lucky Dip",
    custom: "🎁 Custom",
  };
  return map[type] || type;
};

const couponBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "claimed") return "default";
  if (status === "assigned" || status === "viewed") return "secondary";
  if (status === "revoked") return "destructive";
  return "outline";
};

const initials = (title: string) =>
  title
    .split(/[\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";

const channelColor = (id: string) => {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500",
    "bg-rose-500", "bg-amber-500", "bg-cyan-500",
    "bg-indigo-500", "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) => (
  <Card className={`${accent ? "border-primary/40 bg-primary/5" : ""}`}>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${accent ? "bg-primary/15" : "bg-muted"}`}>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold leading-tight ${accent ? "text-primary" : ""}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

const ChannelCard = ({
  channel,
  onClick,
}: {
  channel: LoyaltyChannelSummary;
  onClick: () => void;
}) => {
  const accuracy =
    channel.totalResponses > 0
      ? Math.round((channel.totalCorrectAnswers / channel.totalResponses) * 100)
      : 0;

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card
        className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
        onClick={onClick}
      >
        <CardContent className="p-5">
          {/* Channel header */}
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`h-11 w-11 rounded-xl ${channelColor(channel.quizHostChannelId)} flex items-center justify-center text-white font-bold text-base shrink-0`}
            >
              {initials(channel.quizHostChannelTitle)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate leading-tight">
                {channel.quizHostChannelTitle}
              </p>
              {channel.quizHostChannelHandle && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <Youtube className="h-3 w-3 text-rose-500 shrink-0" />
                  {channel.quizHostChannelHandle}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Last played {fmtDate(channel.lastPlayedAt)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-muted/50 py-2">
              <p className="text-base font-bold text-amber-500">{fmtCoins(channel.totalCoins)}</p>
              <p className="text-[10px] text-muted-foreground">Coins</p>
            </div>
            <div className="rounded-lg bg-muted/50 py-2">
              <p className="text-base font-bold">{channel.quizzesPlayed}</p>
              <p className="text-[10px] text-muted-foreground">Quizzes</p>
            </div>
            <div className="rounded-lg bg-muted/50 py-2">
              <p className="text-base font-bold text-emerald-500">{accuracy}%</p>
              <p className="text-[10px] text-muted-foreground">Accuracy</p>
            </div>
            <div className="rounded-lg bg-muted/50 py-2">
              <p className="text-base font-bold text-violet-500">{channel.prizesWon}</p>
              <p className="text-[10px] text-muted-foreground">Prizes</p>
            </div>
          </div>

          {channel.firstPlaces > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] text-muted-foreground">
                {channel.firstPlaces} × 1st place
                {channel.bestRank !== null && channel.bestRank > 1
                  ? `, best rank: ${ordinal(channel.bestRank)}`
                  : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const QuizRow = ({ quiz, index }: { quiz: LoyaltyQuiz; index: number }) => {
  const accuracy =
    quiz.totalResponses > 0
      ? Math.round((quiz.correctAnswers / quiz.totalResponses) * 100)
      : 0;
  const eligiblePrizes = quiz.prizes.filter((p) => p.eligibilityStatus === "eligible");

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
    >
      {/* Episode */}
      <td className="py-3 px-4">
        <p className="font-medium text-sm leading-tight">
          {quiz.episodeName || quiz.frontendQuizGameId}
        </p>
        {quiz.episodeNumber && (
          <p className="text-[10px] text-muted-foreground">Ep. {quiz.episodeNumber}</p>
        )}
        <p className="text-[10px] text-muted-foreground">{fmtDate(quiz.endedAt)}</p>
      </td>

      {/* Rank */}
      <td className="py-3 px-4 text-center">
        <span
          className={`text-sm font-bold ${
            quiz.rank === 1
              ? "text-amber-500"
              : quiz.rank === 2
              ? "text-slate-400"
              : quiz.rank === 3
              ? "text-amber-700"
              : "text-foreground"
          }`}
        >
          {ordinal(quiz.rank)}
        </span>
      </td>

      {/* Coins */}
      <td className="py-3 px-4 text-center">
        <span className="font-bold text-amber-500">{fmtCoins(quiz.totalScore)}</span>
      </td>

      {/* Correct / Total */}
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span className="text-sm font-medium">{quiz.correctAnswers}</span>
          <span className="text-muted-foreground text-xs">/ {quiz.totalQuestions || quiz.totalResponses}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">{accuracy}%</p>
      </td>

      {/* Avg response */}
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{fmtMs(quiz.avgResponseTimeMs)}</span>
        </div>
        {quiz.fastestResponseMs !== null && quiz.fastestResponseMs !== undefined && (
          <p className="text-[10px] text-muted-foreground">
            Best: {fmtMs(quiz.fastestResponseMs)}
          </p>
        )}
      </td>

      {/* Prizes */}
      <td className="py-3 px-4">
        {eligiblePrizes.length === 0 ? (
          <span className="text-[11px] text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {eligiblePrizes.map((p, i) => (
              <Badge key={i} variant={couponBadgeVariant(p.couponStatus)} className="text-[10px] py-0">
                {prizeLabel(p.prizeType)}
              </Badge>
            ))}
          </div>
        )}
      </td>
    </motion.tr>
  );
};

// ─── Views ────────────────────────────────────────────────────────────────────

const ChannelListView = ({
  channels,
  participantChannelId,
  onSelect,
}: {
  channels: LoyaltyChannelSummary[];
  participantChannelId: string;
  onSelect: (id: string) => void;
}) => {
  const totalCoins = channels.reduce((s, c) => s + c.totalCoins, 0);
  const totalQuizzes = channels.reduce((s, c) => s + c.quizzesPlayed, 0);
  const totalPrizes = channels.reduce((s, c) => s + c.prizesWon, 0);

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Coins className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">No participation history yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Once you participate in quiz games on YouTube live streams, your coin history will appear here.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key="channel-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Overall summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <StatCard icon={Trophy} label="Channels" value={channels.length} />
        <StatCard icon={Star} label="Total Quizzes" value={totalQuizzes} />
        <StatCard icon={Coins} label="Total Coins" value={fmtCoins(totalCoins)} accent />
        <StatCard
          icon={Gift}
          label="Prizes Won"
          value={totalPrizes}
          sub="Redeemed: 0"
        />
        <CouponsSection participantChannelId={participantChannelId} />
      </div>

      {/* Channel grid */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Channels you've played on
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((ch) => (
          <ChannelCard
            key={ch.quizHostChannelId}
            channel={ch}
            onClick={() => onSelect(ch.quizHostChannelId)}
          />
        ))}
      </div>
    </motion.div>
  );
};

const ChannelDetailView = ({
  detail,
  participantChannelId,
  onBack,
}: {
  detail: LoyaltyChannelDetail;
  participantChannelId: string;
  onBack: () => void;
}) => {
  const s = detail.summary;

  return (
    <motion.div
      key="channel-detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Back + channel header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div
          className={`h-10 w-10 rounded-xl ${channelColor(detail.hostChannelId)} flex items-center justify-center text-white font-bold shrink-0`}
        >
          {s ? initials(s.quizHostChannelTitle) : "?"}
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-base leading-tight truncate">
            {s?.quizHostChannelTitle || detail.hostChannelId}
          </h2>
          {s?.quizHostChannelHandle && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Youtube className="h-3 w-3 text-rose-500" />
              {s.quizHostChannelHandle}
            </p>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatCard icon={Star} label="Quizzes Played" value={s.quizzesPlayed} />
          <StatCard icon={Coins} label="Coins Earned" value={fmtCoins(s.totalCoins)} accent />
          <StatCard icon={Gift} label="Prizes Won" value={s.totalPrizesWon} sub="Redeemed: 0" />
          <StatCard
            icon={Clock}
            label="Avg Response"
            value={fmtMs(s.avgResponseTimeMs)}
            sub={s.bestRank !== null ? `Best rank: ${ordinal(s.bestRank)}` : undefined}
          />
          <CouponsSection
            participantChannelId={participantChannelId}
            hostChannelIdFilter={detail.hostChannelId}
          />
        </div>
      )}

      {/* Secondary stats row */}
      {s && (
        <div className="flex flex-wrap gap-2 mb-6">
          {s.firstPlaces > 0 && (
            <Badge variant="outline" className="gap-1">
              <Trophy className="h-3 w-3 text-amber-500" />
              {s.firstPlaces} × 1st
            </Badge>
          )}
          {s.secondPlaces > 0 && (
            <Badge variant="outline" className="gap-1">
              <Medal className="h-3 w-3 text-slate-400" />
              {s.secondPlaces} × 2nd
            </Badge>
          )}
          {s.thirdPlaces > 0 && (
            <Badge variant="outline" className="gap-1">
              <Medal className="h-3 w-3 text-amber-700" />
              {s.thirdPlaces} × 3rd
            </Badge>
          )}
          {s.top10Places > 0 && (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Star className="h-3 w-3" />
              {s.top10Places} × Top 10
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {s.totalResponses > 0
              ? `${Math.round((s.totalCorrectAnswers / s.totalResponses) * 100)}% accuracy`
              : "No answers"}
          </Badge>
        </div>
      )}

      {/* Quiz history table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Quiz History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {detail.quizzes.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No completed quizzes found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-muted-foreground">
                      Episode
                    </th>
                    <th className="py-2.5 px-4 text-center text-xs font-semibold text-muted-foreground">
                      Rank
                    </th>
                    <th className="py-2.5 px-4 text-center text-xs font-semibold text-muted-foreground">
                      Coins
                    </th>
                    <th className="py-2.5 px-4 text-center text-xs font-semibold text-muted-foreground">
                      Correct
                    </th>
                    <th className="py-2.5 px-4 text-center text-xs font-semibold text-muted-foreground">
                      Avg Time
                    </th>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-muted-foreground">
                      Prizes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detail.quizzes.map((quiz, i) => (
                    <QuizRow key={quiz.frontendQuizGameId} quiz={quiz} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const Loyalty = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<LoyaltyChannelSummary[]>([]);
  const [detail, setDetail] = useState<LoyaltyChannelDetail | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    if (!user?.youtubeChannelId) return;
    setLoading(true);
    setError(null);
    const result = await getLoyaltyChannels(user.youtubeChannelId);
    if (!result.success) {
      setError(result.error || "Failed to load loyalty data");
    } else {
      setChannels(result.data?.channels || []);
    }
    setLoading(false);
  }, [user?.youtubeChannelId]);

  useEffect(() => {
    if (user?.youtubeChannelId) loadChannels();
    else setLoading(false);
  }, [user?.youtubeChannelId, loadChannels]);

  const handleSelectChannel = useCallback(async (channelId: string) => {
    if (!user?.youtubeChannelId) return;
    setSelectedChannelId(channelId);
    setDetailLoading(true);
    setDetail(null);
    const result = await getLoyaltyChannelDetail(user.youtubeChannelId, channelId);
    if (result.success && result.data) {
      setDetail(result.data);
    } else {
      setError(result.error || "Failed to load channel detail");
      setSelectedChannelId(null);
    }
    setDetailLoading(false);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedChannelId(null);
    setDetail(null);
  }, []);

  if (!user?.youtubeChannelId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4 md:p-6 relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader title="Loyalty" icon={Coins} description="Your quiz participation history and coins across all channels" />
          <div className="text-center py-16">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-semibold text-lg mb-2">YouTube channel required</h2>
            <p className="text-sm text-muted-foreground">
              Sign in with a Google account that has a YouTube channel to view your loyalty history.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4 md:p-6 relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Loyalty"
          icon={Coins}
          description="Your quiz participation history and coins across all channels"
        />

        {/* Loading */}
        {(loading || detailLoading) && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && !loading && !detailLoading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={loadChannels}>
              Retry
            </Button>
          </div>
        )}

        {/* Content */}
        {!loading && !detailLoading && !error && (
          <AnimatePresence mode="wait">
            {selectedChannelId && detail ? (
              <ChannelDetailView
                key="detail"
                detail={detail}
                participantChannelId={user.youtubeChannelId}
                onBack={handleBack}
              />
            ) : (
              <ChannelListView
                key="list"
                channels={channels}
                participantChannelId={user.youtubeChannelId}
                onSelect={handleSelectChannel}
              />
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Loyalty;
