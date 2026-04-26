import type { QuizImportPackage, QuizRecord } from "@/types/quizManagement";

export type QuizImportDetectedFormat = "single" | "package" | null;

export interface QuizImportAnalysis {
  detectedFormat: QuizImportDetectedFormat;
  normalized: QuizImportPackage | null;
  warnings: string[];
  errors: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isNonEmptyText = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

const slugifyQuizId = (value: string): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "quiz";

const normalizeDifficultyLevel = (value: unknown): "easy" | "medium" | "hard" => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy" || normalized === "hard") return normalized;
  return "medium";
};

const normalizeChoiceText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (isRecord(value)) {
    const contentText = isRecord(value.content) ? (value.content as Record<string, unknown>).text : "";
    return String(value.text || value.label || contentText || "").trim();
  }
  return "";
};

const isLegacyQuestionMap = (value: unknown): value is Record<string, any> => {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  if (!entries.length) return false;
  return entries.every(([key, question]) => {
    if (!/^\d+$/.test(key)) return false;
    if (!isRecord(question)) return false;
    return isNonEmptyText(question.text || question.question) && Array.isArray(question.options);
  });
};

const validateChoices = (choices: any, path: string, errors: string[]) => {
  if (!Array.isArray(choices) || choices.length < 2) {
    errors.push(`${path} must have at least 2 items.`);
    return;
  }
  choices.forEach((choice: any, idx: number) => {
    if (typeof choice.choiceIndex !== "number") {
      errors.push(`${path}[${idx}].choiceIndex is required.`);
    }
    if (!isRecord(choice.content) || !isNonEmptyText(choice.content.text)) {
      errors.push(`${path}[${idx}].content.text is required.`);
    }
  });
};

const validateImportPackage = (data: any): string[] => {
  const errors: string[] = [];
  if (!data || typeof data !== "object") return ["JSON must be an object."];
  if (!Array.isArray(data.quizzes)) errors.push("quizzes must be an array.");
  if (!Array.isArray(data.questions)) errors.push("questions must be an array.");
  if (errors.length > 0) return errors;

  const questionIds = new Set<string>();
  data.questions.forEach((question: any, idx: number) => {
    if (!question.id || typeof question.id !== "string") {
      errors.push(`questions[${idx}].id is required.`);
      return;
    }
    questionIds.add(question.id);
    if (!question.question || !isNonEmptyText(question.question.text)) {
      errors.push(`questions[${idx}].question.text is required.`);
    }
    validateChoices(question.choices, `questions[${idx}].choices`, errors);
    if (
      typeof question.correctChoiceIndex !== "number" ||
      question.correctChoiceIndex < 0 ||
      question.correctChoiceIndex >= (question.choices?.length || 0)
    ) {
      errors.push(`questions[${idx}].correctChoiceIndex is invalid.`);
    }
  });

  data.quizzes.forEach((quiz: any, idx: number) => {
    if (!quiz.id || typeof quiz.id !== "string") errors.push(`quizzes[${idx}].id is required.`);
    if (!quiz.quizTitle || typeof quiz.quizTitle !== "string") errors.push(`quizzes[${idx}].quizTitle is required.`);
    if (!Array.isArray(quiz.rounds) || quiz.rounds.length === 0) {
      errors.push(`quizzes[${idx}].rounds must have at least one round.`);
      return;
    }
    quiz.rounds.forEach((round: any, roundIdx: number) => {
      if (!Array.isArray(round.questionIds)) {
        errors.push(`quizzes[${idx}].rounds[${roundIdx}].questionIds must be an array.`);
        return;
      }
      round.questionIds.forEach((id: string) => {
        if (!questionIds.has(id)) errors.push(`Round references missing question id: ${id}`);
      });
    });
  });

  return errors;
};

const normalizeLegacyQuestionMapToPackage = (
  data: Record<string, any>,
  warnings: string[]
): QuizImportPackage => {
  const now = Date.now();
  const quizzes: QuizRecord[] = [];
  const questions: QuizImportPackage["questions"] = [];

  Object.entries(data).forEach(([quizTitle, questionMap], quizIdx) => {
    if (!isLegacyQuestionMap(questionMap)) return;
    const quizId = slugifyQuizId(quizTitle);
    const questionIds: string[] = [];

    Object.entries(questionMap)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([questionNumber, rawQuestion], questionIdx) => {
        const qId = `${quizId}-q${questionNumber}`;
        const options = Array.isArray(rawQuestion.options) ? rawQuestion.options : [];
        const usedLegacyCorrectAnswerField = rawQuestion.correctAnswer !== undefined;
        const correctChoiceIndexRaw =
          rawQuestion.correctChoiceIndex ??
          rawQuestion.correctAnswerIndex ??
          rawQuestion.correctAnswer;
        const correctChoiceIndex = Number.isInteger(correctChoiceIndexRaw)
          ? Number(correctChoiceIndexRaw)
          : 0;

        if (usedLegacyCorrectAnswerField) {
          warnings.push(`Question ${questionNumber} in "${quizTitle}" mapped correctAnswer to correctChoiceIndex.`);
        }

        questionIds.push(qId);
        questions.push({
          id: qId,
          quizId,
          baseLanguage: "te",
          question: {
            text: String(rawQuestion.text || rawQuestion.question || "").trim(),
            imageUrl: String(rawQuestion.image || "").trim() || undefined,
          },
          choices: options.map((option: any, choiceIndex: number) => ({
            choiceIndex,
            content: { text: normalizeChoiceText(option) },
          })),
          correctChoiceIndex,
          answerExplanation: String(rawQuestion.explanation || rawQuestion.answerExplanation || "").trim(),
          translations: {},
          questionType: "multiple-choice",
          difficultyLevel: normalizeDifficultyLevel(rawQuestion.difficulty),
          questionTopics: [quizTitle],
          questionTags: [],
          isActive: true,
          usedCount: Number(rawQuestion.usedCount || 0),
          createdAt: now + quizIdx + questionIdx,
          updatedAt: now + quizIdx + questionIdx,
        });
      });

    quizzes.push({
      id: quizId,
      quizTitle,
      quizDescription: "",
      quizLanguage: "te",
      quizTopicsList: [quizTitle],
      rounds: [
        {
          roundTitle: "Round 1",
          roundDescription: "",
          roundOrder: 1,
          roundType: "Generic",
          questionIds,
        },
      ],
      quizType: "Automatic",
      isPublished: false,
      isArchived: false,
      createdAt: now + quizIdx,
      updatedAt: now + quizIdx,
    });
  });

  return { quizzes, questions };
};

