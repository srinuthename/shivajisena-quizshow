// Game State Manager
// Manages comprehensive localStorage-based game state persistence
// Ensures game survives browser refresh and accidental closures

import { QuestionData, PassChain, Team } from '@/types/quiz';
import { ActivityLog } from '@/components/ActivityFeed';

const GAME_STATE_KEY = 'quizGameState';
const LIFELINES_STATE_KEY = 'teamLifelinesState';
const VIEWER_LEADERBOARD_KEY = 'viewerLeaderboard';
const ACTIVE_SESSION_KEY = 'activeQuizSessionId';
const FRONTEND_GAME_ID_KEY = 'frontendQuizGameId';

const RUNTIME_LOCALSTORAGE_KEYS = [
  GAME_STATE_KEY,
  LIFELINES_STATE_KEY,
  VIEWER_LEADERBOARD_KEY,
  ACTIVE_SESSION_KEY,
  FRONTEND_GAME_ID_KEY,
  'quizSessionQuestions',
  'quizSessionPools',
  'liveLeaderboardLastSyncAt',
  'liveLeaderboardLastSyncErrorAt',
  'liveLeaderboardLastSyncError',
  'liveLeaderboardSyncFailureCount',
  'liveLeaderboardLastRestoreSource',
];

const RUNTIME_SESSIONSTORAGE_KEYS = [
  'viewerLeaderboard',
  'currentCorrectAnswer',
  'currentQuestionIndex',
  'quizActiveSession',
];

// Full game state structure
export interface FullGameState {
  // Core game state
  currentTeamIndex: number;
  teamScores: number[];
  teamStreaks: number[];
  quizMasterScore: number;
  usedQuestions: string[];
  gameStarted: boolean;
  gameEnded: boolean;
  gamePhase?: 'idle' | 'running' | 'ended';

  // Question state
  questionActive: boolean;
  questionPhase?: 'idle' | 'open' | 'revealCountdown' | 'revealed';
  currentQuestion: QuestionData | null;
  currentQuestionDisplayIndex: number | null;
  passChain: PassChain | null;
  changeQuestionMode: boolean;
  changeQuestionTeam: number | null;

  // Answer state
  selectedAnswer: number | null;
  showCountdown: boolean;
  countdownValue: number;
  showRevealAnimation: boolean;
  verifyAnswerUsed: boolean;
  verifyAnswerResult: 'correct' | 'wrong' | null;

  // Timer states
  timerSeconds: number;
  timerIsRunning: boolean;
  masterTimerSeconds: number;
  masterTimerIsRunning: boolean;

  // Powerplay state
  powerplayActive: boolean;
  powerplayPhase?: 'inactive' | 'active';
  powerplayTeam: number | null;
  powerplayUsed: boolean[];
  powerplayTimerSeconds: number;
  powerplayTimerIsRunning: boolean;

  // Activity log
  activities: ActivityLog[];

  // Current question viewer state
  currentQuestionResponses: Array<{
    id: string;
    odytChannelId: string;
    userName: string;
    avatarUrl?: string;
    answer: string;
    responseTimeMs: number;
    isCorrect?: boolean | null;
    score?: number;
    serverSeq?: number;
    supportingTeam?: 'east' | 'west' | 'north' | 'south' | null;
  }>;

  // Metadata
  savedAt: number;
  sessionId: string | null;
  episodeNumber: string;

  // Question timing (used by SSE answer-filter and reveal logic)
  questionOpenTime: number | null;
  questionCloseTime: number | null;
}

// Default empty state
export const createEmptyGameState = (teamsCount: number): FullGameState => ({
  currentTeamIndex: 0,
  teamScores: Array(teamsCount).fill(0),
  teamStreaks: Array(teamsCount).fill(0),
  quizMasterScore: 0,
  usedQuestions: [],
  gameStarted: false,
  gameEnded: false,
  gamePhase: 'idle',

  questionActive: false,
  questionPhase: 'idle',
  currentQuestion: null,
  currentQuestionDisplayIndex: null,
  passChain: null,
  changeQuestionMode: false,
  changeQuestionTeam: null,

  selectedAnswer: null,
  showCountdown: false,
  countdownValue: 5,
  showRevealAnimation: false,
  verifyAnswerUsed: false,
  verifyAnswerResult: null,

  timerSeconds: 0,
  timerIsRunning: false,
  masterTimerSeconds: 0,
  masterTimerIsRunning: false,

  powerplayActive: false,
  powerplayPhase: 'inactive',
  powerplayTeam: null,
  powerplayUsed: Array(teamsCount).fill(false),
  powerplayTimerSeconds: 0,
  powerplayTimerIsRunning: false,

  activities: [],
  currentQuestionResponses: [],

  savedAt: Date.now(),
  sessionId: null,
  episodeNumber: '',
  questionOpenTime: null,
  questionCloseTime: null,
});

