import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
const APP_ID_KEY = 'applicationId';
const getApplicationId = async (): Promise<string | null> => localStorage.getItem(APP_ID_KEY);
const saveApplicationId = async (id: string): Promise<void> => { localStorage.setItem(APP_ID_KEY, id); };
import { DEFAULT_QUIZ_SETTINGS } from '@/config/quizSettings';
import { applyBackendBaseUrl, getApiServerUrl, getAppMode, getBackendTarget, setAppMode } from '@/config/appMode';
import { setAnalyticsScope } from '@/services/analyticsApi';
import { QUIZ_HOST_CHANNEL_UPDATED_EVENT, readQuizHostChannel } from '@/lib/quizHostChannel';
import { ensureRemoteAppAccessSession, HOST_PRODUCT_KEY } from '@/config/hostProduct';
import { applyAllDefaults } from '@/config/defaults';
import { hydrateAdminConfigFromBackend } from '@/lib/adminConfigHydration';
import { hasMirroredAdminSettingSync, hydrateMirroredAdminSettings } from '@/lib/adminConfigPersistence';
import { clearActiveQuizRunConfig } from '@/lib/quizRunConfig';

// Storage keys
const FRONTEND_GAME_ID_KEY = 'frontendQuizGameId';
const BACKEND_ENABLED_KEY = 'backendEnabled';
// Generate a UUID
const generateUUID = (): string => {
  return crypto.randomUUID();
};

export interface AppContextType {
  // Application identity (admin-configured, fetched from IndexedDB)
  applicationId: string | null;
  applicationIdLoading: boolean;
  applicationIdError: boolean;
  setApplicationId: (id: string) => Promise<void>;
  refreshApplicationId: () => Promise<void>;
  
  // Frontend quiz game ID (generated when Save Quiz creates/confirms the run)
  frontendQuizGameId: string | null;
  setFrontendQuizGameId: (id: string | null) => void;
  createNewQuizGame: () => string;
  clearQuizRuntimeContext: () => void;
  
  // Backend integration settings
  backendEnabled: boolean;
  setBackendEnabled: (enabled: boolean) => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  backendConnected: boolean;
  setBackendConnected: (connected: boolean) => void;
  
  // Actions
  verifyConnection: () => Promise<boolean>;
  isBackendReady: () => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Application ID - fetched from IndexedDB (admin-configured)
  const [applicationId, setApplicationIdState] = useState<string | null>(null);
  const [applicationIdLoading, setApplicationIdLoading] = useState(true);
  const [applicationIdError, setApplicationIdError] = useState(false);

