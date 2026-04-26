import { getQuizDomainApiBaseUrl, getAppMode } from '@/config/appMode';
import { ensureRemoteAppAccessSession, getAppAccessHeaders } from '@/config/hostProduct';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';

/**
 * Coupon API — frontend-only stub.
 *
 * Backend wiring will be added later. The contract below describes the shape
 * the orchestrator MUST eventually expose so that the Loyalty UI can list
 * admin-assigned coupons (e.g. an Amazon voucher attached to a quiz win),
 * mark them as viewed when the user opens the code, and mark them as
 * claimed/redeemed when the user has applied the code.
 *
 *   GET  /api/loyalty/coupons?participantChannelId=...
 *        -> { success, data: { coupons: LoyaltyCoupon[] } }
 *
 *   POST /api/loyalty/coupons/:couponId/view
 *        -> { success, data: LoyaltyCoupon }
 *
 *   POST /api/loyalty/coupons/:couponId/claim
 *        -> { success, data: LoyaltyCoupon }
 *
 * Until the backend route exists, getLoyaltyCoupons swallows the 404 and
 * resolves to an empty list so the UI can render gracefully.
 */

export type CouponStatus = 'pending' | 'assigned' | 'viewed' | 'claimed' | 'expired' | 'revoked';

export interface LoyaltyCoupon {
  couponId: string;
  awardId?: string | null;
  prizeType: string;
  prizeLabel?: string | null;
  rank?: number | null;
  // Where the coupon was earned
  frontendQuizGameId: string;
  episodeName?: string | null;
  episodeNumber?: string | null;
  quizHostChannelId: string;
  quizHostChannelTitle?: string | null;
  quizHostChannelHandle?: string | null;
  // The coupon itself
  provider?: string | null;        // e.g. "Amazon", "Flipkart", "Custom"
  title?: string | null;           // e.g. "Amazon Gift Card ₹500"
  description?: string | null;
  couponCode?: string | null;      // hidden until viewed
  redeemUrl?: string | null;
  valueLabel?: string | null;      // e.g. "₹500", "$10"
  status: CouponStatus;
  assignedAt?: string | null;
  viewedAt?: string | null;
  claimedAt?: string | null;
  expiresAt?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

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

const safeJson = async <T,>(res: Response): Promise<ApiResponse<T>> => {
  // 404 == endpoint not deployed yet → treat as empty result
  if (res.status === 404) return { success: true, data: undefined as unknown as T };
  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, error: 'Invalid response' };
  }
};

export const getLoyaltyCoupons = async (
  participantChannelId: string,
): Promise<ApiResponse<{ coupons: LoyaltyCoupon[] }>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const params = new URLSearchParams({ participantChannelId });
    const res = await fetch(`${baseUrl}/api/loyalty/coupons?${params}`, {
      credentials: 'include',
      headers: getAppAccessHeaders(),
    });
    const parsed = await safeJson<{ coupons: LoyaltyCoupon[] }>(res);
    if (!parsed.data) return { success: true, data: { coupons: [] } };
    return parsed;
  } catch (err) {
    console.warn('[CouponAPI] getLoyaltyCoupons unavailable:', err);
    return { success: true, data: { coupons: [] } };
  }
};

export const markCouponViewed = async (
  couponId: string,
): Promise<ApiResponse<LoyaltyCoupon>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const res = await fetch(
      `${baseUrl}/api/loyalty/coupons/${encodeURIComponent(couponId)}/view`,
      {
        method: 'POST',
        credentials: 'include',
        headers: getAppAccessHeaders(),
      },
    );
    return await safeJson<LoyaltyCoupon>(res);
  } catch (err) {
    console.warn('[CouponAPI] markCouponViewed failed:', err);
    return { success: false, error: 'Network error' };
  }
};

export const markCouponClaimed = async (
  couponId: string,
): Promise<ApiResponse<LoyaltyCoupon>> => {
  try {
    const baseUrl = await ensureAuthorizedBase();
    const res = await fetch(
      `${baseUrl}/api/loyalty/coupons/${encodeURIComponent(couponId)}/claim`,
      {
        method: 'POST',
        credentials: 'include',
        headers: getAppAccessHeaders(),
      },
    );
    return await safeJson<LoyaltyCoupon>(res);
  } catch (err) {
    console.warn('[CouponAPI] markCouponClaimed failed:', err);
    return { success: false, error: 'Network error' };
  }
};
