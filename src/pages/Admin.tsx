import { useState, useEffect } from "react";
import { Question } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { questionService } from "@/services/questionService";
import { gameQuestions } from "@/data/questions";
import { Trash2, Plus, Save, RefreshCw } from "lucide-react";
import { apiService } from "@/services/apiService";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GAME_CONSTANTS } from "@/constants/game";

export default function Admin() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    timeLimit: GAME_CONSTANTS.DEFAULT_TIMER_DURATION,
  });
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [timerDuration, setTimerDuration] = useState(30);
  const [targetScore, setTargetScore] = useState(99);
  const [questionCount, setQuestionCount] = useState(10);
  const [pointsPerQuestion, setPointsPerQuestion] = useState(11);
  const [useApiScoring, setUseApiScoring] = useState(false);
  const [allowNegativeMarks, setAllowNegativeMarks] = useState(false);
  const [negativePointsPerQuestion, setNegativePointsPerQuestion] = useState(9);
  const [skipPenaltyPointsPerQuestion, setSkipPenaltyPointsPerQuestion] = useState(9);
  const [lifelinePenaltyPointsPerLifeline, setLifelinePenaltyPointsPerLifeline] = useState(9);

  const [fetchViewerVotes, setFetchViewerVotes] = useState(false);
  const [viewerVotesApiUrl, setViewerVotesApiUrl] = useState("");
  const [viewerVotesApiKey, setViewerVotesApiKey] = useState("");
  const [allowAnswerReview, setAllowAnswerReview] = useState(true);
  const [gameShowMode, setGameShowMode] = useState("Solo");
  const [quizTitle, setQuizTitle] = useState('SPP News Quiz Vijetha');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const settings = await questionService.getSettings();

        setQuestions(settings.questions);
        setQuestionCount(settings.questionCount || GAME_CONSTANTS.MAX_QUESTIONS);
        setTimerDuration(settings.timerDuration);
        setTargetScore(settings.targetScore);
        setPointsPerQuestion(settings.pointsPerQuestion);
        setUseApiScoring(settings.useApiScoring);
        setAllowNegativeMarks(settings.allowNegativeMarks);
        setNegativePointsPerQuestion(settings.negativePointsPerQuestion);
        setSkipPenaltyPointsPerQuestion(settings.skipPenaltyPointsPerQuestion);
        setLifelinePenaltyPointsPerLifeline(settings.lifelinePenaltyPointsPerLifeline);
        setFetchViewerVotes(settings.fetchViewerVotes);
        setViewerVotesApiUrl(settings.viewerVotesApiUrl || "");
        setViewerVotesApiKey(settings.viewerVotesApiKey || "");
        setAllowAnswerReview(settings.allowAnswerReview);
        setGameShowMode(settings.gameShowMode || "Solo");
        setQuizTitle(settings.quizTitle || 'SPP News Quiz Vijetha');
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.toast({
          title: "Error",
          description: "Failed to load settings from server. Using local data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddQuestion = () => {
    if (!newQuestion.text || newQuestion.options?.some(opt => !opt)) {
      toast.toast({
        title: "Invalid Question",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    const question: Question = {
      id: questions.length + 1,
      text: newQuestion.text,
      options: newQuestion.options || ["", "", "", ""],
      correctAnswer: newQuestion.correctAnswer || 0,
      timeLimit: newQuestion.timeLimit || GAME_CONSTANTS.DEFAULT_TIMER_DURATION,
    };

    setQuestions([...questions, question]);
    setNewQuestion({
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      timeLimit: GAME_CONSTANTS.DEFAULT_TIMER_DURATION,
    });
    setShowAddForm(false);
    toast.toast({
      title: "Question Added",
      description: "New question has been added successfully.",
    });
  };

  const handleDeleteQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
    toast.toast({
      title: "Question Deleted",
      description: "Question has been removed.",
    });
  };

  const handleEditQuestion = (question: Question) => {
    setIsEditing(question.id);
    setEditingQuestion({ ...question });
  };

  const handleSaveEdit = () => {
    if (!editingQuestion || !editingQuestion.text || editingQuestion.options?.some(opt => !opt)) {
      toast.toast({
        title: "Invalid Question",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setQuestions(questions.map(q =>
      q.id === editingQuestion.id ? editingQuestion as Question : q
    ));
    setIsEditing(null);
    setEditingQuestion(null);
    toast.toast({
      title: "Question Updated",
      description: "Question has been updated successfully.",
    });
  };

  const handleAddOption = () => {
    if (isEditing && editingQuestion) {
      const options = [...(editingQuestion.options || []), ""];
      setEditingQuestion({ ...editingQuestion, options });
    } else {
      const options = [...(newQuestion.options || []), ""];
      setNewQuestion({ ...newQuestion, options });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (isEditing && editingQuestion) {
      const options = editingQuestion.options?.filter((_, i) => i !== index) || [];
      let correctAnswer = editingQuestion.correctAnswer || 0;
      if (correctAnswer >= index && correctAnswer > 0) {
        correctAnswer--;
      }
      setEditingQuestion({ ...editingQuestion, options, correctAnswer });
    } else {
      const options = newQuestion.options?.filter((_, i) => i !== index) || [];
      let correctAnswer = newQuestion.correctAnswer || 0;
      if (correctAnswer >= index && correctAnswer > 0) {
        correctAnswer--;
      }
      setNewQuestion({ ...newQuestion, options, correctAnswer });
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      await apiService.saveSettings({
        questions,
        questionCount,
        timerDuration,
        targetScore,
        pointsPerQuestion,
        useApiScoring,
        allowNegativeMarks,
        negativePointsPerQuestion,
        skipPenaltyPointsPerQuestion,
        lifelinePenaltyPointsPerLifeline,
        fetchViewerVotes,
        viewerVotesApiUrl,
        viewerVotesApiKey,
        allowAnswerReview,
        gameShowMode,
        quizTitle,
      });
      toast.toast({
        title: "Settings Saved",
        description: "All game settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.toast({
        title: "Error",
        description: "Failed to save settings to server. Changes saved locally.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setIsSaving(true);
      await questionService.resetToDefault();
      const defaultQuestions = gameQuestions;
      setQuestions(defaultQuestions);
      setTimerDuration(GAME_CONSTANTS.DEFAULT_TIMER_DURATION);
      setTargetScore(GAME_CONSTANTS.DEFAULT_TARGET_SCORE);
      setPointsPerQuestion(GAME_CONSTANTS.DEFAULT_POINTS_PER_QUESTION);
      setAllowNegativeMarks(true);
      setNegativePointsPerQuestion(GAME_CONSTANTS.DEFAULT_INCORRECT_NEGATIVE_POINTS);
      setSkipPenaltyPointsPerQuestion(GAME_CONSTANTS.DEFAULT_SKIP_PENALTY_POINTS);
      setLifelinePenaltyPointsPerLifeline(GAME_CONSTANTS.DEFAULT_LIFELINE_PENALTY_POINTS);
      setGameShowMode("Solo");
      toast.toast({
        title: "Reset Complete",
        description: "All settings have been reset to defaults.",
      });
    } catch (error) {
      console.error("Failed to reset settings:", error);
      toast.toast({
        title: "Error",
        description: "Failed to reset settings on server. Local settings cleared.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/95 flex items-center justify-center">
        <div className="text-2xl text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            SPP News Quiz Vijetha - Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage questions and game settings for the quiz competition
          </p>
        </div>

        {/* Game Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mb-4">
                <Label htmlFor="quiz-title">Quiz Title</Label>
                <Input
                  id="quiz-title"
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Enter quiz title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="question-count">Question Count</Label>
                  <Input
                    id="question-count"
                    type="number"
                    min="5"
                    max="50"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 11)}
                  />
                </div>
                <div>
                  <Label htmlFor="timer">Timer Duration (seconds)</Label>
                  <Input
                    id="timer"
                    type="number"
                    min="10"
                    max="120"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target">Target Score</Label>
                  <Input
                    id="target"
                    type="number"
                    min="10"
                    max="500"
                    step="10"
                    value={targetScore}
                    onChange={(e) => setTargetScore(parseInt(e.target.value) || 200)}
                  />
                </div>
                <div>
                  <Label htmlFor="points">Points Per Correct Answer</Label>
                  <Input
                    id="points"
                    type="number"
                    min="5"
                    max="50"
                    step="5"
                    value={pointsPerQuestion}
                    onChange={(e) => setPointsPerQuestion(parseInt(e.target.value) || 20)}
                    disabled={useApiScoring}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="api-scoring">User-based Scoring (API)</Label>
                    <p className="text-sm text-muted-foreground">
                      Use API to calculate dynamic scores based on viewer votes
                    </p>
                  </div>
                  <Switch
                    id="api-scoring"
                    checked={useApiScoring}
                    onCheckedChange={setUseApiScoring}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="negative-marks">Allow Negative Marks</Label>
                    <p className="text-sm text-muted-foreground">
                      Deduct points for incorrect answers
                    </p>
                  </div>
                  <Switch
                    id="negative-marks"
                    checked={allowNegativeMarks}
                    onCheckedChange={setAllowNegativeMarks}
                  />
                </div>

                {allowNegativeMarks && !useApiScoring && (
                  <div>
                    <Label htmlFor="negative-points">Negative Points Per Wrong Answer</Label>
                    <Select
                      value={negativePointsPerQuestion.toString()}
                      onValueChange={(value) => setNegativePointsPerQuestion(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Kids</SelectItem>
                        <SelectItem value="4">4 - Pre Primary</SelectItem>
                        <SelectItem value="10">10 - Primary</SelectItem>
                        <SelectItem value="20">20 - Secondary</SelectItem>
                        <SelectItem value="40">40 - Standard Challenge Mode</SelectItem>
                        <SelectItem value="100">100 - Ultimate Challenge Mode</SelectItem>
                      </SelectContent>
                    </Select>
                    <Label htmlFor="skip-penalty-points">Negative Points Per Skipping Question</Label>
                    <Select
                      value={(skipPenaltyPointsPerQuestion ?? 0).toString()}
                      onValueChange={(value) => setSkipPenaltyPointsPerQuestion(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Kids</SelectItem>
                        <SelectItem value="4">4 - Pre Primary</SelectItem>
                        <SelectItem value="10">10 - Primary</SelectItem>
                        <SelectItem value="20">20 - Secondary</SelectItem>
                        <SelectItem value="40">40 - Standard Challenge Mode</SelectItem>
                        <SelectItem value="100">100 - Ultimate Challenge Mode</SelectItem>
                      </SelectContent>
                    </Select>
                    <Label htmlFor="skip-penalty-points">Penalty Points for using One Lifeline</Label>
                    <Select
                      value={(lifelinePenaltyPointsPerLifeline ?? 5).toString()}
                      onValueChange={(value) => setLifelinePenaltyPointsPerLifeline(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Kids</SelectItem>
                        <SelectItem value="1">1 - Pre Primary</SelectItem>
                        <SelectItem value="2">2 - Primary</SelectItem>
                        <SelectItem value="3">3 - Secondary</SelectItem>
                        <SelectItem value="4">4 - Standard Challenge Mode</SelectItem>
                        <SelectItem value="5">5 - Ultimate Challenge Mode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="fetch-viewer-votes">Fetch Viewer Votes</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable YouTube chat integration for viewer votes
                    </p>
                  </div>
                  <Switch
                    id="fetch-viewer-votes"
                    checked={fetchViewerVotes}
                    onCheckedChange={setFetchViewerVotes}
                  />
                </div>

                {fetchViewerVotes && (
                  <>
                    <div>
                      <Label htmlFor="viewer-api-url">Viewer Votes API URL</Label>
                      <Input
                        id="viewer-api-url"
                        type="text"
                        placeholder="https://api.example.com/votes"
                        value={viewerVotesApiUrl}
                        onChange={(e) => setViewerVotesApiUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="viewer-api-key">Viewer Votes API Key</Label>
                      <Input
                        id="viewer-api-key"
                        type="password"
                        placeholder="Enter API key"
                        value={viewerVotesApiKey}
                        onChange={(e) => setViewerVotesApiKey(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow-answer-review">Allow Answer Review</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow guests to change their answer before final decision
                    </p>
                  </div>
                  <Switch
                    id="allow-answer-review"
                    checked={allowAnswerReview}
                    onCheckedChange={setAllowAnswerReview}
                  />
                </div>

                <div>
                  <Label htmlFor="game-show-mode">Game Show Mode</Label>
                  <Select
                    value={gameShowMode}
                    onValueChange={setGameShowMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solo">Solo</SelectItem>
                      <SelectItem value="1 vs 1">1 vs 1</SelectItem>
                      <SelectItem value="Quiz Bowl">Quiz Bowl</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select the game show format
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveSettings} className="w-full" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save All Settings"}
                </Button>
                <Button onClick={resetToDefaults} variant="outline" className="w-full" disabled={isSaving}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isSaving ? "Resetting..." : "Reset to Defaults"}
                </Button>
              </div>
              <div className="pt-4">
                <a href="/" className="text-primary hover:text-primary/80 underline text-sm">
                  ← Back to Home
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Questions ({questions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowAddForm(true)}
                className="w-full"
                disabled={showAddForm}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Question
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Add Question Form */}
        {showAddForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Question Text</Label>
                <Input
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  placeholder="Enter question..."
                />
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                {newQuestion.options?.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const options = [...(newQuestion.options || [])];
                        options[index] = e.target.value;
                        setNewQuestion({ ...newQuestion, options });
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: index })}
                      variant={newQuestion.correctAnswer === index ? "default" : "outline"}
                      size="sm"
                    >
                      Correct
                    </Button>
                    {(newQuestion.options?.length || 0) > 2 && (
                      <Button
                        onClick={() => handleRemoveOption(index)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button onClick={handleAddOption} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddQuestion} className="flex-1">
                  Save Question
                </Button>
                <Button onClick={() => setShowAddForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Question {question.id}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditQuestion(question)}
                      variant="outline"
                      size="sm"
                      disabled={isEditing === question.id}
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteQuestion(question.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing === question.id && editingQuestion ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Question Text</Label>
                      <Input
                        value={editingQuestion.text}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {editingQuestion.options?.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const options = [...(editingQuestion.options || [])];
                              options[index] = e.target.value;
                              setEditingQuestion({ ...editingQuestion, options });
                            }}
                          />
                          <Button
                            onClick={() => setEditingQuestion({ ...editingQuestion, correctAnswer: index })}
                            variant={editingQuestion.correctAnswer === index ? "default" : "outline"}
                            size="sm"
                          >
                            Correct
                          </Button>
                          {(editingQuestion.options?.length || 0) > 2 && (
                            <Button
                              onClick={() => handleRemoveOption(index)}
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button onClick={handleAddOption} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Option
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} className="flex-1">
                        Save Changes
                      </Button>
                      <Button onClick={() => {
                        setIsEditing(null);
                        setEditingQuestion(null);
                      }} variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium mb-2">{question.text}</p>
                    <div className="space-y-1">
                      {question.options.map((option, index) => (
                        <div key={index} className={`p-2 rounded ${index === question.correctAnswer
                          ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "bg-muted"
                          }`}>
                          {option} {index === question.correctAnswer && "✓"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}