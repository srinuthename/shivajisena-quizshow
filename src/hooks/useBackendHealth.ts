// Backend health check with exponential backoff
import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiConfig, checkHealth } from '@/config/apiConfig';
import { getAppMode } from '@/config/appMode';

export interface BackendHealthState {
  isHealthy: boolean;
  isChecking: boolean;
  lastCheckTime: number | null;
  consecutiveFailures: number;
  nextRetryIn: number | null;
  error: string | null;
}

export interface UseBackendHealthOptions {
  // Whether to start health checks automatically
  autoStart?: boolean;
  // Minimum delay between checks (ms)
  minDelay?: number;
  // Maximum delay between checks (ms)
  maxDelay?: number;
  // Jitter percentage (0-1)
  jitter?: number;
  // Maximum consecutive failures before stopping
  maxFailures?: number;
}

const DEFAULT_OPTIONS: Required<UseBackendHealthOptions> = {
  autoStart: false, // Don't auto-connect by default
  minDelay: 2000,   // 2 seconds minimum
  maxDelay: 60000,  // 1 minute maximum
  jitter: 0.3,      // 30% jitter
  maxFailures: 10,  // Stop after 10 consecutive failures
};

export const useBackendHealth = (options: UseBackendHealthOptions = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<BackendHealthState>({
    isHealthy: false,
    isChecking: false,
    lastCheckTime: null,
    consecutiveFailures: 0,
    nextRetryIn: null,
    error: null,
  });
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkingRef = useRef(false);
  const mountedRef = useRef(true);
  const enabledRef = useRef(false);
  
  // Calculate delay with exponential backoff and jitter
  const calculateDelay = useCallback((failures: number): number => {
    // Exponential backoff: min * 2^failures
    const exponentialDelay = opts.minDelay * Math.pow(2, failures);
    const clampedDelay = Math.min(exponentialDelay, opts.maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitterAmount = clampedDelay * opts.jitter * (Math.random() * 2 - 1);
    return Math.max(opts.minDelay, clampedDelay + jitterAmount);
  }, [opts.minDelay, opts.maxDelay, opts.jitter]);
  
  // Perform health check
  const performHealthCheck = useCallback(async (): Promise<boolean> => {
    // Skip if in offline mode
    const mode = getAppMode();
    if (mode === 'offline') {
      setState(prev => ({
        ...prev,
        isHealthy: false,
        isChecking: false,
        error: 'Offline mode - backend disabled',
      }));
      return false;
    }
    
    // Prevent concurrent checks
    if (checkingRef.current) return state.isHealthy;
    checkingRef.current = true;
    
    setState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const result = await checkHealth();
      
      if (!mountedRef.current) return false;
      
      if (result.success) {
        setState({
          isHealthy: true,
          isChecking: false,
          lastCheckTime: Date.now(),
          consecutiveFailures: 0,
          nextRetryIn: null,
          error: null,
        });
        checkingRef.current = false;
        return true;
      } else {
        throw new Error('Health check returned unsuccessful');
      }
    } catch (error) {
      if (!mountedRef.current) return false;
      
      const newFailures = state.consecutiveFailures + 1;
      const shouldRetry = newFailures < opts.maxFailures && enabledRef.current;
      const nextDelay = shouldRetry ? calculateDelay(newFailures) : null;
      
      setState({
        isHealthy: false,
        isChecking: false,
        lastCheckTime: Date.now(),
        consecutiveFailures: newFailures,
        nextRetryIn: nextDelay,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
      
      // Schedule retry with exponential backoff
      if (shouldRetry && nextDelay) {
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && enabledRef.current) {
            performHealthCheck();
          }
        }, nextDelay);
      }
      
      checkingRef.current = false;
      return false;
    }
  }, [state.isHealthy, state.consecutiveFailures, calculateDelay, opts.maxFailures]);
  
  // Start health checks
  const startHealthChecks = useCallback(() => {
    enabledRef.current = true;
    // Reset state and start checking
    setState(prev => ({
      ...prev,
      consecutiveFailures: 0,
      error: null,
    }));
    performHealthCheck();
  }, [performHealthCheck]);
  
  // Stop health checks
  const stopHealthChecks = useCallback(() => {
    enabledRef.current = false;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isChecking: false,
      nextRetryIn: null,
    }));
  }, []);
  
  // Manual retry
  const retryNow = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    enabledRef.current = true;
    performHealthCheck();
  }, [performHealthCheck]);
  
  // Reset and restart
  const reset = useCallback(() => {
    stopHealthChecks();
    setState({
      isHealthy: false,
      isChecking: false,
      lastCheckTime: null,
      consecutiveFailures: 0,
      nextRetryIn: null,
      error: null,
    });
  }, [stopHealthChecks]);
  
  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    // Only auto-start if explicitly enabled
    if (opts.autoStart) {
      startHealthChecks();
    }
    
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [opts.autoStart, startHealthChecks]);
  
  // Update countdown timer display
  useEffect(() => {
    if (!state.nextRetryIn) return;
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(interval);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (state.nextRetryIn || 0) - elapsed);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [state.nextRetryIn]);
  
  return {
    ...state,
    startHealthChecks,
    stopHealthChecks,
    retryNow,
    reset,
    isEnabled: enabledRef.current,
  };
};

// Singleton instance for global health state
let globalHealthInstance: ReturnType<typeof useBackendHealth> | null = null;

export const getGlobalHealthInstance = () => globalHealthInstance;
export const setGlobalHealthInstance = (instance: ReturnType<typeof useBackendHealth>) => {
  globalHealthInstance = instance;
};
