import { useState, useEffect, useRef, useCallback } from 'react';

export const useTimer = () => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup function to clear interval
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((initialSeconds: number = 0) => {
    clearTimer();
    setIsRunning(false);
    setSeconds(initialSeconds);
    // Use requestAnimationFrame to batch state updates
    requestAnimationFrame(() => {
      if (mountedRef.current) {
        setIsRunning(true);
      }
    });
  }, [clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const reset = useCallback(() => {
    stop();
    setSeconds(0);
  }, [stop]);

  // Track mounted state for cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (mountedRef.current) {
            setIsRunning(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    intervalRef.current = interval;
    return () => clearInterval(interval);
  }, [isRunning]);

  return {
    seconds,
    isRunning,
    start,
    stop,
    reset,
    isTimeUp: seconds === 0 && !isRunning
  };
};