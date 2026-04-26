// Quiz Session Manager
// Manages in-memory session questions for active quiz gameplay.
// Questions are fetched from the backend question bank, transformed into
// session format, and held in a module-level variable for the quiz duration.

import { shuffleArray } from './questionPoolManager';
import { getQuestionsByIds, listQuizzes } from './quizManagementDB';
import type { QuestionRecord } from '@/types/quizManagement';

export interface SessionQuestion {
  id: string;
  category: string;
  questionNum: number;
  text: string;
  image?: string;
  difficulty: string;
  options: string[];
  correctAnswer: number;
  correctAnswerText: string;
}

export interface SessionData {
  questions: Record<string, SessionQuestion[]>;  // Questions by category
  pools: Record<string, number[]>;               // Question number pools by category
  createdAt: number;
  settings: {
    maxUsedCount: number;
    questionsPerCategory: number;
    shuffleEnabled: boolean;
  };
}

// ---------------------------------------------------------------------------
// In-memory session store
// ---------------------------------------------------------------------------

let activeSessionData: SessionData | null = null;

const DEFAULT_QUIZ_LANGUAGE = 'te';

const toTitleCase = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const mapQuestionToSession = (
  question: QuestionRecord,
  category: string,
  questionNum: number,
  preferredLang: string
): SessionQuestion => {
  const resolveQuestionText = (lang: string): string => {
    if (lang === question.baseLanguage) return question.question?.text || '';
    return question.translations?.[lang]?.question?.text || '';
  };

  const resolveChoiceText = (choiceIndex: number, lang: string): string => {
    if (lang === question.baseLanguage) {
      return question.choices?.[choiceIndex]?.content?.text || '';
    }
    return question.translations?.[lang]?.choices?.[choiceIndex]?.content?.text || '';
  };

  const languageOrder = Array.from(
    new Set([preferredLang, DEFAULT_QUIZ_LANGUAGE, question.baseLanguage])
  );

  const sortedChoices = [...question.choices].sort((a, b) => a.choiceIndex - b.choiceIndex);
  const options = sortedChoices.map((choice, idx) => {
    for (const lang of languageOrder) {
      const text = resolveChoiceText(idx, lang);
      if (text) return text;
    }
    return '';
  });

  let localizedText = '';
  for (const lang of languageOrder) {
    localizedText = resolveQuestionText(lang);
    if (localizedText) break;
  }

  const correctAnswer = question.correctChoiceIndex ?? 0;
  const correctAnswerText = options[correctAnswer] || '';
  return {
    id: question.id,
    category,
    questionNum,
    text: localizedText,
    image: question.question?.imageUrl,
    difficulty: toTitleCase(question.difficultyLevel || 'medium'),
    options,
    correctAnswer,
    correctAnswerText,
  };
};

// Create session questions from backend question bank.
// topicSettings is an optional map of quizId → boolean; quizzes with
// topicSettings[quizId] === false are excluded.
export const createSessionQuestions = async (
  questionsPerCategory: number,
  maxUsedCount: number,
  shuffleEnabled: boolean,
  topicSettings: Record<string, boolean> = {}
): Promise<SessionData> => {
  const preferredLanguage = (() => {
    const raw = localStorage.getItem('appLanguage');
    if (raw && raw.trim()) return raw.trim().toLowerCase();
    return DEFAULT_QUIZ_LANGUAGE;
  })();
  const quizzes = await listQuizzes();
  const activeQuizzes = quizzes.filter((quiz) => topicSettings[quiz.id] !== false);
  const sessionQuestions: Record<string, SessionQuestion[]> = {};
  const sessionPools: Record<string, number[]> = {};

  for (const quiz of activeQuizzes) {
    const orderedRounds = [...quiz.rounds].sort(
      (a, b) => a.roundOrder - b.roundOrder
    );
    const orderedQuestionIds = orderedRounds.flatMap(
      (round) => round.questionIds
    );

    let resolvedQuestions: QuestionRecord[] = [];
    try {
      resolvedQuestions = await getQuestionsByIds(orderedQuestionIds);
    } catch (error) {
      console.info(`[quizSessionManager] Skipping quiz ${quiz.id} because questions could not be resolved`);
      continue;
    }

    const questionMap = new Map(
      resolvedQuestions.map((q) => [q.id, q])
    );

    const eligibleIds = orderedQuestionIds.filter((id) => {
      const question = questionMap.get(id);
      return question && (question.usedCount || 0) < maxUsedCount;
    });

    const questionIds = shuffleEnabled
      ? shuffleArray(eligibleIds).slice(0, questionsPerCategory)
      : eligibleIds.slice(0, questionsPerCategory);

    const sessionQs: SessionQuestion[] = [];
    questionIds.forEach((id, index) => {
      const question = questionMap.get(id);
      if (!question) return;
      sessionQs.push(
        mapQuestionToSession(question, quiz.id, index + 1, preferredLanguage)
      );
    });

    const questionNums = sessionQs.map((q) => q.questionNum);
    sessionQuestions[quiz.id] = sessionQs;
    sessionPools[quiz.id] = questionNums;
  }

  const sessionData: SessionData = {
    questions: sessionQuestions,
    pools: sessionPools,
    createdAt: Date.now(),
    settings: {
      maxUsedCount,
      questionsPerCategory,
      shuffleEnabled
    }
  };

  // Store in-memory only — no localStorage or IndexedDB
  activeSessionData = sessionData;
  return sessionData;
};

// ---------------------------------------------------------------------------
// Session data accessors (all read from in-memory store)
// ---------------------------------------------------------------------------

/** Set session data directly (e.g. when restoring from backend game state). */
export const setSessionData = (data: SessionData | null): void => {
  activeSessionData = data;
};

export const getSessionData = (): SessionData | null => {
  return activeSessionData;
};

export const getSessionPools = (): Record<string, number[]> => {
  return activeSessionData?.pools || {};
};

export const getSessionQuestion = (category: string, questionNum: number): SessionQuestion | undefined => {
  if (!activeSessionData) return undefined;
  const categoryQuestions = activeSessionData.questions[category];
  if (!categoryQuestions) return undefined;
  return categoryQuestions.find(q => q.questionNum === questionNum);
};

export const getSessionQuestionsByCategory = (category: string): SessionQuestion[] => {
  if (!activeSessionData) return [];
  return activeSessionData.questions[category] || [];
};

export const getSessionSubjects = (): string[] => {
  if (!activeSessionData) return [];
  return Object.keys(activeSessionData.questions);
};

export const clearSessionQuestions = async (): Promise<void> => {
  activeSessionData = null;
};

export const hasSessionData = (): boolean => {
  return activeSessionData !== null;
};

export const getSessionSettings = (): SessionData['settings'] | null => {
  return activeSessionData?.settings || null;
};

export const isSessionValid = (): boolean => {
  if (!activeSessionData) return false;
  // Sessions older than 24 hours should be refreshed
  const maxAgeMs = 24 * 60 * 60 * 1000;
  if (Date.now() - activeSessionData.createdAt > maxAgeMs) {
    console.log('[Session] Session data is stale (>24h)');
    return false;
  }
  return true;
};

export const getSessionCreatedAt = (): number | null => {
  return activeSessionData?.createdAt || null;
};

/** @deprecated No longer needed — session data is in-memory only */
export const restoreSessionDataFromIndexedDb = async (): Promise<SessionData | null> => {
  return activeSessionData;
};
