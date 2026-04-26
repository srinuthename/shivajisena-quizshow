// Default Quiz Settings Configuration
// This file contains all default settings for the quiz application
// Used when "Reset to Defaults" is triggered

export interface QuizSettings {
  // Show Configuration
  episodeNumber: string;
  
  // Team Configuration
  teamCount: number;
  defaultTeamNames: string[];
  
  // Scoring Configuration
  correctAnswerScore: number;
  wrongAnswerPenalty: number;
  lifelinePenalty: number; // Applies to "Change Question" and "Verify Answer"
  
  // Timer Configuration
  timerDuration: number; // seconds for question timer
  masterTimerDuration: number; // minutes for game timer
  passedQuestionTimer: number; // seconds for passed questions
  revealCountdownDuration: number; // seconds for answer reveal countdown
  rapidFireDuration: number; // minutes for rapid fire mode
  
  // Display Settings
  showActivityFeed: boolean;
  showDifficultyBadge: boolean;
  showSaveIndicator: boolean;
  showIntroAnimation: boolean; // Toggle for pre-game countdown animation
  showToastMessages: boolean; // Toggle for toast notifications
  maskViewerResponses: boolean; // Hide viewer answer choices with "?" during live display
  youtubeIntegrationEnabled: boolean; // Enable/disable YouTube Live integration
  disableLivePanelDuringPowerplay: boolean; // Disable YouTube Live panel during powerplay
  showYouTubeAutoPostPanel: boolean; // Show/hide the quiz-side YouTube auto-post status panel
  showEngagementHeatmap: boolean; // Show/hide the engagement heatmap widget in quiz UI
  showViewerPredictions: boolean; // Show/hide the viewer predictions widget in quiz UI
  powerplayEnabled: boolean; // Enable/disable powerplay mode
  tickerEnabled: boolean; // Enable/disable ticker messages
  tvModeEnabled: boolean; // Enable TV mode for large screen viewing
  fixedLeaderboard: boolean; // Keep teams in fixed position (no reordering by score)
  showSequenceNumbers: boolean; // Show question sequence numbers (Q1, Q2...) in the grid
  
  // Viewer Scoring
  minimumCorrectScore: number; // Minimum score for correct answers (regardless of timing)
  
  // Ticker Messages
  tickerMessageRegular: string; // Message shown during regular questions
  tickerMessagePowerplay: string; // Message shown during powerplay
  
  // Question Pool Settings
  questionsPerCategory: number;
  maxUsedCountThreshold: number;
  questionImportMergeMode: boolean;
  shuffleQuestions: boolean;
  
  // Lifeline Configuration
  teamLifelines: number; // Number of lifelines each team has (for Verify Answer & Change Question)
  
  // Application Identity
  applicationId: string; // Unique application ID for backend integration (admin-configured)
  quizAnalyticsEnabled: boolean; // Consent toggle to persist quiz analytics in orchestrator MongoDB
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  // Show Configuration
  episodeNumber: "0",
  
  // Team Configuration
  teamCount: 2,
  defaultTeamNames: ["#East", "#West", "#North", "#South"], // English team names (directions)
  
  // Scoring Configuration
  correctAnswerScore: 40, //jesus fasted for 40 days
  wrongAnswerPenalty: 20,
  lifelinePenalty: 0, // Penalty for Change Question and Change Option lifelines
  
  // Timer Configuration
  timerDuration: 90, // 90 seconds per question
  masterTimerDuration: 100, // 10 minutes total game time
  passedQuestionTimer: 15, // 15 seconds for passed questions
  revealCountdownDuration: 3, // 5 seconds for answer reveal countdown
  rapidFireDuration: 3, // 3 minutes for rapid fire mode
  
  // Display Settings
  showActivityFeed: false,
  showDifficultyBadge: false, // Show difficulty badge on questions
  showSaveIndicator: false, // Show "Game Saved" indicator on auto-save
  showToastMessages: false, // Toast notifications off by default
  showIntroAnimation: false, // Pre-game countdown animation off by default
  maskViewerResponses: true, // Hide viewer answer choices with "?" during live display
  youtubeIntegrationEnabled: true, // YouTube Live integration enabled by default (when SSE is on)
  disableLivePanelDuringPowerplay: false, // Live panel stays active during powerplay by default
  showYouTubeAutoPostPanel: true, // Show quiz-side auto-post status panel by default
  showEngagementHeatmap: false, // Hide unfinished engagement widget by default
  showViewerPredictions: false, // Hide unfinished predictions widget by default
  tickerEnabled: false, // Show ticker messages by default
  powerplayEnabled: true, // Powerplay mode enabled by default
  tvModeEnabled: true, // TV mode disabled by default
  fixedLeaderboard: true, // Fixed leaderboard disabled by default
  showSequenceNumbers: true, // Show sequence numbers by default
  
