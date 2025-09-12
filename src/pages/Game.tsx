import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { questionService } from "@/services/questionService";
import { settingsService } from "@/services/settingsService";
import { apiService } from "@/services/apiService";
import { GameState, GamePhase, ViewerVote, Question } from "@/types/game";
import { updateScore } from "@/lib/api";
import { QuestionCard } from "@/components/QuestionCard";
import { AnswerOptions } from "@/components/AnswerOptions";
import { Timer } from "@/components/Timer";
import { ScientistProgress } from "@/components/ScientistProgress";
import { HostControls } from "@/components/HostControls";
import { WinnerScreen } from "@/components/WinnerScreen";
import { WinnerModal } from "@/components/WinnerModal";
import { PrizeModal } from "@/components/PrizeModal";
import { FinalWinnerMessage } from "@/components/FinalWinnerMessage";
import { Lifelines } from "@/components/Lifelines";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Button } from "@/components/ui/button";
import { GAME_CONSTANTS } from "@/constants/game";
import { LanguageToggle } from "@/components/LanguageToggle";
import { X, Gift, Home, PenTool, Award, CheckCircle, Crown, Trophy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Game() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>("question");
  const [timerDuration, setTimerDuration] = useState<number>(GAME_CONSTANTS.DEFAULT_TIMER_DURATION);
  const [targetScore, setTargetScore] = useState<number>(GAME_CONSTANTS.DEFAULT_TARGET_SCORE);
  const [pointsPerQuestion, setPointsPerQuestion] = useState<number>(GAME_CONSTANTS.DEFAULT_POINTS_PER_QUESTION);
  const [questionCount, setQuestionCount] = useState(11);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const [gameShowMode, setGameShowMode] = useState("Solo");
  const [isPaused, setIsPaused] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    currentQuestion: 0,
    score: 0,
    guestAnswer: null,
    finalAnswer: null,
    viewerVotes: [],
    isRevealed: false,
    hasChangedAnswer: false,
    timeRemaining: 30,
    answeredQuestions: new Array(10).fill(false),
    skippedQuestions: new Array(10).fill(false),
    allQuestionsCompleted: false,
    lifelines: {
      checkAnswer: true,
      fiftyFifty: true,
    },
    eliminatedOptions: undefined,
    checkAnswerResult: null,
    lifelinesUsedCurrentQuestion: 0,
  });

  const [isLoadingVotes, setIsLoadingVotes] = useState(false);
  const { toast } = useToast();

  // Load questions and settings on mount
  const [useApiScoring, setUseApiScoring] = useState(false);
  const [allowNegativeMarks, setAllowNegativeMarks] = useState(true);
  const [negativePointsPerQuestion, setNegativePointsPerQuestion] = useState<number>(GAME_CONSTANTS.DEFAULT_INCORRECT_NEGATIVE_POINTS);
  const [skipPenaltyPointsPerQuestion, setSkipPenaltyPointsPerQuestion] = useState<number>(GAME_CONSTANTS.DEFAULT_SKIP_PENALTY_POINTS);
  const [lifelinePenaltyPointsPerLifeline, setLifelinePenaltyPointsPerLifeline] = useState<number>(GAME_CONSTANTS.DEFAULT_LIFELINE_PENALTY_POINTS);
