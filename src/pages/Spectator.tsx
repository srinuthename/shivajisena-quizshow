import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Trophy, Users, Sparkles, Zap, Star, Crown, Flame, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Team, QuestionData } from "@/types/quiz";
import confetti from 'canvas-confetti';
import { useSounds } from "@/hooks/useSounds";
import { LiveResponseCounter } from "@/components/LiveResponseCounter";
import { AnswerDistributionChart } from "@/components/AnswerDistributionChart";
import { SpectatorEngagement } from "@/components/SpectatorEngagement";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBranding } from "@/hooks/useBranding";
import { useQuizStore } from "@/store/quizStore";
import { ADMIN_SETTINGS_UPDATED_EVENT, readMirroredAdminSettingSync } from "@/lib/adminConfigPersistence";

const TEAM_COLORS = [
  "bg-gradient-to-r from-pink-500 to-rose-500",
  "bg-gradient-to-r from-blue-500 to-cyan-500",
  "bg-gradient-to-r from-green-500 to-emerald-500",
  "bg-gradient-to-r from-orange-500 to-amber-500",
];

export const Spectator = () => {
  usePageTitle();
  const { pageTitle } = useBranding();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamScores, setTeamScores] = useState<number[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [questionActive, setQuestionActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [masterTimerSeconds, setMasterTimerSeconds] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);
  const [gameEnded, setGameEnded] = useState(false);
  const [prevShowReveal, setPrevShowReveal] = useState(false);
  const [showCorrectFlash, setShowCorrectFlash] = useState(false);
  const [showWrongFlash, setShowWrongFlash] = useState(false);
  const [viewerResponseCounts, setViewerResponseCounts] = useState<Record<number, number>>({});
  const [totalViewerResponses, setTotalViewerResponses] = useState(0);
  const [uniqueResponders, setUniqueResponders] = useState(0);
  const [responseRate, setResponseRate] = useState(0);
  const lastResponseCountRef = useRef(0);
  const responseRateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameState = useQuizStore((state) => state.gameState);
  const viewerStats = useQuizStore((state) => state.viewerStats);

  const { playCorrect, playWrong, playBuzzer } = useSounds();

  // Trigger confetti and sounds when correct answer is revealed
  useEffect(() => {
    if (showRevealAnimation && !prevShowReveal && currentQuestion && selectedAnswer !== null) {
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      if (isCorrect) {
        setShowCorrectFlash(true);
        // Play correct sound
        playCorrect();
        // Fire celebratory confetti
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6B00', '#FF4500', '#FFFFFF'],
        });
        setTimeout(() => setShowCorrectFlash(false), 1500);
      } else {
        setShowWrongFlash(true);
        // Play wrong buzzer sound
        playBuzzer();
        setTimeout(() => setShowWrongFlash(false), 800);
      }
    }
    setPrevShowReveal(showRevealAnimation);
  }, [showRevealAnimation, prevShowReveal, currentQuestion, selectedAnswer, playCorrect, playBuzzer]);

  // Load initial team configs (static unless admin changes)
  useEffect(() => {
    const loadTeams = (raw?: string | null) => {
      const configs = raw ? JSON.parse(raw) : readMirroredAdminSettingSync<any[]>("teamConfigs", []);
      if (Array.isArray(configs) && configs.length > 0) {
        const loadedTeams = configs.map((config: any, i: number) => ({
          id: i + 1,
          name: config.name,
          members: config.members || [],
          score: 0,
          color: TEAM_COLORS[i % TEAM_COLORS.length]
        }));
        setTeams(loadedTeams);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'teamConfigs') loadTeams(e.newValue);
    };
    const handleAdminSettings = () => loadTeams();

    loadTeams();
    window.addEventListener('storage', handleStorage);
    window.addEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleAdminSettings);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleAdminSettings);
    };
  }, []);

  useEffect(() => {
    if (!gameState) return;
    setCurrentTeamIndex(gameState.currentTeamIndex || 0);
    setCurrentQuestion(gameState.currentQuestion || null);
    setQuestionActive(gameState.questionActive || false);
    setTeamScores(gameState.teamScores || []);
    setTimerSeconds(gameState.timerSeconds || 0);
    setMasterTimerSeconds(gameState.masterTimerSeconds || 0);
    setSelectedAnswer(gameState.selectedAnswer ?? null);
    setShowRevealAnimation(gameState.showRevealAnimation || false);
    setShowCountdown(gameState.showCountdown || false);
    setCountdownValue(gameState.countdownValue || 5);
    setGameEnded(gameState.gameEnded || false);
  }, [gameState]);

  useEffect(() => {
    setViewerResponseCounts(viewerStats.counts || {});
    setTotalViewerResponses(viewerStats.total || 0);
    setUniqueResponders(viewerStats.unique || 0);
  }, [viewerStats]);

  // Calculate response rate
  useEffect(() => {
    responseRateTimerRef.current = setInterval(() => {
      const currentCount = totalViewerResponses;
      const diff = currentCount - lastResponseCountRef.current;
      lastResponseCountRef.current = currentCount;
      setResponseRate(diff / 0.5); // Rate per second (interval is 500ms)
    }, 500);

    return () => {
      if (responseRateTimerRef.current) {
        clearInterval(responseRateTimerRef.current);
      }
    };
  }, [totalViewerResponses]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sortedTeams = teams
    .map((team, index) => ({ ...team, score: teamScores[index] || 0, originalIndex: index }))
    .sort((a, b) => b.score === a.score ? a.originalIndex - b.originalIndex : b.score - a.score);

  // Find highest score for proper medal awarding (like Leaderboard component)
  const highestScore = Math.max(...sortedTeams.map(t => t.score), 0);

  // Helper to get position indicator - matches Leaderboard logic
  const getPositionIndicator = (rank: number, teamScore: number) => {
    // Trophy for team(s) with highest score (and score > 0)
    if (teamScore === highestScore && highestScore > 0) {
      return "🏆";
    }
    // Standard medals for positions 2 and 3
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    // Number for 4th and beyond
    return `${rank + 1}`;
  };

  if (gameEnded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8 overflow-hidden">
        {/* Victory particles */}
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
                y: (typeof window !== 'undefined' ? window.innerHeight : 600) + 50
              }}
              animate={{
                y: -50,
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
                rotate: [0, 360],
              }}
              transition={{
                duration: 4 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            >
              <Star className="h-4 w-4 text-primary/60" />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="text-center relative"
        >
          <motion.div
            className="absolute -top-20 left-1/2 -translate-x-1/2"
            animate={{
              y: [0, -10, 0],
              rotate: [-5, 5, -5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className="h-24 w-24 text-primary drop-shadow-lg" />
          </motion.div>

          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Trophy className="h-32 w-32 text-primary mx-auto mb-8 drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)]" />
          </motion.div>
          <motion.h1 
            className="text-6xl lg:text-8xl font-bold text-primary mb-4 animate-text-shimmer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Game Over!
          </motion.h1>
          <motion.h2 
            className="text-4xl lg:text-6xl font-bold text-foreground mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Winner: {sortedTeams[0]?.name}
          </motion.h2>
          <motion.div 
            className="text-8xl lg:text-9xl font-bold text-primary animate-glow-pulse"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: "spring" }}
          >
            {sortedTeams[0]?.score} pts
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 lg:p-4 xl:p-6 overflow-y-auto relative flex flex-col">
      {/* Screen flash effects */}
      <AnimatePresence>
        {showCorrectFlash && (
          <motion.div
            className="fixed inset-0 bg-quiz-correct/30 pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}
        {showWrongFlash && (
          <motion.div
            className="fixed inset-0 bg-quiz-incorrect/30 pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Floating Particles - Fewer on mobile, more on TV */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : window.innerWidth > 1200 ? 40 : 20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 sm:w-2 lg:w-3 h-1.5 sm:h-2 lg:h-3 bg-primary/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20
            }}
            animate={{
              y: -20,
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Decorative corner flames for TV mode */}
      <div className="hidden lg:block">
        <motion.div
          className="fixed top-0 left-0 w-32 h-32 opacity-30"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Flame className="w-full h-full text-primary" />
        </motion.div>
        <motion.div
          className="fixed top-0 right-0 w-32 h-32 opacity-30 -scale-x-100"
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        >
          <Flame className="w-full h-full text-primary" />
        </motion.div>
      </div>

      {/* Header - Mobile Optimized, TV Enhanced */}
 {/* Header Headband (Viewer-style) */}
<motion.div
  initial={{ y: -60, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  className="relative z-10 mb-4 lg:mb-6"
>
  <div className="
    max-w-[1920px] w-full mx-auto
    flex flex-wrap items-center justify-between gap-4
    px-4 lg:px-6 py-3 lg:py-4
    rounded-xl lg:rounded-2xl
    bg-card/70 border border-border
    shadow-lg backdrop-blur
  ">

    {/* Left: Title */}
    <motion.h1
      className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-primary whitespace-nowrap"
      animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
      transition={{ duration: 5, repeat: Infinity }}
      style={{ backgroundSize: "200%" }}
    >
      {pageTitle}
    </motion.h1>

    {/* Center: Master Timer */}
    <motion.div
      className={`
        flex items-center gap-3 px-4 py-2 rounded-xl
        ${masterTimerSeconds <= 60
          ? "bg-destructive/20 border-2 border-destructive"
          : "bg-muted/40 border border-border"
        }
      `}
      animate={masterTimerSeconds <= 60 ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <Clock
        className={`h-6 w-6 ${
          masterTimerSeconds <= 60 ? "text-red-500" : "text-primary"
        }`}
      />
      <span
        className={`text-xl sm:text-2xl font-mono font-bold ${
          masterTimerSeconds <= 60 ? "text-red-500" : "text-foreground"
        }`}
      >
        {formatTime(masterTimerSeconds)}
      </span>
    </motion.div>

    {/* Right: Status */}
    <div className="flex items-center gap-3">
      {questionActive && (
        <Badge className="
          px-4 py-2
          bg-emerald-500/20 border border-emerald-500/50
          text-emerald-400 flex items-center gap-2
        ">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Question Active
        </Badge>
      )}
    </div>

  </div>
</motion.div>

      <div className="max-w-[1920px] w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-4 xl:gap-6 relative z-10">
        {/* Scoreboard - Top on mobile, left side on desktop */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-card rounded-lg lg:rounded-2xl p-1 lg:p-4 border border-border lg:border-2 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto"
          >
            {/* Horizontal scroll on mobile, vertical on desktop */}
            <div
              className="
              grid grid-cols-2 gap-1
              sm:grid-cols-2
              lg:flex lg:flex-col lg:gap-4
            "
            >
              {sortedTeams.map((team, rank) => (
                <motion.div
                  key={team.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rank * 0.1 }}
                  className={`relative p-2 lg:p-4 xl:p-6 rounded-md lg:rounded-xl ${team.color} text-white overflow-hidden flex-shrink-0 min-w-[140px] sm:min-w-[160px] lg:min-w-0`}
                >
                  {/* Sparkle effect for leader */}
                  {rank === 0 && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    />
                  )}

                  <div className="relative flex items-center justify-between gap-1 lg:gap-3">
                    <div className="flex items-center gap-1 lg:gap-3">
                      <span className="text-xl sm:text-3xl lg:text-4xl xl:text-5xl">
                        {getPositionIndicator(rank, team.score)}
                      </span>
                      <div>
                        <div className="font-bold text-sm sm:text-xl lg:text-2xl xl:text-3xl truncate max-w-[80px] sm:max-w-none lg:max-w-[120px] xl:max-w-none">{team.name}</div>
                        {team.originalIndex === currentTeamIndex && questionActive && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                            className="flex items-center gap-1 text-xs sm:text-sm lg:text-lg"
                          >
                            <Zap className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                            <span>Playing</span>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    <motion.span
                      key={team.score}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold"
                    >
                      {team.score}
                    </motion.span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Engagement Widget */}
          <SpectatorEngagement
            responseRate={responseRate}
            totalResponses={totalViewerResponses}
            uniqueResponders={uniqueResponders}
            isActive={questionActive && !showRevealAnimation}
          />
        </div>

        {/* Question Display - Center */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <AnimatePresence mode="wait">
            {questionActive && currentQuestion ? (
              <motion.div
                key="question"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card rounded-2xl sm:rounded-3xl p-3 lg:p-6 xl:p-8 border-2 lg:border-4 border-primary shadow-lg lg:shadow-2xl lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto"
              >
                {/* Current Team Indicator - Mobile Optimized, TV Enhanced */}
                <motion.div
                  className="flex flex-wrap items-center justify-center gap-1 lg:gap-3 mb-2 lg:mb-4"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Users className="h-5 w-5 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary" />
                  <span className="text-base sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-muted-foreground">Now Playing:</span>
                  <Badge className={`${TEAM_COLORS[currentTeamIndex % TEAM_COLORS.length]} text-white text-base sm:text-2xl lg:text-3xl xl:text-4xl px-3 py-1 lg:px-6 lg:py-2`}>
                    {teams[currentTeamIndex]?.name}
                  </Badge>
                </motion.div>

                {/* Timer Bar - Mobile Optimized, TV Enhanced */}
                <div className="relative h-4 lg:h-8 mb-4 sm:mb-8 bg-muted/50 rounded-full overflow-hidden border border-border/30 lg:border-2">
                  <motion.div
                    className={`h-full rounded-full ${timerSeconds > 60 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                      timerSeconds > 30 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                        'bg-gradient-to-r from-red-400 to-rose-500'
                      }`}
                    style={{ width: `${(timerSeconds / 90) * 100}%` }}
                    animate={timerSeconds <= 10 ? { opacity: [1, 0.5, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm sm:text-lg lg:text-2xl xl:text-3xl font-bold text-foreground drop-shadow-lg">
                      {timerSeconds}s
                    </span>
                  </div>
                </div>

                {/* Countdown Overlay */}
                <AnimatePresence>
                  {showCountdown && (
                    <motion.div
                      className="fixed inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        key={countdownValue}
                        className="text-[200px] lg:text-[300px] font-bold text-primary drop-shadow-[0_0_60px_hsl(var(--primary)/0.8)]"
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.8 }}
                      >
                        {countdownValue}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Question Text - Mobile Optimized, TV Enhanced */}
                <motion.h2
                  className="text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center text-foreground mb-3 lg:mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {currentQuestion.text}
                </motion.h2>

                {/* Options Grid - Mobile Optimized, TV Enhanced */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 lg:gap-6">
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = index === currentQuestion.correctAnswer;
                    const isSelected = selectedAnswer === index;
                    const isRevealed = showRevealAnimation;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                        animate={{ 
                          opacity: 1, 
                          x: 0,
                          scale: isRevealed && isCorrect ? [1, 1.05, 1] : 1,
                        }}
                        transition={{ 
                          delay: index * 0.1,
                          scale: { duration: 0.5, repeat: isRevealed && isCorrect ? Infinity : 0, repeatDelay: 1 }
                        }}
                        className={`p-3 lg:p-6 xl:p-8 rounded-xl sm:rounded-2xl lg:rounded-3xl border-2 lg:border-4 transition-all ${isRevealed && isCorrect
                          ? 'bg-quiz-correct/20 border-quiz-correct shadow-[0_0_30px_hsl(145_72%_42%/0.5)] animate-glow-pulse'
                          : isRevealed && isSelected && !isCorrect
                            ? 'bg-quiz-incorrect/20 border-quiz-incorrect'
                            : isSelected
                              ? 'bg-primary/20 border-primary shadow-lg'
                              : isRevealed
                                ? 'bg-muted/30 border-border/50 opacity-50'
                                : 'bg-muted border-border'
                          }`}
                      >
                        <div className="flex items-center gap-2 lg:gap-4">
                          <motion.span 
                            className={`text-xl sm:text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-bold flex-shrink-0 ${
                              isRevealed && isCorrect ? 'text-quiz-correct' : 'text-primary'
                            }`}
                            animate={isRevealed && isCorrect ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          >
                            {String.fromCharCode(65 + index)}
                          </motion.span>
                          <span className={`text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-medium ${
                            isRevealed && !isCorrect ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {option}
                          </span>
                          {isRevealed && isCorrect && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="ml-auto flex items-center gap-2"
                            >
                              <motion.div
                                animate={{ rotate: [0, 15, -15, 0] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              >
                                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 lg:h-12 lg:w-12 xl:h-16 xl:w-16 text-emerald-500" />
                              </motion.div>
                            </motion.div>
                          )}
                          {isRevealed && isSelected && !isCorrect && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto"
                            >
                              <span className="text-2xl lg:text-4xl">❌</span>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Viewer Stats Section */}
                <motion.div
                  className="mt-4 lg:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {/* Live Response Counter */}
                  <div className="bg-card/50 rounded-xl p-3 lg:p-4 border border-border/50">
                    <div className="flex items-center gap-2 mb-2 lg:mb-3">
                      <Users className="w-4 h-4 lg:w-6 lg:h-6 text-primary" />
                      <span className="text-sm lg:text-xl font-bold text-foreground">Live Viewer Responses</span>
                    </div>
                    <LiveResponseCounter
                      totalResponses={totalViewerResponses}
                      uniqueResponders={uniqueResponders}
                      responseRate={responseRate}
                      isActive={questionActive && !showRevealAnimation}
                    />
                  </div>

                  {/* Answer Distribution Chart */}
                  <div className="bg-card/50 rounded-xl p-3 lg:p-4 border border-border/50">
                    <AnswerDistributionChart
                      counts={viewerResponseCounts}
                      correctAnswer={currentQuestion.correctAnswer}
                      isRevealed={showRevealAnimation}
                    />
                  </div>
                </motion.div>

                {/* Reveal celebration */}
                <AnimatePresence>
                  {showRevealAnimation && selectedAnswer === currentQuestion.correctAnswer && (
                    <motion.div
                      className="mt-6 lg:mt-10 text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="inline-flex items-center gap-3 lg:gap-6 bg-quiz-correct/20 rounded-2xl lg:rounded-3xl px-6 py-3 lg:px-12 lg:py-6 border-2 lg:border-4 border-quiz-correct"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Sparkles className="h-8 w-8 lg:h-16 lg:w-16 text-quiz-correct" />
                        <span className="text-2xl lg:text-5xl xl:text-6xl font-bold text-quiz-correct">
                          CORRECT!
                        </span>
                        <Sparkles className="h-8 w-8 lg:h-16 lg:w-16 text-quiz-correct" />
                      </motion.div>
                    </motion.div>
                  )}
                  {showRevealAnimation && selectedAnswer !== null && selectedAnswer !== currentQuestion.correctAnswer && (
                    <motion.div
                      className="mt-6 lg:mt-10 text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="inline-flex items-center gap-3 lg:gap-6 bg-quiz-incorrect/20 rounded-2xl lg:rounded-3xl px-6 py-3 lg:px-12 lg:py-6 border-2 lg:border-4 border-quiz-incorrect"
                        animate={{ x: [-5, 5, -5, 5, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <span className="text-3xl lg:text-5xl">😢</span>
                        <span className="text-2xl lg:text-5xl xl:text-6xl font-bold text-quiz-incorrect">
                          WRONG!
                        </span>
                        <span className="text-3xl lg:text-5xl">😢</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 lg:p-20 xl:p-24 border border-border lg:border-2 text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Zap className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-32 lg:w-32 xl:h-40 xl:w-40 text-primary mx-auto mb-4 sm:mb-6 md:mb-8 drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)]" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-2 sm:mb-4">
                  Waiting for Question...
                </h2>
                <p className="text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-muted-foreground">
                  Get ready! The next question is coming soon.
                </p>

                {/* Animated dots */}
                <div className="flex justify-center gap-3 mt-8">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-4 h-4 lg:w-6 lg:h-6 rounded-full bg-primary"
                      animate={{ y: [0, -20, 0] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Spectator;
