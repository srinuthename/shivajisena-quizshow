// Translation Types
// Define all translation keys and language types

export type Language = 'te' | 'en';

export interface TranslationStrings {
  // App-wide
  appName: string;
  quizShow: string;
  episode: string;
  
  // Teams
  team: string;
  teamNames: string[];
  score: string;
  streak: string;
  
  // Quiz
  question: string;
  answer: string;
  correct: string;
  wrong: string;
  pass: string;
  timeout: string;
  nextQuestion: string;
  previousQuestion: string;
  revealAnswer: string;
  
  // Lifelines
  lifelines: string;
  verifyAnswer: string;
  changeQuestion: string;
  lifelinesRemaining: string;
  noLifelines: string;
  lifelineUsedAll: string;
  
  // Powerplay
  powerplay: string;
  powerplayActive: string;
  powerplayEnded: string;
  activatePowerplay: string;
  powerplayUsed: string;
  questionsAttempted: string;
  correctAnswers: string;
  wrongAnswers: string;
  lifelinesUsed: string;
  pointsScored: string;
  pointsLost: string;
  netScore: string;
  powerplayActivated: string;
  normalGameplayResumes: string;
  
  // Timer
  timer: string;
  timeRemaining: string;
  masterTimer: string;
  seconds: string;
  minutes: string;
  
  // Game States
  gameNotStarted: string;
  gameInProgress: string;
  gameEnded: string;
  startGame: string;
  endGame: string;
  pauseGame: string;
  resumeGame: string;
  resetGame: string;
  
  // Leaderboard
  leaderboard: string;
  rank: string;
  viewers: string;
  participants: string;
  totalScore: string;
  responses: string;
  avgResponseTime: string;
  accuracy: string;
  totalCoins: string;
  
  // Admin
  admin: string;
  settings: string;
  saveSettings: string;
  resetToDefaults: string;
  teamConfiguration: string;
  scoringConfiguration: string;
  timerConfiguration: string;
  displaySettings: string;
  questionPool: string;
  
  // Backend
  backendIntegration: string;
  connectionStatus: string;
  connected: string;
  disconnected: string;
  connecting: string;
  reconnecting: string;
  serverUrl: string;
  testConnection: string;
  
  // Actions
  save: string;
  cancel: string;
  confirm: string;
  delete: string;
  edit: string;
  add: string;
  remove: string;
  refresh: string;
  loading: string;
  loadingQuestions: string;
  
  // Messages
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // Quiz Controls
  selectSubject: string;
  selectQuestion: string;
  submitAnswer: string;
  skipQuestion: string;
  questionSkipped: string;
  chooseAnotherQuestion: string;
  chooseQuiz: string;
  quizPrefix: string;
  
  // Viewer Participation
  typeAnswer: string;
  viewerResponses: string;
  liveResponses: string;
  responseRate: string;
  
  // Ticker Messages
  tickerRegular: string;
  tickerPowerplay: string;
  
  // Difficulty
  easy: string;
  medium: string;
  hard: string;
  
  // General
  yes: string;
  no: string;
  ok: string;
  close: string;
  back: string;
  next: string;
  finish: string;
  continueBtn: string;
  
  // Show configuration
  showTitle: string;
  showConfiguration: string;
  episodePrefix: string;
  episodeNumber: string;
  quizName: string;
  channelName: string;
  
  // Branding
  branding: string;
  logo: string;
  partnerLogos: string;
  theme: string;
  
  // Language
  language: string;
  switchLanguage: string;
  telugu: string;
  english: string;
  
  // Activity Feed
  activityFeed: string;
  answeredCorrectly: string;
  answeredIncorrectly: string;
  passedQuestion: string;
  questionToMaster: string;
  usedLifeline: string;
  activatedPowerplay: string;
  skippedQuestion: string;
  
  // Live Leaderboard
  liveLeaderboard: string;
  live: string;
  offline: string;
  noScoresYet: string;
  noMatchingUsers: string;
  
  // Viewer Stats
  users: string;
  rate: string;
  
  // Quiz Display
  nowPlaying: string;
  currentTeam: string;
  passedFrom: string;
  selectCategory: string;
  selectQuestionNumber: string;
  
