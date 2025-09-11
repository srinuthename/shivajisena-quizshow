export const GAME_CONSTANTS = {
  // Question settings
  MAX_QUESTIONS: 10,
  MIN_OPTIONS: 4,
  MAX_OPTIONS: 4,
  DEFAULT_TIMER_DURATION: 30,
  
  // Scoring
  DEFAULT_TARGET_SCORE: 100,
  DEFAULT_POINTS_PER_QUESTION: 11,
  DEFAULT_INCORRECT_NEGATIVE_POINTS: 10,
  DEFAULT_SKIP_PENALTY_POINTS: 0,
  DEFAULT_LIFELINE_PENALTY_POINTS:5,
  
  // Storage keys
  STORAGE_KEYS: {
    QUESTIONS: 'game_questions',
    TIMER_DURATION: 'timer_duration',
    TARGET_SCORE: 'target_score',
    POINTS_PER_QUESTION: 'points_per_question',
    GAME_STATE: 'game_state',
  },
  
  // Animation delays
  ANIMATION_DELAYS: {
    VOTE_FETCH: 1500,
    SCORE_UPDATE: 300,
    FINAL_ANIMATION: 2000,
  },
  
  // Achievement milestones
  ACHIEVEMENT_NAME: 'SPP News Quiz Vijetha',
} as const;