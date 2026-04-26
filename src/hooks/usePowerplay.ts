import { useState, useRef, useCallback } from "react";
import { useTimer } from "./useTimer";
import { Team } from "@/types/quiz";
import { DEFAULT_QUIZ_SETTINGS } from "@/config/quizSettings";
import { readMirroredAdminSettingSync } from "@/lib/adminConfigPersistence";

export interface PowerplayStats {
  teamName: string;
  teamColor: string;
  correctAnswers: number;
  wrongAnswers: number;
  lifelinesUsed: number;
  pointsScored: number;
  pointsLost: number;
  netScore: number;
  questionsAttempted: number;
}

export interface PowerplayConfig {
  teamsCount: number;
  teams: Team[];
  currentTeamIndex: number;
  teamScores: number[];
  onPowerplayStart?: () => void;
  onPowerplayEnd?: (stats: PowerplayStats) => void;
}

export const usePowerplay = (config: PowerplayConfig) => {
  const { teamsCount, teams, currentTeamIndex, teamScores, onPowerplayStart, onPowerplayEnd } = config;

  // Powerplay settings
  const [powerplayDuration] = useState<number>(() => {
    return Number(readMirroredAdminSettingSync<number>("rapidFireDuration", DEFAULT_QUIZ_SETTINGS.rapidFireDuration));
  });
  const [powerplayEnabled] = useState<boolean>(() => {
    return readMirroredAdminSettingSync<boolean>("powerplayEnabled", DEFAULT_QUIZ_SETTINGS.powerplayEnabled);
  });

  // Powerplay state
  const [powerplayUsed, setPowerplayUsed] = useState<boolean[]>(() => Array(teamsCount).fill(false));
  const [powerplayActive, setPowerplayActive] = useState(false);
  const [powerplayTeam, setPowerplayTeam] = useState<number | null>(null);
  const powerplayTimer = useTimer();
  const powerplayEndPendingRef = useRef(false);

  // Animation states
  const [powerplayFlash, setPowerplayFlash] = useState(false);
  const [powerplayEndFlash, setPowerplayEndFlash] = useState(false);
  const [showPowerplaySummary, setShowPowerplaySummary] = useState(false);
  const [powerplayStats, setPowerplayStats] = useState<PowerplayStats | null>(null);

  // Tracking refs for stats
  const powerplayStartScoreRef = useRef<number>(0);
  const powerplayCorrectRef = useRef<number>(0);
  const powerplayWrongRef = useRef<number>(0);
  const powerplayLifelinesRef = useRef<number>(0);
  const powerplayPointsScoredRef = useRef<number>(0);
  const powerplayPointsLostRef = useRef<number>(0);
  const powerplayQuestionsRef = useRef<number>(0);

  // Track correct answer during powerplay
  const trackCorrect = useCallback((points: number) => {
    if (powerplayActive) {
      powerplayCorrectRef.current += 1;
      powerplayPointsScoredRef.current += points;
      powerplayQuestionsRef.current += 1;
    }
  }, [powerplayActive]);

  // Track wrong answer during powerplay
  const trackWrong = useCallback((points: number) => {
    if (powerplayActive) {
      powerplayWrongRef.current += 1;
      powerplayPointsLostRef.current += points;
      powerplayQuestionsRef.current += 1;
    }
  }, [powerplayActive]);

  // Track lifeline usage during powerplay
  const trackLifeline = useCallback((points: number) => {
    if (powerplayActive) {
      powerplayLifelinesRef.current += 1;
      powerplayPointsLostRef.current += points;
    }
  }, [powerplayActive]);

  // Start powerplay
  const startPowerplay = useCallback(async () => {
    if (!powerplayEnabled || powerplayUsed[currentTeamIndex] || powerplayActive) {
      return false;
    }

    // Initialize tracking refs
    powerplayStartScoreRef.current = teamScores[currentTeamIndex];
    powerplayCorrectRef.current = 0;
    powerplayWrongRef.current = 0;
    powerplayLifelinesRef.current = 0;
    powerplayPointsScoredRef.current = 0;
    powerplayPointsLostRef.current = 0;
    powerplayQuestionsRef.current = 0;

    // Mark powerplay as used
    const newPowerplayUsed = [...powerplayUsed];
    newPowerplayUsed[currentTeamIndex] = true;
    setPowerplayUsed(newPowerplayUsed);

    // Activate
    setPowerplayActive(true);
    setPowerplayTeam(currentTeamIndex);
    powerplayTimer.start(powerplayDuration * 60);

    // Show flash animation
    setPowerplayFlash(true);
    setTimeout(() => setPowerplayFlash(false), 1500);

    onPowerplayStart?.();
    return true;
  }, [powerplayEnabled, powerplayUsed, currentTeamIndex, powerplayActive, teamScores, powerplayDuration, powerplayTimer, onPowerplayStart]);

  // End powerplay
  const endPowerplay = useCallback(() => {
    const previousTeam = powerplayTeam;

    // Calculate stats
    if (previousTeam !== null) {
      const netScore = powerplayPointsScoredRef.current - powerplayPointsLostRef.current;
      const stats: PowerplayStats = {
        teamName: teams[previousTeam].name,
        teamColor: teams[previousTeam].color,
        correctAnswers: powerplayCorrectRef.current,
        wrongAnswers: powerplayWrongRef.current,
        lifelinesUsed: powerplayLifelinesRef.current,
        pointsScored: powerplayPointsScoredRef.current,
        pointsLost: powerplayPointsLostRef.current,
        netScore,
        questionsAttempted: powerplayQuestionsRef.current
      };
      setPowerplayStats(stats);
      onPowerplayEnd?.(stats);
    }

    // Reset state
    setPowerplayActive(false);
    setPowerplayTeam(null);
    powerplayTimer.stop();
    powerplayTimer.reset();

    // Show end animation
    setPowerplayEndFlash(true);
    setTimeout(() => {
      setPowerplayEndFlash(false);
      if (previousTeam !== null) {
        setShowPowerplaySummary(true);
      }
    }, 1500);

    return previousTeam;
  }, [powerplayTeam, teams, powerplayTimer, onPowerplayEnd]);

  // Check if powerplay should end (called on timer expiry)
  const checkPowerplayEnd = useCallback((questionActive: boolean) => {
    if (powerplayTimer.isTimeUp && powerplayActive) {
      if (questionActive) {
        powerplayEndPendingRef.current = true;
      } else {
        endPowerplay();
      }
    }
  }, [powerplayTimer.isTimeUp, powerplayActive, endPowerplay]);

  // Called after question ends to check pending powerplay end
  const handleQuestionEnd = useCallback(() => {
    if (powerplayEndPendingRef.current && powerplayActive) {
      powerplayEndPendingRef.current = false;
      return endPowerplay();
    }
    return null;
  }, [powerplayActive, endPowerplay]);

  // Restore powerplay state from saved game
  const restorePowerplayState = useCallback((savedState: {
    powerplayUsed?: boolean[];
    powerplayActive?: boolean;
    powerplayTeam?: number | null;
    powerplayTimerSeconds?: number;
    powerplayTimerIsRunning?: boolean;
  }) => {
    if (savedState.powerplayUsed) setPowerplayUsed(savedState.powerplayUsed);
    if (savedState.powerplayActive !== undefined) setPowerplayActive(savedState.powerplayActive);
    if (savedState.powerplayTeam !== undefined) setPowerplayTeam(savedState.powerplayTeam);
    if (savedState.powerplayTimerSeconds && savedState.powerplayTimerSeconds > 0 && savedState.powerplayTimerIsRunning) {
      powerplayTimer.start(savedState.powerplayTimerSeconds);
    }
  }, [powerplayTimer]);

  return {
    // State
    powerplayEnabled,
    powerplayDuration,
    powerplayUsed,
    setPowerplayUsed,
    powerplayActive,
    powerplayTeam,
    powerplayTimer,
    powerplayFlash,
    powerplayEndFlash,
    showPowerplaySummary,
    setShowPowerplaySummary,
    powerplayStats,

    // Actions
    startPowerplay,
    endPowerplay,
    checkPowerplayEnd,
    handleQuestionEnd,
    restorePowerplayState,

    // Tracking
    trackCorrect,
    trackWrong,
    trackLifeline,
  };
};
