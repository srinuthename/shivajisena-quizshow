export interface Question {
  id: number;
  text: string;
  image?: string;
  category?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  options: string[];
  correctAnswer: number;
  correctAnswerText?: string;
  explanation?: string;
}

export interface QuestionData {
  text: string;
  image?: string;
  category?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  options: string[];
  correctAnswer: number;
  correctAnswerText?: string;
}

export interface QuestionSet {
  [subject: string]: {
    [questionNumber: string]: QuestionData;
  };
}

export interface Team {
  id: number;
  name: string;
  members?: string[];
  score: number;
  color: string;
  avatar?: string;
}

export interface PassChain {
  originalTeam: number;
  currentTeam: number;
  teams: number[];
}

export interface QuizState {
  teams: Team[];
  currentTeamIndex: number;
  questions: QuestionSet;
  usedQuestions: Set<string>;
  currentSubject: string;
  quizMasterScore: number;
  questionActive: boolean;
  currentQuestion: string;
  passChain: PassChain | null;
  timer: {
    seconds: number;
    isRunning: boolean;
  };
}

// YouTube User Tracking Types
export interface YouTubeUser {
  id: string;
  userName: string;
  avatarUrl: string;
}

export interface UserQuestionResponse {
  questionId: string | number;
  answer: string;
  isCorrect: boolean | null;
}

export interface QuizUserStats {
  user: YouTubeUser;
  totalResponses: number;
  correctAnswers: number;
  responses: UserQuestionResponse[];
}

// SSE Event Types - Updated for new unified UserResponse schema
export interface SSEAnswerEvent {
  msgUniqueId: string;
  msgSource: string;
  userUniqueId: string;
  userProfilePicUrl: string | null;
  userUserName: string | null;
  userDisplayName: string | null;
  responseTextNormalized: string | null;
  responseReceivedAt: string;
  responseFrom: 'user' | 'system' | 'log';
  responseType: 'MCQ' | 'TEXT' | 'REACTION' | 'SYSTEM';
  responseLatencyMs?: number;
  // Legacy fields for backward compat (deprecated)
  frontendQuizGameId?: string;
  questionIndex?: number;
  isCorrect?: boolean;
  answer?: string;
}

export interface SSEAnswerCountsEvent {
  frontendQuizGameId: string;
  questionIndex: number;
  counts: Record<number, number>;
}

// Quiz Session History Types
export interface QuizSessionTeamResult {
  teamId: number;
  teamName: string;
  members: string[];
  finalScore: number;
  rank: number;
}

export interface QuizSessionViewerResult {
  odytChannelId: string;
  userName: string;
  avatarUrl?: string;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  avgResponseTimeMs: number;
  rank: number;
}

export interface QuizSessionRecord {
  id: string;                    // UUID
  createdAt: number;             // Timestamp when quiz started
  endedAt: number | null;        // Timestamp when quiz ended (null if abrupt)
  status: 'active' | 'completed' | 'aborted';
  episodeNumber: string;

  /** Backend frontendQuizGameId — present for sessions hydrated from the server. */
  frontendQuizGameId?: string;

  // Team/Participant Leaderboard
  teamLeaderboard: QuizSessionTeamResult[];

  // YouTube Viewers Leaderboard
  viewerLeaderboard: QuizSessionViewerResult[];

  // Optional advanced-history snapshots (only set when hydrated from backend results)
  currentQuestionLeaderboard?: QuizSessionViewerResult[];
  currentCumulativeLeaderboard?: QuizSessionViewerResult[];
  lastViewerBoardsUpdatedAt?: number;

  // Summary Stats
  totalQuestions: number;
  totalViewerResponses: number;
  totalViewers: number;
}
