import { useState, useCallback, useRef } from "react";
import { QuestionData, PassChain } from "@/types/quiz";
import { DEFAULT_QUIZ_SETTINGS } from "@/config/quizSettings";
import { saveGameState, getGameState, saveViewerLeaderboard, getViewerLeaderboard } from "@/lib/gameStateManager";
import { LeaderboardEntry } from "@/components/LiveLeaderboard";
import { readMirroredAdminSettingSync } from "@/lib/adminConfigPersistence";

export interface QuizStateConfig {
  teamsCount: number;
  onStateChange?: () => void;
}

export interface QuizQuestionState {
  questionActive: boolean;
  currentQuestion: QuestionData | null;
  currentQuestionDisplayIndex: number | null;
  passChain: PassChain | null;
  selectedAnswer: number | null;
  showCountdown: boolean;
  countdownValue: number;
  showRevealAnimation: boolean;
  verifyAnswerUsed: boolean;
  verifyAnswerResult: 'correct' | 'wrong' | null;
  changeQuestionMode: boolean;
  changeQuestionTeam: number | null;
}

export interface QuizScoreState {
  teamScores: number[];
  teamStreaks: number[];
  quizMasterScore: number;
  scoreChanges: Map<number, number>;
}

export const useQuizState = (config: QuizStateConfig) => {
  const { teamsCount } = config;

  // Core game state
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const gameEndHandledRef = useRef(false);

  // Question state
  const [questionActive, setQuestionActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [currentQuestionDisplayIndex, setCurrentQuestionDisplayIndex] = useState<number | null>(null);
  const [passChain, setPassChain] = useState<PassChain | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [verifyAnswerUsed, setVerifyAnswerUsed] = useState(false);
  const [verifyAnswerResult, setVerifyAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [changeQuestionMode, setChangeQuestionMode] = useState(false);
  const [changeQuestionTeam, setChangeQuestionTeam] = useState<number | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const [currentBackendQuestionIndex, setCurrentBackendQuestionIndex] = useState(0);

  // Score state
  const [teamScores, setTeamScores] = useState<number[]>(() => Array(teamsCount).fill(0));
  const [teamStreaks, setTeamStreaks] = useState<number[]>(() => Array(teamsCount).fill(0));
  const [quizMasterScore, setQuizMasterScore] = useState(0);
  const [scoreChanges, setScoreChanges] = useState<Map<number, number>>(new Map());

  // Lifelines
  const [teamLifelines, setTeamLifelines] = useState<number[]>(() => {
    const saved = localStorage.getItem("teamLifelinesState");
    if (saved) return JSON.parse(saved);
    const lifelineCount = Number(readMirroredAdminSettingSync<number>("teamLifelines", DEFAULT_QUIZ_SETTINGS.teamLifelines));
    return Array(teamsCount).fill(lifelineCount);
  });

  // Viewer leaderboard
  const [viewerLeaderboard, setViewerLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Load scoring configuration
  const correctAnswerScore = Number(readMirroredAdminSettingSync<number>("correctAnswerScore", DEFAULT_QUIZ_SETTINGS.correctAnswerScore));
  const wrongAnswerPenalty = Number(readMirroredAdminSettingSync<number>("wrongAnswerPenalty", DEFAULT_QUIZ_SETTINGS.wrongAnswerPenalty));
  const lifelinePenalty = Number(readMirroredAdminSettingSync<number>("lifelinePenalty", DEFAULT_QUIZ_SETTINGS.lifelinePenalty));

  // Show temporary score change indicator
  const showScoreChange = useCallback((teamIndex: number, points: number) => {
    setScoreChanges(new Map([[teamIndex, points]]));
    setTimeout(() => setScoreChanges(new Map()), 1500);
  }, []);

  // Trigger screen flash for wrong answers
  const triggerScreenFlash = useCallback(() => {
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 500);
  }, []);

  // Update lifelines and persist
  const updateLifelines = useCallback((newLifelines: number[]) => {
    setTeamLifelines(newLifelines);
    localStorage.setItem("teamLifelinesState", JSON.stringify(newLifelines));
  }, []);

  // Reset question state
  const resetQuestionState = useCallback(() => {
    setQuestionActive(false);
    setCurrentQuestion(null);
    setPassChain(null);
    setSelectedAnswer(null);
    setShowCountdown(false);
    setCountdownValue(5);
    setScreenFlash(false);
    setShowRevealAnimation(false);
    setVerifyAnswerUsed(false);
    setVerifyAnswerResult(null);
    setCurrentQuestionDisplayIndex(null);
  }, []);

  // Load from localStorage on init
  const loadSavedState = useCallback(() => {
    const savedState = getGameState();
    if (savedState) {
      setCurrentTeamIndex(savedState.currentTeamIndex || 0);
      setCurrentQuestion(savedState.currentQuestion || null);
      setQuestionActive(savedState.questionActive || false);
      setPassChain(savedState.passChain || null);
      setChangeQuestionMode(savedState.changeQuestionMode || false);
      setChangeQuestionTeam(savedState.changeQuestionTeam || null);
      setTeamScores(savedState.teamScores || Array(teamsCount).fill(0));
      setTeamStreaks(savedState.teamStreaks || Array(teamsCount).fill(0));
      setQuizMasterScore(savedState.quizMasterScore || 0);
      setUsedQuestions(new Set(savedState.usedQuestions || []));
      setGameStarted(savedState.gameStarted || false);
      setGameEnded(savedState.gameEnded || false);
      if (savedState.gameEnded) {
        gameEndHandledRef.current = true;
      }
      setSelectedAnswer(savedState.selectedAnswer ?? null);
      setShowCountdown(savedState.showCountdown || false);
      setCountdownValue(savedState.countdownValue || 5);
      setVerifyAnswerUsed(savedState.verifyAnswerUsed || false);
      setVerifyAnswerResult(savedState.verifyAnswerResult || null);
      setCurrentQuestionDisplayIndex(savedState.currentQuestionDisplayIndex ?? null);
      
      // Restore viewer leaderboard
      const savedViewerLeaderboard = getViewerLeaderboard();
      if (savedViewerLeaderboard.length > 0) {
        setViewerLeaderboard(savedViewerLeaderboard);
      }
      
      return savedState;
    }
    return null;
  }, [teamsCount]);

  return {
    // Core state
    currentTeamIndex,
    setCurrentTeamIndex,
    usedQuestions,
    setUsedQuestions,
    gameStarted,
    setGameStarted,
    gameEnded,
    setGameEnded,
    gameEndHandledRef,

    // Question state
    questionActive,
    setQuestionActive,
    currentQuestion,
    setCurrentQuestion,
    currentQuestionDisplayIndex,
    setCurrentQuestionDisplayIndex,
    passChain,
    setPassChain,
    selectedAnswer,
    setSelectedAnswer,
    showCountdown,
    setShowCountdown,
    countdownValue,
    setCountdownValue,
    showRevealAnimation,
    setShowRevealAnimation,
    verifyAnswerUsed,
    setVerifyAnswerUsed,
    verifyAnswerResult,
    setVerifyAnswerResult,
    changeQuestionMode,
    setChangeQuestionMode,
    changeQuestionTeam,
    setChangeQuestionTeam,
    screenFlash,
    setScreenFlash,
    currentBackendQuestionIndex,
    setCurrentBackendQuestionIndex,

    // Score state
    teamScores,
    setTeamScores,
    teamStreaks,
    setTeamStreaks,
    quizMasterScore,
    setQuizMasterScore,
    scoreChanges,

    // Lifelines
    teamLifelines,
    updateLifelines,

    // Viewer leaderboard
    viewerLeaderboard,
    setViewerLeaderboard,

    // Scoring config
    correctAnswerScore,
    wrongAnswerPenalty,
    lifelinePenalty,

    // Helpers
    showScoreChange,
    triggerScreenFlash,
    resetQuestionState,
    loadSavedState,
  };
};
