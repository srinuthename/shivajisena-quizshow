import { Question, GameState } from "@/types/game";
import { gameQuestions as defaultQuestions } from "@/data/questions";
import { GAME_CONSTANTS } from "@/constants/game";
import { apiService, GameSettings } from "./apiService";

export type { GameSettings };

const { STORAGE_KEYS } = GAME_CONSTANTS;

// Cached settings to avoid redundant API calls
let cachedSettings: GameSettings | null = null;

export const questionService = {
  async getQuestions(): Promise<Question[]> {
    try {
      // Try to get from API first
      const settings = await this.getSettings();
      return settings.questions.length > 0 ? settings.questions : defaultQuestions;
    } catch (error) {
      console.error("Failed to fetch from API, using local storage:", error);
      // Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return defaultQuestions;
        }
      }
      return defaultQuestions;
    }
  },

  async saveQuestions(questions: Question[]): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.questions = questions;
      const updated = await apiService.saveSettings(settings);
      cachedSettings = updated;
    } catch (error) {
      console.error("Failed to save to API, using local storage:", error);
      // Fallback to localStorage
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    }
  },

  async resetToDefault(): Promise<void> {
    try {
      const settings = await apiService.resetSettings();
      cachedSettings = settings;
    } catch (error) {
      console.error("Failed to reset via API, clearing local storage:", error);
      // Fallback to localStorage
      localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
      localStorage.removeItem(STORAGE_KEYS.TIMER_DURATION);
      localStorage.removeItem(STORAGE_KEYS.TARGET_SCORE);
      localStorage.removeItem(STORAGE_KEYS.POINTS_PER_QUESTION);
      localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    }
  },

  async getSettings(): Promise<GameSettings> {
    try {
      if (!cachedSettings) {
        cachedSettings = await apiService.getSettings();
      }
      return cachedSettings;
    } catch (error) {
      // Fallback to local values
      return {
        questions: defaultQuestions,
        questionCount: GAME_CONSTANTS.MAX_QUESTIONS,
        timerDuration: this.getTimerDurationLocal(),
        targetScore: this.getTargetScoreLocal(),
        pointsPerQuestion: this.getPointsPerQuestionLocal(),
        quizTitle: 'SPP News Quiz Vijetha',
        useApiScoring: false,
        allowNegativeMarks: true,
        negativePointsPerQuestion: GAME_CONSTANTS.DEFAULT_INCORRECT_NEGATIVE_POINTS,
        skipPenaltyPointsPerQuestion: GAME_CONSTANTS.DEFAULT_SKIP_PENALTY_POINTS,

        lifelinePenaltyPointsPerLifeline: GAME_CONSTANTS.DEFAULT_LIFELINE_PENALTY_POINTS,
        fetchViewerVotes: false,
        viewerVotesApiUrl: "",
        viewerVotesApiKey: "",
        allowAnswerReview: true,
        gameShowMode: "Solo",
      };
    }
  },

  async getTimerDuration(): Promise<number> {
    try {
      const settings = await this.getSettings();
      return settings.timerDuration;
    } catch {
      return this.getTimerDurationLocal();
    }
  },

  getTimerDurationLocal(): number {
    const stored = localStorage.getItem(STORAGE_KEYS.TIMER_DURATION);
    return stored ? parseInt(stored, 10) : GAME_CONSTANTS.DEFAULT_TIMER_DURATION;
  },

  async setTimerDuration(seconds: number): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.timerDuration = seconds;
      const updated = await apiService.saveSettings(settings);
      cachedSettings = updated;
    } catch (error) {
      console.error("Failed to save timer duration to API:", error);
      localStorage.setItem(STORAGE_KEYS.TIMER_DURATION, seconds.toString());
    }
  },

  async getTargetScore(): Promise<number> {
    try {
      const settings = await this.getSettings();
      return settings.targetScore;
    } catch {
      return this.getTargetScoreLocal();
    }
  },

  getTargetScoreLocal(): number {
    const stored = localStorage.getItem(STORAGE_KEYS.TARGET_SCORE);
    return stored ? parseInt(stored, 10) : GAME_CONSTANTS.DEFAULT_TARGET_SCORE;
  },

  async setTargetScore(score: number): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.targetScore = score;
      const updated = await apiService.saveSettings(settings);
      cachedSettings = updated;
    } catch (error) {
      console.error("Failed to save target score to API:", error);
      localStorage.setItem(STORAGE_KEYS.TARGET_SCORE, score.toString());
    }
  },

  async getPointsPerQuestion(): Promise<number> {
    try {
      const settings = await this.getSettings();
      return settings.pointsPerQuestion;
    } catch {
      return this.getPointsPerQuestionLocal();
    }
  },

  getPointsPerQuestionLocal(): number {
    const stored = localStorage.getItem(STORAGE_KEYS.POINTS_PER_QUESTION);
    return stored ? parseInt(stored, 10) : GAME_CONSTANTS.DEFAULT_POINTS_PER_QUESTION;
  },

  async setPointsPerQuestion(points: number): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.pointsPerQuestion = points;
      const updated = await apiService.saveSettings(settings);
      cachedSettings = updated;
    } catch (error) {
      console.error("Failed to save points per question to API:", error);
      localStorage.setItem(STORAGE_KEYS.POINTS_PER_QUESTION, points.toString());
    }
  },

  // Game state persistence
  saveGameState(state: Partial<GameState>): void {
    const currentState = this.getGameState();
    const newState = { ...currentState, ...state };
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(newState));
  },

  getGameState(): Partial<GameState> | null {
    const stored = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  },

  clearGameState(): void {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  }
};