// Quiz Results Types - Schemas for saving quiz results to backend

export interface QuizEpisodeDetails {
  episodeName: string;
  episodeNumber: string;
  quizShowName: string;
  startedAt: string;       // ISO date
  endedAt: string;         // ISO date
  totalQuestions: number;
  totalDurationSeconds: number;
  status: 'completed' | 'aborted' | 'running';
  frontendQuizGameId: string;
  applicationId: string | null;
  analyticsOwnerId?: string | null;
  quizHostChannel?: {
    quizHostChannelId: string | null;
    quizHostChannelTitle: string;
    quizHostChannelHandle: string;
  };
}

export interface PanelTeamMember {
  name: string;
  role?: string;
}

export interface PanelTeamResult {
  teamId: number;
  teamName: string;
  teamColor: string;
  teamAvatar?: string;
  members: PanelTeamMember[];
  finalScore: number;
  rank: number;
  streak: number;
  lifelinesUsed: number;
  lifelinesRemaining: number;
  powerplayUsed: boolean;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  passedQuestions: number;
}

export interface PanelLeaderboardPayload {
  episode: QuizEpisodeDetails;
  teams: PanelTeamResult[];
  quizMasterScore: number;
}

export interface LiveViewerResult {
  odytChannelId: string;
  userName: string;
  displayName?: string;
  avatarUrl?: string;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  avgResponseTimeMs: number;
  fastestResponseMs?: number;
  streak?: number;
  rank: number;
  supportingTeam?: string;
  achievements?: string[];
  percentile?: number;
}

export interface LiveLeaderboardPayload {
  episode: QuizEpisodeDetails;
  viewers: LiveViewerResult[];
  totalUniqueViewers: number;
  totalResponses: number;
  avgResponseTimeMs: number;
  currentQuestionResponses?: Array<{
    id: string;
    odytChannelId: string;
    userName: string;
    avatarUrl: string;
    answer: string;
    responseTimeMs: number;
    isCorrect: boolean | null;
    score: number;
    supportingTeam?: string;
  }>;
}

export interface SaveQuizResultsPayload {
  panelLeaderboard: PanelLeaderboardPayload;
  liveLeaderboard: LiveLeaderboardPayload;
}

export interface SaveQuizResultsResponse {
  success: boolean;
  resultId?: string;
  error?: string;
  message?: string;
}
