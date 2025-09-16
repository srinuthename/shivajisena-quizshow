import { Question, GameState } from "@/types/game";
import { localStorageService, GameSettings } from "./localStorageService";

export type { GameSettings };

export const questionService = {
  getQuestions(): Question[] {
    return localStorageService.getQuestions();
  },

  saveQuestions(questions: Question[]): void {
    localStorageService.saveQuestions(questions);
  },

  resetToDefault(): void {
    localStorageService.resetToDefault();
  },

  getSettings(): GameSettings {
    return localStorageService.getSettings();
  },

  getTimerDuration(): number {
    return localStorageService.getSettings().timerDuration;
  },

  setTimerDuration(seconds: number): void {
    const settings = localStorageService.getSettings();
    settings.timerDuration = seconds;
    localStorageService.saveSettings(settings);
  },

  getTargetScore(): number {
    return localStorageService.getSettings().targetScore;
  },

  setTargetScore(score: number): void {
    const settings = localStorageService.getSettings();
    settings.targetScore = score;
    localStorageService.saveSettings(settings);
  },

  getPointsPerQuestion(): number {
    return localStorageService.getSettings().pointsPerQuestion;
  },

  setPointsPerQuestion(points: number): void {
    const settings = localStorageService.getSettings();
    settings.pointsPerQuestion = points;
    localStorageService.saveSettings(settings);
  },

  // Game state persistence
  saveGameState(state: Partial<GameState>): void {
    localStorageService.saveGameState(state);
  },

  getGameState(): Partial<GameState> | null {
    return localStorageService.getGameState();
  },

  clearGameState(): void {
    localStorageService.clearGameState();
  }
};