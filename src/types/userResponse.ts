// Answer event format from backend SSE stream
// This matches the format sent by the backend for YouTube answers

export interface StageTimestamps {
  reader: number;
  transform: number;
  sse: number;
}

export interface AnswerEvent {
  // Message identity
  id: string;
  type: string; // "ANSWER" or "RAW"
  
  // Stream info
  streamId: string;
  sourceVideoId?: string;
  connectorTenantId?: string;
  connectorApplicationId?: string;
  connectorResourceId?: string;
  connectorConsumer?: string;
  
  // User identity
  channelId: string;
  author: string;
  displayName: string;
  channelHandle: string;
  channelUrl: string;
  avatar: string;
  avatarUrl: string;
  badges: string[];
  membership: string | null;
  
  // Answer data
  answer: string; // A, B, C, D
  originalMessage: string;
  
  // Timestamps for latency tracking
  receivedAtYT: string; // ISO date string - when YouTube received the message
  serverTs: number; // Server timestamp when message was processed
  serverSeq?: number; // Monotonic server sequence for deterministic ordering
  clientTs: number; // Client timestamp when message reached frontend
  youtubeServerTimestamp: number; // YouTube's server timestamp
  
  // Stage timestamps for detailed latency analysis
  stageTs?: StageTimestamps;
  
  // Legacy field (deprecated, use receivedAtYT)
  receivedAt?: string;
  
  // Raw payload (ignored by frontend, used for debugging)
  payload?: unknown;
}

export interface SystemEvent {
  message: string;
  clientId?: string;
}

/**
 * Check if an answer event is valid for processing
 */
export const isValidAnswerEvent = (event: AnswerEvent): boolean => {
  const normalized = String(event.answer || "").trim().toLowerCase();
  const isTeamSupportCommand = ["#east", "#west", "#north", "#south", "east", "west", "north", "south"].includes(normalized);
  const isSingleLetter = /^[a-zA-Z]$/.test(String(event.answer || "").trim());
  return (
    event.type === 'ANSWER' &&
    event.channelId?.trim() !== '' &&
    event.answer !== null &&
    (isSingleLetter || isTeamSupportCommand)
  );
};

/**
 * Normalize answer letter to uppercase (accepts any A-Z)
 */
export const normalizeAnswer = (answer: string | null): string | null => {
  if (!answer) return null;
  const upper = answer.trim().toUpperCase();
  return /^[A-Z]$/.test(upper) ? upper : null;
};

/**
 * Get answer index from letter using provided label map, or legacy A=0,B=1,C=2,D=3 fallback
 */
export const getAnswerIndex = (answer: string | null, labelToOriginalIndex?: Record<string, number> | null): number | null => {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return null;
  if (labelToOriginalIndex) return labelToOriginalIndex[normalized] ?? null;
  const ANSWER_MAP: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  return ANSWER_MAP[normalized] ?? null;
};

/**
 * Get answer letter from index (0=A, 1=B, 2=C, 3=D) — legacy helper, only valid for default labels
 */
export const getAnswerLetter = (index: number | null): string | null => {
  if (index === null || index < 0 || index > 3) return null;
  return ['A', 'B', 'C', 'D'][index];
};

/**
 * Get the received timestamp from an answer event
 * Priority: serverTs (backend-aligned) > receivedAtYT (YouTube timestamp) > Date.now() (fallback)
 * In frontend_scoring mode, we use serverTs as the primary timestamp for consistency
 */
export const getReceivedTimestamp = (event: AnswerEvent): number => {
  // Primary: Use serverTs (server-aligned timestamp from backend)
  if (event.serverTs && typeof event.serverTs === 'number' && event.serverTs > 0) {
    return event.serverTs;
  }
  
  // Fallback: Parse receivedAtYT ISO string
  const receivedAtStr = event.receivedAtYT || event.receivedAt;
  if (receivedAtStr) {
    const parsed = new Date(receivedAtStr).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  
  // Last resort
  return Date.now();
};
