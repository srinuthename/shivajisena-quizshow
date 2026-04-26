import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Crown,
  Sparkles,
  Clock,
  Star,
  Zap,
  Target,
  Flame,
  CheckCircle,
  X,
  Medal,
  Shield,
  Award,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  ViewerAchievementBadge,
  AchievementType,
  calculateAchievements
} from "./ViewerAchievementBadge";
import { StreakFlamesBadge } from "./StreakFlames";
import { LeaderboardEntry } from "./LiveLeaderboard";
import { ChatResponse } from "./YouTubeChatResponses";
import { QuestionData } from "@/types/quiz";
import { useEffect, useState, useMemo } from "react";
import confetti from "canvas-confetti";
import { useTranslation } from "@/hooks/useTranslation";

interface QuestionResultPanelProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionData | null;
  correctAnswer: number | null;
  isCorrectResult: boolean; // true = team got it right, false = wrong
  allResponses: ChatResponse[];
  leaderboard: LeaderboardEntry[];
  questionNumber?: string | number;
}

// Shield/Memento Card for each correct participant
const ParticipantCard = ({
  response,
  rank,
  totalParticipants,
  leaderboardEntry,
  index,
  isFirstCorrect,
  isFastest,
  translations,
}: {
  response: ChatResponse;
  rank: number;
  totalParticipants: number;
  leaderboardEntry?: LeaderboardEntry;
  index: number;
  isFirstCorrect: boolean;
  isFastest: boolean;
  translations: { first: string; fastest: string };
}) => {
  const achievements = useMemo(() => {
    if (!leaderboardEntry) return [];
    return calculateAchievements(
      {
        avgResponseTimeMs: leaderboardEntry.avgResponseTimeMs,
        correctAnswers: leaderboardEntry.correctAnswers,
        totalResponses: leaderboardEntry.totalResponses,
        streak: leaderboardEntry.streak,
        previousRank: leaderboardEntry.previousRank,
        isFirstCorrect,
        isFastestResponse: isFastest,
      },
      rank,
      totalParticipants
    );
  }, [leaderboardEntry, rank, totalParticipants, isFirstCorrect, isFastest]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Determine card glow based on ranking
  const getCardGlow = () => {
    if (rank === 1) return "shadow-[0_0_30px_rgba(234,179,8,0.5)]";
    if (rank === 2) return "shadow-[0_0_20px_rgba(156,163,175,0.4)]";
    if (rank === 3) return "shadow-[0_0_20px_rgba(217,119,6,0.4)]";
    return "shadow-lg";
  };

  const getRankBadge = () => {
    if (rank === 1) return (
      <div className="absolute -top-3 -right-3 z-10">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Crown className="h-8 w-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
        </motion.div>
      </div>
    );
    if (rank === 2) return (
      <div className="absolute -top-2 -right-2 z-10">
        <Medal className="h-6 w-6 text-gray-300" />
      </div>
    );
    if (rank === 3) return (
      <div className="absolute -top-2 -right-2 z-10">
        <Medal className="h-6 w-6 text-amber-600" />
      </div>
    );
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.08,
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      className="relative"
    >
      {getRankBadge()}

      {/* Shield/Memento shaped card */}
      <div
        className={`
          relative overflow-hidden
          bg-gradient-to-br from-card via-card to-muted/50
          border-2 border-border/50
          rounded-t-2xl rounded-b-[40%]
          p-4 pb-6
          min-w-[180px] max-w-[200px]
          ${getCardGlow()}
          hover:scale-105 transition-transform duration-300
        `}
      >
        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

        {/* Rank number badge */}
        <div className="absolute top-2 left-2">
          <span className={`
            text-xs font-bold px-2 py-0.5 rounded-full
            ${rank <= 3
              ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border border-yellow-500/50'
              : 'bg-muted text-muted-foreground border border-border'}
          `}>
            #{rank}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-3 mt-4">
          <div className={`
            relative rounded-full p-1
            ${rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
              rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                rank === 3 ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                  'bg-gradient-to-br from-primary/50 to-primary'}
          `}>
            <Avatar className="h-16 w-16 border-2 border-background">
              <AvatarImage src={response.avatarUrl} alt={response.userName} />
              <AvatarFallback className="text-lg font-bold bg-muted">
                {(response.userName || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Name */}
        <h3 className="text-center font-bold text-sm text-foreground truncate px-2 mb-2">
          {response.userName}
        </h3>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3 text-cyan-400" />
            <span className="text-cyan-300 font-mono font-bold">
              {formatTime(response.responseTimeMs)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Zap className="h-3 w-3 text-yellow-400" />
            <span className="text-yellow-300 font-bold">
              +{response.score || 0}
            </span>
          </div>
        </div>

        {/* Cumulative Total Score */}
        {leaderboardEntry && (
          <div className="flex items-center justify-center gap-1 mb-3">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
              <Trophy className="h-3 w-3 text-primary" />
              <span className="text-xs font-bold text-primary">
                {leaderboardEntry.totalScore}
              </span>
              <span className="text-[10px] text-muted-foreground">total</span>
            </div>
          </div>
        )}

        {/* Streak badge */}
        {leaderboardEntry?.streak && leaderboardEntry.streak >= 2 && (
          <div className="flex justify-center mb-2">
            <StreakFlamesBadge streak={leaderboardEntry.streak} />
          </div>
        )}

        {/* Achievement badges */}
        {achievements.length > 0 && (
          <div className="flex justify-center flex-wrap gap-1">
            {achievements.slice(0, 3).map((achievement, i) => (
              <ViewerAchievementBadge
                key={achievement}
                type={achievement}
                size="md"
                animate={true}
              />
            ))}
          </div>
        )}

        {/* Special badges for first/fastest */}
        <div className="flex justify-center gap-1 mt-2">
          {isFirstCorrect && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] px-2 py-0 border-0">
                <Flame className="h-3 w-3 mr-1" />
                {translations.first}
              </Badge>
            </motion.div>
          )}
          {isFastest && !isFirstCorrect && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] px-2 py-0 border-0">
                <Zap className="h-3 w-3 mr-1" />
                {translations.fastest}
              </Badge>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const QuestionResultPanel = ({
  isOpen,
  onClose,
  question,
  correctAnswer,
  isCorrectResult,
  allResponses,
  leaderboard,
  questionNumber,
}: QuestionResultPanelProps) => {
  const { t } = useTranslation();
  const [sparklePositions, setSparklePositions] = useState<Array<{ x: number; y: number }>>([]);

  // Get correct responses sorted by response time
  const correctResponses = useMemo(() => {
    if (correctAnswer === null) return [];
    const correctLetter = ["A", "B", "C", "D"][correctAnswer];
    return allResponses
      .filter(r => r.answer === correctLetter || r.isCorrect)
      .sort((a, b) => a.responseTimeMs - b.responseTimeMs);
  }, [allResponses, correctAnswer]);

  // Find fastest and first correct
  const fastestResponseTime = correctResponses.length > 0
    ? Math.min(...correctResponses.map(r => r.responseTimeMs))
    : 0;
  const firstCorrectId = correctResponses[0]?.odytChannelId;

  // Create leaderboard lookup
  const leaderboardMap = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    leaderboard.forEach(entry => map.set(entry.odytChannelId, entry));
    return map;
  }, [leaderboard]);

  // Answer options
  const answerLetters = ["A", "B", "C", "D"];
  const correctAnswerText = question && correctAnswer !== null
    ? question.options[correctAnswer]
    : "";
  const correctAnswerLetter = correctAnswer !== null
    ? answerLetters[correctAnswer]
    : "";

  // Sparkle positions
  useEffect(() => {
    if (isOpen) {
      const positions = Array.from({ length: 30 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
      }));
      setSparklePositions(positions);

      // Fire confetti on open
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.3 },
          colors: ['#ffd700', '#ff6b35', '#22c55e', '#3b82f6', '#a855f7']
        });
      }, 300);
    }
  }, [isOpen]);

  if (!question) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 border-2 border-primary/30 bg-background/98 backdrop-blur-xl overflow-hidden"
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>{t.questionResult}</DialogTitle>
        </VisuallyHidden>

        {/* Animated background sparkles */}
        {sparklePositions.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none z-0"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0, 1.2, 0],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.15
            }}
          >
            <Sparkles className="h-4 w-4 text-primary/60" />
          </motion.div>
        ))}

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-muted/50 hover:bg-muted"
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="relative z-10 h-full flex flex-col p-6 overflow-hidden">
          {/* Header with Question Info */}
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  className="mb-6"
>
  {/* Top Row */}
  <div className="flex items-start gap-6">
    
    {/* Left: Question Number */}
    {questionNumber && (
      <Badge className="shrink-0 bg-gradient-to-r from-primary/80 to-primary text-primary-foreground text-lg px-4 py-1 border-0">
        Q{questionNumber}
      </Badge>
    )}

    {/* Middle: Question Text (wraps) */}
    <h2 className="flex-1 text-xl md:text-2xl font-bold text-foreground leading-tight">
      {question.text}
    </h2>

    {/* Right: Correct Answer */}
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="shrink-0 flex items-center gap-4 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 px-6 py-3 rounded-2xl border-2 border-green-500/50"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white font-bold text-2xl shadow-lg shadow-green-500/30">
        {correctAnswerLetter}
      </div>
      <div className="text-left max-w-[220px]">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {t.correctAnswer}
        </p>
        <p className="text-sm font-bold text-green-300 truncate">
          {correctAnswerText}
        </p>
      </div>
    </motion.div>
  </div>

  {/* Bottom Row: Correct Answer Explanation */}
  {question.correctAnswerText && (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="mt-3 text-muted-foreground text-sm italic"
    >
      💡 {question.correctAnswerText}
    </motion.p>
  )}
