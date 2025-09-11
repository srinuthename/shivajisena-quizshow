import { cn } from "@/lib/utils";
import { Question } from "@/types/game";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
}

export function QuestionCard({ question, questionNumber, totalQuestions }: QuestionCardProps) {
  return (
    <div className="animate-slide-up">
      <div className="text-center mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Question {questionNumber} of {totalQuestions}
        </span>
      </div>
      <div className="glass-card rounded-xl p-4 shadow-card">
        <h1 className="text-xl md:text-2xl font-bold text-center leading-tight">
          {question.text}
        </h1>
      </div>
    </div>
  );
}