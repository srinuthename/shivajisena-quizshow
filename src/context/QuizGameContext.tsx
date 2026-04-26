/* @refresh reload */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { getBackendTarget } from '@/config/appMode';
import { readActiveQuizRunConfigSync } from '@/lib/quizRunConfig';
import { 
  StreamInfo, 
  addStreamToGame, 
  removeStreamFromGame, 
  toggleStreamStatus, 
  getActiveStreams,
  restartStream as restartStreamApi,
  revalidateStream as revalidateStreamApi,
  refreshAllStreams as refreshAllStreamsApi,
  startAllStreams as startAllStreamsApi,
  stopAllStreams as stopAllStreamsApi,
} from '@/config/apiConfig';

// Storage key for quiz game ID (align with AppContext frontendQuizGameId)
const GAME_ID_STORAGE_KEY = 'frontendQuizGameId';
const STREAMS_SYNC_KEY = 'quizStreamsChangedAt';

const isStreamManagerRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname;
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin?') ||
    pathname === '/quiz' ||
    pathname.startsWith('/quiz/') ||
    pathname === '/quiz-management'
  );
};

export interface QuizGameContextType {
  // Game identification
  frontendQuizGameId: string | null;
  setFrontendQuizGameId: (id: string | null) => void;
  
  // Computed helpers
  isGameActive: boolean;
  
  // Stream management
  connectedStreams: StreamInfo[];
  isLoadingStreams: boolean;
  addStream: (videoUrl: string, transformMode?: string) => Promise<{ success: boolean; error?: string }>;
  removeStream: (videoId: string) => Promise<{ success: boolean }>;
  toggleStream: (videoId: string) => Promise<{ success: boolean; isStopped?: boolean }>;
  restartStream: (videoId: string) => Promise<{ success: boolean; error?: string }>;
  revalidateStream: (videoId: string) => Promise<{ success: boolean; error?: string }>;
  startAllStreams: () => Promise<{ success: boolean; error?: string }>;
  stopAllStreams: () => Promise<{ success: boolean; error?: string }>;
  refreshAllStreamsBackend: () => Promise<{ success: boolean; error?: string }>;
  cleanupStreamsForQuizEnd: () => Promise<{ success: boolean; removed: number; error?: string }>;
  refreshStreams: () => Promise<void>;
}

const QuizGameContext = createContext<QuizGameContextType | undefined>(undefined);

interface QuizGameProviderProps {
  children: ReactNode;
}

