export interface Question {
  id: number;
  text: string;
  image?: string;
  category?: string;
  level?: string;
  difficulty?: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  correctAnswerText?: string;
  timeLimit?: number; // in seconds
}

export interface ViewerVote {
  choice: number;
  fullname: string;
  channelid: string;
  avatar: {
    initial: string;
    color: string;
    url: string;
  };
}


export interface Lifeline {
  checkAnswer: boolean;        // Check if marked answer is correct (once per game)
  fiftyFifty: boolean;        // Remove 2 incorrect answers (once per game)
}

export interface GameState {
  gameId?: string; // Backend game ID
  currentQuestion: number;
  score: number;
  guestAnswer: number | null;
  finalAnswer: number | null;
  viewerVotes: ViewerVote[];
  viewerVotePercentages?: number[];
  isRevealed: boolean;
  hasChangedAnswer: boolean;
  timeRemaining: number;
  answeredQuestions: boolean[]; // Track which questions were answered correctly
  skippedQuestions: boolean[]; // Track which questions were skipped
  allQuestionsCompleted: boolean;
  currentPhase?: GamePhase; // Track the exact phase
  timerEndTime?: number; // Store when timer should end for resume
  lifelines: Lifeline; // Available lifelines
  eliminatedOptions?: number[]; // Options eliminated by 50-50 lifeline
  checkAnswerResult?: 'correct' | 'incorrect' | null; // Result of check answer lifeline
  lifelinesUsedCurrentQuestion: number; // Track how many lifelines used for current question
}

export type GamePhase = 
  | 'waiting'
  | 'question'
  | 'guest-answered'
  | 'viewer-votes'
  | 'final-decision'
  | 'revealed'
  | 'final-animation'
  | 'winner';