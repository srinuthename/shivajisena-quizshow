// Quiz Entry Module - Complete quiz and question management
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Save, Edit2, Copy, CheckCircle,
  Image as ImageIcon, BookOpen, HelpCircle,
  ChevronDown, ChevronUp, GripVertical, Download, Upload, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  QuestionRecord,
  QuizRecord,
  createEmptyQuiz,
  createEmptyQuestion,
} from "@/types/quizManagement";

interface QuizEntryModuleProps {
  quizzes: QuizRecord[];
  onSaveQuiz: (quiz: QuizRecord, questions: QuestionRecord[]) => Promise<void>;
  onDeleteQuiz: (quizId: string) => Promise<void>;
  onLoadQuiz: (quizId: string) => Promise<{ quiz: QuizRecord; questions: QuestionRecord[] }>;
  onExport: () => Promise<void>;
}

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;
const LANGUAGE_OPTIONS = [
  { code: 'te', label: 'Telugu' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
];

const EXCEL_COLUMNS = [
  "questionId", "baseLanguage", "questionText", "questionImageUrl",
  "choice0", "choice1", "choice2", "choice3",
  "correctChoiceIndex", "answerText", "answerImageUrl", "answerExplanation",
  "difficultyLevel", "topics", "tags", "isActive",
  "questionText_en", "choice0_en", "choice1_en", "choice2_en", "choice3_en", "answerText_en", "answerExplanation_en",
  "questionText_hi", "choice0_hi", "choice1_hi", "choice2_hi", "choice3_hi", "answerText_hi", "answerExplanation_hi",
];

const SAMPLE_XLSX_COLUMNS = [
  "base_language",
  "question_text",
  "question_image_url",
  "option_a_text",
  "option_a_image_url",
  "option_b_text",
  "option_b_image_url",
  "option_c_text",
  "option_c_image_url",
  "option_d_text",
  "option_d_image_url",
  "correct_option",
  "answer_text",
  "answer_image_url",
  "answer_explanation",
  "difficulty_level",
  "question_type",
  "question_topics",
  "question_tags",
  "is_active",
] as const;

const generateQuizId = (): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
};

const normalizeDelimitedList = (value: string): string[] =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeCorrectChoiceIndex = (value: string): number => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return 0;
  if (/^[A-D]$/.test(raw)) return raw.charCodeAt(0) - 65;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed)) {
    if (parsed >= 1 && parsed <= 4) return parsed - 1;
    if (parsed >= 0 && parsed <= 3) return parsed;
  }
  return 0;
};

const buildImportedQuestionId = (quizId: string, index: number) => `${quizId}-Q${String(index + 1).padStart(3, "0")}`;

const buildQuizWithQuestionIds = (quiz: QuizRecord, questionIds: string[]): QuizRecord => {
  const normalizedIds = questionIds.map((id) => String(id || "").trim()).filter(Boolean);
  const rounds = Array.isArray(quiz.rounds) && quiz.rounds.length > 0
    ? quiz.rounds.map((round, idx) => ({
        ...round,
        roundTitle: round.roundTitle || `Round ${idx + 1}`,
        roundDescription: round.roundDescription || "",
        roundOrder: round.roundOrder ?? idx + 1,
        roundType: round.roundType || "Generic",
        questionIds: idx === 0 ? normalizedIds : Array.isArray(round.questionIds) ? round.questionIds : [],
      }))
    : [
        {
          roundTitle: "Round 1",
          roundDescription: "",
          roundOrder: 1,
          roundType: "Generic" as const,
          questionIds: normalizedIds,
        },
      ];
  return {
    ...quiz,
    rounds,
    updatedAt: Date.now(),
  };
};

const getQuestionTextForTab = (question: QuestionRecord, lang: string): string =>
  lang === question.baseLanguage
    ? (question.question.text || "")
    : (question.translations[lang]?.question?.text || "");

const getChoiceTextForTab = (
  question: QuestionRecord,
  choiceIndex: number,
  lang: string
): string =>
  lang === question.baseLanguage
    ? (question.choices[choiceIndex]?.content?.text || "")
    : (question.translations[lang]?.choices?.[choiceIndex]?.content?.text || "");