const [showPrizeStructure, setShowPrizeStructure] = useState(false);

  const [fetchViewerVotes, setFetchViewerVotes] = useState(false);
  const [allowAnswerReview, setAllowAnswerReview] = useState(true);
  const [quizTitle, setQuizTitle] = useState('ShivajiSena Quiz Show');
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
const prizeTable = [
  { answers: "Participation", prize: "Complimentary Pen", icon: <PenTool className="h-5 w-5 text-gray-400" />, key: "participation" },
  { answers: "8 Questions Correct", prize: "₹100 or equivalent", icon: <CheckCircle className="h-5 w-5 text-green-500" />, key: "q8" },
  { answers: "9 Questions Correct", prize: "₹150 or equivalent", icon: <Award className="h-5 w-5 text-blue-500" />, key: "q9" },
  { answers: "10 Questions Correct", prize: "₹200 or equivalent", icon: <Trophy className="h-5 w-5 text-yellow-500" />, key: "q10" },
  { answers: `> ${GAME_CONSTANTS.DEFAULT_TARGET_SCORE} score at the end of the Quiz`, prize: "Quiz Vijetha Title", icon: <Crown className="h-5 w-5 text-academic-gold" />, key: "title" },
];
let earnedPrizeKey = "participation";
if (gameState.answeredQuestions.filter(Boolean).length >= 10) earnedPrizeKey = "q10";
else if (gameState.answeredQuestions.filter(Boolean).length === 9) earnedPrizeKey = "q9";
else if (gameState.answeredQuestions.filter(Boolean).length === 8) earnedPrizeKey = "q8";
if (gameState.score >= GAME_CONSTANTS.DEFAULT_TARGET_SCORE) {
  earnedPrizeKey = "title"; // Override if title achieved
}

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("🚀 [GAME] Initializing game");
        setIsLoading(true);
        const settings = await settingsService.getSettings();
        console.log("📚 [DATA] Settings loaded:", {
          questionsCount: (settings.questions || []).length,
          timerDuration: settings.timerDuration,
          targetScore: settings.targetScore,
          pointsPerQuestion: settings.pointsPerQuestion,
        });

        setQuestions(settings.questions || []);
        setQuestionCount(settings.questionCount || 10);
        setTimerDuration(settings.timerDuration || GAME_CONSTANTS.DEFAULT_TIMER_DURATION);
        setTargetScore(settings.targetScore || GAME_CONSTANTS.DEFAULT_TARGET_SCORE);
        setPointsPerQuestion(settings.pointsPerQuestion || GAME_CONSTANTS.DEFAULT_POINTS_PER_QUESTION);
        setUseApiScoring(settings.useApiScoring || false);
        setAllowNegativeMarks(settings.allowNegativeMarks !== undefined ? settings.allowNegativeMarks : true);
        setNegativePointsPerQuestion(settings.negativePointsPerQuestion || GAME_CONSTANTS.DEFAULT_INCORRECT_NEGATIVE_POINTS);
        setSkipPenaltyPointsPerQuestion(settings.skipPenaltyPointsPerQuestion || GAME_CONSTANTS.DEFAULT_SKIP_PENALTY_POINTS);
        setLifelinePenaltyPointsPerLifeline(settings.lifelinePenaltyPointsPerLifeline || GAME_CONSTANTS.DEFAULT_LIFELINE_PENALTY_POINTS);

        setGameShowMode(settings.gameShowMode || "Solo");
        setFetchViewerVotes(settings.fetchViewerVotes || false);
        setAllowAnswerReview(settings.allowAnswerReview !== undefined ? settings.allowAnswerReview : true);
        setQuizTitle(settings.quizTitle || 'ShivajiSena Quiz Show');

        // Check for existing game state or start new game
        const savedState = questionService.getGameState();
        if (savedState && savedState.currentQuestion !== undefined) {
          console.log("💾 [STATE] Restoring saved game state:", savedState);
          setGameState(prev => ({ ...prev, ...savedState }));
          if (savedState.currentPhase) {
            setGamePhase(savedState.currentPhase);
          }
        } else {
          // Start a new game automatically
          await startNewGame(settings.questions || []);
        }
      } catch (error) {
        console.error("❌ [ERROR] Failed to load game data:", error);
        setQuestions([]);
        setTimerDuration(GAME_CONSTANTS.DEFAULT_TIMER_DURATION);
        setTargetScore(GAME_CONSTANTS.DEFAULT_TARGET_SCORE);
        setPointsPerQuestion(GAME_CONSTANTS.DEFAULT_POINTS_PER_QUESTION);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const startNewGame = async (questionsToUse: Question[]) => {
    try {
      console.log("🎮 [ACTION] Starting new game");
      const game = await apiService.createGame(questionsToUse);
      console.log("🔄 [API] Game created in backend:", { gameId: game.id });

      const newGameState: GameState = {
        gameId: game.id,
        currentQuestion: 0,
        score: 0,
        guestAnswer: null,
        finalAnswer: null,
        viewerVotes: [],
        isRevealed: false,
        hasChangedAnswer: false,
        timeRemaining: 30,
        answeredQuestions: new Array(questionsToUse.length).fill(false),
        skippedQuestions: new Array(questionsToUse.length).fill(false),
        allQuestionsCompleted: false,
        lifelines: {
          checkAnswer: true,
          fiftyFifty: true,
        },
        eliminatedOptions: undefined,
        checkAnswerResult: null,
        lifelinesUsedCurrentQuestion: 0,
      };

      setGameState(newGameState);
      setGamePhase("question");
      questionService.clearGameState();
    } catch (error) {
      console.error("❌ [ERROR] Failed to start game:", error);
      
      const fallbackGameState: GameState = {
        currentQuestion: 0,
        score: 0,
        guestAnswer: null,
        finalAnswer: null,
        viewerVotes: [],
        isRevealed: false,
        hasChangedAnswer: false,
        timeRemaining: 30,
        answeredQuestions: new Array(questionsToUse.length).fill(false),
        skippedQuestions: new Array(questionsToUse.length).fill(false),
        allQuestionsCompleted: false,
        lifelines: {
          checkAnswer: true,
          fiftyFifty: true,
        },
        eliminatedOptions: undefined,
        checkAnswerResult: null,
        lifelinesUsedCurrentQuestion: 0,
      };

      setGameState(fallbackGameState);
      setGamePhase("question");
      questionService.clearGameState();
    }
  };

  // Save game state whenever it changes
  useEffect(() => {
    if (gamePhase !== "waiting" && gamePhase !== "winner") {
      const stateToSave = {
        ...gameState,
        currentPhase: gamePhase,
      };
      console.log("💾 [STATE] Saving game state");
      questionService.saveGameState(stateToSave);
    }
  }, [gameState, gamePhase]);

  const currentQuestion = questions[gameState.currentQuestion];

  // Handle time up
  const handleTimeUp = useCallback(() => {
    if (gamePhase === "question") {
      console.log("⏰ [ACTION] Time up");

      if (gameState.guestAnswer === null) {
        const scoreChange = allowNegativeMarks ? -skipPenaltyPointsPerQuestion : 0;

        setGameState(prev => ({
          ...prev,
          score: Math.max(0, prev.score + scoreChange),
          finalAnswer: null,
          isRevealed: false,
          skippedQuestions: prev.skippedQuestions.map((s, i) =>
            i === prev.currentQuestion ? true : s
          ),
        }));

        toast({
          title: "⏰ Time's Up!",
          description: scoreChange < 0
            ? `No answer selected. -${skipPenaltyPointsPerQuestion} points.`
            : `No answer selected. Skipped without penalty.`,
          variant: scoreChange < 0 ? "destructive" : "default",
        });
      } else {
        setGameState(prev => ({ ...prev, finalAnswer: prev.guestAnswer }));
        toast({
          title: "Time's Up!",
          description: "Answer locked in!",
        });
      }
      setGamePhase("guest-answered");
    }
  }, [gamePhase, gameState.guestAnswer, allowNegativeMarks, skipPenaltyPointsPerQuestion, toast]);

  // Guest selects answer
  const handleSelectAnswer = useCallback((index: number) => {
    if (gameState.isRevealed) return;

    console.log("🎯 [ACTION] Guest selecting answer", { selectedIndex: index });

    if (gamePhase === "question") {
      setGameState(prev => ({ ...prev, guestAnswer: index }));
    } else if ((gamePhase === "viewer-votes" || gamePhase === "final-decision") && allowAnswerReview) {
      setGameState(prev => ({
        ...prev,
        finalAnswer: index,
        hasChangedAnswer: prev.guestAnswer !== index
      }));
      setGamePhase("final-decision");
    }
  }, [gamePhase, gameState.isRevealed, allowAnswerReview]);

  // Host locks answer
  const handleLockAnswer = useCallback(() => {
    if (gameState.guestAnswer === null) {
      toast({
        title: "No Answer Selected",
        description: "The guest must select an answer first.",
        variant: "destructive",
      });
      return;
    }

    setGameState(prev => ({ ...prev, finalAnswer: prev.guestAnswer }));
    setGamePhase("guest-answered");
  }, [gameState.guestAnswer, toast]);

  // Fetch viewer votes
  const handleFetchVotes = useCallback(async () => {
    if (!currentQuestion) return;

    console.log("👥 [ACTION] Fetching viewer votes");
    setIsLoadingVotes(true);
    try {
      const votes = await apiService.fetchViewerVotes(currentQuestion.id, currentQuestion.options.length);
      const totalVotes = votes.length;
      const optionCounts = currentQuestion.options.map((_, idx) =>
        votes.filter(v => v.choice === idx).length
      );
      const optionPercentages = optionCounts.map(count =>
        totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
      );

      setGameState(prev => ({
        ...prev,
        viewerVotes: votes,
        viewerVotePercentages: optionPercentages,
      }));
      setGamePhase("viewer-votes");

      toast({
        title: "Viewer Votes Received!",
        description: "The audience has spoken. Guest can now change their answer.",
      });
    } catch (error) {
      console.error("❌ [ERROR] Failed to fetch viewer votes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch viewer votes.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingVotes(false);
    }
  }, [currentQuestion, toast]);

  // Allow answer change
  const handleAllowChange = useCallback(() => {
    setGamePhase("final-decision");
    toast({
      title: "Final Decision",
      description: "Guest can now make their final choice.",
    });
  }, [toast]);

  const calculateScoreFromAPI = useCallback(async (guestChoice: number | null, correctAnswer: number, viewerVotes: ViewerVote[]) => {
    const isCorrect = guestChoice === correctAnswer;

    if (useApiScoring) {
      try {
        const viewerCorrect = viewerVotes.filter(v => v.choice === correctAnswer).length;
        const viewerIncorrect = viewerVotes.filter(v => v.choice !== correctAnswer).length;

        // For now, just return the calculated score since the API doesn't support complex scoring
        console.log("API scoring not fully implemented, using local calculation");
        return pointsPerQuestion;
      } catch (error) {
        console.error("Failed to calculate score via API:", error);
      }
    }

    if (isCorrect) {
      return pointsPerQuestion;
    } else if (guestChoice === null) {
      return allowNegativeMarks ? -skipPenaltyPointsPerQuestion : 0;
    } else {
      return allowNegativeMarks ? -negativePointsPerQuestion : 0;
    }
  }, [useApiScoring, gameState.gameId, currentQuestion, pointsPerQuestion, allowNegativeMarks, skipPenaltyPointsPerQuestion, negativePointsPerQuestion]);

  // Reveal answer
  const handleRevealAnswer = useCallback(async () => {
    if (!currentQuestion) return;

    console.log("🔍 [ACTION] Revealing answer");
    
    const finalChoice = gameState.finalAnswer !== null ? gameState.finalAnswer : gameState.guestAnswer;
    const isCorrect = finalChoice === currentQuestion.correctAnswer;
    
    let scoreChange = await calculateScoreFromAPI(finalChoice, currentQuestion.correctAnswer, gameState.viewerVotes);
    
    if (gameState.lifelinesUsedCurrentQuestion > 0) {
      const lifelinePenalty = gameState.lifelinesUsedCurrentQuestion * lifelinePenaltyPointsPerLifeline;
      scoreChange -= lifelinePenalty;
      console.log(`Lifeline penalty applied: -${lifelinePenalty} points (${gameState.lifelinesUsedCurrentQuestion} lifelines used)`);
    }

    const newScore = Math.max(0, gameState.score + scoreChange);
    const newAnsweredQuestions = gameState.answeredQuestions.map((answered, idx) =>
      idx === gameState.currentQuestion ? isCorrect : answered
    );

    setGameState(prev => ({
      ...prev,
      score: newScore,
      isRevealed: true,
      answeredQuestions: newAnsweredQuestions,
      lifelinesUsedCurrentQuestion: 0,
    }));
    
    setGamePhase("revealed");

    let description = `${isCorrect ? "Correct!" : "Incorrect."} `;
    if (scoreChange > 0) {
      description += `+${scoreChange} points.`;
    } else if (scoreChange < 0) {
      description += `${scoreChange} points.`;
    } else {
      description += "No points change.";
    }

    toast({
      title: isCorrect ? "✅ Correct Answer!" : "❌ Wrong Answer",
      description,
      variant: isCorrect ? "default" : "destructive",
    });
  }, [currentQuestion, gameState, calculateScoreFromAPI, lifelinePenaltyPointsPerLifeline, toast]);

  // Next question
  const handleNextQuestion = useCallback(() => {
    const nextQuestionIndex = gameState.currentQuestion + 1;
    
    if (nextQuestionIndex >= questions.length) {
      if (gameState.score >= targetScore) {
        setGamePhase("final-animation");
      } else {
        setGamePhase("winner");
      }
      return;
    }

    setGameState(prev => ({
      ...prev,
      currentQuestion: nextQuestionIndex,
      guestAnswer: null,
      finalAnswer: null,
      viewerVotes: [],
      isRevealed: false,
      hasChangedAnswer: false,
      timeRemaining: timerDuration,
      eliminatedOptions: undefined,
      checkAnswerResult: null,
    }));
    
    setIsPaused(false); // Reset pause state for new question
    setGamePhase("question");
  }, [gameState.currentQuestion, gameState.score, questions.length, targetScore, timerDuration]);

  // Trigger final animation
  const handleTriggerFinalAnimation = useCallback(() => {
    setGamePhase("final-animation");
  }, []);

  // Check answer lifeline
  const handleCheckAnswer = useCallback(() => {
    if (!gameState.lifelines.checkAnswer || gameState.guestAnswer === null) return;

    const isCorrect = gameState.guestAnswer === currentQuestion?.correctAnswer;
    
    setGameState(prev => ({
      ...prev,
      lifelines: { ...prev.lifelines, checkAnswer: false },
      checkAnswerResult: isCorrect ? "correct" : "incorrect",
      lifelinesUsedCurrentQuestion: prev.lifelinesUsedCurrentQuestion + 1,
    }));

    toast({
      title: "Check Answer Result",
      description: isCorrect ? "Your answer is correct! ✅" : "Your answer is incorrect! ❌",
      variant: isCorrect ? "default" : "destructive",
    });
  }, [gameState.lifelines.checkAnswer, gameState.guestAnswer, currentQuestion, toast]);

  // Fifty-fifty lifeline
  const handleFiftyFifty = useCallback(() => {
    if (!gameState.lifelines.fiftyFifty || !currentQuestion) return;

    const correctIndex = currentQuestion.correctAnswer;
    const incorrectIndices = currentQuestion.options
      .map((_, index) => index)
      .filter(index => index !== correctIndex);
    
    const shuffled = [...incorrectIndices].sort(() => Math.random() - 0.5);
    const toEliminate = shuffled.slice(0, 2);

    setGameState(prev => ({
      ...prev,
      lifelines: { ...prev.lifelines, fiftyFifty: false },
      eliminatedOptions: toEliminate,
      lifelinesUsedCurrentQuestion: prev.lifelinesUsedCurrentQuestion + 1,
    }));

    toast({
      title: "50:50 Lifeline Used",
      description: "Two incorrect answers have been eliminated!",
    });
  }, [gameState.lifelines.fiftyFifty, currentQuestion, toast]);

  // Restart game
  const handleStartGame = useCallback(() => {
    startNewGame(questions);
  }, [questions]);

  // Display results (go to winner screen)
  const handleDisplayResults = useCallback(() => {
    setGamePhase("winner");
  }, []);

  // Cancel game
  const handleCancelGame = useCallback(() => {
    const resetState: GameState = {
      currentQuestion: 0,
      score: 0,
      guestAnswer: null,
      finalAnswer: null,
      viewerVotes: [],
      isRevealed: false,
      hasChangedAnswer: false,
      timeRemaining: 30,
      answeredQuestions: new Array(10).fill(false),
      skippedQuestions: new Array(10).fill(false),
      allQuestionsCompleted: false,
      lifelines: {
        checkAnswer: true,
        fiftyFifty: true,
      },
      eliminatedOptions: undefined,
      checkAnswerResult: null,
      lifelinesUsedCurrentQuestion: 0,
    };

    setGameState(resetState);
    questionService.clearGameState();
    setShowCancelDialog(false);
    
    toast({
      title: "Game Cancelled",
      description: "Returning to home page.",
    });
    
    navigate("/");
  }, [navigate, toast]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onLockAnswer: gamePhase === "question" ? handleLockAnswer : undefined,
    onFetchVotes: gamePhase === "guest-answered" ? handleFetchVotes : undefined,
    onAllowChange: gamePhase === "viewer-votes" ? handleAllowChange : undefined,
    onRevealAnswer: gamePhase === "final-decision" ? handleRevealAnswer : undefined,
    onNextQuestion: gamePhase === "revealed" ? handleNextQuestion : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background flex items-center justify-center">
        <div className="text-2xl text-muted-foreground">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background flex flex-col">
      <LanguageToggle />
      {/* Final Winner Message */}
      {gamePhase === "final-animation" && (
        <FinalWinnerMessage onComplete={() => setGamePhase("winner")} />
      )}

      {/* Winner Screen */}
      {gamePhase === "winner" && (
        <WinnerScreen
          score={gameState.score}
          questionsAnswered={gameState.answeredQuestions.filter(Boolean).length}
          onClose={() => navigate("/")}
        />
      )}

      {/* Game Screen */}
      {(gamePhase === "question" || gamePhase === "guest-answered" ||
        gamePhase === "viewer-votes" || gamePhase === "final-decision" ||
        gamePhase === "revealed") && currentQuestion && (
          <div className="flex-1 p-4 md:p-8">
            <div className="w-full max-w-[1920px] mx-auto flex gap-6">
              {/* Main Game Area */}
              <div className="flex-1 space-y-6">
                {/* Quiz Title Header */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {quizTitle}
                  </h2>
                </div>

                {/* Scientist Progress */}
                <ScientistProgress
                  score={gameState.score}
                  targetScore={targetScore}
                  answeredQuestions={gameState.answeredQuestions}
                  currentQuestion={gameState.currentQuestion}
                  readyForFinalAnimation={
                    gameState.currentQuestion === 9 &&
                    gameState.score >= targetScore
                  }
                  onTriggerFinalAnimation={handleTriggerFinalAnimation}
                />

                {/* Timer and Question */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-2">
                    <Timer
                      key={`timer-${gameState.currentQuestion}`}
                      timeLimit={currentQuestion?.timeLimit || timerDuration}
                      isActive={gamePhase === "question" && !gameState.isRevealed}
                      paused={isPaused}    // ⬅️ Timer freezes when paused

                      onTimeUp={handleTimeUp}
                    />
                  </div>

                  <div className="lg:col-span-10">
                    <QuestionCard
                      question={currentQuestion}
                      questionNumber={gameState.currentQuestion + 1}
                      totalQuestions={questions.length}
                    />
                  </div>
                </div>

                {/* Answer Options */}
                <AnswerOptions
                  options={currentQuestion.options}
                  guestAnswer={gameState.guestAnswer}
                  finalAnswer={gameState.finalAnswer}
                  correctAnswer={gameState.isRevealed ? currentQuestion.correctAnswer : undefined}
                  viewerVotes={gameState.viewerVotes}
                  viewerVotePercentages={gameState.viewerVotePercentages}
                  isRevealed={gameState.isRevealed}
                  onSelectAnswer={handleSelectAnswer}
                  disabled={
                    gamePhase === "revealed" ||
                    (gamePhase === "guest-answered" && !allowAnswerReview) ||
                    (gamePhase === "viewer-votes" && !allowAnswerReview)
                  }
                  eliminatedOptions={gameState.eliminatedOptions}
                />

                {/* Lifelines */}
                <Lifelines
                  lifelines={gameState.lifelines}
                  onCheckAnswer={handleCheckAnswer}
                  onFiftyFifty={handleFiftyFifty}
                  disabled={gamePhase !== "question" || gameState.guestAnswer === null}
                  checkAnswerResult={gameState.checkAnswerResult}
                />

                {/* Show animation button when ready */}
                {gamePhase === "revealed" && gameState.currentQuestion === 9 &&
                  gameState.score >= targetScore && (
                    <div className="flex justify-center mt-8">

                    </div>
                  )}
              </div>

              {/* Right Sidebar - Host Controls */}
<div className="w-80 flex-shrink-0">
  <div className="sticky top-4 space-y-4">
<HostControls
  phase={gamePhase}
  onLockAnswer={handleLockAnswer}
  onFetchVotes={handleFetchVotes}
  onAllowChange={handleAllowChange}
  onRevealAnswer={handleRevealAnswer}
  onNextQuestion={handleNextQuestion}
  onDisplayResults={handleDisplayResults}
  onStartGame={handleStartGame}
  isPaused={isPaused}
  onTogglePause={() => setIsPaused(p => !p)}
  isLoading={isLoading}
  fetchViewerVotes={fetchViewerVotes}
  allowAnswerReview={allowAnswerReview}
  isLastQuestion={gameState.currentQuestion === questions.length - 1}
/>


    {/* View Prize Structure Button */}
    <Button
      onClick={() => setShowPrizeStructure(!showPrizeStructure)}
      variant="outline"
      size="lg"
      className="w-full mb-2 flex items-center gap-2"
    >
      <Gift className="h-4 w-4" />
      {showPrizeStructure ? "Hide Prize Structure" : "View Prize Structure"}
    </Button>

    {/* Prize Structure Display */}
    {showPrizeStructure && (
      <div className="glass-card rounded-lg p-3 mb-3">
        <h3 className="text-sm font-semibold mb-2 text-center">Prize Structure</h3>
        <div className="space-y-1">
          {prizeTable.map((item) => {
            const isEarned = item.key === earnedPrizeKey;
            return (
              <div
                key={item.key}
                className={`flex justify-between items-center p-1.5 rounded-md border text-xs
                  ${isEarned
                    ? "bg-academic-gold/20 border-academic-gold shadow-lg scale-[1.01]"
                    : "bg-gradient-subtle border-white/10"
                  }`}
              >
                <div className="flex items-center gap-1">
                  {item.icon}
                  <span className={isEarned ? "text-academic-gold" : ""}>
                    {item.answers}
                  </span>
                </div>
                <span className={`font-medium ${isEarned ? "text-academic-gold" : "text-academic-muted"}`}>
                  {item.prize}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Back to Home Button */}
    <Button
      onClick={() => setShowHomeDialog(true)}
      variant="outline"
      size="default"
      className="w-full mb-2 flex items-center gap-2"
    >
      <Home className="h-4 w-4" />
      Back to Home
    </Button>

    {/* Cancel Game / New Game Button */}
    <Button
      onClick={
        gameState.currentQuestion === questions.length - 1 && gamePhase === "revealed"
          ? handleStartGame
          : () => setShowCancelDialog(true)
      }
      variant={
        gameState.currentQuestion === questions.length - 1 && gamePhase === "revealed"
          ? "default"
          : "destructive"
      }
      size="default"
      className="w-full"
    >
      <X className="mr-2 h-4 w-4" />
      {gameState.currentQuestion === questions.length - 1 && gamePhase === "revealed"
        ? "New Game"
        : "Cancel Game"}
    </Button>
  </div>
</div>

            </div>
          </div>
        )}

      {/* Cancel Game Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to cancel the game?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the current game and reset all progress. The score will be lost and you'll return to the home page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Playing</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Back to Home Dialog */}
      <AlertDialog open={showHomeDialog} onOpenChange={setShowHomeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return to Home?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave the game? Your current progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in Game</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/")} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Go to Home
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prize Modal */}
      <PrizeModal
        isOpen={showPrizeModal}
        onClose={() => setShowPrizeModal(false)}
        score={gameState.score}
        questionsAnswered={gameState.answeredQuestions.filter(Boolean).length}
      />

      {/* Winner Modal */}
      <WinnerModal
        isOpen={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        onContinue={() => setShowWinnerModal(false)}
        quizTitle={quizTitle}
        score={gameState.score}
        correctAnswers={gameState.answeredQuestions.filter(Boolean).length}
      />
    </div>
  );
}
