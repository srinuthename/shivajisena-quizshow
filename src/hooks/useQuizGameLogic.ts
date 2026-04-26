import { useState, useCallback, useRef, useEffect } from "react";
import { calculateViewerScore } from "@/lib/viewerScoring";

export interface ChatMessage {
  messageId: string;
  publishedAt: string;
  ytChannelId: string;
  ytProfilePicUrl: string;
  userName: string;
  message: string;
  ytPubTimeStamp?: number; // YouTube's publish timestamp from backend
}

export interface UserResponse {
  odytChannelId: string;
  userName: string;
  avatarUrl: string;
  answer: string; // A, B, C, or D
  responseTimeMs: number;
  isCorrect: boolean | null;
  score: number;
}

export interface QuestionState {
  isOpen: boolean;
  openedAt: number | null;
  closedAt: number | null;
  questionDurationMs: number;
  correctAnswer: number | null; // 0=A, 1=B, 2=C, 3=D
  questionId: string;
}

export interface LeaderboardEntry {
  odytChannelId: string;
  userName: string;
  avatarUrl: string;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  avgResponseTimeMs: number;
}

const VALID_ANSWERS = ['a', 'b', 'c', 'd'];
export const useQuizGameLogic = () => {
  // Question state
  const [questionState, setQuestionState] = useState<QuestionState>({
    isOpen: false,
    openedAt: null,
    closedAt: null,
    questionDurationMs: 0,
    correctAnswer: null,
    questionId: '',
  });

  // All responses across all questions: questionId -> userId -> response
  const [allResponses, setAllResponses] = useState<Map<string, Map<string, UserResponse>>>(new Map());
  
  // Current question responses (for display)
  const [currentResponses, setCurrentResponses] = useState<UserResponse[]>([]);
  
  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Ref to track question open time for response time calculation
  const questionOpenTimeRef = useRef<number | null>(null);

  // Open question for answers
  const openQuestion = useCallback((questionId: string) => {
    const now = Date.now();
    questionOpenTimeRef.current = now;
    
    setQuestionState({
      isOpen: true,
      openedAt: now,
      closedAt: null,
      questionDurationMs: 0,
      correctAnswer: null,
      questionId,
    });
    
    setCurrentResponses([]);
    
    // Initialize responses map for this question
    setAllResponses(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(questionId)) {
        newMap.set(questionId, new Map());
      }
      return newMap;
    });
    
    console.log(`[Quiz] Question opened: ${questionId}`);
  }, []);

  // Close question for answers (stop accepting new responses)
  const closeQuestion = useCallback(() => {
    const now = Date.now();
    const duration = questionOpenTimeRef.current ? now - questionOpenTimeRef.current : 0;
    
    setQuestionState(prev => ({
      ...prev,
      isOpen: false,
      closedAt: now,
      questionDurationMs: duration,
    }));
    
    console.log(`[Quiz] Question closed. Duration: ${duration}ms`);
  }, []);

  // Reveal correct answer and calculate scores
  const revealAnswer = useCallback((correctAnswer: number) => {
    setQuestionState(prev => {
      const questionDuration = prev.questionDurationMs || 
        (prev.closedAt && prev.openedAt 
          ? prev.closedAt - prev.openedAt 
          : 30000);
      
      const correctLetter = ['A', 'B', 'C', 'D'][correctAnswer];

      // Update allResponses with scores
      setAllResponses(prevAll => {
        const newMap = new Map(prevAll);
        const questionResponses = newMap.get(prev.questionId);
        
        if (questionResponses) {
          const updatedResponses = new Map<string, UserResponse>();
          
          questionResponses.forEach((response, oduserId) => {
            const isCorrect = response.answer === correctLetter;
            const minimumScore = parseInt(localStorage.getItem('minimumCorrectScore') || '100', 10);
            const score = calculateViewerScore({
              isCorrect,
              questionDurationMs: questionDuration,
              responseTimeMs: response.responseTimeMs,
              minimumScore,
            });
            
            updatedResponses.set(oduserId, {
              ...response,
              isCorrect,
              score,
            });
          });
          
          newMap.set(prev.questionId, updatedResponses);
        }
        
        return newMap;
      });
      
      // Update current responses display
      setCurrentResponses(prevResponses => {
        return prevResponses.map(r => {
          const isCorrect = r.answer === correctLetter;
          const minimumScore = parseInt(localStorage.getItem('minimumCorrectScore') || '100', 10);
          const score = calculateViewerScore({
            isCorrect,
            questionDurationMs: questionDuration,
            responseTimeMs: r.responseTimeMs,
            minimumScore,
          });
          return { ...r, isCorrect, score };
        });
      });
      
      console.log(`[Quiz] Answer revealed: ${correctLetter}`);
      
      return { ...prev, correctAnswer };
    });
  }, []);

  // Process incoming chat message
  const processChatMessage = useCallback((message: ChatMessage) => {
    // Only process if question is open
    if (!questionState.isOpen || !questionOpenTimeRef.current) {
      return null;
    }
    
    // Check if it's a valid answer
    const answerText = message.message.trim().toLowerCase();
    if (!VALID_ANSWERS.includes(answerText)) {
      return null;
    }
    
    const oduserId = message.ytChannelId;
    const questionId = questionState.questionId;
    
    // Check if user already answered this question (first answer only)
    const existingResponses = allResponses.get(questionId);
    if (existingResponses?.has(oduserId)) {
      console.log(`[Quiz] User ${message.userName} already answered`);
      return null;
    }
    
    const responseTimeMs = Date.now() - questionOpenTimeRef.current;
    
    const response: UserResponse = {
      odytChannelId: oduserId,
      userName: message.userName,
      avatarUrl: message.ytProfilePicUrl,
      answer: answerText.toUpperCase(),
      responseTimeMs,
      isCorrect: null, // Will be set when answer is revealed
      score: 0,
    };
    
    // Store response
    setAllResponses(prev => {
      const newMap = new Map(prev);
      const questionResponses = newMap.get(questionId) || new Map();
      questionResponses.set(oduserId, response);
      newMap.set(questionId, questionResponses);
      return newMap;
    });
    
    // Add to current responses
    setCurrentResponses(prev => [...prev, response]);
    
    console.log(`[Quiz] Response recorded: ${message.userName} answered ${response.answer} in ${responseTimeMs}ms`);
    
    return response;
  }, [questionState, allResponses]);

  // Recalculate leaderboard from all responses
  const recalculateLeaderboard = useCallback(() => {
    const userScores = new Map<string, {
      userName: string;
      avatarUrl: string;
      totalScore: number;
      correctAnswers: number;
      totalResponses: number;
      totalResponseTimeMs: number;
    }>();
    
    allResponses.forEach((questionResponses) => {
      questionResponses.forEach((response, oduserId) => {
        const existing = userScores.get(oduserId) || {
          userName: response.userName,
          avatarUrl: response.avatarUrl,
          totalScore: 0,
          correctAnswers: 0,
          totalResponses: 0,
          totalResponseTimeMs: 0,
        };
        
        existing.totalScore += response.score;
        existing.totalResponses += 1;
        existing.totalResponseTimeMs += response.responseTimeMs;
        if (response.isCorrect === true) {
          existing.correctAnswers += 1;
        }
        // Update user info (might have changed)
        existing.userName = response.userName;
        existing.avatarUrl = response.avatarUrl;
        
        userScores.set(oduserId, existing);
      });
    });
    
    // Convert to leaderboard entries and sort
    const entries: LeaderboardEntry[] = Array.from(userScores.entries()).map(([odytChannelId, data]) => ({
      odytChannelId,
      userName: data.userName,
      avatarUrl: data.avatarUrl,
      totalScore: data.totalScore,
      correctAnswers: data.correctAnswers,
      totalResponses: data.totalResponses,
      avgResponseTimeMs: data.totalResponses > 0 ? data.totalResponseTimeMs / data.totalResponses : 0,
    }));
    
    // Sort by score (desc), then by average response time (asc)
    entries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.avgResponseTimeMs - b.avgResponseTimeMs;
    });
    
    setLeaderboard(entries);
    
    console.log(`[Quiz] Leaderboard updated: ${entries.length} users`);
  }, [allResponses]);

  // Auto-recalculate leaderboard whenever allResponses changes (fixes closure bug)
  useEffect(() => {
    recalculateLeaderboard();
  }, [allResponses, recalculateLeaderboard]);

  const getAnswerDistribution = useCallback(() => {
    const distribution = { A: 0, B: 0, C: 0, D: 0 };
    currentResponses.forEach(r => {
      if (r.answer in distribution) {
        distribution[r.answer as keyof typeof distribution]++;
      }
    });
    return distribution;
  }, [currentResponses]);

  // Clear all data
  const clearAllData = useCallback(() => {
    setAllResponses(new Map());
    setCurrentResponses([]);
    setLeaderboard([]);
    setQuestionState({
      isOpen: false,
      openedAt: null,
      closedAt: null,
      questionDurationMs: 0,
      correctAnswer: null,
      questionId: '',
    });
    questionOpenTimeRef.current = null;
    console.log('[Quiz] All data cleared');
  }, []);

  return {
    // State
    questionState,
    currentResponses,
    leaderboard,
    
    // Actions
    openQuestion,
    closeQuestion,
    revealAnswer,
    processChatMessage,
    recalculateLeaderboard,
    getAnswerDistribution,
    clearAllData,
    
    // Helpers
    totalResponses: currentResponses.length,
    isQuestionOpen: questionState.isOpen,
  };
};
