import { getAppMode } from '@/config/appMode';
import { ensureRemoteAppAccessSession, getHostProductHeaders, HOST_PRODUCT_KEY } from '@/config/hostProduct';
import { readQuizHostChannel } from '@/lib/quizHostChannel';
import { ensureSharedAuthToken } from '@/lib/sharedAuth';
import type { QuestionRecord, QuizImportPackage, QuizRecord } from '@/types/quizManagement';

const LOCAL_TENANT_ID = 'local-dev-tenant';
const LOCAL_TENANT_TITLE = 'Local Dev Host';
const LOCAL_TENANT_HANDLE = 'local-dev-host';

const QUIZ_DB_NAME = 'quizManagementLocal';
const QUIZ_DB_VERSION = 1;
const QUIZZES_STORE_NAME = 'quizzes';
const QUESTIONS_STORE_NAME = 'questions';
const META_STORE_NAME = 'meta';
const SYNC_META_KEY = 'syncMeta';

export interface QuestionBankSyncMeta {
  lastPulledAt: number | null;
  lastPushedAt: number | null;
  lastPullConflictCount: number;
  lastPushConflictCount: number;
  lastPullStatus: string | null;
  lastPushStatus: string | null;
}

export interface QuestionBankSyncResult {
  quizzesApplied: number;
  quizzesSkipped: number;
  questionRecordsApplied: number;
  conflictCount: number;
}

type SyncMetaRecord = {
  key: typeof SYNC_META_KEY;
  value: QuestionBankSyncMeta;
};

const DEFAULT_SYNC_META: QuestionBankSyncMeta = {
  lastPulledAt: null,
  lastPushedAt: null,
  lastPullConflictCount: 0,
  lastPushConflictCount: 0,
  lastPullStatus: null,
  lastPushStatus: null,
};

const getQuestionBankBaseUrl = () =>
  String(import.meta.env.VITE_BACKEND_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');

const getAuthorizedHeaders = (headers?: HeadersInit) => {
  const hostChannel = readQuizHostChannel();
  return getHostProductHeaders({
    ...Object.fromEntries(new Headers(headers || {}).entries()),
    'x-tenant-id': String(hostChannel.quizHostChannelId || LOCAL_TENANT_ID).trim(),
    'x-tenant-title': String(hostChannel.quizHostChannelTitle || LOCAL_TENANT_TITLE).trim(),
    'x-tenant-handle': String(hostChannel.quizHostChannelHandle || LOCAL_TENANT_HANDLE).trim(),
  });
};

const readJsonSafe = async (response: Response) => response.json().catch(() => ({}));

const normalizeQuiz = (quiz: any): QuizRecord => {
  const now = Date.now();
  return {
    id: String(quiz?.id || '').trim(),
    quizTitle: String(quiz?.quizTitle || quiz?.id || '').trim(),
    quizDescription: String(quiz?.quizDescription || ''),
    quizLanguage: String(quiz?.quizLanguage || 'te'),
    quizTopicsList: Array.isArray(quiz?.quizTopicsList) ? quiz.quizTopicsList : [],
    rounds: Array.isArray(quiz?.rounds)
      ? quiz.rounds.map((round: any, idx: number) => ({
          roundTitle: String(round?.roundTitle || `Round ${idx + 1}`),
          roundDescription: String(round?.roundDescription || ''),
          roundOrder: Number(round?.roundOrder ?? idx + 1),
          roundType: round?.roundType || 'Generic',
          questionIds: Array.isArray(round?.questionIds)
            ? round.questionIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
            : [],
        }))
      : [],
    quizType: quiz?.quizType === 'Manual' ? 'Manual' : 'Automatic',
    isPublished: Boolean(quiz?.isPublished),
    isArchived: Boolean(quiz?.isArchived),
    createdBy: typeof quiz?.createdBy === 'string' ? quiz.createdBy : undefined,
    updatedBy: typeof quiz?.updatedBy === 'string' ? quiz.updatedBy : undefined,
    createdAt: Number(quiz?.createdAt || now),
    updatedAt: Number(quiz?.updatedAt || now),
  };
};

const normalizeQuestion = (question: any): QuestionRecord => {
  const now = Date.now();
  return {
    id: String(question?.id || '').trim(),
    quizId: String(question?.quizId || '').trim() || undefined,
    baseLanguage: String(question?.baseLanguage || 'te'),
    question: question?.question || { text: '' },
    choices: Array.isArray(question?.choices)
      ? question.choices.map((choice: any, idx: number) => ({
          choiceIndex: typeof choice?.choiceIndex === 'number' ? choice.choiceIndex : idx,
          content: choice?.content || { text: '' },
        }))
      : [],
    correctChoiceIndex: typeof question?.correctChoiceIndex === 'number' ? question.correctChoiceIndex : 0,
    answerText: String(question?.answerText || ''),
    answerImageUrl: String(question?.answerImageUrl || ''),
    answerExplanation: String(question?.answerExplanation || ''),
    translations: question?.translations || {},
    questionType: 'multiple-choice',
    difficultyLevel: question?.difficultyLevel || 'medium',
    questionTopics: Array.isArray(question?.questionTopics) ? question.questionTopics : [],
    questionTags: Array.isArray(question?.questionTags) ? question.questionTags : [],
    isActive: question?.isActive !== false,
    usedCount: Number(question?.usedCount || 0),
    createdBy: typeof question?.createdBy === 'string' ? question.createdBy : undefined,
    updatedBy: typeof question?.updatedBy === 'string' ? question.updatedBy : undefined,
    createdAt: Number(question?.createdAt || now),
    updatedAt: Number(question?.updatedAt || now),
  };
};

const openQuizManagementDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(QUIZ_DB_NAME, QUIZ_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUIZZES_STORE_NAME)) {
        db.createObjectStore(QUIZZES_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(QUESTIONS_STORE_NAME)) {
        db.createObjectStore(QUESTIONS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open question bank database'));
  });

const withDb = async <T>(run: (db: IDBDatabase) => Promise<T>): Promise<T> => {
  const db = await openQuizManagementDb();
  try {
    return await run(db);
  } finally {
    db.close();
  }
};

const getAllFromStore = async <T>(storeName: string): Promise<T[]> =>
  withDb((db) =>
    new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? (request.result as T[]) : []);
      request.onerror = () => reject(request.error || new Error(`Failed to read ${storeName}`));
    })
  );