  // QuestionGrid
  noQuestionsAvailable: string;
  questionsRemaining: string;
  questionUsed: string;
  questionNotAvailable: string;
  
  // PodiumFinish  
  champion: string;
  champions: string;
  tied: string;
  points: string;
  pts: string;
  teamLeaderboard: string;
  viewersLeaderboard: string;
  noViewerData: string;
  celebrate: string;
  closeGame: string;
  
  // PowerplaySummary
  supporters: string;
  attempted: string;
  continueText: string;
  
  // QuestionResultPanel
  correctAnswer: string;
  noCorrectAnswers: string;
  totalResponses: string;
  first: string;
  fastest: string;
  
  // Achievements
  achievements: string;
  speedDemon: string;
  perfectStreak: string;
  topPerformer: string;
  risingRank: string;
  
  // Admin Labels
  questionBank: string;
  importQuestions: string;
  exportQuestions: string;
  clearQuestions: string;
  questionsLoaded: string;
  noQuestionsLoaded: string;
  
  // Session Management
  startNewQuiz: string;
  resumeQuiz: string;
  quizHistory: string;
  sessionId: string;
  sessionDate: string;
  sessionDuration: string;
  
  // Connection Status
  online: string;
  sseConnected: string;
  sseDisconnected: string;
  reconnect: string;
  
  // Misc UI Labels
  search: string;
  filter: string;
  sort: string;
  ascending: string;
  descending: string;
  all: string;
  none: string;
  select: string;
  selected: string;
  clear: string;
  reset: string;
  apply: string;
  
  // Time Related
  now: string;
  today: string;
  yesterday: string;
  daysAgo: string;
  hoursAgo: string;
  minutesAgo: string;
  secondsAgo: string;
  
  // Numbers and Counting
  of: string;
  outOf: string;
  total: string;
  remaining: string;
  used: string;
  available: string;
  
  // Game End
  winner: string;
  finalScoreboard: string;
  
  // Toasts and Notifications
  pleaseFinishCurrentQuestion: string;
  mustFinishQuestionFirst: string;
  noTeamCouldAnswer: string;
  revealingCorrectAnswer: string;
  pointToAdmin: string;
  movingToNextQuestion: string;
  teamChanged: string;
  switchedTo: string;
  gameSaved: string;
  changeTeam: string;
  selectTeamToSwitch: string;
  
  // Volume and Sound
  volume: string;
  mute: string;
  unmute: string;
  backgroundMusic: string;
  
  // Fullscreen
  fullscreen: string;
  exitFullscreen: string;
  
  // Exit and Navigation
  exitQuiz: string;
  confirmExit: string;
  unsavedProgress: string;
  
  // Application Modes
  appMode: string;
  offlineMode: string;
  offlineModeDesc: string;
  frontendScoringMode: string;
  frontendScoringModeDesc: string;
  backendScoringMode: string;
  backendScoringModeDesc: string;
  onlineMode: string;
  onlineModeDesc: string;
  comingSoon: string;
  
  // SSE Configuration
  sseServerConfig: string;
  sseServerUrl: string;
  viewerAnswerDelay: string;
  reconnectDelay: string;
  heartbeatTimeout: string;
  enableSSE: string;
  
  // API Server Configuration
  apiServerConfig: string;
  apiServerUrl: string;
  applicationId: string;
  generateNewId: string;
  
  // YouTube Integration
  youtubeIntegration: string;
  youtubePanel: string;
  enableYoutube: string;
  connectSSEFirst: string;
  
  // Viewer Features
  viewerScoring: string;
  viewerLeaderboard: string;
  clockSync: string;
  latencyCompensation: string;

  // Quiz Gameplay UI
  poweredBy: string;
  timeRemainingLabel: string;
  nowPlayingLabel: string;
  powerPlay: string;
  liveLabel: string;
  questionResult: string;
  noResponsesYet: string;
  thisQuestion: string;
  correctOnly: string;
  halfTime: string;
  questionsPlayed: string;
  activeViewers: string;
  teamSupporters: string;
  questionsLeft: string;
  teamStandings: string;
  topViewers: string;
  panelLeaderboard: string;
  viewUserLeaderboard: string;
  maximizeTeamLeaderboard: string;
  liveChatLeaderboard: string;
}
