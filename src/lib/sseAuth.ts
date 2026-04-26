import { ensureRemoteAppAccessSession, getHostProductHeaders, HOST_PRODUCT_KEY } from '@/config/hostProduct';
import { readQuizHostChannel } from '@/lib/quizHostChannel';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';

const normalizeBaseUrl = (value: string): string => String(value || '').trim().replace(/\/+$/, '');

export type ScopedSseRequest = {
  baseUrl: string;
  tenantId: string;
  applicationId: string;
  resourceId: string;
  streamId?: string;
  consumer?: string;
};

export const issueScopedSseToken = async ({
  baseUrl,
  tenantId,
  applicationId,
  resourceId,
  streamId = '',
  consumer = HOST_PRODUCT_KEY,
}: ScopedSseRequest): Promise<string> => {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    throw new Error('SSE backend URL is not configured');
  }
  if (!applicationId || !resourceId) {
    throw new Error('applicationId and resourceId are required for SSE token');
  }
  await ensureSharedAuthToken(60_000).catch(() => null);
  await ensureRemoteAppAccessSession(normalizedBaseUrl);

  const hostChannel = readQuizHostChannel();
  const response = await fetch(`${normalizedBaseUrl}/streams/sse-token`, {
    method: 'POST',
    credentials: 'include',
    headers: getHostProductHeaders({
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId || String(hostChannel.quizHostChannelId || '').trim(),
      'x-tenant-title': String(hostChannel.quizHostChannelTitle || '').trim(),
      'x-tenant-handle': String(hostChannel.quizHostChannelHandle || '').trim(),
    }),
    body: JSON.stringify({ tenantId, applicationId, resourceId, streamId, consumer }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json?.token) {
    throw new Error(String(json?.error || 'Failed to issue SSE token'));
  }
  return String(json.token);
};