const normalizeSingleQuizToPackage = (
  data: any,
  warnings: string[]
): QuizImportPackage | any => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  if (Array.isArray(data.quizzes) && Array.isArray(data.questions)) return data;
  if (Object.values(data).some((value) => isLegacyQuestionMap(value))) {
    return normalizeLegacyQuestionMapToPackage(data, warnings);
  }
  if (data.quizTitle && Array.isArray(data.rounds)) {
    const now = Date.now();
    const quizId = data.id || slugifyQuizId(data.quizTitle);
    const questions: any[] = [];
    const rounds: any[] = [];

    data.rounds.forEach((round: any, roundIdx: number) => {
      const questionIds: string[] = [];
      const roundQuestions = round.questions || [];
      roundQuestions.forEach((q: any, qIdx: number) => {
        const qId = q.id || `${quizId}-r${roundIdx + 1}-q${qIdx + 1}`;
        questionIds.push(qId);
        questions.push({
          id: qId,
          quizId,
          baseLanguage: q.baseLanguage || data.quizLanguage || "te",
          question: q.question || { text: "" },
          choices: q.choices || [],
          correctChoiceIndex: q.correctChoiceIndex ?? q.correctAnswerIndex ?? q.correctAnswer ?? 0,
          answerExplanation: q.answerExplanation || q.explanation || "",
          translations: q.translations || {},
          questionType: "multiple-choice",
          difficultyLevel: q.difficultyLevel || "medium",
          questionTopics: q.questionTopics || [],
          questionTags: q.questionTags || [],
          isActive: q.isActive !== undefined ? q.isActive : true,
          usedCount: q.usedCount || 0,
          createdAt: q.createdAt || now,
          updatedAt: q.updatedAt || now,
        });
      });
      if (round.questionIds?.length) questionIds.push(...round.questionIds);
      rounds.push({
        roundTitle: round.roundTitle || `Round ${roundIdx + 1}`,
        roundDescription: round.roundDescription || "",
        roundOrder: round.roundOrder || roundIdx + 1,
        roundType: round.roundType || "Generic",
        questionIds,
      });
    });

    if (Array.isArray(data.questions)) {
      data.questions.forEach((q: any, qIdx: number) => {
        if (!questions.find((existing) => existing.id === q.id)) {
          questions.push({
            id: q.id || `${quizId}-q${qIdx + 1}`,
            quizId,
            baseLanguage: q.baseLanguage || data.quizLanguage || "te",
            question: q.question || { text: "" },
            choices: q.choices || [],
            correctChoiceIndex: q.correctChoiceIndex ?? q.correctAnswerIndex ?? q.correctAnswer ?? 0,
            answerExplanation: q.answerExplanation || q.explanation || "",
            translations: q.translations || {},
            questionType: "multiple-choice",
            difficultyLevel: q.difficultyLevel || "medium",
            questionTopics: q.questionTopics || [],
            questionTags: q.questionTags || [],
            isActive: q.isActive !== undefined ? q.isActive : true,
            usedCount: q.usedCount || 0,
            createdAt: q.createdAt || now,
            updatedAt: q.updatedAt || now,
          });
        }
      });
    }

    return {
      quizzes: [
        {
          id: quizId,
          quizTitle: data.quizTitle,
          quizDescription: data.quizDescription || data.description || "",
          quizLanguage: data.quizLanguage || "te",
          quizTopicsList: data.quizTopicsList || [],
          rounds,
          quizType: data.quizType === "Manual" ? "Manual" : "Automatic",
          isPublished: data.isPublished ?? false,
          isArchived: data.isArchived ?? false,
          createdAt: data.createdAt || now,
          updatedAt: data.updatedAt || now,
        },
      ],
      questions,
    };
  }
  return data;
};

export const analyzeQuizImportText = (text: string): QuizImportAnalysis => {
  if (!text.trim()) {
    return {
      detectedFormat: null,
      normalized: null,
      warnings: [],
      errors: ["JSON content is empty."],
    };
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        detectedFormat: null,
        normalized: null,
        warnings: [],
        errors: ["JSON must be an object."],
      };
    }

    const warnings: string[] = [];
    const normalized = normalizeSingleQuizToPackage(parsed, warnings);
    const detectedFormat: QuizImportDetectedFormat =
      Array.isArray(parsed.quizzes) && Array.isArray(parsed.questions)
        ? "package"
        : normalized && Array.isArray(normalized.quizzes) && Array.isArray(normalized.questions)
          ? "single"
          : null;
    const errors = validateImportPackage(normalized);

    return {
      detectedFormat,
      normalized: errors.length === 0 ? normalized : normalized,
      warnings,
      errors,
    };
  } catch {
    return {
      detectedFormat: null,
      normalized: null,
      warnings: [],
      errors: ["Invalid JSON syntax."],
    };
  }
};
