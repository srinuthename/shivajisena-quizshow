import { getQuizDomainApiBaseUrl, getAppMode } from "@/config/appMode";
import { HOST_PRODUCT_KEY, ensureRemoteAppAccessSession, getHostProductHeaders } from "@/config/hostProduct";
import { ensureSharedAuthToken } from "@/lib/sharedAuth";
import { readQuizHostChannel } from "@/lib/quizHostChannel";
// Local storage helpers (replaced IndexedDB getAppSetting/setAppSetting)
const getAppSetting = async (key: string): Promise<string | null> => localStorage.getItem(key);
const setAppSetting = async (key: string, value: string): Promise<void> => { localStorage.setItem(key, value); };

const getBaseUrl = (): string => {
  if (getAppMode() === 'offline') {
    throw new Error('Offline mode');
  }
  const baseUrl = getQuizDomainApiBaseUrl().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Backend unavailable');
  }
  return baseUrl;
};

const getAuthorizedHeaders = (headers?: HeadersInit): Headers =>
  getHostProductHeaders(headers);

const ensureAuthorizedBase = async (): Promise<string> => {
  const baseUrl = getBaseUrl();
  await ensureSharedAuthToken(60_000).catch(() => null);
  await ensureRemoteAppAccessSession(baseUrl);
  return baseUrl;
};

const getScopedHostChannelId = (): string => String(readQuizHostChannel().quizHostChannelId || "").trim();

export type PrizeType = "quizfirst" | "quizsecond" | "quizthird" | "luckydip" | "custom";
const getPrizePolicyStorageKey = (applicationId: string, quizHostChannelId: string) =>
  `prize-policy:${String(applicationId || '').trim()}:${String(quizHostChannelId || 'global').trim()}`;

const buildDefaultPrizePolicy = (applicationId: string, quizHostChannelId: string): PrizePolicyRecord => ({
  applicationId: String(applicationId || '').trim(),
  quizHostChannelId: String(quizHostChannelId || '').trim() || null,
  cooldownQuizCount: 10,
  minAccountAgeDays: 180,
  minProperParticipations: 10,
  luckyMinProperParticipations: 20,
  properParticipationMinAnswersPerQuiz: 10,
  recentPrizeLookbackQuizCount: 20,
  minCurrentQuizAnswersForSuggestion: 5,
  minCurrentQuizAccuracyPctForSuggestion: 40,
  luckyOnceLifetimeEnabled: true,
  enabledPrizeTypes: ['quizfirst', 'quizsecond', 'quizthird', 'luckydip'],
});

const readLocalPrizePolicy = async (applicationId: string, quizHostChannelId: string): Promise<PrizePolicyRecord> => {
  const key = getPrizePolicyStorageKey(applicationId, quizHostChannelId);
  const raw = await getAppSetting(key);
  if (!raw) return buildDefaultPrizePolicy(applicationId, quizHostChannelId);
  try {
    return {
      ...buildDefaultPrizePolicy(applicationId, quizHostChannelId),
      ...JSON.parse(raw),
      applicationId: String(applicationId || '').trim(),
      quizHostChannelId: String(quizHostChannelId || '').trim() || null,
    };
  } catch {
    return buildDefaultPrizePolicy(applicationId, quizHostChannelId);
  }
};

const writeLocalPrizePolicy = async (policy: PrizePolicyRecord): Promise<void> => {
  const key = getPrizePolicyStorageKey(policy.applicationId, String(policy.quizHostChannelId || ''));
  await setAppSetting(key, JSON.stringify(policy));
};

const fetchPrizePolicyFromBackend = async (applicationId: string, quizHostChannelId: string): Promise<ApiResponse<PrizePolicyRecord>> => {
  const params = new URLSearchParams({ applicationId });
  if (quizHostChannelId) params.set('quizHostChannelId', quizHostChannelId);
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/policy?${params.toString()}`, {
      credentials: 'include',
      headers: getAuthorizedHeaders(),
    });
    return await parseResponse<PrizePolicyRecord>(response);
  } catch (error) {
    console.error('[PrizeAPI] fetchPrizePolicyFromBackend failed:', error);
    return { success: false, error: 'Network error' };
  }
};

const pushPrizePolicyToBackendInternal = async (payload: PrizePolicyRecord & { updatedBy?: string | null }): Promise<ApiResponse<PrizePolicyRecord>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/policy`, {
      method: 'PUT',
      credentials: 'include',
      headers: getAuthorizedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        ...payload,
        quizHostChannelId: payload.quizHostChannelId || null,
        productKey: HOST_PRODUCT_KEY,
      }),
    });
    return await parseResponse<PrizePolicyRecord>(response);
  } catch (error) {
    console.error('[PrizeAPI] pushPrizePolicyToBackend failed:', error);
    return { success: false, error: 'Network error' };
  }
};

