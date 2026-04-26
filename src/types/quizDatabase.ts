// Quiz Database Types - New schema with multilingual support
// Matches MongoDB schema for backend compatibility

// Multilingual text support for multiple languages
export interface MultilingualText {
  en: string;           // English (required)
  te?: string;          // Telugu (optional)
  hi?: string;          // Hindi (optional)
}

// Choice/Option for a question
export interface QuizChoice {
  choiceIndex: number;
  choiceText: MultilingualText;
  choiceImageUrl?: string;
}

// Full question record stored in IndexedDB
export interface QuizQuestionRecord {
  id: string;                        // "quizId-questionNum" e.g., "general-1"
  quizId: string;                    // Parent quiz ID
  questionNum: number;               // Question number within the quiz
  questionText: MultilingualText;    // Multilingual question text
  questionImageUrl?: string;         // Optional question image
  questionTopicsList: string[];      // Tags/topics for the question
  choices: QuizChoice[];             // Array of choices
  correctChoiceIndex: number;        // Index of correct choice (0-based)
  answerText?: MultilingualText;     // Optional answer explanation text
  answerExplanation?: MultilingualText; // Detailed explanation
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
  questionLanguages: string[];       // Supported languages e.g., ["en", "te"]
  validatedManually: boolean;        // Whether manually validated
  usedCount: number;                 // How many times displayed
  createdAt: number;                 // Timestamp
  updatedAt: number;                 // Timestamp
}

// Quiz (collection of questions) record
export interface QuizRecord {
  id: string;                        // Unique quiz ID
  quizTitle: MultilingualText;       // Quiz title
  quizDescription?: MultilingualText; // Quiz description
  quizTopicsList: string[];          // Topics/tags for the quiz
  quizLanguages: string[];           // Supported languages
  youtubeChannels: string[];         // Associated YouTube channels
  questionCount: number;             // Number of questions
  active: boolean;                   // Whether quiz is active
  createdAt: number;                 // Timestamp
  updatedAt: number;                 // Timestamp
}

// Quiz settings per quiz (replaces topic settings)
export interface QuizSettingRecord {
  quizId: string;                    // Quiz ID (primary key)
  active: boolean;                   // Whether this quiz is active for gameplay
  updatedAt: number;
}

// Session pool record - for quiz gameplay
export interface QuizSessionPoolRecord {
  quizId: string;                    // Quiz ID (primary key)
  questionIds: number[];             // Randomized question numbers
  createdAt: number;
}

// Used question record
export interface QuizUsedQuestionRecord {
  id: string;                        // "quizId-questionNum"
  quizId: string;
  questionNum: number;
  usedAt: number;
}

// Import/Export format for backward compatibility
export interface QuizImportFormat {
  quizzes?: QuizRecord[];
  questions?: QuizQuestionRecord[];
  // Legacy format support
  [quizName: string]: any;
}

// Helper functions
export const createMultilingualText = (en: string, te?: string, hi?: string): MultilingualText => ({
  en,
  te,
  hi,
});

export const getLocalizedText = (text: MultilingualText | string, lang: string = 'en'): string => {
  if (typeof text === 'string') return text;
  return text[lang as keyof MultilingualText] || text.en || '';
};

// Convert legacy question format to new format
export interface LegacyQuestionData {
  text?: string;
  question?: string;
  image?: string;
  category?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  options?: string[];
  correctAnswer?: number;
  correctAnswerText?: string;
  explanation?: string;
  usedCount?: number;
}

export const convertLegacyQuestion = (
  quizId: string,
  questionNum: number,
  data: LegacyQuestionData
): QuizQuestionRecord => {
  const questionText = data.text || data.question || '';
  const options = data.options || [];
  
  return {
    id: `${quizId}-${questionNum}`,
    quizId,
    questionNum,
    questionText: { en: questionText },
    questionImageUrl: data.image,
    questionTopicsList: data.category ? [data.category] : [],
    choices: options.map((opt, idx) => ({
      choiceIndex: idx,
      choiceText: { en: opt },
    })),
    correctChoiceIndex: data.correctAnswer ?? 0,
    answerText: data.correctAnswerText ? { en: data.correctAnswerText } : undefined,
    answerExplanation: data.explanation ? { en: data.explanation } : undefined,
    difficultyLevel: data.difficulty || 'Medium',
    questionLanguages: ['en'],
    validatedManually: false,
    usedCount: data.usedCount ?? 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// Convert new format back to legacy for display (temporary compatibility)
export const convertToLegacyFormat = (question: QuizQuestionRecord, lang: string = 'en') => ({
  id: question.questionNum,
  text: getLocalizedText(question.questionText, lang),
  image: question.questionImageUrl,
  category: question.quizId,
  difficulty: question.difficultyLevel,
  options: question.choices.map(c => getLocalizedText(c.choiceText, lang)),
  correctAnswer: question.correctChoiceIndex,
  correctAnswerText: question.answerText ? getLocalizedText(question.answerText, lang) : undefined,
  explanation: question.answerExplanation ? getLocalizedText(question.answerExplanation, lang) : undefined,
});

// Default empty quiz
export const createEmptyQuiz = (quizId: string): QuizRecord => ({
  id: quizId,
  quizTitle: { en: quizId },
  quizDescription: { en: '' },
  quizTopicsList: [],
  quizLanguages: ['en'],
  youtubeChannels: [],
  questionCount: 0,
  active: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Default empty question
export const createEmptyQuestion = (quizId: string, questionNum: number): QuizQuestionRecord => ({
  id: `${quizId}-${questionNum}`,
  quizId,
  questionNum,
  questionText: { en: '' },
  questionTopicsList: [],
  choices: [
    { choiceIndex: 0, choiceText: { en: '' } },
    { choiceIndex: 1, choiceText: { en: '' } },
    { choiceIndex: 2, choiceText: { en: '' } },
    { choiceIndex: 3, choiceText: { en: '' } },
  ],
  correctChoiceIndex: 0,
  difficultyLevel: 'Medium',
  questionLanguages: ['en'],
  validatedManually: false,
  usedCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