const getAnswerExplanationForTab = (question: QuestionRecord, lang: string): string =>
  lang === question.baseLanguage
    ? (question.answerExplanation || "")
    : (question.translations[lang]?.answerExplanation || "");

const getExcelRows = (questions: QuestionRecord[]): string[][] =>
  questions.map((q) => {
    const getTransChoice = (lang: string, idx: number) =>
      q.translations[lang]?.choices?.[idx]?.content?.text || "";
    return [
      q.id,
      q.baseLanguage,
      q.question.text || "",
      q.question.imageUrl || "",
      ...([0, 1, 2, 3].map((i) => q.choices[i]?.content?.text || "")),
      String(q.correctChoiceIndex),
      q.answerText || "",
      q.answerImageUrl || "",
      q.answerExplanation || "",
      q.difficultyLevel,
      q.questionTopics.join(", "),
      q.questionTags.join(", "),
      q.isActive ? "true" : "false",
      q.translations["en"]?.question?.text || "",
      ...([0, 1, 2, 3].map((i) => getTransChoice("en", i))),
      q.translations["en"]?.answerText || "",
      q.translations["en"]?.answerExplanation || "",
      q.translations["hi"]?.question?.text || "",
      ...([0, 1, 2, 3].map((i) => getTransChoice("hi", i))),
      q.translations["hi"]?.answerText || "",
      q.translations["hi"]?.answerExplanation || "",
    ];
  });

// --- Excel Export/Import helpers ---
const quizToExcelCSV = (_quiz: QuizRecord, questions: QuestionRecord[]): string => {
  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = getExcelRows(questions).map((row) => row.map((v) => escapeCSV(String(v))));

  return [EXCEL_COLUMNS.join(","), ...rows.map((r) => r.join(","))].join("\n");
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const quizToExcelWorkbook = (_quiz: QuizRecord, questions: QuestionRecord[]): string => {
  const rows = [EXCEL_COLUMNS, ...getExcelRows(questions)];
  const rowXml = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(String(cell))}</Data></Cell>`)
          .join("")}</Row>`
    )
    .join("");

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="Questions">
    <Table>${rowXml}</Table>
  </Worksheet>