// Save game state to localStorage
export const saveGameState = (state: Partial<FullGameState>): void => {
  try {
    const existing = getGameState();
    const newState = {
      ...existing,
      ...state,
      savedAt: Date.now(),
    };
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(newState));
  } catch (error) {
    console.error('[GameState] Failed to save game state:', error);
  }
};

// Get game state from localStorage
export const getGameState = (): FullGameState | null => {
  try {
    const data = localStorage.getItem(GAME_STATE_KEY);
    if (!data) return null;
    return JSON.parse(data) as FullGameState;
  } catch {
    return null;
  }
};

// Check if there's a recoverable game state
export const hasRecoverableGameState = (): boolean => {
  const state = getGameState();
  if (!state) return false;

  if (state.gamePhase) {
    return state.gamePhase === 'running';
  }

  // Backward compatibility: A game is recoverable if it was started but not ended
  return state.gameStarted && !state.gameEnded;
};

// Get game state age in minutes
export const getGameStateAge = (): number => {
  const state = getGameState();
  if (!state?.savedAt) return Infinity;
  return Math.floor((Date.now() - state.savedAt) / 60000);
};

// Save team lifelines state
export const saveLifelinesState = (lifelines: number[]): void => {
  try {
    localStorage.setItem(LIFELINES_STATE_KEY, JSON.stringify(lifelines));
  } catch (error) {
    console.error('[GameState] Failed to save lifelines:', error);
  }
};

// Get team lifelines state
export const getLifelinesState = (): number[] | null => {
  try {
    const data = localStorage.getItem(LIFELINES_STATE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
};

// Save viewer leaderboard
export const saveViewerLeaderboard = (leaderboard: any[]): void => {
  try {
    localStorage.setItem(VIEWER_LEADERBOARD_KEY, JSON.stringify(leaderboard));
  } catch (error) {
    console.error('[GameState] Failed to save viewer leaderboard:', error);
  }
};

// Get viewer leaderboard
export const getViewerLeaderboard = (): any[] => {
  try {
    const data = localStorage.getItem(VIEWER_LEADERBOARD_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
};

// Clear all quiz-related localStorage data
export const clearAllQuizData = (): void => {
  RUNTIME_LOCALSTORAGE_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[GameState] Failed to remove ${key}:`, error);
    }
  });

  RUNTIME_SESSIONSTORAGE_KEYS.forEach((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`[GameState] Failed to remove sessionStorage key ${key}:`, error);
    }
  });

  console.log('[GameState] All quiz data cleared');
};

// Check if quiz window should be open
export const isQuizWindowActive = (): boolean => {
  return localStorage.getItem(ACTIVE_SESSION_KEY) !== null;
};

// Get recovery info for display
export interface RecoveryInfo {
  episodeNumber: string;
  currentTeamIndex: number;
  teamScores: number[];
  savedAt: Date;
  minutesAgo: number;
  questionActive: boolean;
  gameProgress: string;
}

export const getRecoveryInfo = (): RecoveryInfo | null => {
  const state = getGameState();
  if (!state || !hasRecoverableGameState()) return null;

  const minutesAgo = getGameStateAge();
  const totalQuestions = state.usedQuestions.length;
  
  return {
    episodeNumber: state.episodeNumber,
    currentTeamIndex: state.currentTeamIndex,
    teamScores: state.teamScores,
    savedAt: new Date(state.savedAt),
    minutesAgo,
    questionActive: state.questionActive,
    gameProgress: `${totalQuestions} questions answered`,
  };
};
