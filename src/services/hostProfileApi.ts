import { getQuizDomainApiBaseUrl, getAppMode } from '@/config/appMode';
import { ensureRemoteAppAccessSession, getAppAccessHeaders } from '@/config/hostProduct';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';

export interface HostYouTubeChannel {
  id: string | null;
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  subscriberCount: number | null;
}

export interface HostProfile {
  id: string;
  email: string;
  name: string;
  authProvider: string;
  profilePicture: string | null;
  youtubeChannel: HostYouTubeChannel | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  active: boolean;
}

export interface HostSession {
  tenantId: string;
  applicationId: string;
  userId: string;
  userEmail: string;
  userName: string;
  roles: string[];
  youtubeChannelId: string | null;
  youtubeChannelTitle: string | null;
  tokenExpiresAt: string | null;
  connectedToYouTube: boolean;
}

export interface LoginAttempt {
  _id: string;
  email: string;
  ip: string;
  success: boolean;
  authType: string;
  userAgent: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface HostProfileResponse {
  success: boolean;
  profile: HostProfile | null;
  session: HostSession;
}

export interface LoginHistoryResponse {
  success: boolean;
  email: string;
  attempts: LoginAttempt[];
}

const getBaseUrl = (): string => {
  return getQuizDomainApiBaseUrl() || '';
};

const ensureAuthorizedBase = async (): Promise<string> => {
  const baseUrl = getBaseUrl();
  await ensureSharedAuthToken(60_000).catch(() => null);
  await ensureRemoteAppAccessSession(baseUrl);
  return baseUrl;
};

/**
 * Fetch the current host's Google/YouTube profile from the orchestrator,
 * which proxies to the auth service.
 */
export const fetchHostProfile = async (): Promise<HostProfileResponse | null> => {
  if (getAppMode() === 'offline') return null;
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(`${baseUrl}/api/host/profile`, {
      credentials: 'include',
      headers: getAppAccessHeaders(),
    });
    if (!response.ok) return null;
    return (await response.json()) as HostProfileResponse;
  } catch {
    return null;
  }
};

/**
 * Fetch the current host's login attempt history from the orchestrator,
 * which proxies to the auth service.
 */
export const fetchHostLoginHistory = async (limit = 50): Promise<LoginHistoryResponse | null> => {
  if (getAppMode() === 'offline') return null;
  try {
    const baseUrl = await ensureAuthorizedBase();
    const response = await fetch(
      `${baseUrl}/api/host/login-history?limit=${limit}`,
      {
        credentials: 'include',
        headers: getAppAccessHeaders(),
      }
    );
    if (!response.ok) return null;
    return (await response.json()) as LoginHistoryResponse;
  } catch {
    return null;
  }
};
