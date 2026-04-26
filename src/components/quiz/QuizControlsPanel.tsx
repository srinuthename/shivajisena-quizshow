// Quiz Controls Panel
// Contains subject selection and question grid
// Extracted from TeamQuiz for better maintainability

import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { QuestionGrid } from "../QuestionGrid";
import { useTranslation } from "@/hooks/useTranslation";

interface QuizControlsPanelProps {
  currentSubject: string;
  subjects: string[];
  onSubjectChange: (subject: string) => void;
  sessionReady: boolean;
  sessionPools: Record<string, number[]>;
  usedQuestions: Set<string>;
  questionActive: boolean;
  onQuestionSelect: (subject: string, questionNum: number, displayIndex?: number) => void;
  shuffleEnabled: boolean;
  totalButtons: number;
  showSequenceNumbers?: boolean;
}

export const QuizControlsPanel = ({
  currentSubject,
  subjects,
  onSubjectChange,
  sessionReady,
  sessionPools,
  usedQuestions,
  questionActive,
  onQuestionSelect,
  shuffleEnabled,
  totalButtons,
  showSequenceNumbers = true,
}: QuizControlsPanelProps) => {
  const { t } = useTranslation();

  return (
    <Card className="p-2 bg-card/80 border-border/50 shadow-lg">
      <div className="mb-6">
        <Select value={currentSubject} onValueChange={onSubjectChange}>
          <SelectTrigger className="h-14 text-lg font-bold">
            <SelectValue placeholder={t.chooseQuiz} />
          </SelectTrigger>

          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem
                key={subject}
                value={subject}
                className="text-lg py-3 font-medium"
              >
                {`${t.quizPrefix} ${subject}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Question Grid */}
      {!sessionReady ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-4 text-xl font-bold text-muted-foreground">
            {t.loadingQuestions}
          </span>
        </div>
      ) : (
        <QuestionGrid
          subject={currentSubject}
          questionPool={sessionPools[currentSubject] || []}
          usedQuestions={usedQuestions}
          questionActive={questionActive}
          onQuestionSelect={onQuestionSelect}
          hideUsed={false}
          shuffleEnabled={shuffleEnabled}
          totalButtons={totalButtons}
          showSequenceNumbers={showSequenceNumbers}
        />
      )}
    </Card>
  );
};
