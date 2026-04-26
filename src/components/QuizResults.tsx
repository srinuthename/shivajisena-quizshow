import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { Question } from "./Quiz";

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  questions: Question[];
  userAnswers: number[];
  onRestart: () => void;
}

export const QuizResults = ({
  score,
  totalQuestions,
  questions,
  userAnswers,
  onRestart,
}: QuizResultsProps) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  
  const getScoreMessage = () => {
    if (percentage >= 90) return "Outstanding! 🌟";
    if (percentage >= 80) return "Excellent work! 🎉";
    if (percentage >= 70) return "Great job! 👏";
    if (percentage >= 60) return "Good effort! 👍";
    return "Keep learning! 📚";
  };

  const getScoreColor = () => {
    if (percentage >= 80) return "text-quiz-correct";
    if (percentage >= 60) return "text-primary";
    return "text-quiz-incorrect";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl mx-auto shadow-[var(--quiz-card-shadow)] border-0">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Trophy className="h-16 w-16 text-primary" />
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                {score}
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">
            Quiz Complete!
          </CardTitle>
          <p className="text-xl text-muted-foreground mt-2">
            {getScoreMessage()}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Score Summary */}
          <div className="text-center bg-accent/50 rounded-lg p-6">
            <div className={`text-4xl font-bold ${getScoreColor()} mb-2`}>
              {score}/{totalQuestions}
            </div>
            <div className={`text-2xl font-semibold ${getScoreColor()}`}>
              {percentage}%
            </div>
            <p className="text-muted-foreground mt-2">
              You got {score} out of {totalQuestions} questions correct
            </p>
          </div>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Question Review</h3>
            
            {questions.map((question, index) => {
              const userAnswer = userAnswers[index];
              const isCorrect = userAnswer === question.correctAnswer;
              
              return (
                <Card key={question.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-quiz-correct" />
                        ) : (
                          <XCircle className="h-5 w-5 text-quiz-incorrect" />
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            Question {index + 1}
                          </span>
                          <Badge variant={isCorrect ? "default" : "destructive"}>
                            {isCorrect ? "Correct" : "Incorrect"}
                          </Badge>
                        </div>
                        
                        <p className="text-foreground">{question.question}</p>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Your answer:</span>
                            <span className={isCorrect ? "text-quiz-correct" : "text-quiz-incorrect"}>
                              {question.options[userAnswer]}
                            </span>
                          </div>
                          
                          {!isCorrect && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Correct answer:</span>
                              <span className="text-quiz-correct">
                                {question.options[question.correctAnswer]}
                              </span>
                            </div>
                          )}
                        </div>

                        {question.explanation && (
                          <div className="bg-muted/50 rounded p-3 text-sm text-foreground">
                            <strong>Explanation:</strong> {question.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={onRestart}
              className="bg-primary hover:bg-primary/90 px-8"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Take Quiz Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};