</Workbook>`;
};

const parseExcelCSV = (csv: string, quizId: string): QuestionRecord[] => {
  const lines = csv.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current); current = ""; }
        else { current += ch; }
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseCSVLine(lines[0]);
  const colIdx = (name: string) => headers.indexOf(name);

  const now = Date.now();
  return lines.slice(1).map((line, idx) => {
    const cols = parseCSVLine(line);
    const get = (name: string) => cols[colIdx(name)]?.trim() || "";

    const baseChoices = [0, 1, 2, 3].map(i => ({
      choiceIndex: i,
      content: { text: get(`choice${i}`) },
    })).filter(c => c.content.text);

    const translations: QuestionRecord["translations"] = {};
    const enText = get("questionText_en");
    if (enText) {
      translations["en"] = {
        question: { text: enText },
        choices: [0, 1, 2, 3].map(i => ({
          choiceIndex: i,
          content: { text: get(`choice${i}_en`) },
        })),
        answerText: get("answerText_en"),
        answerExplanation: get("answerExplanation_en"),
      };
    }
    const hiText = get("questionText_hi");
    if (hiText) {
      translations["hi"] = {
        question: { text: hiText },
        choices: [0, 1, 2, 3].map(i => ({
          choiceIndex: i,
          content: { text: get(`choice${i}_hi`) },
        })),
        answerText: get("answerText_hi"),
        answerExplanation: get("answerExplanation_hi"),
      };
    }

    const topics = get("topics") ? get("topics").split(",").map(t => t.trim()).filter(Boolean) : [];
    const tags = get("tags") ? get("tags").split(",").map(t => t.trim()).filter(Boolean) : [];

    return {
      id: get("questionId") || `${quizId}-q${idx + 1}`,
      baseLanguage: get("baseLanguage") || "te",
      question: { text: get("questionText"), imageUrl: get("questionImageUrl") || undefined },
      choices: baseChoices.length >= 2 ? baseChoices : [
        { choiceIndex: 0, content: { text: "" } },
        { choiceIndex: 1, content: { text: "" } },
      ],
      correctChoiceIndex: parseInt(get("correctChoiceIndex")) || 0,
      answerText: get("answerText"),
      answerImageUrl: get("answerImageUrl") || undefined,
      answerExplanation: get("answerExplanation"),
      translations,
      questionType: "multiple-choice" as const,
      difficultyLevel: (get("difficultyLevel") || "medium") as any,
      questionTopics: topics,
      questionTags: tags,
      isActive: get("isActive") !== "false",
      usedCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  });
};

const parseExcelWorkbook = (xmlText: string, quizId: string): QuestionRecord[] => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  if (xml.querySelector("parsererror")) {
    throw new Error("Invalid Excel workbook");
  }

  const rows = Array.from(xml.getElementsByTagName("Row")).map((row) =>
    Array.from(row.getElementsByTagName("Cell")).map((cell) => {
      const data = cell.getElementsByTagName("Data")[0];
      return data?.textContent?.trim() || "";
    })
  );

  if (rows.length < 2) {
    return [];
  }

  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const needsQuotes = value.includes(",") || value.includes('"') || value.includes("\n");
          const escaped = value.replace(/"/g, '""');
          return needsQuotes ? `"${escaped}"` : escaped;
        })
        .join(",")
    )
    .join("\n");

  return parseExcelCSV(csv, quizId);
};

const parseSampleWorksheetRows = (rows: Record<string, unknown>[], quizId: string): QuestionRecord[] => {
  const now = Date.now();
  return rows
    .map((row, index) => {
      const get = (key: string) => String(row?.[key] ?? "").trim();
      const baseLanguage = get("base_language") || "en";
      const choices = [
        { choiceIndex: 0, content: { text: get("option_a_text"), imageUrl: get("option_a_image_url") || undefined } },
        { choiceIndex: 1, content: { text: get("option_b_text"), imageUrl: get("option_b_image_url") || undefined } },
        { choiceIndex: 2, content: { text: get("option_c_text"), imageUrl: get("option_c_image_url") || undefined } },
        { choiceIndex: 3, content: { text: get("option_d_text"), imageUrl: get("option_d_image_url") || undefined } },
      ];
      const questionText = get("question_text");
      if (!questionText) return null;
      return {
        id: buildImportedQuestionId(quizId, index),
        baseLanguage,
        question: {
          text: questionText,
          imageUrl: get("question_image_url") || undefined,
        },
        choices,
        correctChoiceIndex: normalizeCorrectChoiceIndex(get("correct_option")),
        answerText: get("answer_text"),
        answerImageUrl: get("answer_image_url") || undefined,
        answerExplanation: get("answer_explanation"),
        translations: {},
        questionType: "multiple-choice" as const,
        difficultyLevel: (get("difficulty_level") || "medium") as any,
        questionTopics: normalizeDelimitedList(get("question_topics")),
        questionTags: normalizeDelimitedList(get("question_tags")),
        isActive: get("is_active").toLowerCase() !== "false",
        usedCount: 0,
        createdAt: now + index,
        updatedAt: now + index,
      } as QuestionRecord;
    })
    .filter((question): question is QuestionRecord => Boolean(question));
};

const parseXlsxWorkbook = async (file: File, quizId: string): Promise<QuestionRecord[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false,
  });
  const headers = rows.length > 0 ? Object.keys(rows[0] || {}) : [];
  const normalizedHeaders = headers.map((header) => String(header || "").trim().toLowerCase());
  const isSampleSchema = SAMPLE_XLSX_COLUMNS.every((column) => normalizedHeaders.includes(column));
  if (isSampleSchema) {
    return parseSampleWorksheetRows(
      rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [String(key || "").trim().toLowerCase(), value])
        )
      ),
      quizId
    );
  }

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  return parseExcelCSV(csv, quizId);
};

export const QuizEntryModule = ({
  quizzes,
  onSaveQuiz,
  onDeleteQuiz,
  onLoadQuiz,
  onExport,
}: QuizEntryModuleProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'edit'>('list');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<QuizRecord | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<QuestionRecord[]>([]);
  const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewQuizDialog, setShowNewQuizDialog] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [activeLanguage, setActiveLanguage] = useState<'en' | 'te' | 'hi'>('te');

  // Refs for comma-separated inputs to prevent cursor jumping
  const [topicsInputs, setTopicsInputs] = useState<Record<number, string>>({});
  const [tagsInputs, setTagsInputs] = useState<Record<number, string>>({});
  const [quizTopicsInput, setQuizTopicsInput] = useState('');
  const excelUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingQuiz) {
      setQuizTopicsInput(editingQuiz.quizTopicsList.join(', '));
      return;
    }
    setQuizTopicsInput('');
  }, [editingQuiz?.id, editingQuiz?.quizTopicsList]);

  useEffect(() => {
    const inputs: Record<number, string> = {};
    const tagInputs: Record<number, string> = {};
    editingQuestions.forEach((q, i) => {
      inputs[i] = q.questionTopics.join(', ');
      tagInputs[i] = q.questionTags.join(', ');
    });
    setTopicsInputs(inputs);
    setTagsInputs(tagInputs);
  }, [editingQuestions]);

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === 'te' || detail === 'en' || detail === 'hi') {
        setActiveLanguage(detail);
        return;
      }
      setActiveLanguage('te');
    };
    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
  }, []);

  const getQuestionCount = (quiz: QuizRecord) =>
    quiz.rounds.reduce((sum, round) => sum + round.questionIds.length, 0);

  const handleEditQuiz = async (quizId: string) => {
    setIsLoading(true);
    try {
      const result = await onLoadQuiz(quizId);
      setEditingQuiz(result.quiz);
      setEditingQuestions(result.questions);
      setSelectedQuizId(quizId);
      setActiveTab('edit');
      toast({ title: 'Quiz Loaded', description: `Loaded "${quizId}" with ${result.questions.length} questions.` });
    } catch {
      toast({ title: 'Load Failed', description: 'Failed to load quiz.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewQuiz = () => {
    if (!newQuizTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Quiz title is required.', variant: 'destructive' });
      return;
    }
    let generatedId = generateQuizId();
    while (quizzes.some((quiz) => quiz.id === generatedId)) {
      generatedId = generateQuizId();
    }
    const newQuiz = createEmptyQuiz(generatedId);
    newQuiz.quizTitle = newQuizTitle.trim();
    setEditingQuiz(newQuiz);
    setEditingQuestions([]);
    setShowNewQuizDialog(false);
    setNewQuizTitle('');
    setActiveTab('edit');
  };

  const handleAddQuestion = () => {
    if (!editingQuiz) return;
    const newQuestionId = `${editingQuiz.id}-${crypto.randomUUID()}`;
    const newQuestion = createEmptyQuestion(newQuestionId);
    setEditingQuestions([...editingQuestions, newQuestion]);
    setExpandedQuestionIndex(editingQuestions.length);
  };

  const updateQuestion = (index: number, updates: Partial<QuestionRecord>) => {
    const updated = [...editingQuestions];
    updated[index] = { ...updated[index], ...updates, updatedAt: Date.now() };
    setEditingQuestions(updated);
  };

  const ensureTranslation = (question: QuestionRecord, lang: string) => {
    const translations = { ...question.translations };
    const baseChoices = question.choices;
    const existing = translations[lang] || {
      question: { text: "" },
      choices: baseChoices.map((_, idx) => ({ choiceIndex: idx, content: { text: "" } })),
      answerText: "",
      answerExplanation: "",
    };
    if (existing.choices.length !== baseChoices.length) {
      existing.choices = baseChoices.map((_, idx) => {
        const candidate = existing.choices[idx];
        return candidate ? { ...candidate, choiceIndex: idx } : { choiceIndex: idx, content: { text: "" } };
      });
    }
    translations[lang] = existing;
    return translations;
  };

  const updateQuestionText = (index: number, lang: string, value: string) => {
    const question = editingQuestions[index];
    if (lang === question.baseLanguage) {
      updateQuestion(index, { question: { ...question.question, text: value } });
      return;
    }
    const translations = ensureTranslation(question, lang);
    translations[lang] = { ...translations[lang], question: { ...translations[lang].question, text: value } };
    updateQuestion(index, { translations });
  };

  const updateChoiceText = (questionIndex: number, choiceIndex: number, lang: string, value: string) => {
    const question = editingQuestions[questionIndex];
    if (lang === question.baseLanguage) {
      const choices = [...question.choices];
      choices[choiceIndex] = { ...choices[choiceIndex], content: { ...choices[choiceIndex].content, text: value } };
      updateQuestion(questionIndex, { choices });
      return;
    }
    const translations = ensureTranslation(question, lang);
    const translatedChoice = translations[lang].choices[choiceIndex];
    translations[lang].choices[choiceIndex] = { ...translatedChoice, content: { ...translatedChoice.content, text: value } };
    updateQuestion(questionIndex, { translations });
  };

  const updateChoiceImage = (questionIndex: number, choiceIndex: number, imageUrl: string) => {
    const question = editingQuestions[questionIndex];
    const choices = [...question.choices];
    choices[choiceIndex] = { ...choices[choiceIndex], content: { ...choices[choiceIndex].content, imageUrl: imageUrl || undefined } };
    updateQuestion(questionIndex, { choices });
  };

  const addChoice = (questionIndex: number) => {
    const question = editingQuestions[questionIndex];
    const choices = [...question.choices, { choiceIndex: question.choices.length, content: { text: "" } }];
    const translations = { ...question.translations };
    Object.keys(translations).forEach((lang) => {
      translations[lang] = ensureTranslation({ ...question, choices }, lang)[lang];
    });
    updateQuestion(questionIndex, { choices, translations });
  };

  const removeChoice = (questionIndex: number, choiceIndex: number) => {
    const question = editingQuestions[questionIndex];
    const choices = question.choices.filter((_, i) => i !== choiceIndex).map((c, i) => ({ ...c, choiceIndex: i }));
    let correctIdx = question.correctChoiceIndex;
    if (correctIdx === choiceIndex) correctIdx = 0;
    else if (correctIdx > choiceIndex) correctIdx--;
    const translations: QuestionRecord["translations"] = {};
    Object.entries(question.translations).forEach(([lang, translation]) => {
      const filtered = translation.choices.filter((_, i) => i !== choiceIndex);
      translations[lang] = { ...translation, choices: filtered.map((c, i) => ({ ...c, choiceIndex: i })) };
    });
    updateQuestion(questionIndex, { choices, correctChoiceIndex: correctIdx, translations });
  };

  const deleteQuestion = (index: number) => {
    setEditingQuestions(editingQuestions.filter((_, i) => i !== index));
    setExpandedQuestionIndex(null);
  };

  const duplicateQuestion = (index: number) => {
    if (!editingQuiz) return;
    const source = editingQuestions[index];
    const duplicate: QuestionRecord = { ...source, id: `${editingQuiz.id}-${crypto.randomUUID()}`, createdAt: Date.now(), updatedAt: Date.now() };
    setEditingQuestions([...editingQuestions, duplicate]);
    setExpandedQuestionIndex(editingQuestions.length);
  };

  const handleSave = async () => {
    if (!editingQuiz) return;
    if (!editingQuiz.quizTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Quiz title is required.', variant: 'destructive' });
      return;
    }
    for (let i = 0; i < editingQuestions.length; i++) {
      const q = editingQuestions[i];
      if (!q.question.text?.trim()) {
        toast({ title: 'Validation Error', description: `Question ${i + 1} text is required.`, variant: 'destructive' });
        setExpandedQuestionIndex(i);
        return;
      }
      if (q.choices.length < 2) {
        toast({ title: 'Validation Error', description: `Question ${i + 1} needs at least 2 choices.`, variant: 'destructive' });
        setExpandedQuestionIndex(i);
        return;
      }
      for (let j = 0; j < q.choices.length; j++) {
        if (!q.choices[j].content.text?.trim()) {
          toast({ title: 'Validation Error', description: `Q${i + 1}, Choice ${j + 1} text is required.`, variant: 'destructive' });
          setExpandedQuestionIndex(i);
          return;
        }
      }
    }

    // Apply pending comma-separated inputs
    const finalQuestions = editingQuestions.map((q, i) => ({
      ...q,
      questionTopics: (topicsInputs[i] || '').split(',').map(t => t.trim()).filter(Boolean),
      questionTags: (tagsInputs[i] || '').split(',').map(t => t.trim()).filter(Boolean),
    }));
    const finalQuiz = buildQuizWithQuestionIds(
      { ...editingQuiz, quizTopicsList: quizTopicsInput.split(',').map(t => t.trim()).filter(Boolean), updatedAt: Date.now() },
      finalQuestions.map((question) => question.id)
    );

    setIsSaving(true);
    try {
      await onSaveQuiz(finalQuiz, finalQuestions);
      toast({ title: 'Saved', description: `"${finalQuiz.quizTitle}" with ${finalQuestions.length} questions saved.` });
      setActiveTab('list');
      setEditingQuiz(null);
      setEditingQuestions([]);
    } catch {
      toast({ title: 'Save Failed', description: 'Failed to save quiz.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Excel export for current quiz
  const handleExcelExport = () => {
    if (!editingQuiz) return;
    const workbook = quizToExcelWorkbook(editingQuiz, editingQuestions);
    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${editingQuiz.id}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Quiz exported as Excel (.xls)." });
  };

  // Excel import
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingQuiz) return;
    try {
      const lowerName = file.name.toLowerCase();
      let questions: QuestionRecord[] = [];
      if (lowerName.endsWith(".xlsx")) {
        questions = await parseXlsxWorkbook(file, editingQuiz.id);
      } else {
        const text = await file.text();
        const isExcelWorkbook = lowerName.endsWith(".xls") || text.trimStart().startsWith("<?xml");
        questions = isExcelWorkbook ? parseExcelWorkbook(text, editingQuiz.id) : parseExcelCSV(text, editingQuiz.id);
      }
      if (questions.length === 0) {
        toast({ title: "No Data", description: "No valid questions found in file.", variant: "destructive" });
        return;
      }
      setEditingQuestions(questions);
      setEditingQuiz((current) => (current ? buildQuizWithQuestionIds(current, questions.map((question) => question.id)) : current));
      toast({ title: "Imported", description: `${questions.length} questions imported.` });
    } catch {
      toast({ title: "Import Failed", description: "Could not parse Excel/XLSX/CSV file.", variant: "destructive" });
    }
    if (excelUploadRef.current) excelUploadRef.current.value = "";
  };

  const renderQuestionEditor = (question: QuestionRecord, index: number) => {
    const isExpanded = expandedQuestionIndex === index;
    const difficultyLabel = DIFFICULTY_OPTIONS.find((d) => d.value === question.difficultyLevel)?.label || "Medium";

    return (
      <Card key={question.id} className="mb-3 border border-border/60">
        <CardHeader 
          className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setExpandedQuestionIndex(isExpanded ? null : index)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-primary">Q{index + 1}</span>
              <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                {getQuestionTextForTab(question, question.baseLanguage) || '(No text)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={question.difficultyLevel === "easy" ? "default" : question.difficultyLevel === "hard" ? "destructive" : "secondary"}>
                {difficultyLabel}
              </Badge>
              {question.question.imageUrl && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4 pt-0">
            <Tabs value={activeLanguage} onValueChange={(v) => setActiveLanguage(v as 'en' | 'te' | 'hi')}>
              <TabsList className="grid grid-cols-3 w-48">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <TabsTrigger key={lang.code} value={lang.code}>{lang.code.toUpperCase()}</TabsTrigger>
                ))}
              </TabsList>

              {LANGUAGE_OPTIONS.map((lang) => (
                <TabsContent key={lang.code} value={lang.code} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>
                      Question Text ({lang.label}) {lang.code === question.baseLanguage && <span className="text-destructive">*</span>}
                    </Label>
                    <Textarea
                      value={getQuestionTextForTab(question, lang.code)}
                      onChange={(e) => updateQuestionText(index, lang.code, e.target.value)}
                      placeholder={`Enter question in ${lang.label}...`}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Choices ({lang.label})</Label>
                      <Button size="sm" variant="outline" onClick={() => addChoice(index)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Choice
                      </Button>
                    </div>
                    
                    {question.choices.map((choice, cIdx) => (
                      <div key={cIdx} className="flex items-start gap-2">
                        <div 
                          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 cursor-pointer transition-colors ${
                            question.correctChoiceIndex === cIdx 
                              ? 'bg-primary border-primary text-primary-foreground' 
                              : 'border-muted-foreground/30 hover:border-primary'
                          }`}
                          onClick={() => updateQuestion(index, { correctChoiceIndex: cIdx })}
                          title={question.correctChoiceIndex === cIdx ? 'Correct answer' : 'Click to mark as correct'}
                        >
                          {question.correctChoiceIndex === cIdx ? <CheckCircle className="h-4 w-4" /> : (cIdx + 1)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <Input
                            value={getChoiceTextForTab(question, cIdx, lang.code)}
                            onChange={(e) => updateChoiceText(index, cIdx, lang.code, e.target.value)}
                            placeholder={`Choice ${cIdx + 1} in ${lang.label}...`}
                          />
                          {lang.code === 'en' && (
                            <Input
                              value={choice.content.imageUrl || ''}
                              onChange={(e) => updateChoiceImage(index, cIdx, e.target.value)}
                              placeholder="Image URL (optional)"
                              className="text-xs"
                            />
                          )}
                        </div>
                        {question.choices.length > 2 && (
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeChoice(index, cIdx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Answer Text ({lang.label})</Label>
                    <Input
                      value={
                        lang.code === question.baseLanguage
                          ? (question.answerText || "")
                          : (question.translations[lang.code]?.answerText || "")
                      }
                      onChange={(e) => {
                        const currentQuestion = editingQuestions[index];
                        if (lang.code === currentQuestion.baseLanguage) {
                          updateQuestion(index, { answerText: e.target.value });
                        } else {
                          const translations = ensureTranslation(currentQuestion, lang.code);
                          translations[lang.code] = { ...translations[lang.code], answerText: e.target.value };
                          updateQuestion(index, { translations });
                        }
                      }}
                      placeholder={`Answer text in ${lang.label} (optional)...`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Answer Explanation ({lang.label})</Label>
                    <Textarea
                      value={getAnswerExplanationForTab(question, lang.code)}
                      onChange={(e) => {
                        const currentQuestion = editingQuestions[index];
                        if (lang.code === currentQuestion.baseLanguage) {
                          updateQuestion(index, { answerExplanation: e.target.value });
                        } else {
                          const translations = ensureTranslation(currentQuestion, lang.code);
                          translations[lang.code] = { ...translations[lang.code], answerExplanation: e.target.value };
                          updateQuestion(index, { translations });
                        }
                      }}
                      placeholder={`Explanation in ${lang.label} (optional)...`}
                      rows={2}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Base Language</Label>
                <Select
                  value={question.baseLanguage}
                  onValueChange={(value) => updateQuestion(index, { baseLanguage: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label} ({lang.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question Image URL</Label>
                <Input
                  value={question.question.imageUrl || ''}
                  onChange={(e) => updateQuestion(index, { question: { ...question.question, imageUrl: e.target.value || undefined } })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={question.difficultyLevel} onValueChange={(v) => updateQuestion(index, { difficultyLevel: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Answer Image URL</Label>
                <Input
                  value={question.answerImageUrl || ''}
                  onChange={(e) => updateQuestion(index, { answerImageUrl: e.target.value || undefined })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Topics (comma-separated)</Label>
                <Input
                  value={topicsInputs[index] ?? question.questionTopics.join(', ')}
                  onChange={(e) => setTopicsInputs(prev => ({ ...prev, [index]: e.target.value }))}
                  onBlur={(e) => {
                    const parsed = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    updateQuestion(index, { questionTopics: parsed });
                  }}
                  placeholder="e.g., Science, Physics"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={tagsInputs[index] ?? question.questionTags.join(', ')}
                  onChange={(e) => setTagsInputs(prev => ({ ...prev, [index]: e.target.value }))}
                  onBlur={(e) => {
                    const parsed = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    updateQuestion(index, { questionTags: parsed });
                  }}
                  placeholder="e.g., olympiad, weekly"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={question.isActive} onCheckedChange={(checked) => updateQuestion(index, { isActive: checked })} />
                <Label>Active</Label>
              </div>
            </div>

            {/* Question Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button size="sm" variant="outline" onClick={() => duplicateQuestion(index)}>
                <Copy className="h-3 w-3 mr-1" /> Duplicate
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete Question {index + 1}.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteQuestion(index)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Quiz Entry Module
        </CardTitle>
        <CardDescription>Create and manage quizzes with multilingual support</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'edit')}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="list">Quiz List</TabsTrigger>
              <TabsTrigger value="edit" disabled={!editingQuiz}>Edit Quiz</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" /> Export All
              </Button>
              <Button size="sm" onClick={() => setShowNewQuizDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Quiz
              </Button>
            </div>
          </div>

          <TabsContent value="list" className="mt-0">
            {quizzes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No quizzes yet. Create your first quiz!</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {quizzes.map((quiz) => (
                    <Card key={quiz.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{quiz.quizTitle}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{getQuestionCount(quiz)} questions</span>
                              <span>•</span>
                              <span>{quiz.quizLanguage}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">{quiz.quizType}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={isLoading} onClick={() => handleEditQuiz(quiz.id)}>
                              <Edit2 className="h-3 w-3 mr-1" /> {isLoading && selectedQuizId === quiz.id ? 'Loading...' : 'Edit'}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Quiz?</AlertDialogTitle>
                                  <AlertDialogDescription>Delete "{quiz.quizTitle}" and all its questions permanently.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDeleteQuiz(quiz.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="edit" className="mt-0">
            {editingQuiz && (
              <div className="space-y-4">
                {/* Quiz Metadata */}
                <Card className="bg-muted/20 border-muted">
                  <CardContent className="py-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quiz ID</Label>
                        <Input value={editingQuiz.id} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Quiz Title <span className="text-destructive">*</span></Label>
                        <Input
                          value={editingQuiz.quizTitle}
                          onChange={(e) => setEditingQuiz({ ...editingQuiz, quizTitle: e.target.value })}
                          placeholder="Enter quiz title..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Quiz Description</Label>
                      <Textarea
                        value={editingQuiz.quizDescription || ''}
                        onChange={(e) => setEditingQuiz({ ...editingQuiz, quizDescription: e.target.value })}
                        placeholder="Brief description..."
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Language</Label>
                        <Select value={editingQuiz.quizLanguage} onValueChange={(value) => setEditingQuiz({ ...editingQuiz, quizLanguage: value })}>
                          <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_OPTIONS.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>{lang.label} ({lang.code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quiz Type</Label>
                        <Select value={editingQuiz.quizType} onValueChange={(v) => setEditingQuiz({ ...editingQuiz, quizType: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Automatic">Automatic</SelectItem>
                            <SelectItem value="Manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Topics (comma-separated)</Label>
                        <Input
                          value={quizTopicsInput}
                          onChange={(e) => setQuizTopicsInput(e.target.value)}
                          onBlur={() => {
                            setEditingQuiz({ ...editingQuiz, quizTopicsList: quizTopicsInput.split(',').map(t => t.trim()).filter(Boolean) });
                          }}
                          placeholder="e.g., science, technology"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch checked={editingQuiz.isPublished} onCheckedChange={(checked) => setEditingQuiz({ ...editingQuiz, isPublished: checked })} />
                        <Label>Published</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={editingQuiz.isArchived} onCheckedChange={(checked) => setEditingQuiz({ ...editingQuiz, isArchived: checked })} />
                        <Label>Archived</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Questions Header with Excel controls */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Questions ({editingQuestions.length})</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleExcelExport} disabled={editingQuestions.length === 0}>
                      <FileSpreadsheet className="h-4 w-4 mr-1" /> Export Excel
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => excelUploadRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> Import Excel
                    </Button>
                    <input ref={excelUploadRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
                    <Button size="sm" onClick={handleAddQuestion}>
                      <Plus className="h-4 w-4 mr-1" /> Add Question
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px]">
                  {editingQuestions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                      <p>No questions yet. Add questions or import from Excel.</p>
                    </div>
                  ) : (
                    editingQuestions.map((q, i) => renderQuestionEditor(q, i))
                  )}
                </ScrollArea>

                {/* Save Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setEditingQuiz(null); setEditingQuestions([]); setActiveTab('list'); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save Quiz'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* New Quiz Dialog */}
        <Dialog open={showNewQuizDialog} onOpenChange={setShowNewQuizDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Quiz</DialogTitle>
              <DialogDescription>Enter a title for your new quiz. We will auto-generate a 6-character quiz ID.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Quiz Title <span className="text-destructive">*</span></Label>
                <Input value={newQuizTitle} onChange={(e) => setNewQuizTitle(e.target.value)} placeholder="e.g., General Knowledge Quiz" />
              </div>
              <div className="space-y-2">
                <Label>Quiz ID</Label>
                <Input value="Auto-generated 6-character ID" disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">The quiz ID is generated automatically when you create the quiz.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewQuizDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateNewQuiz}>Create Quiz</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
