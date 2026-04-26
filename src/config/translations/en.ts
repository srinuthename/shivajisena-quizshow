// English Translations
import { TranslationStrings } from './types';

export const en: TranslationStrings = {
  // App-wide
  appName: 'Quiz Show',
  quizShow: 'Quiz Show',
  episode: 'Episode',
  
  // Teams
  team: 'Team',
  teamNames: ['#East', '#West', '#North', '#South'],
  score: 'Score',
  streak: 'Streak',
  
  // Quiz
  question: 'Question',
  answer: 'Answer',
  correct: 'Correct',
  wrong: 'Wrong',
  pass: 'Pass',
  timeout: 'Time Up',
  nextQuestion: 'Next Question',
  previousQuestion: 'Previous Question',
  revealAnswer: 'Reveal Answer',
  
  // Lifelines
  lifelines: 'Lifelines',
  verifyAnswer: 'Verify Answer',
  changeQuestion: 'Change Question',
  lifelinesRemaining: 'Lifelines Remaining',
  noLifelines: 'No Lifelines',
  lifelineUsedAll: 'This team has used all their lifelines.',
  
  // Powerplay
  powerplay: 'Powerplay',
  powerplayActive: 'Powerplay Active!',
  powerplayEnded: 'Powerplay Ended',
  activatePowerplay: 'Activate Powerplay',
  powerplayUsed: 'Powerplay Used',
  questionsAttempted: 'Questions Attempted',
  correctAnswers: 'Correct Answers',
  wrongAnswers: 'Wrong Answers',
  lifelinesUsed: 'Lifelines Used',
  pointsScored: 'Points Scored',
  pointsLost: 'Points Lost',
  netScore: 'Net Score',
  powerplayActivated: 'POWERPLAY ACTIVATED!',
  normalGameplayResumes: 'Normal gameplay resumes.',
  
  // Timer
  timer: 'Timer',
  timeRemaining: 'Time Remaining',
  masterTimer: 'Master Timer',
  seconds: 'seconds',
  minutes: 'minutes',
  
  // Game States
  gameNotStarted: 'Game Not Started',
  gameInProgress: 'Game In Progress',
  gameEnded: 'Game Ended',
  startGame: 'Start Game',
  endGame: 'End Game',
  pauseGame: 'Pause Game',
  resumeGame: 'Resume Game',
  resetGame: 'Reset Game',
  
  // Leaderboard
  leaderboard: 'Leaderboard',
  rank: 'Rank',
  viewers: 'Viewers',
  participants: 'Participants',
  totalScore: 'Total Score',
  responses: 'Responses',
  avgResponseTime: 'Avg Response Time',
  accuracy: 'Accuracy',
  totalCoins: 'Total Coins',
  
  // Admin
  admin: 'Admin',
  settings: 'Settings',
  saveSettings: 'Save Settings',
  resetToDefaults: 'Reset to Defaults',
  teamConfiguration: 'Team Configuration',
  scoringConfiguration: 'Scoring Configuration',
  timerConfiguration: 'Timer Configuration',
  displaySettings: 'Display Settings',
  questionPool: 'Question Pool',
  
  // Backend
  backendIntegration: 'Backend Integration',
  connectionStatus: 'Connection Status',
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  reconnecting: 'Reconnecting...',
  serverUrl: 'Server URL',
  testConnection: 'Test Connection',
  
  // Actions
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  delete: 'Delete',
  edit: 'Edit',
  add: 'Add',
  remove: 'Remove',
  refresh: 'Refresh',
  loading: 'Loading...',
  loadingQuestions: 'Loading questions…',
  
  // Messages
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
  
  // Quiz Controls
  selectSubject: 'Select Subject',
  selectQuestion: 'Select Question',
  submitAnswer: 'Submit Answer',
  skipQuestion: 'Skip Question',
  questionSkipped: 'Question Skipped',
  chooseAnotherQuestion: 'Choose another question from the grid.',
  chooseQuiz: 'Choose a quiz',
  quizPrefix: 'Quiz:',
  
  // Viewer Participation
  typeAnswer: 'Type A, B, C or D',
  viewerResponses: 'Viewer Responses',
  liveResponses: 'Live Responses',
  responseRate: 'Response Rate',
  
  // Ticker Messages
  tickerRegular: '📢 Type A, B, C, or D in YouTube chat to answer!',
  tickerPowerplay: '⚡ Powerplay Active! Answer quickly for maximum points!',
  
  // Difficulty
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  
  // General
  yes: 'Yes',
  no: 'No',
  ok: 'OK',
  close: 'Close',
  back: 'Back',
  next: 'Next',
  finish: 'Finish',
  continueBtn: 'Continue',
  
  // Show configuration
  showTitle: 'Show Title',
  showConfiguration: 'Show Configuration',
  episodePrefix: 'Episode Prefix',
  episodeNumber: 'Episode Number',
  quizName: 'Quiz Name',
  channelName: 'Channel Name',
  
  // Branding
  branding: 'Branding',
  logo: 'Logo',
  partnerLogos: 'Partner Logos',
  theme: 'Theme',
  
  // Language
  language: 'Language',
  switchLanguage: 'Switch Language',
  telugu: 'Telugu',
  english: 'English',
  
  // Activity Feed
  activityFeed: 'Activity Feed',
  answeredCorrectly: 'answered correctly',
  answeredIncorrectly: 'answered incorrectly',
  passedQuestion: 'passed the question',
  questionToMaster: 'Question went to Quiz Master',
  usedLifeline: 'used lifeline',
  activatedPowerplay: 'activated POWERPLAY mode!',
  skippedQuestion: 'skipped the question',
  
  // Live Leaderboard
  liveLeaderboard: 'Live Leaderboard',
  live: 'Live',
  offline: 'Offline / No Backend',
  noScoresYet: 'No scores yet...',
  noMatchingUsers: 'No matching users',
  
  // Viewer Stats
  users: 'users',
  rate: 'rate',
  
  // Quiz Display
  nowPlaying: 'Now Playing',
  currentTeam: 'Current Team',
  passedFrom: 'Passed from',
  selectCategory: 'Select Category',
  selectQuestionNumber: 'Select Question Number',
  
  // QuestionGrid
  noQuestionsAvailable: 'No questions available for this quiz.',
  questionsRemaining: 'Questions remaining',
  questionUsed: 'This question has already been used.',
  questionNotAvailable: 'Question not available.',
  
  // PodiumFinish
  champion: 'Champion',
  champions: 'Champions',
  tied: 'Tied!',
  points: 'Points',
  pts: 'pts',
  teamLeaderboard: 'Team Leaderboard',
  viewersLeaderboard: 'Viewers Leaderboard',
  noViewerData: 'No viewer participation data',
  celebrate: 'Celebrate!',
  closeGame: 'Close Game',
  
  // PowerplaySummary
  supporters: 'Supporters',
  attempted: 'Attempted',
  continueText: 'CONTINUE',
  
  // QuestionResultPanel
  correctAnswer: 'Correct Answer',
  noCorrectAnswers: 'No Correct Answers',
  totalResponses: 'Total Responses',
  first: 'First!',
  fastest: 'Fastest!',
  
  // Achievements
  achievements: 'Achievements',
  speedDemon: 'Speed Demon',
  perfectStreak: 'Perfect Streak',
  topPerformer: 'Top Performer',
  risingRank: 'Rising Rank',
  
  // Admin Labels
  questionBank: 'Question Bank',
  importQuestions: 'Import Questions',
  exportQuestions: 'Export Questions',
  clearQuestions: 'Clear Questions',
  questionsLoaded: 'Questions Loaded',
  noQuestionsLoaded: 'No Questions Loaded',
  
  // Session Management
  startNewQuiz: 'Start New Quiz',
  resumeQuiz: 'Resume Quiz',
  quizHistory: 'Quiz History',
  sessionId: 'Session ID',
  sessionDate: 'Session Date',
  sessionDuration: 'Session Duration',
  
  // Connection Status
  online: 'Online',
  sseConnected: 'SSE Connected',
  sseDisconnected: 'SSE Disconnected',
  reconnect: 'Reconnect',
  
  // Misc UI Labels
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  ascending: 'Ascending',
  descending: 'Descending',
  all: 'All',
  none: 'None',
  select: 'Select',
  selected: 'Selected',
  clear: 'Clear',
  reset: 'Reset',
  apply: 'Apply',
  
  // Time Related
  now: 'Now',
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: 'days ago',
  hoursAgo: 'hours ago',
  minutesAgo: 'minutes ago',
  secondsAgo: 'seconds ago',
  
  // Numbers and Counting
  of: 'of',
  outOf: 'out of',
  total: 'Total',
  remaining: 'Remaining',
  used: 'Used',
  available: 'Available',
  
  // Game End
  winner: 'Winner',
  finalScoreboard: 'Final Scoreboard',
  
  // Toasts and Notifications
  pleaseFinishCurrentQuestion: 'Please Finish Current Question',
  mustFinishQuestionFirst: 'You must finish the current question first.',
  noTeamCouldAnswer: 'No Team Could Answer',
  revealingCorrectAnswer: 'Revealing correct answer...',
  pointToAdmin: 'Point to Admin!',
  movingToNextQuestion: 'Moving to next question...',
  teamChanged: 'Team Changed',
  switchedTo: 'Switched to',
  gameSaved: 'Game Saved',
  changeTeam: 'Change Team',
  selectTeamToSwitch: 'Select team to switch',
  
  // Volume and Sound
  volume: 'Volume',
  mute: 'Mute',
  unmute: 'Unmute',
  backgroundMusic: 'Background Music',
  
  // Fullscreen
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit Fullscreen',
  
  // Exit and Navigation
  exitQuiz: 'Exit Quiz',
  confirmExit: 'Confirm Exit',
  unsavedProgress: 'Your progress will be saved.',
  
  // Application Modes
  appMode: 'Application Mode',
  offlineMode: 'Offline Mode (No Backend)',
  offlineModeDesc: 'Quiz engine only - teams, scoring, leaderboards. No backend connections, no viewers.',
  frontendScoringMode: 'Frontend Scoring Engine',
  frontendScoringModeDesc: 'Frontend handles scoring and timing. Backend can still persist quiz runs, state, analytics, and prizes.',
  backendScoringMode: 'Backend Scoring Engine',
  backendScoringModeDesc: 'Frontend quiz + backend handles viewer scoring and leaderboards.',
  onlineMode: 'Online Mode',
  onlineModeDesc: 'Backend is the quiz engine. Frontend is display/controller only.',
  comingSoon: 'Coming Soon',
  
  // SSE Configuration
  sseServerConfig: 'SSE Server Configuration',
  sseServerUrl: 'SSE Server URL',
  viewerAnswerDelay: 'Viewer Answer Delay (ms)',
  reconnectDelay: 'Reconnect Delay (ms)',
  heartbeatTimeout: 'Heartbeat Timeout (s)',
  enableSSE: 'Enable SSE',
  
  // API Server Configuration
  apiServerConfig: 'API Server Configuration',
  apiServerUrl: 'API Server URL',
  applicationId: 'Application ID',
  generateNewId: 'Generate New ID',
  
  // YouTube Integration
  youtubeIntegration: 'YouTube Integration',
  youtubePanel: 'YouTube Panel',
  enableYoutube: 'Enable YouTube',
  connectSSEFirst: 'Connect SSE first to enable YouTube panel',
  
  // Viewer Features
  viewerScoring: 'Viewer Scoring',
  viewerLeaderboard: 'Viewer Leaderboard',
  clockSync: 'Clock Sync',
  latencyCompensation: 'Latency Compensation',

  // Quiz Gameplay UI
  poweredBy: 'powered by',
  timeRemainingLabel: 'Time remaining',
  nowPlayingLabel: 'Now Playing',
  powerPlay: 'POWER PLAY',
  liveLabel: 'LIVE',
  questionResult: 'Question Result',
  noResponsesYet: 'No responses yet...',
  thisQuestion: 'This Question',
  correctOnly: 'Correct only',
  halfTime: 'HALF-TIME',
  questionsPlayed: 'questions played',
  activeViewers: 'Active Viewers',
  teamSupporters: 'Team Supporters',
  questionsLeft: 'Questions Left',
  teamStandings: 'Team Standings',
  topViewers: 'Top Viewers',
  panelLeaderboard: 'Panel Leaderboard',
  viewUserLeaderboard: 'View User Leaderboard',
  maximizeTeamLeaderboard: 'Maximize Team Leaderboard',
  liveChatLeaderboard: 'Live Chat Leaderboard',
};
