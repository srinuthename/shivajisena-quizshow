import { create } from 'zustand';
import { FullGameState, getGameState, saveGameState } from '@/lib/gameStateManager';
import { LeaderboardEntry } from '@/components/LiveLeaderboard';

export interface ViewerStats {
  counts: Record<string, number>;
  total: number;
  unique: number;
}

interface QuizStoreState {
  gameState: FullGameState | null;
  viewerStats: ViewerStats;
  viewerLeaderboard: LeaderboardEntry[];
  setGameState: (state: Partial<FullGameState>) => void;
  setViewerStats: (stats: ViewerStats) => void;
  setViewerLeaderboard: (entries: LeaderboardEntry[]) => void;
  applyRemoteGameState: (state: FullGameState) => void;
  applyRemoteGameStateMemOnly: (state: FullGameState) => void;
  applyRemoteViewerStats: (stats: ViewerStats) => void;
  applyRemoteViewerLeaderboard: (entries: LeaderboardEntry[]) => void;
  applyRemoteViewerLeaderboardMemOnly: (entries: LeaderboardEntry[]) => void;
  hydrateFromStorage: () => void;
}

const CHANNEL_NAME = 'quiz-state-v1';
const VIEWER_STATS_KEY = 'viewerResponseData';

const clientId = (() => {
  try {
    return crypto.randomUUID();
  } catch {
    return `client-${Math.random().toString(36).slice(2)}`;
  }
})();

const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel(CHANNEL_NAME)
  : null;

const publish = (type: string, payload: unknown) => {
  if (!channel) return;
  channel.postMessage({ type, payload, source: clientId });
};

const loadViewerStats = (): ViewerStats => {
  try {
    const saved = localStorage.getItem(VIEWER_STATS_KEY);
    if (!saved) return { counts: {}, total: 0, unique: 0 };
    return JSON.parse(saved) as ViewerStats;
  } catch {
    return { counts: {}, total: 0, unique: 0 };
  }
};

const loadViewerLeaderboard = (): LeaderboardEntry[] => {
  try {
    const saved = localStorage.getItem('viewerLeaderboard');
    if (!saved) return [];
    return JSON.parse(saved) as LeaderboardEntry[];
  } catch {
    return [];
  }
};

export const useQuizStore = create<QuizStoreState>((set, get) => ({
  gameState: getGameState(),
  viewerStats: loadViewerStats(),
  viewerLeaderboard: loadViewerLeaderboard(),
  setGameState: (state) => {
    const existing = get().gameState;
    const next = { ...(existing || {}), ...state } as FullGameState;
    saveGameState(next);
    set({ gameState: next });
    publish('gameState', next);
  },
  setViewerStats: (stats) => {
    try {
      localStorage.setItem(VIEWER_STATS_KEY, JSON.stringify(stats));
    } catch {
      // ignore storage errors
    }
    set({ viewerStats: stats });
    publish('viewerStats', stats);
  },
  setViewerLeaderboard: (entries) => {
    try {
      localStorage.setItem('viewerLeaderboard', JSON.stringify(entries));
    } catch {
      // ignore storage errors
    }
    set({ viewerLeaderboard: entries });
    publish('viewerLeaderboard', entries);
  },
  applyRemoteGameState: (state) => {
    saveGameState(state);
    set({ gameState: state });
  },
  // Mirror-safe: updates Zustand in memory only, never writes to shared localStorage
  applyRemoteGameStateMemOnly: (state) => {
    set({ gameState: state });
  },
  applyRemoteViewerStats: (stats) => {
    try {
      localStorage.setItem(VIEWER_STATS_KEY, JSON.stringify(stats));
    } catch {
      // ignore storage errors
    }
    set({ viewerStats: stats });
  },
  applyRemoteViewerLeaderboard: (entries) => {
    try {
      localStorage.setItem('viewerLeaderboard', JSON.stringify(entries));
    } catch {
      // ignore storage errors
    }
    set({ viewerLeaderboard: entries });
  },
  // Mirror-safe: updates Zustand in memory only
  applyRemoteViewerLeaderboardMemOnly: (entries) => {
    set({ viewerLeaderboard: entries });
  },
  hydrateFromStorage: () => {
    set({
      gameState: getGameState(),
      viewerStats: loadViewerStats(),
      viewerLeaderboard: loadViewerLeaderboard(),
    });
  },
}));

if (channel) {
  channel.onmessage = (event) => {
    const { type, payload, source } = event.data || {};
    if (!type || source === clientId) return;

    const state = useQuizStore.getState();
    if (type === 'gameState') {
      state.applyRemoteGameState(payload as FullGameState);
    } else if (type === 'viewerStats') {
      state.applyRemoteViewerStats(payload as ViewerStats);
    } else if (type === 'viewerLeaderboard') {
      state.applyRemoteViewerLeaderboard(payload as LeaderboardEntry[]);
    }
  };
}
