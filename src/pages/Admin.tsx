import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Question } from "@/types/game";
import { questionService } from "@/services/questionService";
import { toast } from "sonner";
import { Settings, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FileUpload } from "@/components/FileUpload";

export const Admin: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = () => {
    try {
      const questionsData = questionService.getQuestions();
      setQuestions(questionsData);
    } catch (error) {
      toast.error("Failed to load questions");
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetQuestions = () => {
    try {
      questionService.resetToDefault();
      loadQuestions();
      toast.success("Questions reset to default");
    } catch (error) {
      toast.error("Failed to reset questions");
      console.error("Error resetting questions:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">
              ShivajiSena Quiz Admin
            </h1>
            <p className="text-muted-foreground">
              Manage questions and game settings via file upload
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate("/")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Game
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* File Upload Management */}
          <FileUpload />

          {/* Question Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {questions.length}
                </Badge>
                Questions Currently Loaded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{questions.length}</div>
                  <div className="text-sm text-muted-foreground">Total Questions</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {questionService.getSettings().timerDuration}s
                  </div>
                  <div className="text-sm text-muted-foreground">Timer Duration</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {questionService.getSettings().targetScore}
                  </div>
                  <div className="text-sm text-muted-foreground">Target Score</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Questions Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {questions.slice(0, 5).map((question, index) => (
                  <div key={question.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{index + 1}. {question.text}</h3>
                      <Badge variant="outline">ID: {question.id}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded ${
                            question.correctAnswer === optIndex
                              ? "bg-success/20 text-success-foreground border border-success"
                              : "bg-muted"
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {questions.length > 5 && (
                  <div className="text-center text-muted-foreground">
                    ... and {questions.length - 5} more questions
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;