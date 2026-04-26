import { ChatResponse } from "@/components/YouTubeChatResponses";
import { LeaderboardEntry } from "@/components/LiveLeaderboard";

const DEFAULT_TEAM_TAGS = ["#East", "#West", "#North", "#South"];

export type PersistedChatResponse = {
  id: string;
  odytChannelId: string;
  userName: string;
  avatarUrl?: string;
  answer: string;
  responseTimeMs: number;
  isCorrect?: boolean | null;
  score?: number;
  serverSeq?: number;
  supportingTeam?: ChatResponse["supportingTeam"];
};

export type BackendViewerBoardsSnapshot = {
  viewerLeaderboard: LeaderboardEntry[];
  currentQuestionResponses: ChatResponse[];
};

export const normalizeDirectionalTeamName = (name: string, teamIndex = 0): string => {
  const raw = String(name || "").trim();
  if (!raw) return DEFAULT_TEAM_TAGS[teamIndex] || `#Team${teamIndex + 1}`;
  const key = raw.replace(/\s+/g, "").toLowerCase();
  const map: Record<string, string> = {
    "#east": "#East",
    east: "#East",
    "#west": "#West",
    west: "#West",
    "#north": "#North",
    north: "#North",
    "#south": "#South",
    south: "#South",
  };
  return map[key] || raw;
};

export const getInitials = (name: string): string =>
  String(name || "")
    .replace(/#/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "T";

export const serializeViewerResponses = (responses: ChatResponse[]): PersistedChatResponse[] =>
  responses.map((response) => ({
    id: response.id,
    odytChannelId: response.odytChannelId,
    userName: response.userName,
    avatarUrl: response.avatarUrl,
    answer: response.answer,
    responseTimeMs: response.responseTimeMs,
    isCorrect: response.isCorrect,
    score: response.score,
    serverSeq: response.serverSeq,
    supportingTeam: response.supportingTeam,
  }));

export const deserializeViewerResponses = (responses: PersistedChatResponse[] | undefined | null): ChatResponse[] =>
  Array.isArray(responses)
    ? responses.map((response) => ({
        id: String(response.id || `${response.odytChannelId || "viewer"}-${Date.now()}`),
        odytChannelId: String(response.odytChannelId || ""),
        userName: String(response.userName || "Viewer"),
        avatarUrl: response.avatarUrl ? String(response.avatarUrl) : "",
        answer: String(response.answer || ""),
        responseTimeMs: Number(response.responseTimeMs || 0),
        isCorrect: typeof response.isCorrect === "boolean" ? response.isCorrect : null,
        score: Number(response.score || 0),
        serverSeq:
          response.serverSeq !== undefined && Number.isFinite(Number(response.serverSeq))
            ? Number(response.serverSeq)
            : undefined,
        supportingTeam: response.supportingTeam,
      }))
    : [];

export const extractBackendViewerBoardsSnapshot = (payload: any): BackendViewerBoardsSnapshot | null => {
  const livePayload =
    payload?.liveLeaderboard?.viewers
      ? payload.liveLeaderboard
      : payload?.liveLeaderboard?.liveLeaderboard?.viewers
        ? payload.liveLeaderboard.liveLeaderboard
        : null;

  if (!livePayload) return null;

  const viewerLeaderboard = (Array.isArray(livePayload.viewers) ? livePayload.viewers : []).map((v: any) => ({
    odytChannelId: String(v.odytChannelId || ""),
    userName: String(v.userName || "Viewer"),
    avatarUrl: String(v.avatarUrl || ""),
    totalScore: Number(v.totalScore || 0),
    correctAnswers: Number(v.correctAnswers || 0),
    totalResponses: Number(v.totalResponses || 0),
    avgResponseTimeMs: Number(v.avgResponseTimeMs || 0),
    supportingTeam: v.supportingTeam,
  })) as LeaderboardEntry[];

  return {
    viewerLeaderboard,
    currentQuestionResponses: deserializeViewerResponses(livePayload.currentQuestionResponses),
  };
};
