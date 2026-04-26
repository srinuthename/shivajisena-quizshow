// Telugu Translations (తెలుగు)
import { TranslationStrings } from './types';

export const te: TranslationStrings = {
  // App-wide
  appName: 'క్విజ్ షో',
  quizShow: 'క్విజ్ షో',
  episode: 'ఎపిసోడ్',
  
  // Teams - Telugu team names (directions/regions)
  team: 'జట్టు',
  teamNames: ['#తూర్పు', '#పశ్చిమ', '#ఉత్తర', '#దక్షిణ'],
  score: 'స్కోరు',
  streak: 'వరుస',
  
  // Quiz
  question: 'ప్రశ్న',
  answer: 'సమాధానం',
  correct: 'సరైనది',
  wrong: 'తప్పు',
  pass: 'పాస్',
  timeout: 'సమయం అయిపోయింది',
  nextQuestion: 'తదుపరి ప్రశ్న',
  previousQuestion: 'మునుపటి ప్రశ్న',
  revealAnswer: 'సమాధానం చూపించు',
  
  // Lifelines
  lifelines: 'లైఫ్‌లైన్లు',
  verifyAnswer: 'సమాధానం ధృవీకరించు',
  changeQuestion: 'ప్రశ్న మార్చు',
  lifelinesRemaining: 'మిగిలిన లైఫ్‌లైన్లు',
  noLifelines: 'లైఫ్‌లైన్లు లేవు',
  lifelineUsedAll: 'ఈ జట్టు అన్ని లైఫ్‌లైన్లు ఉపయోగించింది.',
  
  // Powerplay
  powerplay: 'పవర్‌ప్లే',
  powerplayActive: 'పవర్‌ప్లే యాక్టివ్!',
  powerplayEnded: 'పవర్‌ప్లే ముగిసింది',
  activatePowerplay: 'పవర్‌ప్లే ప్రారంభించు',
  powerplayUsed: 'పవర్‌ప్లే ఉపయోగించారు',
  questionsAttempted: 'ప్రయత్నించిన ప్రశ్నలు',
  correctAnswers: 'సరైన సమాధానాలు',
  wrongAnswers: 'తప్పు సమాధానాలు',
  lifelinesUsed: 'ఉపయోగించిన లైఫ్‌లైన్లు',
  pointsScored: 'సంపాదించిన పాయింట్లు',
  pointsLost: 'కోల్పోయిన పాయింట్లు',
  netScore: 'నికర స్కోరు',
  powerplayActivated: '⚡ పవర్‌ప్లే యాక్టివేట్!',
  normalGameplayResumes: 'సాధారణ గేమ్‌ప్లే తిరిగి ప్రారంభమవుతుంది.',
  
  // Timer
  timer: 'టైమర్',
  timeRemaining: 'మిగిలిన సమయం',
  masterTimer: 'మాస్టర్ టైమర్',
  seconds: 'సెకన్లు',
  minutes: 'నిమిషాలు',
  
  // Game States
  gameNotStarted: 'ఆట మొదలు కాలేదు',
  gameInProgress: 'ఆట కొనసాగుతోంది',
  gameEnded: 'ఆట ముగిసింది',
  startGame: 'ఆట ప్రారంభించు',
  endGame: 'ఆట ముగించు',
  pauseGame: 'ఆట ఆపు',
  resumeGame: 'ఆట కొనసాగించు',
  resetGame: 'ఆట రీసెట్ చేయి',
  
  // Leaderboard
  leaderboard: 'లీడర్‌బోర్డ్',
  rank: 'ర్యాంక్',
  viewers: 'వీక్షకులు',
  participants: 'పాల్గొనేవారు',
  totalScore: 'మొత్తం స్కోరు',
  responses: 'ప్రతిస్పందనలు',
  avgResponseTime: 'సగటు ప్రతిస్పందన సమయం',
  accuracy: 'ఖచ్చితత్వం',
  totalCoins: 'మొత్తం నాణేలు',
  
  // Admin
  admin: 'అడ్మిన్',
  settings: 'సెట్టింగ్‌లు',
  saveSettings: 'సెట్టింగ్‌లు సేవ్ చేయి',
  resetToDefaults: 'డిఫాల్ట్‌లకు రీసెట్',
  teamConfiguration: 'జట్టు కాన్ఫిగరేషన్',
  scoringConfiguration: 'స్కోరింగ్ కాన్ఫిగరేషన్',
  timerConfiguration: 'టైమర్ కాన్ఫిగరేషన్',
  displaySettings: 'డిస్‌ప్లే సెట్టింగ్‌లు',
  questionPool: 'ప్రశ్న పూల్',
  
  // Backend
  backendIntegration: 'బ్యాకెండ్ ఇంటిగ్రేషన్',
  connectionStatus: 'కనెక్షన్ స్థితి',
  connected: 'కనెక్ట్ అయింది',
  disconnected: 'డిస్‌కనెక్ట్ అయింది',
  connecting: 'కనెక్ట్ అవుతోంది...',
  reconnecting: 'మళ్ళీ కనెక్ట్ అవుతోంది...',
  serverUrl: 'సర్వర్ URL',
  testConnection: 'కనెక్షన్ టెస్ట్',
  
  // Actions
  save: 'సేవ్',
  cancel: 'రద్దు',
  confirm: 'నిర్ధారించు',
  delete: 'తొలగించు',
  edit: 'ఎడిట్',
  add: 'జోడించు',
  remove: 'తీసివేయి',
  refresh: 'రిఫ్రెష్',
  loading: 'లోడ్ అవుతోంది...',
  loadingQuestions: 'ప్రశ్నలు లోడ్ అవుతున్నాయి…',
  
  // Messages
  success: 'విజయం',
  error: 'లోపం',
  warning: 'హెచ్చరిక',
  info: 'సమాచారం',
  
  // Quiz Controls
  selectSubject: 'విషయం ఎంచుకో',
  selectQuestion: 'ప్రశ్న ఎంచుకో',
  submitAnswer: 'సమాధానం సబ్మిట్ చేయి',
  skipQuestion: 'ప్రశ్న స్కిప్ చేయి',
  questionSkipped: 'ప్రశ్న స్కిప్ అయింది',
  chooseAnotherQuestion: 'గ్రిడ్ నుండి మరొక ప్రశ్న ఎంచుకోండి.',
  chooseQuiz: 'క్విజ్ ఎంచుకోండి',
  quizPrefix: 'క్విజ్:',
  
  // Viewer Participation
  typeAnswer: 'A, B, C లేదా D టైప్ చేయండి',
  viewerResponses: 'వీక్షకుల ప్రతిస్పందనలు',
  liveResponses: 'లైవ్ ప్రతిస్పందనలు',
  responseRate: 'ప్రతిస్పందన రేటు',
  
  // Ticker Messages
  tickerRegular: '📢 YouTube చాట్‌లో A, B, C లేదా D టైప్ చేయండి!',
  tickerPowerplay: '⚡ పవర్‌ప్లే యాక్టివ్! త్వరగా సమాధానం ఇవ్వండి!',
  
  // Difficulty
  easy: 'సులభం',
  medium: 'మధ్యస్థం',
  hard: 'కష్టం',
  
  // General
  yes: 'అవును',
  no: 'కాదు',
  ok: 'సరే',
  close: 'మూసివేయి',
  back: 'వెనుకకు',
  next: 'తదుపరి',
  finish: 'ముగించు',
  continueBtn: 'కొనసాగించు',
  
  // Show configuration
  showTitle: 'షో టైటిల్',
  showConfiguration: 'షో కాన్ఫిగరేషన్',
  episodePrefix: 'ఎపిసోడ్ ప్రిఫిక్స్',
  episodeNumber: 'ఎపిసోడ్ నంబర్',
  quizName: 'క్విజ్ పేరు',
  channelName: 'ఛానల్ పేరు',
  
  // Branding
  branding: 'బ్రాండింగ్',
  logo: 'లోగో',
  partnerLogos: 'భాగస్వామి లోగోలు',
  theme: 'థీమ్',
  
  // Language
  language: 'భాష',
  switchLanguage: 'భాష మార్చు',
  telugu: 'తెలుగు',
  english: 'ఆంగ్లం',
  
  // Activity Feed
  activityFeed: 'యాక్టివిటీ ఫీడ్',
  answeredCorrectly: 'సరిగ్గా సమాధానమిచ్చారు',
  answeredIncorrectly: 'తప్పుగా సమాధానమిచ్చారు',
  passedQuestion: 'ప్రశ్నను పాస్ చేసారు',
  questionToMaster: 'ప్రశ్న క్విజ్ మాస్టర్‌కు వెళ్ళింది',
  usedLifeline: 'లైఫ్‌లైన్ ఉపయోగించారు',
  activatedPowerplay: 'పవర్‌ప్లే యాక్టివేట్ చేసారు!',
  skippedQuestion: 'ప్రశ్న స్కిప్ చేసారు',
  
  // Live Leaderboard
  liveLeaderboard: 'లైవ్ లీడర్‌బోర్డ్',
  live: 'లైవ్',
  offline: 'ఆఫ్‌లైన్',
  noScoresYet: 'ఇంకా స్కోర్లు లేవు...',
  noMatchingUsers: 'సరిపోలే యూజర్లు లేరు',
  
  // Viewer Stats
  users: 'యూజర్లు',
  rate: 'రేటు',
  
  // Quiz Display
  nowPlaying: 'ఇప్పుడు ఆడుతున్నారు',
  currentTeam: 'ప్రస్తుత జట్టు',
  passedFrom: 'నుండి పాస్ అయింది',
  selectCategory: 'విభాగం ఎంచుకోండి',
  selectQuestionNumber: 'ప్రశ్న నంబర్ ఎంచుకోండి',
  
  // QuestionGrid
  noQuestionsAvailable: 'ఈ క్విజ్‌కు ప్రశ్నలు అందుబాటులో లేవు.',
  questionsRemaining: 'మిగిలిన ప్రశ్నలు',
  questionUsed: 'ఈ ప్రశ్న ఇప్పటికే ఉపయోగించబడింది.',
  questionNotAvailable: 'ప్రశ్న అందుబాటులో లేదు.',
  
  // PodiumFinish
  champion: 'చాంపియన్',
  champions: 'చాంపియన్లు',
  tied: 'టై!',
  points: 'పాయింట్లు',
  pts: 'pts',
  teamLeaderboard: 'జట్టు లీడర్‌బోర్డ్',
  viewersLeaderboard: 'వీక్షకుల లీడర్‌బోర్డ్',
  noViewerData: 'వీక్షకుల పాల్గొనే డేటా లేదు',
  celebrate: 'సెలబ్రేట్!',
  closeGame: 'గేమ్ మూసివేయి',
  
  // PowerplaySummary
  supporters: 'మద్దతుదారులు',
  attempted: 'ప్రయత్నించారు',
  continueText: 'కొనసాగించు',
  
  // QuestionResultPanel
  correctAnswer: 'సరైన సమాధానం',
  noCorrectAnswers: 'సరైన సమాధానాలు లేవు',
  totalResponses: 'మొత్తం ప్రతిస్పందనలు',
  first: 'మొదటి!',
  fastest: 'వేగవంతమైన!',
  
  // Achievements
  achievements: 'సాధనలు',
  speedDemon: 'స్పీడ్ డెమన్',
  perfectStreak: 'పర్ఫెక్ట్ స్ట్రీక్',
  topPerformer: 'టాప్ పెర్ఫార్మర్',
  risingRank: 'రైజింగ్ ర్యాంక్',
  
  // Admin Labels
  questionBank: 'ప్రశ్న బ్యాంక్',
  importQuestions: 'ప్రశ్నలు దిగుమతి చేయి',
  exportQuestions: 'ప్రశ్నలు ఎగుమతి చేయి',
  clearQuestions: 'ప్రశ్నలు క్లియర్ చేయి',
  questionsLoaded: 'ప్రశ్నలు లోడ్ అయ్యాయి',
  noQuestionsLoaded: 'ప్రశ్నలు లోడ్ కాలేదు',
  
  // Session Management
  startNewQuiz: 'కొత్త క్విజ్ ప్రారంభించు',
  resumeQuiz: 'క్విజ్ కొనసాగించు',
  quizHistory: 'క్విజ్ చరిత్ర',
  sessionId: 'సెషన్ ID',
  sessionDate: 'సెషన్ తేదీ',
  sessionDuration: 'సెషన్ వ్యవధి',
  
  // Connection Status
  online: 'ఆన్‌లైన్',
  sseConnected: 'SSE కనెక్ట్ అయింది',
  sseDisconnected: 'SSE డిస్‌కనెక్ట్ అయింది',
  reconnect: 'మళ్ళీ కనెక్ట్ చేయి',
  
  // Misc UI Labels
  search: 'వెతుకు',
  filter: 'ఫిల్టర్',
  sort: 'క్రమబద్ధం',
  ascending: 'ఆరోహణ',
  descending: 'అవరోహణ',
  all: 'అన్ని',
  none: 'ఏదీ కాదు',
  select: 'ఎంచుకో',
  selected: 'ఎంచుకోబడింది',
  clear: 'క్లియర్',
  reset: 'రీసెట్',
  apply: 'వర్తించు',
  
  // Time Related
  now: 'ఇప్పుడు',
  today: 'ఈరోజు',
  yesterday: 'నిన్న',
  daysAgo: 'రోజుల క్రితం',
  hoursAgo: 'గంటల క్రితం',
  minutesAgo: 'నిమిషాల క్రితం',
  secondsAgo: 'సెకన్ల క్రితం',
  
  // Numbers and Counting
  of: 'లో',
  outOf: 'లో',
  total: 'మొత్తం',
  remaining: 'మిగిలిన',
  used: 'ఉపయోగించిన',
  available: 'అందుబాటులో',
  
  // Game End
  winner: 'విజేత',
  finalScoreboard: 'ఫైనల్ స్కోర్‌బోర్డ్',
  
  // Toasts and Notifications
  pleaseFinishCurrentQuestion: 'దయచేసి ప్రస్తుత ప్రశ్నను పూర్తి చేయండి',
  mustFinishQuestionFirst: 'మీరు ప్రస్తుత ప్రశ్నను మొదట పూర్తి చేయాలి.',
  noTeamCouldAnswer: 'ఏ జట్టూ సమాధానం ఇవ్వలేకపోయింది',
  revealingCorrectAnswer: 'సరైన సమాధానం చూపిస్తోంది...',
  pointToAdmin: 'అడ్మిన్‌కు పాయింట్!',
  movingToNextQuestion: 'తదుపరి ప్రశ్నకు వెళ్తోంది...',
  teamChanged: 'జట్టు మారింది',
  switchedTo: 'మారారు',
  gameSaved: 'గేమ్ సేవ్ అయింది',
  changeTeam: 'జట్టు మార్చు',
  selectTeamToSwitch: 'మార్చడానికి జట్టును ఎంచుకోండి',
  
  // Volume and Sound
  volume: 'వాల్యూమ్',
  mute: 'మ్యూట్',
  unmute: 'అన్‌మ్యూట్',
  backgroundMusic: 'బ్యాక్‌గ్రౌండ్ మ్యూజిక్',
  
  // Fullscreen
  fullscreen: 'ఫుల్‌స్క్రీన్',
  exitFullscreen: 'ఫుల్‌స్క్రీన్ నిష్క్రమించు',
  
  // Exit and Navigation
  exitQuiz: 'క్విజ్ నిష్క్రమించు',
  confirmExit: 'నిష్క్రమణ నిర్ధారించు',
  unsavedProgress: 'మీ ప్రగతి సేవ్ చేయబడుతుంది.',
  
  // Application Modes
  appMode: 'అప్లికేషన్ మోడ్',
  offlineMode: 'ఆఫ్‌లైన్ మోడ్',
  offlineModeDesc: 'క్విజ్ ఇంజన్ మాత్రమే - జట్లు, స్కోరింగ్, లీడర్‌బోర్డ్‌లు. సర్వర్ కనెక్షన్లు లేవు, వీక్షకులు లేరు.',
  frontendScoringMode: 'ఫ్రంటెండ్ స్కోరింగ్ ఇంజన్',
  frontendScoringModeDesc: 'ఫ్రంటెండ్ స్కోరింగ్ మరియు టైమింగ్ నిర్వహిస్తుంది. బ్యాకెండ్ ఇంకా క్విజ్ రన్స్, స్టేట్, అనలిటిక్స్, ప్రైజ్ డేటాను సేవ్ చేయగలదు.',
  backendScoringMode: 'బ్యాకెండ్ స్కోరింగ్ ఇంజన్',
  backendScoringModeDesc: 'ఫ్రంటెండ్ క్విజ్ + బ్యాకెండ్ వీక్షకుల స్కోరింగ్ మరియు లీడర్‌బోర్డ్‌లు నిర్వహిస్తుంది.',
  onlineMode: 'ఆన్‌లైన్ మోడ్',
  onlineModeDesc: 'బ్యాకెండ్ క్విజ్ ఇంజన్. ఫ్రంటెండ్ డిస్‌ప్లే/కంట్రోలర్ మాత్రమే.',
  comingSoon: 'త్వరలో వస్తుంది',
  
  // SSE Configuration
  sseServerConfig: 'SSE సర్వర్ కాన్ఫిగరేషన్',
  sseServerUrl: 'SSE సర్వర్ URL',
  viewerAnswerDelay: 'వీక్షకుల సమాధాన ఆలస్యం (ms)',
  reconnectDelay: 'మళ్ళీ కనెక్ట్ ఆలస్యం (ms)',
  heartbeatTimeout: 'హార్ట్‌బీట్ టైమ్‌అవుట్ (s)',
  enableSSE: 'SSE ఎనేబుల్ చేయి',
  
  // API Server Configuration
  apiServerConfig: 'API సర్వర్ కాన్ఫిగరేషన్',
  apiServerUrl: 'API సర్వర్ URL',
  applicationId: 'అప్లికేషన్ ID',
  generateNewId: 'కొత్త ID జెనరేట్ చేయి',
  
  // YouTube Integration
  youtubeIntegration: 'YouTube ఇంటిగ్రేషన్',
  youtubePanel: 'YouTube ప్యానెల్',
  enableYoutube: 'YouTube ఎనేబుల్ చేయి',
  connectSSEFirst: 'YouTube ప్యానెల్ ఎనేబుల్ చేయడానికి ముందు SSE కనెక్ట్ చేయండి',
  
  // Viewer Features
  viewerScoring: 'వీక్షకుల స్కోరింగ్',
  viewerLeaderboard: 'వీక్షకుల లీడర్‌బోర్డ్',
  clockSync: 'క్లాక్ సింక్',
  latencyCompensation: 'లేటెన్సీ పరిహారం',

  // Quiz Gameplay UI
  poweredBy: 'సమర్పణ',
  timeRemainingLabel: 'మిగిలిన సమయం',
  nowPlayingLabel: 'ఇప్పుడు ఆడుతున్నారు',
  powerPlay: 'పవర్ ప్లే',
  liveLabel: 'లైవ్',
  questionResult: 'ప్రశ్న ఫలితం',
  noResponsesYet: 'ఇంకా ప్రతిస్పందనలు లేవు...',
  thisQuestion: 'ఈ ప్రశ్న',
  correctOnly: 'సరైనవి మాత్రమే',
  halfTime: 'హాఫ్-టైమ్',
  questionsPlayed: 'ప్రశ్నలు ఆడారు',
  activeViewers: 'యాక్టివ్ వీక్షకులు',
  teamSupporters: 'జట్టు మద్దతుదారులు',
  questionsLeft: 'మిగిలిన ప్రశ్నలు',
  teamStandings: 'జట్టు స్థానాలు',
  topViewers: 'టాప్ వీక్షకులు',
  panelLeaderboard: 'ప్యానెల్ లీడర్‌బోర్డ్',
  viewUserLeaderboard: 'యూజర్ లీడర్‌బోర్డ్ చూడండి',
  maximizeTeamLeaderboard: 'జట్టు లీడర్‌బోర్డ్ పెద్దది చేయండి',
  liveChatLeaderboard: 'లైవ్ చాట్ లీడర్‌బోర్డ్',
};
