export type DifficultyLevel = "easy" | "medium" | "hard";
export type QuestionType = "multiple-choice";
export type QuizType = "Automatic" | "Manual";
export type RoundType = "Generic" | "RapidFire" | "Buzzer" | "Elimination";

export interface LocalizedContent {
  text?: string;
  imageUrl?: string;
}

export interface ChoiceRecord {
  choiceIndex: number;
  content: LocalizedContent;
}

export interface TranslationRecord {
  question: LocalizedContent;
  choices: ChoiceRecord[];
  answerText?: string;
  answerExplanation?: string;
}

export interface QuestionRecord {
  id: string;
  quizId?: string;
  baseLanguage: string;
  question: LocalizedContent;
  choices: ChoiceRecord[];
  correctChoiceIndex: number;
  answerText?: string;
  answerImageUrl?: string;
  answerExplanation?: string;
  translations: Record<string, TranslationRecord>;
  questionType: QuestionType;
  difficultyLevel: DifficultyLevel;
  questionTopics: string[];
  questionTags: string[];
  isActive: boolean;
  usedCount: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoundRecord {
  roundTitle: string;
  roundDescription?: string;
  roundOrder: number;
  roundType: RoundType;
  questionIds: string[];
}

export interface QuizRecord {
  id: string;
  quizTitle: string;
  quizDescription?: string;
  quizLanguage: string;
  quizTopicsList: string[];
  rounds: RoundRecord[];
  quizType: QuizType;
  isPublished: boolean;
  isArchived: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface QuizImportPackage {
  quizzes: QuizRecord[];
  questions: QuestionRecord[];
}

export const createEmptyQuiz = (quizId: string): QuizRecord => {
  const now = Date.now();
  return {
    id: quizId,
    quizTitle: quizId,
    quizDescription: "",
    quizLanguage: "te",
    quizTopicsList: [],
    rounds: [
      {
        roundTitle: "Round 1",
        roundDescription: "",
        roundOrder: 1,
        roundType: "Generic",
        questionIds: [],
      },
    ],
    quizType: "Automatic",
    isPublished: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
};

export const createEmptyQuestion = (questionId: string): QuestionRecord => {
  const now = Date.now();
  return {
    id: questionId,
    baseLanguage: "te",
    question: { text: "" },
    choices: [
      { choiceIndex: 0, content: { text: "" } },
      { choiceIndex: 1, content: { text: "" } },
      { choiceIndex: 2, content: { text: "" } },
      { choiceIndex: 3, content: { text: "" } },
    ],
    correctChoiceIndex: 0,
    answerText: "",
    answerImageUrl: "",
    answerExplanation: "",
    translations: {},
    questionType: "multiple-choice",
    difficultyLevel: "medium",
    questionTopics: [],
    questionTags: [],
    isActive: true,
    usedCount: 0,
    createdAt: now,
    updatedAt: now,
  };
};

export const getLocalizedQuestionText = (
  question: QuestionRecord,
  lang: string
): string => {
  const candidates = [lang, "te", question.baseLanguage];
  for (const candidate of candidates) {
    if (candidate === question.baseLanguage) {
      const text = question.question.text || "";
      if (text) return text;
      continue;
    }
    const text = question.translations[candidate]?.question?.text || "";
    if (text) return text;
  }
  return "";
};

export const getLocalizedChoiceText = (
  question: QuestionRecord,
  choiceIndex: number,
  lang: string
): string => {
  const candidates = [lang, "te", question.baseLanguage];
  for (const candidate of candidates) {
    if (candidate === question.baseLanguage) {
      const text = question.choices[choiceIndex]?.content?.text || "";
      if (text) return text;
      continue;
    }
    const text =
      question.translations[candidate]?.choices?.[choiceIndex]?.content?.text ||
      "";
    if (text) return text;
  }
  return "";
};

export const getLocalizedAnswerExplanation = (
  question: QuestionRecord,
  lang: string
): string => {
  const candidates = [lang, "te", question.baseLanguage];
  for (const candidate of candidates) {
    if (candidate === question.baseLanguage) {
      const text = question.answerExplanation || "";
      if (text) return text;
      continue;
    }
    const text = question.translations[candidate]?.answerExplanation || "";
    if (text) return text;
  }
  return "";
};
