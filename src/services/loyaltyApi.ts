import { getQuizDomainApiBaseUrl, getAppMode } from '@/config/appMode';
import { ensureRemoteAppAccessSession, getAppAccessHeaders } from '@/config/hostProduct';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';

const getBaseUrl = (): string => {
  if (getAppMode() === 'offline') throw new Error('Offline mode');
  const baseUrl = getQuizDomainApiBaseUrl().replace(/\/+$/, '');
  if (!baseUrl) throw new Error('Backend unavailable');
  return baseUrl;
};

const ensureAuthorizedBase = async (): Promise<string> => {
  const baseUrl = getBaseUrl();
  await ensureSharedAuthToken(60_000).catch(() => null);
  await ensureRemoteAppAccessSession(baseUrl);
  return baseUrl;
};

const authedFetch = async (path: string): Promise<Response> => {
  const baseUrl = await ensureAuthorizedBase();
  const url = `${baseUrl}${path}`;
  return fetch(url, { credentials: 'include', headers: getAppAccessHeaders() });
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoyaltyChannelSummary {
  quizHostChannelId: string;
  quizHostChannelTitle: string;
  quizHostChannelHandle: string;
  quizzesPlayed: number;
  totalCoins: number;
  totalCorrectAnswers: number;
  totalResponses: number;
  firstPlaces: number;
  bestRank: number | null;
  lastPlayedAt: string | null;
  prizesWon: number;
  coinsRedeemed: number;
}

export interface LoyaltyPrize {
  prizeType: string;
  rank: number | null;
  couponCode: string;
  couponStatus: string;
  eligibilityStatus: string;
  assignedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface LoyaltyQuiz {
  frontendQuizGameId: string;
  episodeName: string;
  episodeNumber: string;
  endedAt: string | null;
  totalQuestions: number;
  totalDurationSeconds: number;
  rank: number | null;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  avgResponseTimeMs: number;
  fastestResponseMs: number | null;
  supportingTeam: string;
  prizes: LoyaltyPrize[];
}

export interface LoyaltyChannelDetail {
  hostChannelId: string;
  summary: {
    quizHostChannelTitle: string;
    quizHostChannelHandle: string;
    quizzesPlayed: number;
    totalCoins: number;
    totalCorrectAnswers: number;
    totalResponses: number;
    avgResponseTimeMs: number;
    firstPlaces: number;
    secondPlaces: number;
    thirdPlaces: number;
    top10Places: number;
    bestRank: number | null;
    lastPlayedAt: string | null;
    totalPrizesWon: number;
    coinsRedeemed: number;
  } | null;
  quizzes: LoyaltyQuiz[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getLoyaltyChannels = async (
  participantChannelId: string
): Promise<{
  success: boolean;
  data?: { channels: LoyaltyChannelSummary[] };
  error?: string;
}> => {
  try {
    const params = new URLSearchParams({ participantChannelId });
    const res = await authedFetch(`/api/loyalty/channels?${params}`);
    return await res.json();
  } catch (err) {
    console.error('[LoyaltyAPI] getLoyaltyChannels failed:', err);
    return { success: false, error: 'Network error' };
  }
};

export const getLoyaltyChannelDetail = async (
  participantChannelId: string,
  hostChannelId: string
): Promise<{ success: boolean; data?: LoyaltyChannelDetail; error?: string }> => {
  try {
    const params = new URLSearchParams({ participantChannelId });
    const res = await authedFetch(
      `/api/loyalty/channels/${encodeURIComponent(hostChannelId)}?${params}`
    );
    return await res.json();
  } catch (err) {
    console.error('[LoyaltyAPI] getLoyaltyChannelDetail failed:', err);
    return { success: false, error: 'Network error' };
  }
};
