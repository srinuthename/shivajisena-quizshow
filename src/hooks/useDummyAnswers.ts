import { useState, useRef, useCallback, useEffect } from 'react';
import { ProcessedAnswer } from './useAnswerPolling';
import dummyUsersData from '@/data/dummyUsers.json';
import { calculateViewerScore } from '@/lib/viewerScoring';

interface DummyUser {
  ytChannelId: string;
  userName: string;
  ytProfilePicUrl: string;
}

interface UseDummyAnswersOptions {
  enabled: boolean;
  answersPerMinute: number;
  correctAnswerProbability?: number; // 0-1, default 0.4
  questionIndex: number;
  correctAnswer: number | null;
  questionDurationMs?: number;
  onNewAnswer?: (answer: ProcessedAnswer) => void;
}

const calculateScore = (
  isCorrect: boolean,
  questionDuration: number,
  responseTimeMs: number
): number => {
  const minimumScore = parseInt(localStorage.getItem('minimumCorrectScore') || '100', 10);
  return calculateViewerScore({
    isCorrect,
    questionDurationMs: questionDuration,
    responseTimeMs,
    minimumScore,
  });
};

export const useDummyAnswers = ({
  enabled,
  answersPerMinute,
  correctAnswerProbability = 0.4,
  questionIndex,
  correctAnswer,
  questionDurationMs = 30000,
  onNewAnswer,
}: UseDummyAnswersOptions) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false); // Track active state in ref for recursive callbacks
  const usedUsersRef = useRef<Set<string>>(new Set());
  const questionStartTimeRef = useRef<number>(Date.now());
  const answerCounterRef = useRef(0);

  // Shuffle array helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get random unused user
  const getRandomUser = useCallback((): DummyUser | null => {
    const availableUsers = dummyUsersData.users.filter(
      (user) => !usedUsersRef.current.has(user.ytChannelId)
    );
    
    if (availableUsers.length === 0) {
      // Reset if all users used
      usedUsersRef.current.clear();
      return dummyUsersData.users[Math.floor(Math.random() * dummyUsersData.users.length)];
    }
    
    return availableUsers[Math.floor(Math.random() * availableUsers.length)];
  }, []);

  // Generate a single dummy answer
  const generateDummyAnswer = useCallback((): ProcessedAnswer | null => {
    if (correctAnswer === null || questionIndex < 0) return null;
    
    const user = getRandomUser();
    if (!user) return null;
    
    usedUsersRef.current.add(user.ytChannelId);
    
    // Determine if answer is correct based on probability
    const isCorrect = Math.random() < correctAnswerProbability;
    
    // Generate answer choice
    let selectedChoice: number;
    if (isCorrect) {
      selectedChoice = correctAnswer;
    } else {
      // Pick a wrong answer
      const wrongChoices = [0, 1, 2, 3].filter(c => c !== correctAnswer);
      selectedChoice = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
    }
    
    const answerLetter = ['A', 'B', 'C', 'D'][selectedChoice];
    
    // Calculate response time (random between 1-25 seconds)
    const elapsed = Date.now() - questionStartTimeRef.current;
    const minTime = Math.max(1000, elapsed);
    const maxTime = Math.min(questionDurationMs - 2000, minTime + 5000);
    const responseTimeMs = Math.floor(minTime + Math.random() * (maxTime - minTime));
    
    // Calculate score
    const score = calculateScore(isCorrect, questionDurationMs, responseTimeMs);
    
    // Random team assignment
    const teams = dummyUsersData.teams as ('east' | 'west' | 'north' | 'south')[];
    const supportingTeam = Math.random() > 0.3 
      ? teams[Math.floor(Math.random() * teams.length)] 
      : null;
    
    answerCounterRef.current += 1;
    
    return {
      id: `dummy_${questionIndex}_${user.ytChannelId}_${answerCounterRef.current}`,
      odytChannelId: user.ytChannelId,
      userName: user.userName,
      avatarUrl: user.ytProfilePicUrl,
      answer: answerLetter,
      responseTimeMs,
      isCorrect,
      score,
      supportingTeam,
    };
  }, [correctAnswer, questionIndex, correctAnswerProbability, questionDurationMs, getRandomUser]);

  // Start generating dummy answers using a single interval
  const startGenerating = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (answersPerMinute <= 0 || !enabled) return;
    
    isActiveRef.current = true;
    setIsGenerating(true);
    questionStartTimeRef.current = Date.now();
    
    // Calculate base interval in ms
    const baseIntervalMs = (60 * 1000) / answersPerMinute;
    
    // Use a regular interval with built-in randomness per answer
    intervalRef.current = setInterval(() => {
      if (!isActiveRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      
      // Add randomness by sometimes skipping (simulates variable timing)
      const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
      if (randomFactor > 1.15) {
        // Skip this tick ~15% of the time to add variance
        return;
      }
      
      const answer = generateDummyAnswer();
      if (answer) {
        setGeneratedCount(prev => prev + 1);
        onNewAnswer?.(answer);
      }
    }, baseIntervalMs);
    
  }, [answersPerMinute, enabled, generateDummyAnswer, onNewAnswer]);

  // Stop generating
  const stopGenerating = useCallback(() => {
    isActiveRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  // Reset for new question
  const reset = useCallback(() => {
    stopGenerating();
    usedUsersRef.current.clear();
    answerCounterRef.current = 0;
    setGeneratedCount(0);
    questionStartTimeRef.current = Date.now();
  }, [stopGenerating]);

  // Auto start/stop based on enabled state
  useEffect(() => {
    if (enabled && questionIndex >= 0 && correctAnswer !== null) {
      startGenerating();
    } else {
      stopGenerating();
    }
    
    return () => {
      stopGenerating();
    };
  }, [enabled, questionIndex, correctAnswer, startGenerating, stopGenerating]);

  // Reset when question changes
  useEffect(() => {
    reset();
  }, [questionIndex, reset]);

  return {
    isGenerating,
    generatedCount,
    startGenerating,
    stopGenerating,
    reset,
    generateSingleAnswer: generateDummyAnswer,
  };
};