const getQuestionRecordsByIds = async (ids: string[]): Promise<QuestionRecord[]> =>
  withDb((db) =>
    new Promise<QuestionRecord[]>((resolve, reject) => {
      const uniqueIds = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
      if (!uniqueIds.length) {
        resolve([]);
        return;
      }
      const tx = db.transaction(QUESTIONS_STORE_NAME, 'readonly');
      const store = tx.objectStore(QUESTIONS_STORE_NAME);
      const results = new Map<string, QuestionRecord>();
      let remaining = uniqueIds.length;
      uniqueIds.forEach((id) => {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) {
            results.set(id, normalizeQuestion(request.result));
          }
          remaining -= 1;
          if (remaining === 0) {
            resolve(uniqueIds.map((questionId) => results.get(questionId)).filter(Boolean) as QuestionRecord[]);
          }
        };
        request.onerror = () => reject(request.error || new Error('Failed to read question record'));
      });
    })
  );

const getSyncMetaRecord = async (): Promise<QuestionBankSyncMeta> => {
  const records = await getAllFromStore<SyncMetaRecord>(META_STORE_NAME);
  const match = records.find((record) => record?.key === SYNC_META_KEY);
  return match?.value ? { ...DEFAULT_SYNC_META, ...match.value } : { ...DEFAULT_SYNC_META };
};

const saveSyncMetaRecord = async (partial: Partial<QuestionBankSyncMeta>): Promise<void> => {
  const current = await getSyncMetaRecord();
  await withDb((db) =>
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE_NAME, 'readwrite');
      tx.objectStore(META_STORE_NAME).put({ key: SYNC_META_KEY, value: { ...current, ...partial } });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to persist question bank sync metadata'));
      tx.onabort = () => reject(tx.error || new Error('Question bank sync metadata transaction aborted'));
    })
  );
};

const exportLocalPackage = async (): Promise<QuizImportPackage> => ({
  quizzes: (await getAllFromStore<QuizRecord>(QUIZZES_STORE_NAME)).map(normalizeQuiz),
  questions: (await getAllFromStore<QuestionRecord>(QUESTIONS_STORE_NAME)).map(normalizeQuestion),
});