</motion.div>


          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-8 mb-6"
          >
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="text-foreground font-bold">{correctResponses.length}</span>
              <span className="text-muted-foreground text-sm">{t.correct}</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
              <Target className="h-5 w-5 text-blue-400" />
              <span className="text-foreground font-bold">{allResponses.length}</span>
              <span className="text-muted-foreground text-sm">{t.totalResponses}</span>
            </div>
            {correctResponses.length > 0 && (
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span className="text-foreground font-bold">
                  {allResponses.length > 0
                    ? ((correctResponses.length / allResponses.length) * 100).toFixed(0)
                    : "0"
                  }%
                </span>
                <span className="text-muted-foreground text-sm">{t.accuracy}</span>
              </div>
            )}
          </motion.div>



          {/* Participants grid */}

<ScrollArea className="flex-1 px-4">
  <div className="pt-10">
    {correctResponses.length > 0 ? (
      <motion.div
        className="flex flex-wrap justify-center gap-6 pb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
          {correctResponses.map((response, index) => (
            <ParticipantCard
              key={response.odytChannelId}
              response={response}
              rank={index + 1}
              totalParticipants={correctResponses.length}
              leaderboardEntry={leaderboardMap.get(response.odytChannelId)}
              index={index}
              isFirstCorrect={response.odytChannelId === firstCorrectId}
              isFastest={response.responseTimeMs === fastestResponseTime}
              translations={{ first: t.first, fastest: t.fastest }}
            />
        ))}
      </motion.div>
    ) : (
      <div className="py-16 text-center text-muted-foreground">
        {t.noCorrectAnswers}
      </div>
    )}
  </div>
</ScrollArea>

          {/* Footer with close button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center pt-4"
          >
            <Button
              onClick={onClose}
              size="lg"
              className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground px-8 py-3 text-lg font-bold shadow-lg shadow-primary/30"
            >
              {t.continueText}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionResultPanel;
