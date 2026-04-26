import { LeaderboardEntry } from "@/components/LiveLeaderboard";

const FINAL_LEADERBOARD_SNAPSHOT_KEY = "finalLeaderboardSnapshot";

export interface FinalTeamLeaderboardEntry {
  teamId: number;
  teamName: string;
  score: number;
  rank: number;
  color?: string;
}

export interface FinalViewerLeaderboardEntry {
  odytChannelId: string;
  userName: string;
  avatarUrl?: string;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  avgResponseTimeMs: number;
  rank: number;
}

export interface FinalLeaderboardSnapshot {
  capturedAt: number;
  gameId?: string | null;
  teams: FinalTeamLeaderboardEntry[];
  viewers: FinalViewerLeaderboardEntry[];
}

export const buildViewerLeaderboardRanks = (
  viewerLeaderboard: LeaderboardEntry[],
): FinalViewerLeaderboardEntry[] =>
  [...viewerLeaderboard]
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((entry, index) => ({
      odytChannelId: entry.odytChannelId,
      userName: entry.userName,
      avatarUrl: entry.avatarUrl,
      totalScore: entry.totalScore,
      correctAnswers: entry.correctAnswers,
      totalResponses: entry.totalResponses,
      avgResponseTimeMs: entry.avgResponseTimeMs,
      rank: index + 1,
    }));

export const saveFinalLeaderboardSnapshot = (
  snapshot: FinalLeaderboardSnapshot,
): void => {
  try {
    localStorage.setItem(FINAL_LEADERBOARD_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error("[FinalLeaderboardSnapshot] Failed to save snapshot:", error);
  }
};

export const getFinalLeaderboardSnapshot = (): FinalLeaderboardSnapshot | null => {
  try {
    const raw = localStorage.getItem(FINAL_LEADERBOARD_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FinalLeaderboardSnapshot;
  } catch {
    return null;
  }
};

export const clearFinalLeaderboardSnapshot = (): void => {
  try {
    localStorage.removeItem(FINAL_LEADERBOARD_SNAPSHOT_KEY);
  } catch (error) {
    console.error("[FinalLeaderboardSnapshot] Failed to clear snapshot:", error);
  }
};
