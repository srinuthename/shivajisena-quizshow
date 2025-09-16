import { Question, GameState, ViewerVote } from "@/types/game";
import { gameQuestions as defaultQuestions } from "@/data/questions";
import { GAME_CONSTANTS } from "@/constants/game";

export interface GameSettings {
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
}

interface ValidationError {
  field: string;
  message: string;
}

const STORAGE_KEYS = {
  QUESTIONS: 'shivajisena_questions',
  SETTINGS: 'shivajisena_settings',
  GAME_STATE: 'shivajisena_game_state',
};

const getDefaultSettings = (): GameSettings => ({
  questionCount: GAME_CONSTANTS.MAX_QUESTIONS,
  timerDuration: GAME_CONSTANTS.DEFAULT_TIMER_DURATION,
  targetScore: GAME_CONSTANTS.DEFAULT_TARGET_SCORE,
  pointsPerQuestion: GAME_CONSTANTS.DEFAULT_POINTS_PER_QUESTION,
  quizTitle: 'ShivajiSena Quiz Show',
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
});

export const localStorageService = {
  // Questions management
  getQuestions(): Question[] {
    const stored = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultQuestions;
      }
    }
    return defaultQuestions;
  },

  saveQuestions(questions: Question[]): void {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  },

  // Settings management
  getSettings(): GameSettings {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      try {
        return { ...getDefaultSettings(), ...JSON.parse(stored) };
      } catch {
        return getDefaultSettings();
      }
    }
    return getDefaultSettings();
  },

  saveSettings(settings: GameSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Game state management
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
  },

  // File validation
  validateQuestions(data: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!Array.isArray(data)) {
      errors.push({ field: 'root', message: 'Questions must be an array' });
      return errors;
    }

    if (data.length === 0) {
      errors.push({ field: 'root', message: 'Questions array cannot be empty' });
      return errors;
    }

    data.forEach((question, index) => {
      if (!question.id) {
        errors.push({ field: `question[${index}].id`, message: 'Question ID is required' });
      }
      
      if (!question.text || typeof question.text !== 'string') {
        errors.push({ field: `question[${index}].text`, message: 'Question text is required and must be a string' });
      }
      
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push({ field: `question[${index}].options`, message: 'Question must have at least 2 options' });
      }
      
      if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer >= (question.options?.length || 0)) {
        errors.push({ field: `question[${index}].correctAnswer`, message: 'Correct answer must be a valid option index' });
      }
      
      if (question.timeLimit && (typeof question.timeLimit !== 'number' || question.timeLimit <= 0)) {
        errors.push({ field: `question[${index}].timeLimit`, message: 'Time limit must be a positive number' });
      }
    });

    return errors;
  },

  validateSettings(data: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredFields = [
      'questionCount', 'timerDuration', 'targetScore', 'pointsPerQuestion',
      'quizTitle', 'useApiScoring', 'allowNegativeMarks', 'negativePointsPerQuestion',
      'skipPenaltyPointsPerQuestion', 'lifelinePenaltyPointsPerLifeline',
      'fetchViewerVotes', 'allowAnswerReview', 'gameShowMode'
    ];

    requiredFields.forEach(field => {
      if (!(field in data)) {
        errors.push({ field, message: `${field} is required` });
      }
    });

    if (data.questionCount && (typeof data.questionCount !== 'number' || data.questionCount <= 0)) {
      errors.push({ field: 'questionCount', message: 'Question count must be a positive number' });
    }

    if (data.timerDuration && (typeof data.timerDuration !== 'number' || data.timerDuration <= 0)) {
      errors.push({ field: 'timerDuration', message: 'Timer duration must be a positive number' });
    }

    if (data.targetScore && (typeof data.targetScore !== 'number' || data.targetScore <= 0)) {
      errors.push({ field: 'targetScore', message: 'Target score must be a positive number' });
    }

    if (data.pointsPerQuestion && (typeof data.pointsPerQuestion !== 'number' || data.pointsPerQuestion <= 0)) {
      errors.push({ field: 'pointsPerQuestion', message: 'Points per question must be a positive number' });
    }

    if (data.gameShowMode && !['Solo', 'Team'].includes(data.gameShowMode)) {
      errors.push({ field: 'gameShowMode', message: 'Game show mode must be either "Solo" or "Team"' });
    }

    return errors;
  },

  // File upload handling
  async loadQuestionsFromFile(file: File): Promise<{ success: boolean; errors: ValidationError[]; data?: Question[] }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const errors = this.validateQuestions(data);
      
      if (errors.length === 0) {
        this.saveQuestions(data);
        return { success: true, errors: [], data };
      }
      
      return { success: false, errors };
    } catch (error) {
      return { 
        success: false, 
        errors: [{ field: 'file', message: 'Invalid JSON format' }] 
      };
    }
  },

  async loadSettingsFromFile(file: File): Promise<{ success: boolean; errors: ValidationError[]; data?: GameSettings }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const errors = this.validateSettings(data);
      
      if (errors.length === 0) {
        this.saveSettings(data);
        return { success: true, errors: [], data };
      }
      
      return { success: false, errors };
    } catch (error) {
      return { 
        success: false, 
        errors: [{ field: 'file', message: 'Invalid JSON format' }] 
      };
    }
  },

  // Mock viewer votes for offline mode
  generateMockViewerVotes(questionId: number, numOptions: number): ViewerVote[] {
    const votes: ViewerVote[] = [];
    const totalVotes = Math.floor(Math.random() * 100) + 50; // 50-150 votes
    
    for (let i = 0; i < totalVotes; i++) {
      const choice = Math.floor(Math.random() * numOptions);
      votes.push({
        choice,
        fullname: `User${i + 1}`,
        channelid: `channel${i + 1}`,
        avatar: {
          initial: String.fromCharCode(65 + (i % 26)),
          color: `hsl(${Math.random() * 360}, 70%, 50%)`,
          url: ''
        }
      });
    }
    
    return votes;
  },

  resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  }
};