const ensureQuestionsBoundToQuiz = (quiz: QuizRecord, questions: QuestionRecord[]): QuestionRecord[] => {
  const referencedIds = new Set(quiz.rounds.flatMap((round) => round.questionIds));
  return questions
    .map(normalizeQuestion)
    .filter((question) => referencedIds.has(question.id) || question.quizId === quiz.id)
    .map((question) => ({ ...question, quizId: quiz.id }));
};

const collectQuestionIdsForQuiz = (quiz: QuizRecord, questionMap: Map<string, QuestionRecord>): string[] => {
  const ids = new Set<string>();
  quiz.rounds.forEach((round) => {
    round.questionIds.forEach((questionId) => ids.add(String(questionId || '').trim()));
  });
  questionMap.forEach((question) => {
    if (question.quizId === quiz.id) ids.add(question.id);
  });
  return Array.from(ids).filter(Boolean);
};

const replaceQuizInMaps = (
  quizMap: Map<string, QuizRecord>,
  questionMap: Map<string, QuestionRecord>,
  quiz: QuizRecord,
  questions: QuestionRecord[]
): number => {
  const existingQuiz = quizMap.get(quiz.id);
  if (existingQuiz) {
    collectQuestionIdsForQuiz(existingQuiz, questionMap).forEach((questionId) => {
      questionMap.delete(questionId);
    });
  }
  quizMap.set(quiz.id, quiz);
  const normalizedQuestions = ensureQuestionsBoundToQuiz(quiz, questions);
  normalizedQuestions.forEach((question) => {
    questionMap.set(question.id, question);
  });
  return normalizedQuestions.length;
};

const normalizeImportPackage = (data: QuizImportPackage): QuizImportPackage => {
  const quizzes = Array.isArray(data?.quizzes) ? data.quizzes.map(normalizeQuiz) : [];
  const rawQuestions = Array.isArray(data?.questions) ? data.questions.map(normalizeQuestion) : [];
  const quizIdByQuestionId = new Map<string, string>();
  quizzes.forEach((quiz) => {
    quiz.rounds.forEach((round) => {
      round.questionIds.forEach((questionId) => {
        const normalizedId = String(questionId || '').trim();
        if (normalizedId) quizIdByQuestionId.set(normalizedId, quiz.id);
      });
    });
  });
  const questions = rawQuestions.map((question) => ({
    ...question,
    quizId: String(question.quizId || quizIdByQuestionId.get(question.id) || '').trim() || undefined,
  }));
  return { quizzes, questions };
};

const mergePackages = (
  currentData: QuizImportPackage,
  incomingData: QuizImportPackage,
  mode: 'replace' | 'merge'
): { merged: QuizImportPackage; summary: QuestionBankSyncResult } => {
  const current = normalizeImportPackage(currentData);
  const incoming = normalizeImportPackage(incomingData);
  const quizMap = new Map(current.quizzes.map((quiz) => [quiz.id, quiz]));
  const questionMap = new Map(current.questions.map((question) => [question.id, question]));
  const groupedIncomingQuestions = new Map<string, QuestionRecord[]>();

  incoming.questions.forEach((question) => {
    const ownerQuizId = String(question.quizId || '').trim();
    if (!ownerQuizId) return;
    const group = groupedIncomingQuestions.get(ownerQuizId) || [];
    group.push(question);
    groupedIncomingQuestions.set(ownerQuizId, group);
  });

  let quizzesApplied = 0;
  let quizzesSkipped = 0;
  let questionRecordsApplied = 0;
  let conflictCount = 0;

  incoming.quizzes.forEach((quiz) => {
    const existingQuiz = quizMap.get(quiz.id);
    const canReplace = mode === 'replace' || !existingQuiz || Number(quiz.updatedAt || 0) >= Number(existingQuiz.updatedAt || 0);
    if (!canReplace) {
      quizzesSkipped += 1;
      conflictCount += 1;
      return;
    }
    if (existingQuiz && mode === 'merge') {
      conflictCount += 1;
    }
    quizzesApplied += 1;
    questionRecordsApplied += replaceQuizInMaps(quizMap, questionMap, quiz, groupedIncomingQuestions.get(quiz.id) || []);
  });

  const incomingQuizIds = new Set(incoming.quizzes.map((quiz) => quiz.id));
  incoming.questions
    .filter((question) => !incomingQuizIds.has(String(question.quizId || '').trim()))
    .forEach((question) => {
      const existingQuestion = questionMap.get(question.id);
      const canReplace = mode === 'replace' || !existingQuestion || Number(question.updatedAt || 0) >= Number(existingQuestion.updatedAt || 0);
      if (!canReplace) {
        conflictCount += 1;
        return;
      }
      if (existingQuestion && mode === 'merge') {
        conflictCount += 1;
      }
      questionMap.set(question.id, question);
      questionRecordsApplied += 1;
    });

  return {
    merged: {
      quizzes: Array.from(quizMap.values()),
      questions: Array.from(questionMap.values()),
    },
    summary: {
      quizzesApplied,
      quizzesSkipped,
      questionRecordsApplied,
      conflictCount,
    },
  };
};

