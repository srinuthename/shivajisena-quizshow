import { Question } from "@/types/game";

const API_BASE_URL = "http://localhost:5030/api";

export interface GameSettings {
  questions: Question[];
  questionCount: number;
  timerDuration: number;
  targetScore: number;
  pointsPerQuestion: number;
  quizTitle: string;
  useApiScoring: boolean;
  allowNegativeMarks: boolean;
  negativePointsPerQuestion: number;
  skipPenaltyPointsPerQuestion: number;
  lifelinePenaltyPointsPerLifeline: number;
  fetchViewerVotes: boolean;
  viewerVotesApiUrl: string;
  viewerVotesApiKey: string;
  allowAnswerReview: boolean;
  gameShowMode: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const settingsService = {
  async getSettings(): Promise<GameSettings> {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) throw new Error("Failed to fetch settings");
    return await response.json();
  },

  async saveSettings(settings: GameSettings): Promise<GameSettings> {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error("Failed to save settings");
    return await response.json();
  },

  async resetSettings(): Promise<GameSettings> {
    const response = await fetch(`${API_BASE_URL}/settings/reset`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to reset settings");
    return await response.json();
  },

  // Helper methods for just questions
  async getQuestions(): Promise<Question[]> {
    const settings = await this.getSettings();
    return settings.questions;
  },

  async saveQuestions(questions: Question[]): Promise<GameSettings> {
    const settings = await this.getSettings();
    settings.questions = questions;
    return await this.saveSettings(settings);
  },
};