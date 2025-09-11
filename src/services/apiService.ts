import { Question, ViewerVote } from "@/types/game";

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
  lifelinePenaltyPointsPerLifeline: number
  fetchViewerVotes: boolean;
  viewerVotesApiUrl: string;
  viewerVotesApiKey: string;
  allowAnswerReview: boolean;
  gameShowMode: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const apiService = {
  async getSettings(): Promise<GameSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`);
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching settings:", error);
      throw error;
    }
  },

  async saveSettings(settings: GameSettings): Promise<GameSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        throw new Error("Failed to save settings");
      }
      return await response.json();
    } catch (error) {
      console.error("Error saving settings:", error);
      throw error;
    }
  },

  async resetSettings(): Promise<GameSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/reset`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to reset settings");
      }
      return await response.json();
    } catch (error) {
      console.error("Error resetting settings:", error);
      throw error;
    }
  },

  async getScore({
    guestChoice,
    correctAnswer,
    viewerCorrect,
    viewerIncorrect,
  }: {
    guestChoice: number;
    correctAnswer: number;
    viewerCorrect: number;
    viewerIncorrect: number;
  }): Promise<number> {
    const response = await fetch("http://localhost:5030/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestChoice, correctAnswer, viewerCorrect, viewerIncorrect }),
    });
    if (!response.ok) throw new Error("Failed to get score");
    const data = await response.json();
    return data.score;
  },

  async fetchViewerVotes(questionId: number, numOptions: number): Promise<ViewerVote[]> {
    const response = await fetch("http://localhost:5030/api/viewer-votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, numOptions }),
    });
    if (!response.ok) throw new Error("Failed to fetch viewer votes");
    const data = await response.json();
    return data.votes;
  },

  // Game management
  async createGame(questions: Question[]): Promise<{ id: string; questions: Question[]; progress: number; score: number; createdAt: string; updatedAt: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/games`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions }),
      });
      if (!response.ok) {
        throw new Error("Failed to create game");
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating game:", error);
      throw error;
    }
  },

  async getGame(gameId: string): Promise<{ id: string; questions: Question[]; progress: number; score: number; createdAt: string; updatedAt: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/games/${gameId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch game");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching game:", error);
      throw error;
    }
  },
};