  // Frontend Quiz Game ID - generated when a quiz run is saved.
  const [frontendQuizGameId, setFrontendQuizGameIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(FRONTEND_GAME_ID_KEY);
    } catch {
      return null;
    }
  });

  // Backend integration settings
  const [backendEnabled, setBackendEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(BACKEND_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [backendUrl, setBackendUrlState] = useState<string>(() => {
    try {
      return getApiServerUrl();
    } catch {
      return getApiServerUrl();
    }
  });

  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Load application ID from IndexedDB on mount
  const loadApplicationId = useCallback(async () => {
    setApplicationIdLoading(true);
    setApplicationIdError(false);
    
    try {
      const storedId = await getApplicationId();
      const nextId = HOST_PRODUCT_KEY;
      if (storedId !== nextId) {
        await saveApplicationId(nextId);
      }
      setApplicationIdState(nextId);
      // Sync to localStorage for apiConfig compatibility (sync access)
      localStorage.setItem('applicationId', nextId);
      console.log('[App] Loaded applicationId:', nextId);
    } catch (error) {
      console.error('[App] Failed to load applicationId:', error);
      setApplicationIdError(true);
    } finally {
      setApplicationIdLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadApplicationId();
  }, [loadApplicationId]);

  useEffect(() => {
    void (async () => {
      await hydrateMirroredAdminSettings().catch(() => {
        // ignore and fall through to default seeding if needed
      });
      const hasLocalDefaults = hasMirroredAdminSettingSync('teamConfigs')
        && hasMirroredAdminSettingSync('correctAnswerScore')
        && hasMirroredAdminSettingSync('quizBranding');
      if (hasLocalDefaults) return;
      await applyAllDefaults();
    })();
  }, []);

  // Boot-time hydration of admin workspace config from the backend.
  // Fire-and-forget — must NEVER block protected route rendering.
  useEffect(() => {
    if (!applicationId) return;
    void hydrateAdminConfigFromBackend(applicationId).catch(() => {
      /* swallow — hydration is opportunistic, never required to render */
    });
  }, [applicationId]);

  // Analytics scope must be runtime-only: derive from JWT token via readQuizHostChannel.
  useEffect(() => {
    const syncAnalyticsScope = () => {
      const hostChannel = readQuizHostChannel();
      setAnalyticsScope({
        applicationId: applicationId || '',
        ownerId: '',
        quizHostChannelId: hostChannel.quizHostChannelId || '',
      });
    };
    syncAnalyticsScope();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'quizUiStateToken' || e.key === 'quizHostChannelId') {
        syncAnalyticsScope();
      }
    };
    window.addEventListener(QUIZ_HOST_CHANNEL_UPDATED_EVENT, syncAnalyticsScope);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(QUIZ_HOST_CHANNEL_UPDATED_EVENT, syncAnalyticsScope);
      window.removeEventListener('storage', onStorage);
    };
  }, [applicationId]);

  // Set application ID (saves to IndexedDB and syncs to localStorage for apiConfig compatibility)
  const setApplicationId = useCallback(async (id: string) => {
    try {
      const nextId = HOST_PRODUCT_KEY;
      await saveApplicationId(nextId);
      setApplicationIdState(nextId);
      setApplicationIdError(false);
      // Sync to localStorage for apiConfig compatibility (sync access)
      localStorage.setItem('applicationId', nextId);
      if (id && id !== nextId) {
        console.warn('[App] Ignoring custom applicationId; using host product key instead.', { requested: id, effective: nextId });
      }
      console.log('[App] Saved applicationId:', nextId);
    } catch (error) {
      console.error('[App] Failed to save applicationId:', error);
      throw error;
    }
  }, []);

  // Refresh application ID from IndexedDB
  const refreshApplicationId = useCallback(async () => {
    await loadApplicationId();
  }, [loadApplicationId]);

  // Set frontend quiz game ID with persistence
  const setFrontendQuizGameId = useCallback((id: string | null) => {
    setFrontendQuizGameIdState(id);
    try {
      if (id) {
        localStorage.setItem(FRONTEND_GAME_ID_KEY, id);
      } else {
        localStorage.removeItem(FRONTEND_GAME_ID_KEY);
      }
      window.dispatchEvent(new CustomEvent('frontendGameIdChanged', { detail: id }));
    } catch (e) {
      console.error('Failed to persist frontendQuizGameId:', e);
    }
  }, []);

  const clearQuizRuntimeContext = useCallback(() => {
    clearActiveQuizRunConfig();
    setFrontendQuizGameId(null);
  }, [setFrontendQuizGameId]);

  // Create a new quiz game (generates a fresh run ID at Save Quiz time)
  const createNewQuizGame = useCallback((): string => {
    const newId = generateUUID();
    setFrontendQuizGameId(newId);
    console.log('[App] Created new frontend quiz game:', newId);
    return newId;
  }, [setFrontendQuizGameId]);

  // Set backend enabled with persistence
  const setBackendEnabled = useCallback((enabled: boolean) => {
    if (getBackendTarget() === 'none') {
      enabled = false;
    }
    setBackendEnabledState(enabled);
    try {
      localStorage.setItem(BACKEND_ENABLED_KEY, enabled.toString());
    } catch (e) {
      console.error('Failed to persist backendEnabled:', e);
    }
    
    // If disabling, reset connection status
    if (!enabled) {
      setBackendConnected(false);
    }
  }, []);

  // Set backend URL with persistence
  const setBackendUrl = useCallback((url: string) => {
    applyBackendBaseUrl(url, 'custom');
    setBackendUrlState(getApiServerUrl());
  }, []);

  useEffect(() => {
    const syncBackendUrl = () => setBackendUrlState(getApiServerUrl());
    window.addEventListener('apiServerUrlChanged', syncBackendUrl as EventListener);
    return () => window.removeEventListener('apiServerUrlChanged', syncBackendUrl as EventListener);
  }, []);

  useEffect(() => {
    const syncBackendRuntime = () => {
      const target = getBackendTarget();
      const mode = getAppMode();

      if (target === 'none') {
        setBackendEnabledState(false);
        setBackendConnected(false);
        try {
          localStorage.setItem(BACKEND_ENABLED_KEY, 'false');
        } catch (e) {
          console.error('Failed to persist backendEnabled:', e);
        }
        if (mode !== 'offline') {
          setAppMode('offline');
        }
        return;
      }

      setBackendEnabledState(true);
      try {
        localStorage.setItem(BACKEND_ENABLED_KEY, 'true');
      } catch (e) {
        console.error('Failed to persist backendEnabled:', e);
      }
      if (mode === 'offline') {
        setAppMode('frontend_scoring');
      }
    };

    syncBackendRuntime();
    window.addEventListener('backendTargetChanged', syncBackendRuntime as EventListener);
    window.addEventListener('appModeChanged', syncBackendRuntime as EventListener);
    return () => {
      window.removeEventListener('backendTargetChanged', syncBackendRuntime as EventListener);
      window.removeEventListener('appModeChanged', syncBackendRuntime as EventListener);
    };
  }, []);

  // Verify connection to backend (called manually, not automatically)
  const verifyConnection = useCallback(async (): Promise<boolean> => {
    // Skip in offline mode - no backend calls allowed
    const mode = getAppMode();
    if (mode === 'offline') {
      setBackendConnected(false);
      return false;
    }

    const isBackendEnabledNow = (() => {
      try {
        return localStorage.getItem(BACKEND_ENABLED_KEY) === 'true';
      } catch {
        return backendEnabled;
      }
    })();

    if (!isBackendEnabledNow) {
      setBackendConnected(false);
      return false;
    }

    if (getBackendTarget() === 'none') {
      setBackendConnected(false);
      return false;
    }

    const effectiveBackendUrl = getApiServerUrl();

    try {
      await ensureRemoteAppAccessSession(effectiveBackendUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${effectiveBackendUrl}/api/health`, {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const connected = response.ok;
      setBackendConnected(connected);
      return connected;
    } catch (error) {
      setBackendConnected(false);
      return false;
    }
  }, [backendEnabled]);

  // Check if backend is ready for API calls
  const isBackendReady = useCallback((): boolean => {
    return backendEnabled && backendConnected;
  }, [backendEnabled, backendConnected]);

  // Listen for cross-tab changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FRONTEND_GAME_ID_KEY) {
        setFrontendQuizGameIdState(e.newValue);
      }
      if (e.key === BACKEND_ENABLED_KEY) {
        setBackendEnabledState(e.newValue === 'true');
      }
      if (e.key === 'apiServerUrl') {
        setBackendUrlState(e.newValue || getApiServerUrl());
      }
    };

    const handleFrontendGameIdChange = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail ?? null;
      setFrontendQuizGameIdState(detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('frontendGameIdChanged', handleFrontendGameIdChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('frontendGameIdChanged', handleFrontendGameIdChange);
    };
  }, []);

  // DO NOT auto-verify connection on mount - let user manually trigger
  // This prevents continuous server polling when backend is down
  // Use useBackendHealth hook for proper exponential backoff when checking
  useEffect(() => {
    const mode = getAppMode();
    // Only set initial connection state, don't make any requests
    if (mode === 'offline' || !backendEnabled) {
      setBackendConnected(false);
    }
    // Don't call verifyConnection() here - let components call it manually
  }, [backendEnabled]);

  const value: AppContextType = {
    applicationId,
    applicationIdLoading,
    applicationIdError,
    setApplicationId,
    refreshApplicationId,
    frontendQuizGameId,
    setFrontendQuizGameId,
    createNewQuizGame,
    clearQuizRuntimeContext,
    backendEnabled,
    setBackendEnabled,
    backendUrl,
    setBackendUrl,
    backendConnected,
    setBackendConnected,
    verifyConnection,
    isBackendReady,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Helper function to check backend enabled from localStorage (for use in apiConfig)
export const isBackendEnabledStatic = (): boolean => {
  try {
    return localStorage.getItem(BACKEND_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
};