export type PrizeCategory = "regular" | "onlyonceinlifetime";
export type EligibilityStatus = "eligible" | "ineligible";
export type IneligibilityReasonCode =
  | "profile_missing"
  | "account_too_new"
  | "insufficient_participations"
  | "cooldown_active"
  | "lucky_already_used"
  | "prior_prize_winner";

export type PrizeSoftFlagCode =
  | "recent_prize_winner"
  | "frequent_prize_winner"
  | "low_current_quiz_engagement"
  | "low_current_quiz_accuracy"
  | "low_non_winning_history";

export type PrizePositiveSignalCode =
  | "first_time_prize_candidate"
  | "high_proper_participation"
  | "strong_current_quiz_engagement"
  | "strong_current_quiz_accuracy"
  | "strong_non_winning_history";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PrizePolicyRecord {
  applicationId: string;
  quizHostChannelId?: string | null;
  cooldownQuizCount: number;
  minAccountAgeDays: number;
  minProperParticipations: number;
  luckyMinProperParticipations: number;
  properParticipationMinAnswersPerQuiz: number;
  recentPrizeLookbackQuizCount: number;
  minCurrentQuizAnswersForSuggestion: number;
  minCurrentQuizAccuracyPctForSuggestion: number;
  luckyOnceLifetimeEnabled: boolean;
  enabledPrizeTypes: PrizeType[];
  updatedBy?: string | null;
}

export interface PrizeCandidate {
  channelId: string;
  prizeType: PrizeType;
  rank?: number | null;
  category?: PrizeCategory;
}

export interface PrizeEligibilityDecision {
  applicationId: string;
  frontendQuizGameId: string;
  channelId: string;
  prizeType: PrizeType;
  category: PrizeCategory;
  rank: number | null;
  eligibilityStatus: EligibilityStatus;
  ineligibilityReasons: IneligibilityReasonCode[];
  softFlags?: PrizeSoftFlagCode[];
  positiveSignals?: PrizePositiveSignalCode[];
  priorityScore?: number;
  cooldownRemaining: number;
  properParticipations: number;
  requiredProperParticipations?: number;
  nonWinningProperParticipations?: number;
  priorPrizeWins?: number;
  priorRankedPrizeWins?: number;
  currentQuizAnswers?: number;
  currentQuizCorrectAnswers?: number;
  currentQuizAccuracyPct?: number;
  currentQuizScore?: number;
  currentQuizAvgResponseTimeMs?: number;
  quizHostChannelId?: string | null;
}

export interface PrizeAwardRecord {
  _id: string;
  applicationId: string;
  frontendQuizGameId: string;
  quizHostChannelId?: string | null;
  quizHostChannelTitle?: string;
  quizHostChannelHandle?: string;
  prizeType: PrizeType;
  prizeInstance?: number;
  category: PrizeCategory;
  rank?: number | null;
  candidateChannelId: string;
  assignedChannelId: string;
  eligibilityStatus: EligibilityStatus;
  ineligibilityReasons: IneligibilityReasonCode[];
  cooldownRemaining: number;
  prizeModality?: "coupon" | "cash";
  couponCode?: string;
  couponProvider?: string | null;
  couponTitle?: string | null;
  couponValueLabel?: string | null;
  couponRedeemUrl?: string | null;
  cashAmount?: number | null;
  cashCurrency?: string | null;
  cashReference?: string | null;
  couponStatus: "unassigned" | "assigned" | "viewed" | "claimed" | "revoked";
  assignedAt?: string;
  claimedAt?: string;
  deliveredAt?: string | null;
  deliveredBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const parseResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (text) {
      try {
        const parsed = JSON.parse(text) as ApiResponse<T>;
        return {
          success: false,
          error: parsed.error || `HTTP ${response.status}`,
          data: parsed.data,
        };
      } catch {
        return { success: false, error: text || `HTTP ${response.status}` };
      }
    }
    return { success: false, error: `HTTP ${response.status}` };
  }
  return (await response.json()) as ApiResponse<T>;
};

