// Utility to build quiz results payloads from game state

import { Team } from '@/types/quiz';
import { LeaderboardEntry } from '@/components/LiveLeaderboard';
import {
  QuizEpisodeDetails,
  PanelTeamResult,
  PanelLeaderboardPayload,
  LiveViewerResult,
  LiveLeaderboardPayload,
  SaveQuizResultsPayload,
} from '@/types/quizResults';

interface BuildPayloadArgs {
  // Episode info
  episodeName: string;
  episodeNumber: string;
  quizShowName: string;
  startedAt: Date;
  endedAt: Date;
  totalQuestions: number;
  status: 'completed' | 'aborted';
  frontendQuizGameId: string;
  applicationId: string | null;
  analyticsOwnerId?: string | null;
  quizHostChannel?: {
    quizHostChannelId: string | null;
    quizHostChannelTitle: string;
    quizHostChannelHandle: string;
  };

  // Panel data
  teams: Team[];
  teamScores: number[];
  teamStreaks: number[];
  teamLifelines: number[];
  initialLifelineCount: number;
  powerplayUsed: boolean[];
  quizMasterScore: number;

  // Live data
  viewerLeaderboard: LeaderboardEntry[];
}

export const buildQuizResultsPayload = (args: BuildPayloadArgs): SaveQuizResultsPayload => {
  const frontendQuizGameId = String(args.frontendQuizGameId || "").trim();
  if (!frontendQuizGameId) {
    throw new Error("frontendQuizGameId is required to build quiz results payload");
  }
  const totalDurationSeconds = Math.round((args.endedAt.getTime() - args.startedAt.getTime()) / 1000);

  const episode: QuizEpisodeDetails = {
    episodeName: args.episodeName || `Episode ${args.episodeNumber}`,
    episodeNumber: args.episodeNumber,
    quizShowName: args.quizShowName,
    startedAt: args.startedAt.toISOString(),
    endedAt: args.endedAt.toISOString(),
    totalQuestions: args.totalQuestions,
    totalDurationSeconds,
    status: args.status,
    frontendQuizGameId,
    applicationId: args.applicationId,
    analyticsOwnerId: args.analyticsOwnerId || null,
    quizHostChannel: args.quizHostChannel || {
      quizHostChannelId: null,
      quizHostChannelTitle: '',
      quizHostChannelHandle: '',
    },
  };

  // Build panel team results
  const panelTeams: PanelTeamResult[] = args.teams
    .map((team, index) => ({
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      teamAvatar: team.avatar,
      members: (team.members || []).map(name => ({ name })),
      finalScore: args.teamScores[index] || 0,
      rank: 0,
      streak: args.teamStreaks[index] || 0,
      lifelinesUsed: args.initialLifelineCount - (args.teamLifelines[index] || 0),
      lifelinesRemaining: args.teamLifelines[index] || 0,
      powerplayUsed: args.powerplayUsed[index] || false,
      questionsAnswered: 0, // Will be enriched by caller if available
      correctAnswers: 0,
      wrongAnswers: 0,
      passedQuestions: 0,
    }))
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((team, index) => ({ ...team, rank: index + 1 }));

  const panelLeaderboard: PanelLeaderboardPayload = {
    episode,
    teams: panelTeams,
    quizMasterScore: args.quizMasterScore,
  };

  // Build live viewer results
  const sortedViewers = [...args.viewerLeaderboard].sort((a, b) => b.totalScore - a.totalScore);
  const viewers: LiveViewerResult[] = sortedViewers.map((entry, index) => ({
    odytChannelId: entry.odytChannelId,
    userName: entry.userName,
    avatarUrl: entry.avatarUrl,
    totalScore: entry.totalScore,
    correctAnswers: entry.correctAnswers,
    totalResponses: entry.totalResponses,
    avgResponseTimeMs: entry.avgResponseTimeMs || 0,
    fastestResponseMs: entry.responseTimes?.length ? Math.min(...entry.responseTimes) : undefined,
    streak: entry.streak || 0,
    rank: index + 1,
    supportingTeam: entry.supportingTeam || undefined,
  }));

  const totalResponses = viewers.reduce((sum, v) => sum + v.totalResponses, 0);
  const avgResponseTimeMs = viewers.length > 0
    ? viewers.reduce((sum, v) => sum + v.avgResponseTimeMs, 0) / viewers.length
    : 0;

  const liveLeaderboard: LiveLeaderboardPayload = {
    episode,
    viewers,
    totalUniqueViewers: viewers.length,
    totalResponses,
    avgResponseTimeMs: Math.round(avgResponseTimeMs),
  };

  return { panelLeaderboard, liveLeaderboard };
};