const persistLocalPackage = async (data: QuizImportPackage): Promise<void> => {
  const normalized = normalizeImportPackage(data);
  await withDb((db) =>
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction([QUIZZES_STORE_NAME, QUESTIONS_STORE_NAME], 'readwrite');
      const quizzesStore = tx.objectStore(QUIZZES_STORE_NAME);
      const questionsStore = tx.objectStore(QUESTIONS_STORE_NAME);
      quizzesStore.clear();
      questionsStore.clear();
      normalized.quizzes.forEach((quiz) => quizzesStore.put(quiz));
      normalized.questions.forEach((question) => questionsStore.put(question));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to persist question bank package'));
      tx.onabort = () => reject(tx.error || new Error('Question bank persistence aborted'));
    })
  );
};

const ensureBackend = () => {
  if (getAppMode() === 'offline') {
    throw new Error('This sync action requires an active backend connection');
  }
};

const fetchBackendJson = async (path: string, options?: RequestInit) => {
  ensureBackend();
  const baseUrl = getQuestionBankBaseUrl();
  await ensureSharedAuthToken(60_000).catch(() => null);
  await ensureRemoteAppAccessSession(baseUrl);
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    ...options,
    headers: getAuthorizedHeaders(options?.headers),
  });
  const json = await readJsonSafe(response);
  if (!response.ok) {
    const message =
      typeof json?.error === 'string'
        ? json.error
        : typeof json?.error?.message === 'string'
          ? json.error.message
          : `Question bank request failed (${response.status})`;
    throw new Error(message);
  }
  return json;
};

const exportBackendPackage = async (): Promise<QuizImportPackage> => {
  const json = await fetchBackendJson(
    `/api/question-bank/export?applicationId=${encodeURIComponent(HOST_PRODUCT_KEY)}`
  );
  return normalizeImportPackage({
    quizzes: (json.data?.quizzes || []).map(normalizeQuiz),
    questions: (json.data?.questions || []).map(normalizeQuestion),
  });
};

const saveBackendQuizAndQuestions = async (quiz: QuizRecord, questions: QuestionRecord[]): Promise<void> => {
  await fetchBackendJson('/api/question-bank/quizzes/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicationId: HOST_PRODUCT_KEY,
      quiz: { ...quiz, updatedAt: Date.now() },
      questions: ensureQuestionsBoundToQuiz(quiz, questions).map((question) => ({
        ...question,
        quizId: quiz.id,
        updatedAt: Date.now(),
      })),
    }),
  });
};

const buildQuizQuestionSubset = (data: QuizImportPackage, quizId: string): QuestionRecord[] => {
  const quiz = data.quizzes.find((entry) => entry.id === quizId);
  if (!quiz) return [];
  const questionIds = new Set(quiz.rounds.flatMap((round) => round.questionIds));
  return data.questions.filter((question) => question.quizId === quizId || questionIds.has(question.id));
};

export const readQuestionBankSyncMeta = async (): Promise<QuestionBankSyncMeta> => getSyncMetaRecord();

export const listQuizzes = async (): Promise<QuizRecord[]> => {
  const data = await getAllFromStore<QuizRecord>(QUIZZES_STORE_NAME);
  return data.map(normalizeQuiz);
};

export const getQuizById = async (quizId: string): Promise<QuizRecord | null> => {
  const loaded = await loadQuizWithQuestions(quizId);
  return loaded?.quiz || null;
};

export const getQuestionsByIds = async (ids: string[]): Promise<QuestionRecord[]> => {
  const cleanIds = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  if (!cleanIds.length) return [];
  return getQuestionRecordsByIds(cleanIds);
};