export const QuizGameProvider: React.FC<QuizGameProviderProps> = ({ children }) => {
  // Quiz Game ID state
  const [frontendQuizGameId, setFrontendQuizGameIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(GAME_ID_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Stream management state
  const [connectedStreams, setConnectedStreams] = useState<StreamInfo[]>(() => {
    return readActiveQuizRunConfigSync()?.streams || [];
  });
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const refreshSeqRef = useRef(0);
  const refreshInFlightRef = useRef(false);

  const emitStreamsChanged = useCallback(() => {
    try {
      const stamp = String(Date.now());
      localStorage.setItem(STREAMS_SYNC_KEY, stamp);
      window.dispatchEvent(new CustomEvent('quizStreamsChanged', { detail: stamp }));
    } catch (e) {
      console.error('Failed to publish stream sync event:', e);
    }
  }, []);

  const getEffectiveFrontendQuizGameId = useCallback(() => {
    return frontendQuizGameId;
  }, [frontendQuizGameId]);

  const shouldUseStreamManager = useCallback(() => {
    return getBackendTarget() !== 'none' && isStreamManagerRoute();
  }, []);

  // Set Quiz Game ID with persistence (this is the shared frontend-generated run ID).
  const setFrontendQuizGameId = useCallback((id: string | null) => {
    setFrontendQuizGameIdState(id);
    // NOTE: apiConfig maintains its own in-memory copy for legacy consumers, but the
    // source of truth remains the shared frontend-generated quiz run ID.
    try {
      if (id) {
        localStorage.setItem(GAME_ID_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(GAME_ID_STORAGE_KEY);
      }
      window.dispatchEvent(new CustomEvent('frontendGameIdChanged', { detail: id }));
    } catch (e) {
      console.error('Failed to persist frontendQuizGameId:', e);
    }
  }, []);

  // Refresh streams from server
  const refreshStreams = useCallback(async () => {
    if (!shouldUseStreamManager()) {
      setConnectedStreams([]);
      setIsLoadingStreams(false);
      refreshInFlightRef.current = false;
      return;
    }
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    const refreshSeq = ++refreshSeqRef.current;
    const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
    if (!effectiveQuizGameId) {
      setConnectedStreams([]);
      refreshInFlightRef.current = false;
      return;
    }
    
    setIsLoadingStreams(true);
    try {
      const result = await getActiveStreams({ frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId });
      // Ignore stale responses from older overlapping refresh calls.
      if (refreshSeq !== refreshSeqRef.current) return;
      if (result.success && result.streams) {
        setConnectedStreams(result.streams);
      }
    } catch (error) {
      if (refreshSeq !== refreshSeqRef.current) return;
      setConnectedStreams([]);
    } finally {
      if (refreshSeq === refreshSeqRef.current) {
        setIsLoadingStreams(false);
      }
      refreshInFlightRef.current = false;
    }
  }, [getEffectiveFrontendQuizGameId, shouldUseStreamManager]);

  // Listen for cross-tab and cross-view changes once refreshStreams is available.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === GAME_ID_STORAGE_KEY) {
        setFrontendQuizGameIdState(e.newValue);
        return;
      }
      if (e.key === STREAMS_SYNC_KEY && getEffectiveFrontendQuizGameId() && shouldUseStreamManager()) {
        void refreshStreams();
      }
    };

    const handleFrontendGameIdChange = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail ?? null;
      setFrontendQuizGameIdState(detail);
    };

    const handleStreamsChanged = () => {
      if (getEffectiveFrontendQuizGameId() && shouldUseStreamManager()) {
        void refreshStreams();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('frontendGameIdChanged', handleFrontendGameIdChange);
    window.addEventListener('quizStreamsChanged', handleStreamsChanged);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('frontendGameIdChanged', handleFrontendGameIdChange);
      window.removeEventListener('quizStreamsChanged', handleStreamsChanged);
    };
  }, [getEffectiveFrontendQuizGameId, refreshStreams, shouldUseStreamManager]);

  // One-time hydration from API when a quiz is active.
  // SSE remains the source of truth after this bootstrap.
  useEffect(() => {
    if (!shouldUseStreamManager() || !getEffectiveFrontendQuizGameId()) {
      setConnectedStreams([]);
      setIsLoadingStreams(false);
      return;
    }
    void refreshStreams();
  }, [getEffectiveFrontendQuizGameId, refreshStreams, shouldUseStreamManager]);

  // No background polling. Stream list is refreshed on:
  // - initial quiz load
  // - user actions (add/remove/toggle/restart/revalidate/start/stop/refresh)
  // - visibility/online recovery

  // Recover stream manager quickly after tab focus/network restore.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && getEffectiveFrontendQuizGameId() && shouldUseStreamManager()) {
        void refreshStreams();
      }
    };
    const handleOnline = () => {
      if (getEffectiveFrontendQuizGameId() && shouldUseStreamManager()) {
        void refreshStreams();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [getEffectiveFrontendQuizGameId, refreshStreams, shouldUseStreamManager]);

  // Add stream handler
  const addStream = useCallback(async (videoUrl: string, transformMode?: string): Promise<{ success: boolean; error?: string }> => {
    const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
    if (!effectiveQuizGameId) {
      return { success: false, error: 'No active quiz game' };
    }
    
    const result = await addStreamToGame(videoUrl, transformMode, { frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId });
    if (result.success) {
      await refreshStreams();
      emitStreamsChanged();
    }
    return result;
  }, [getEffectiveFrontendQuizGameId, refreshStreams, emitStreamsChanged]);

  // Remove stream handler
  const removeStream = useCallback(async (videoId: string): Promise<{ success: boolean }> => {
    const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
    const result = await removeStreamFromGame(videoId, effectiveQuizGameId ? { frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId } : undefined);
    if (result.success) {
      await refreshStreams();
      emitStreamsChanged();
    }
    return result;
  }, [refreshStreams, emitStreamsChanged]);

  // Toggle stream handler
  const toggleStream = useCallback(async (videoId: string): Promise<{ success: boolean; isStopped?: boolean }> => {
    const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
    const result = await toggleStreamStatus(videoId, effectiveQuizGameId ? { frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId } : undefined);
    if (result.success) {
      await refreshStreams();
      emitStreamsChanged();
    }
    return result;
  }, [refreshStreams, emitStreamsChanged]);

  const restartStream = useCallback(async (videoId: string): Promise<{ success: boolean; error?: string }> => {
    const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
    const result = await restartStreamApi(videoId, effectiveQuizGameId ? { frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId } : undefined);
    if (result.success) {
      await refreshStreams();
      emitStreamsChanged();
    }
    return result;
  }, [refreshStreams, emitStreamsChanged]);

  const revalidateStream = useCallback(async (videoId: string): Promise<{ success: boolean; error?: string }> => {
    const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
    const result = await revalidateStreamApi(videoId, effectiveQuizGameId ? { frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId } : undefined);
    if (result.success) {
      await refreshStreams();
      emitStreamsChanged();
    }
    return result;
  }, [refreshStreams, emitStreamsChanged]);

  const startAllStreams = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
    const result = await startAllStreamsApi(effectiveQuizGameId ? { frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId } : undefined);
    if (result.success) {
      await refreshStreams();
      emitStreamsChanged();
    }
    return result;
  }, [refreshStreams, emitStreamsChanged]);

  const stopAllStreams = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
    const result = await stopAllStreamsApi(effectiveQuizGameId ? { frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId } : undefined);
    if (result.success) {
      await refreshStreams();
      emitStreamsChanged();
    }
    return result;
  }, [refreshStreams, emitStreamsChanged]);

  const refreshAllStreamsBackend = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
    const result = await refreshAllStreamsApi(effectiveQuizGameId ? { frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId } : undefined);
    if (result.success) {
      await refreshStreams();
      emitStreamsChanged();
    }
    return result;
  }, [refreshStreams, emitStreamsChanged]);

  const cleanupStreamsForQuizEnd = useCallback(async (): Promise<{ success: boolean; removed: number; error?: string }> => {
    try {
      const effectiveQuizGameId = getEffectiveFrontendQuizGameId();
      const scopeOverride = effectiveQuizGameId ? { frontendQuizGameId: effectiveQuizGameId, resourceId: effectiveQuizGameId } : undefined;
      // Best effort: stop workers first, then remove streams from registry.
      await stopAllStreamsApi(scopeOverride);
      const snapshot = await getActiveStreams(scopeOverride);
      const streams = snapshot.success ? snapshot.streams || [] : [];
      let removed = 0;
      for (const stream of streams) {
        const result = await removeStreamFromGame(stream.streamId || stream.videoId, scopeOverride);
        if (result.success) removed += 1;
      }
      await refreshStreams();
      emitStreamsChanged();
      return { success: true, removed };
    } catch (error) {
      console.error('Failed to cleanup streams on quiz end:', error);
      await refreshStreams();
      return { success: false, removed: 0, error: 'Cleanup failed' };
    }
  }, [refreshStreams, emitStreamsChanged]);

  const isGameActive = getEffectiveFrontendQuizGameId() !== null;

  const value: QuizGameContextType = {
    frontendQuizGameId,
    setFrontendQuizGameId,
    isGameActive,
    connectedStreams,
    isLoadingStreams,
    addStream,
    removeStream,
    toggleStream,
    restartStream,
    revalidateStream,
    startAllStreams,
    stopAllStreams,
    refreshAllStreamsBackend,
    cleanupStreamsForQuizEnd,
    refreshStreams,
  };

  return (
    <QuizGameContext.Provider value={value}>
      {children}
    </QuizGameContext.Provider>
  );
};

export const useQuizGame = (): QuizGameContextType => {
  const context = useContext(QuizGameContext);
  if (context === undefined) {
    throw new Error('useQuizGame must be used within a QuizGameProvider');
  }
  return context;
};
