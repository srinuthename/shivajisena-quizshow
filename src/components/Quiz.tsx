import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Brain } from "lucide-react";
import { QuizResults } from "./QuizResults";

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: 2,
    explanation: "Paris is the capital and most populous city of France."
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
    explanation: "Mars is called the Red Planet due to its reddish appearance from iron oxide on its surface."
  },
  {
    id: 3,
    question: "What is the largest mammal in the world?",
    options: ["African Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
    correctAnswer: 1,
    explanation: "The blue whale is the largest animal ever known to have lived on Earth."
  },
  {
    id: 4,
    question: "Who painted the Mona Lisa?",
    options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
    correctAnswer: 2,
    explanation: "Leonardo da Vinci painted the Mona Lisa between 1503 and 1519."
  },
  {
    id: 5,
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correctAnswer: 2,
    explanation: "Au comes from the Latin word 'aurum' meaning gold."
  }
];

export const Quiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === sampleQuestions[currentQuestion].correctAnswer;
    if (isCorrect) {
      setScore(score + 1);
    }

    setAnswers([...answers, selectedAnswer]);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizCompleted(false);
    setAnswers([]);
  };

  if (quizCompleted) {
    return (
      <QuizResults
        score={score}
        totalQuestions={sampleQuestions.length}
        questions={sampleQuestions}
        userAnswers={answers}
        onRestart={resetQuiz}
      />
    );
  }

  const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100;
  const question = sampleQuestions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 flex items-center justify-center p-1">
      <Card className="w-full max-w-4xl mx-auto shadow-[var(--quiz-card-shadow)] border-0 bg-card/95">
        <CardContent className="p-3 sm:p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground text-sm">Quiz</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {currentQuestion + 1}/{sampleQuestions.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Question */}
          <div className="mb-2 bg-secondary/30 rounded-lg p-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight font-display">
              {question.question}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-1.5">
            {question.options?.map((option, index) => {
              let buttonStyle = "justify-start h-auto py-2.5 px-3 text-left w-full rounded-md font-display";
              
              if (showExplanation) {
                if (index === question.correctAnswer) {
                  buttonStyle += " bg-quiz-correct/20 border-2 border-quiz-correct text-quiz-correct";
                } else if (index === selectedAnswer && selectedAnswer !== question.correctAnswer) {
                  buttonStyle += " bg-quiz-incorrect/20 border-2 border-quiz-incorrect text-quiz-incorrect";
                } else {
                  buttonStyle += " opacity-40 bg-muted/20";
                }
              } else if (selectedAnswer === index) {
                buttonStyle += " bg-primary/20 border-2 border-primary text-primary";
              } else {
                buttonStyle += " bg-muted/40 hover:bg-primary/10 border border-border/50";
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={buttonStyle}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showExplanation}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-xl sm:text-2xl md:text-3xl font-semibold leading-snug">{option}</span>
                    {showExplanation && index === question.correctAnswer && (
                      <CheckCircle className="h-6 w-6 text-quiz-correct flex-shrink-0" />
                    )}
                    {showExplanation && index === selectedAnswer && selectedAnswer !== question.correctAnswer && (
                      <XCircle className="h-6 w-6 text-quiz-incorrect flex-shrink-0" />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && question.explanation && (
            <div className={`mt-2 p-2 rounded-lg ${isCorrect ? 'bg-quiz-correct/15' : 'bg-quiz-incorrect/15'}`}>
              <div className="flex items-start gap-2">
                {isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-quiz-correct mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-quiz-incorrect mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-bold text-lg ${isCorrect ? 'text-quiz-correct' : 'text-quiz-incorrect'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </p>
                  <p className="text-foreground text-base">{question.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-3">
            <div className="text-base font-semibold text-muted-foreground">
              Score: {score}/{sampleQuestions.length}
            </div>
            
            {!showExplanation ? (
              <Button 
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className="bg-primary hover:bg-primary/90 text-lg px-6 py-2"
              >
                Submit
              </Button>
            ) : (
              <Button 
                onClick={handleNextQuestion}
                className="bg-primary hover:bg-primary/90 text-lg px-6 py-2"
              >
                {currentQuestion === sampleQuestions.length - 1 ? 'Results' : 'Next'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};