export const saveQuizAndQuestions = async (quiz: QuizRecord, questions: QuestionRecord[]): Promise<void> => {
  const current = await exportLocalPackage();
  const now = Date.now();
  const incomingQuiz = { ...normalizeQuiz(quiz), updatedAt: now };
  const incomingQuestions = questions.map((question) => ({
    ...normalizeQuestion(question),
    quizId: incomingQuiz.id,
    updatedAt: now,
  }));
  const { merged } = mergePackages(current, { quizzes: [incomingQuiz], questions: incomingQuestions }, 'replace');
  await persistLocalPackage(merged);
};

export const deleteQuiz = async (quizId: string): Promise<void> => {
  const id = String(quizId || '').trim();
  if (!id) return;
  const current = await exportLocalPackage();
  const quizMap = new Map(current.quizzes.map((quiz) => [quiz.id, quiz]));
  const questionMap = new Map(current.questions.map((question) => [question.id, question]));
  const existingQuiz = quizMap.get(id);
  if (!existingQuiz) return;
  collectQuestionIdsForQuiz(existingQuiz, questionMap).forEach((questionId) => {
    questionMap.delete(questionId);
  });
  quizMap.delete(id);
  await persistLocalPackage({ quizzes: Array.from(quizMap.values()), questions: Array.from(questionMap.values()) });
};

export const loadQuizWithQuestions = async (
  quizId: string
): Promise<{ quiz: QuizRecord; questions: QuestionRecord[] }> => {
  const quizzes = await listQuizzes();
  const quiz = quizzes.find((entry) => entry.id === String(quizId || '').trim());
  if (!quiz) throw new Error('Quiz not found');
  const questions = await getQuestionsByIds(quiz.rounds.flatMap((round) => round.questionIds));
  return { quiz, questions };
};

export const exportAllQuizzes = async (): Promise<QuizImportPackage> => exportLocalPackage();

export const importQuizPackage = async (
  data: QuizImportPackage,
  mode: 'replace' | 'merge' = 'replace'
): Promise<QuestionBankSyncResult> => {
  const current = await exportLocalPackage();
  const { merged, summary } = mergePackages(current, data, mode);
  await persistLocalPackage(merged);
  return summary;
};

export const incrementQuestionUsedCount = async (questionId: string, delta: number = 1): Promise<void> => {
  const id = String(questionId || '').trim();
  if (!id) return;
  await withDb((db) =>
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUESTIONS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(QUESTIONS_STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => {
        if (!request.result) return;
        const next = normalizeQuestion(request.result);
        next.usedCount = Math.max(0, Number(next.usedCount || 0) + Number(delta || 0));
        next.updatedAt = Date.now();
        store.put(next);
      };
      request.onerror = () => reject(request.error || new Error('Failed to read question usage'));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to update question usage'));
      tx.onabort = () => reject(tx.error || new Error('Question usage transaction aborted'));
    })
  );
};

export const pullQuestionBankFromBackend = async (
  mode: 'replace' | 'merge' = 'merge'
): Promise<QuestionBankSyncResult> => {
  try {
    const remote = await exportBackendPackage();
    const summary = await importQuizPackage(remote, mode);
    await saveSyncMetaRecord({
      lastPulledAt: Date.now(),
      lastPullConflictCount: summary.conflictCount,
      lastPullStatus: 'success',
    });
    return summary;
  } catch (error) {
    await saveSyncMetaRecord({
      lastPulledAt: Date.now(),
      lastPullStatus: error instanceof Error ? error.message : 'failed',
    });
    throw error;
  }
};

export const pushQuestionBankToBackend = async (): Promise<QuestionBankSyncResult> => {
  try {
    const local = await exportLocalPackage();
    const remote = await exportBackendPackage();
    const { merged, summary } = mergePackages(remote, local, 'merge');
    for (const quiz of merged.quizzes) {
      await saveBackendQuizAndQuestions(quiz, buildQuizQuestionSubset(merged, quiz.id));
    }
    await saveSyncMetaRecord({
      lastPushedAt: Date.now(),
      lastPushConflictCount: summary.conflictCount,
      lastPushStatus: 'success',
    });
    return summary;
  } catch (error) {
    await saveSyncMetaRecord({
      lastPushedAt: Date.now(),
      lastPushStatus: error instanceof Error ? error.message : 'failed',
    });
    throw error;
  }
};