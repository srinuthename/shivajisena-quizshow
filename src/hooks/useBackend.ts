import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getAppMode, modeRequiresApi, modeSupportsViewers, shouldScoreViewersLocally } from '@/config/appMode';

export const useBackend = () => {
  const app = useApp();
  const appMode = getAppMode();
  
  const isApiRequired = modeRequiresApi(appMode);
  const supportsViewers = modeSupportsViewers(appMode);
  const scoreViewersLocally = shouldScoreViewersLocally(appMode);

  const isBackendReady = useMemo(
    () => isApiRequired && app.backendEnabled && app.backendConnected,
    [isApiRequired, app.backendEnabled, app.backendConnected]
  );

  return {
    appMode,
    isApiRequired,
    supportsViewers,
    scoreViewersLocally,
    backendEnabled: app.backendEnabled,
    backendConnected: app.backendConnected,
    isBackendReady,
    verifyConnection: app.verifyConnection,
    setBackendEnabled: app.setBackendEnabled,
    setBackendUrl: app.setBackendUrl,
    backendUrl: app.backendUrl,
  };
};