  // Viewer Scoring
  minimumCorrectScore: 100, // Minimum 100 points for all correct answers
  
  // Ticker Messages
  tickerMessageRegular: "📢 Type A, B, C, or D in YouTube chat to answer! First correct answer wins bonus points!",
  tickerMessagePowerplay: "⚡ YOU are FAST! but Youtube is not, so no live answers during powerplay! 😭😭",
  
  // Question Pool Settings
  questionsPerCategory: 50, // Number of questions to load per category
  maxUsedCountThreshold: 10, // Only show questions with usedCount = 0
  questionImportMergeMode: true, // Merge mode ON by default
  shuffleQuestions: false, // Shuffle questions by default
  
  // Lifeline Configuration
  teamLifelines: 3, // Number of lifelines each team has (for Verify Answer & Change Question)
  
  // Application Identity
  applicationId: 'quiz-app', // Product-level application ID
  quizAnalyticsEnabled: true, // Enabled by default
};

// Helper function to apply default settings to localStorage
export const applyDefaultSettings = (): void => {
  const settings = DEFAULT_QUIZ_SETTINGS;
  
  localStorage.setItem("episodeNumber", settings.episodeNumber);
  localStorage.setItem("correctAnswerScore", settings.correctAnswerScore.toString());
  localStorage.setItem("wrongAnswerPenalty", settings.wrongAnswerPenalty.toString());
  localStorage.setItem("lifelinePenalty", settings.lifelinePenalty.toString());
  localStorage.setItem("timerDuration", settings.timerDuration.toString());
  localStorage.setItem("masterTimerDuration", settings.masterTimerDuration.toString());
  localStorage.setItem("passedQuestionTimer", settings.passedQuestionTimer.toString());
  localStorage.setItem("revealCountdownDuration", settings.revealCountdownDuration.toString());
  localStorage.setItem("rapidFireDuration", settings.rapidFireDuration.toString());
  localStorage.setItem("showActivityFeed", settings.showActivityFeed.toString());
  localStorage.setItem("showDifficultyBadge", settings.showDifficultyBadge.toString());
  localStorage.setItem("showSaveIndicator", settings.showSaveIndicator.toString());
  localStorage.setItem("showToastMessages", settings.showToastMessages.toString());
  localStorage.setItem("showIntroAnimation", settings.showIntroAnimation.toString());
  localStorage.setItem("youtubeIntegrationEnabled", settings.youtubeIntegrationEnabled.toString());
  localStorage.setItem("disableLivePanelDuringPowerplay", settings.disableLivePanelDuringPowerplay.toString());
  localStorage.setItem("showYouTubeAutoPostPanel", settings.showYouTubeAutoPostPanel.toString());
  localStorage.setItem("showEngagementHeatmap", settings.showEngagementHeatmap.toString());
  localStorage.setItem("showViewerPredictions", settings.showViewerPredictions.toString());
  localStorage.setItem("maskViewerResponses", settings.maskViewerResponses.toString());
  localStorage.setItem("powerplayEnabled", settings.powerplayEnabled.toString());
  localStorage.setItem("tickerEnabled", settings.tickerEnabled.toString());
  localStorage.setItem("tickerMessageRegular", settings.tickerMessageRegular);
  localStorage.setItem("tickerMessagePowerplay", settings.tickerMessagePowerplay);
  localStorage.setItem("questionsPerCategory", settings.questionsPerCategory.toString());
  localStorage.setItem("maxUsedCountThreshold", settings.maxUsedCountThreshold.toString());
  localStorage.setItem("questionImportMergeMode", settings.questionImportMergeMode.toString());
  localStorage.setItem("shuffleQuestions", settings.shuffleQuestions.toString());
  localStorage.setItem("teamLifelines", settings.teamLifelines.toString());
  localStorage.setItem("tvModeEnabled", settings.tvModeEnabled.toString());
  localStorage.setItem("fixedLeaderboard", settings.fixedLeaderboard.toString());
  localStorage.setItem("showSequenceNumbers", settings.showSequenceNumbers.toString());
  localStorage.setItem("minimumCorrectScore", settings.minimumCorrectScore.toString());
  localStorage.setItem("quizAnalyticsEnabled", settings.quizAnalyticsEnabled.toString());
};

// Helper function to get a setting with default fallback
export const getSetting = <K extends keyof QuizSettings>(key: K): QuizSettings[K] => {
  const stored = localStorage.getItem(key);
  
  if (stored === null) {
    return DEFAULT_QUIZ_SETTINGS[key];
  }
  
  // Parse based on type
  const defaultValue = DEFAULT_QUIZ_SETTINGS[key];
  
  if (typeof defaultValue === 'number') {
    return parseInt(stored) as QuizSettings[K];
  }
  
  if (typeof defaultValue === 'boolean') {
    return (stored === 'true') as QuizSettings[K];
  }
  
  return stored as QuizSettings[K];
};