export const getPrizePolicy = async (applicationId: string): Promise<ApiResponse<PrizePolicyRecord>> => {
  const quizHostChannelId = getScopedHostChannelId();
  const result = await fetchPrizePolicyFromBackend(applicationId, quizHostChannelId);
  if (result.success && result.data) {
    return result;
  }
  // Fallback to defaults if backend is unavailable
  console.warn('[PrizeAPI] getPrizePolicy backend fetch failed, using defaults:', result.error);
  return { success: true, data: buildDefaultPrizePolicy(applicationId, quizHostChannelId) };
};

export const updatePrizePolicy = async (
  payload: PrizePolicyRecord & { updatedBy?: string | null }
): Promise<ApiResponse<PrizePolicyRecord>> => {
  const nextPolicy: PrizePolicyRecord = {
    ...buildDefaultPrizePolicy(payload.applicationId, String(payload.quizHostChannelId || getScopedHostChannelId() || '')),
    ...payload,
    quizHostChannelId: payload.quizHostChannelId || getScopedHostChannelId() || null,
  };
  return pushPrizePolicyToBackendInternal(nextPolicy);
};

export const getPrizeSuggestions = async (payload: {
  applicationId: string;
  frontendQuizGameId: string;
  candidates: PrizeCandidate[];
}): Promise<ApiResponse<{ applicationId: string; frontendQuizGameId: string; policy: PrizePolicyRecord; decisions: PrizeEligibilityDecision[] }>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/suggestions`, {
      method: "POST",
      credentials: 'include',
      headers: getAuthorizedHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        ...payload,
        quizHostChannelId: getScopedHostChannelId() || null,
        productKey: HOST_PRODUCT_KEY,
      }),
    });
    return await parseResponse(response);
  } catch (error) {
    console.error("[PrizeAPI] getPrizeSuggestions failed:", error);
    return { success: false, error: "Network error" };
  }
};

export const assignPrize = async (payload: {
  applicationId: string;
  frontendQuizGameId: string;
  prizeType: PrizeType;
  prizeInstance?: number;
  category?: PrizeCategory;
  rank?: number | null;
  candidateChannelId: string;
  assignedChannelId: string;
  prizeModality?: "coupon" | "cash";
  couponCode?: string;
  couponProvider?: string | null;
  couponTitle?: string | null;
  couponValue?: string | null;
  couponRedeemUrl?: string | null;
  cashAmount?: number | null;
  cashCurrency?: string | null;
  cashReference?: string | null;
  assignedBy?: string;
  override?: boolean;
  overrideReason?: string;
  replaceExisting?: boolean;
}): Promise<ApiResponse<PrizeAwardRecord>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/assign`, {
      method: "POST",
      credentials: 'include',
      headers: getAuthorizedHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        ...payload,
        quizHostChannelId: getScopedHostChannelId() || null,
        productKey: HOST_PRODUCT_KEY,
      }),
    });
    return await parseResponse<PrizeAwardRecord>(response);
  } catch (error) {
    console.error("[PrizeAPI] assignPrize failed:", error);
    return { success: false, error: "Network error" };
  }
};

export const getPrizeAwards = async (query: {
  applicationId?: string;
  frontendQuizGameId?: string;
  assignedChannelId?: string;
  limit?: number;
}): Promise<ApiResponse<{ awards: PrizeAwardRecord[] }>> => {
  const params = new URLSearchParams();
  const quizHostChannelId = getScopedHostChannelId();
  if (query.applicationId) params.set("applicationId", query.applicationId);
  if (quizHostChannelId) params.set("quizHostChannelId", quizHostChannelId);
  if (query.frontendQuizGameId) params.set("frontendQuizGameId", query.frontendQuizGameId);
  if (query.assignedChannelId) params.set("assignedChannelId", query.assignedChannelId);
  if (query.limit) params.set("limit", String(query.limit));
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/awards?${params.toString()}`, {
      credentials: 'include',
      headers: getAuthorizedHeaders(),
    });
    return await parseResponse<{ awards: PrizeAwardRecord[] }>(response);
  } catch (error) {
    console.error("[PrizeAPI] getPrizeAwards failed:", error);
    return { success: false, error: "Network error" };
  }
};

export const revokePrizeAward = async (payload: {
  awardId: string;
  revokedBy?: string;
  reason?: string;
}): Promise<ApiResponse<PrizeAwardRecord>> => {
  const awardId = String(payload.awardId || "").trim();
  if (!awardId) return { success: false, error: "awardId required" };
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/awards/${encodeURIComponent(awardId)}/revoke`, {
      method: "POST",
      credentials: 'include',
      headers: getAuthorizedHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        productKey: HOST_PRODUCT_KEY,
        quizHostChannelId: getScopedHostChannelId() || null,
        revokedBy: payload.revokedBy || "leaderboard-inline",
        reason: payload.reason || "manual remove from leaderboard",
      }),
    });
    return await parseResponse<PrizeAwardRecord>(response);
  } catch (error) {
    console.error("[PrizeAPI] revokePrizeAward failed:", error);
    return { success: false, error: "Network error" };
  }
};

