import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { YouTubeUser, UserQuestionResponse, QuizUserStats } from "@/types/quiz";

interface YouTubeUserContextType {
  registerResponse: (
    questionId: string | number,
    userId: string,
    userName: string,
    avatarUrl: string,
    answer: string
  ) => void;
  markQuestionCorrectAnswer: (questionId: string | number, correctAnswer: number) => void;
  getUserStats: () => QuizUserStats[];
  clearAllData: () => void;
  getTotalUsers: () => number;
  getCorrectUsersForQuestion: (questionId: string | number) => YouTubeUser[];
}

interface StoredData {
  users: Record<string, YouTubeUser>;
  responses: Record<string, Record<string, { answer: string; isCorrect: boolean | null }>>;
  correctAnswers: Record<string, number>;
}

const STORAGE_KEY = "youtubeUserResponses";

const YouTubeUserContext = createContext<YouTubeUserContextType | null>(null);

export const useYouTubeUsers = () => {
  const context = useContext(YouTubeUserContext);
  if (!context) {
    throw new Error("useYouTubeUsers must be used within YouTubeUserProvider");
  }
  return context;
};

interface YouTubeUserProviderProps {
  children: ReactNode;
}

export const YouTubeUserProvider = ({ children }: YouTubeUserProviderProps) => {
  const [users, setUsers] = useState<Map<string, YouTubeUser>>(new Map());
  const [responses, setResponses] = useState<Map<string, Map<string, { answer: string; isCorrect: boolean | null }>>>(new Map());
  const [correctAnswers, setCorrectAnswers] = useState<Map<string, number>>(new Map());

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data: StoredData = JSON.parse(saved);
        setUsers(new Map(Object.entries(data.users || {})));
        
        const responsesMap = new Map<string, Map<string, { answer: string; isCorrect: boolean | null }>>();
        Object.entries(data.responses || {}).forEach(([qId, userResponses]) => {
          responsesMap.set(qId, new Map(Object.entries(userResponses)));
        });
        setResponses(responsesMap);
        
        setCorrectAnswers(new Map(Object.entries(data.correctAnswers || {}).map(([k, v]) => [k, v as number])));
      } catch (e) {
        console.error("Failed to load YouTube user data:", e);
      }
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    const data: StoredData = {
      users: Object.fromEntries(users),
      responses: Object.fromEntries(
        Array.from(responses.entries()).map(([qId, userMap]) => [
          qId,
          Object.fromEntries(userMap)
        ])
      ),
      correctAnswers: Object.fromEntries(correctAnswers)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [users, responses, correctAnswers]);

  const registerResponse = useCallback((
    questionId: string | number,
    userId: string,
    userName: string,
    avatarUrl: string,
    answer: string
  ) => {
    const qId = String(questionId);
    
    // Store/update user
    setUsers(prev => {
      const newUsers = new Map(prev);
      newUsers.set(userId, { id: userId, userName, avatarUrl });
      return newUsers;
    });

    // Store response
    setResponses(prev => {
      const newResponses = new Map(prev);
      const questionResponses = newResponses.get(qId) || new Map();
      
      // Only store first response per user per question
      if (!questionResponses.has(userId)) {
        questionResponses.set(userId, { answer: answer.toUpperCase(), isCorrect: null });
        newResponses.set(qId, questionResponses);
      }
      
      return newResponses;
    });
  }, []);

  const markQuestionCorrectAnswer = useCallback((questionId: string | number, correctAnswer: number) => {
    const qId = String(questionId);
    const answerLetter = ["A", "B", "C", "D"][correctAnswer];
    
    // Store correct answer
    setCorrectAnswers(prev => {
      const newCorrect = new Map(prev);
      newCorrect.set(qId, correctAnswer);
      return newCorrect;
    });

    // Mark all responses for this question as correct/incorrect
    setResponses(prev => {
      const newResponses = new Map(prev);
      const questionResponses = newResponses.get(qId);
      
      if (questionResponses) {
        const updatedResponses = new Map<string, { answer: string; isCorrect: boolean | null }>();
        questionResponses.forEach((response, oduserId) => {
          updatedResponses.set(oduserId, {
            ...response,
            isCorrect: response.answer === answerLetter
          });
        });
        newResponses.set(qId, updatedResponses);
      }
      
      return newResponses;
    });
  }, []);

  const getUserStats = useCallback((): QuizUserStats[] => {
    const stats: QuizUserStats[] = [];
    
    users.forEach((user, oduserId) => {
      const userResponses: UserQuestionResponse[] = [];
      let correctCount = 0;
      
      responses.forEach((questionResponses, qId) => {
        const response = questionResponses.get(oduserId);
        if (response) {
          userResponses.push({
            questionId: qId,
            answer: response.answer,
            isCorrect: response.isCorrect
          });
          if (response.isCorrect === true) {
            correctCount++;
          }
        }
      });
      
      if (userResponses.length > 0) {
        stats.push({
          user,
          totalResponses: userResponses.length,
          correctAnswers: correctCount,
          responses: userResponses
        });
      }
    });
    
    // Sort by correct answers (descending), then by total responses
    return stats.sort((a, b) => {
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return b.totalResponses - a.totalResponses;
    });
  }, [users, responses]);

  const getCorrectUsersForQuestion = useCallback((questionId: string | number): YouTubeUser[] => {
    const qId = String(questionId);
    const questionResponses = responses.get(qId);
    const correctUsers: YouTubeUser[] = [];
    
    if (questionResponses) {
      questionResponses.forEach((response, oduserId) => {
        if (response.isCorrect === true) {
          const user = users.get(oduserId);
          if (user) {
            correctUsers.push(user);
          }
        }
      });
    }
    
    return correctUsers;
  }, [users, responses]);

  const getTotalUsers = useCallback(() => users.size, [users]);

  const clearAllData = useCallback(() => {
    setUsers(new Map());
    setResponses(new Map());
    setCorrectAnswers(new Map());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <YouTubeUserContext.Provider value={{
      registerResponse,
      markQuestionCorrectAnswer,
      getUserStats,
      clearAllData,
      getTotalUsers,
      getCorrectUsersForQuestion
    }}>
      {children}
    </YouTubeUserContext.Provider>
  );
};