export const updatePrizeAward = async (payload: {
  awardId: string;
  prizeType?: PrizeType;
  prizeInstance?: number;
  candidateChannelId?: string;
  assignedChannelId?: string;
  category?: PrizeCategory;
  rank?: number | null;
  prizeModality?: "coupon" | "cash";
  couponCode?: string;
  couponProvider?: string | null;
  couponTitle?: string | null;
  couponValue?: string | null;
  couponRedeemUrl?: string | null;
  cashAmount?: number | null;
  cashCurrency?: string | null;
  cashReference?: string | null;
  updatedBy?: string;
  override?: boolean;
  overrideReason?: string;
  replaceExisting?: boolean;
}): Promise<ApiResponse<PrizeAwardRecord>> => {
  const awardId = String(payload.awardId || "").trim();
  if (!awardId) return { success: false, error: "awardId required" };
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/awards/${encodeURIComponent(awardId)}`, {
      method: "PUT",
      credentials: 'include',
      headers: getAuthorizedHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        productKey: HOST_PRODUCT_KEY,
        quizHostChannelId: getScopedHostChannelId() || null,
        ...payload,
      }),
    });
    return await parseResponse<PrizeAwardRecord>(response);
  } catch (error) {
    console.error("[PrizeAPI] updatePrizeAward failed:", error);
    return { success: false, error: "Network error" };
  }
};

export const startPrizeClaimAuth = async (payload: {
  applicationId: string;
  channelId: string;
  displayName?: string;
  redirectUri?: string;
}): Promise<ApiResponse<{ sessionId: string; callbackPath: string; expiresAt: string }>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/claim/auth/start`, {
      method: "POST",
      credentials: 'include',
      headers: getHostProductHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    return await parseResponse(response);
  } catch (error) {
    console.error("[PrizeAPI] startPrizeClaimAuth failed:", error);
    return { success: false, error: "Network error" };
  }
};

export const getMyPrizeAwards = async (): Promise<ApiResponse<{ claimant: { applicationId: string; channelId: string; displayName: string }; awards: PrizeAwardRecord[] }>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/claim/my-awards`, {
      credentials: 'include',
      headers: getHostProductHeaders(),
    });
    return await parseResponse(response);
  } catch (error) {
    console.error("[PrizeAPI] getMyPrizeAwards failed:", error);
    return { success: false, error: "Network error" };
  }
};

export const markPrizeViewed = async (awardId: string): Promise<ApiResponse<PrizeAwardRecord>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/claim/${encodeURIComponent(awardId)}/mark-viewed`, {
      method: "POST",
      credentials: 'include',
      headers: getHostProductHeaders(),
    });
    return await parseResponse(response);
  } catch (error) {
    console.error("[PrizeAPI] markPrizeViewed failed:", error);
    return { success: false, error: "Network error" };
  }
};

export const markPrizeClaimed = async (awardId: string): Promise<ApiResponse<PrizeAwardRecord>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/claim/${encodeURIComponent(awardId)}/mark-claimed`, {
      method: "POST",
      credentials: 'include',
      headers: getHostProductHeaders(),
    });
    return await parseResponse(response);
  } catch (error) {
    console.error("[PrizeAPI] markPrizeClaimed failed:", error);
    return { success: false, error: "Network error" };
  }
};

export const markPrizeDelivered = async (awardId: string, deliveredBy?: string): Promise<ApiResponse<PrizeAwardRecord>> => {
  const id = String(awardId || "").trim();
  if (!id) return { success: false, error: "awardId required" };
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/prizes/awards/${encodeURIComponent(id)}/deliver`, {
      method: "POST",
      credentials: 'include',
      headers: getAuthorizedHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        productKey: HOST_PRODUCT_KEY,
        quizHostChannelId: getScopedHostChannelId() || null,
        deliveredBy: deliveredBy || getScopedHostChannelId() || "admin",
      }),
    });
    return await parseResponse<PrizeAwardRecord>(response);
  } catch (error) {
    console.error("[PrizeAPI] markPrizeDelivered failed:", error);
    return { success: false, error: "Network error" };
  }
};
