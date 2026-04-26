// Centralized defaults configuration
// All settings that can be reset are defined here
// This file is the single source of truth for reset functionality

import { DEFAULT_BRANDING, BrandingConfig } from './brandingConfig';
import { DEFAULT_QUIZ_SETTINGS, QuizSettings } from './quizSettings';
import { DEFAULT_LANGUAGE, Language, getTeamNames } from './translations';
import { DEFAULT_SSE_STREAM_URL } from './appMode';
import { clearYouTubeLeaderboard } from '@/components/YouTubeLivePanel';
import { clearSessionQuestions } from '@/lib/quizSessionManager';
import { clearMirroredAdminSettings, writeMirroredAdminSettings } from '@/lib/adminConfigPersistence';
import { clearStoredQuizRunConfigs } from '@/lib/quizRunConfig';

export interface AppDefaults {
  // Language
  language: Language;
  
  // Quiz Settings (from quizSettings.ts)
  quizSettings: QuizSettings;
  
  // Branding (from brandingConfig.ts)
  branding: BrandingConfig;
  
  // Team configurations (names from translation based on language)
  getDefaultTeamConfigs: (lang?: Language) => TeamConfig[];
}

export interface TeamConfig {
  name: string;
  members: string[];
  avatar?: string;
}

// Get default team configs based on language
export const getDefaultTeamConfigs = (lang?: Language): TeamConfig[] => {
  const teamNames = getTeamNames();
  const count = DEFAULT_QUIZ_SETTINGS.teamCount;
  return Array.from({ length: count }, (_, i) => ({
    name: teamNames[i] || `Team ${i + 1}`,
    members: [],
  }));
};

// Combined defaults object
export const APP_DEFAULTS: AppDefaults = {
  language: DEFAULT_LANGUAGE,
  quizSettings: DEFAULT_QUIZ_SETTINGS,
  branding: DEFAULT_BRANDING,
  getDefaultTeamConfigs,
};

// All localStorage keys that should be cleared on reset
export const RESETTABLE_LOCALSTORAGE_KEYS = [
  // Team config
  'teamConfigs',
  'teamLifelinesState',
  
  // Quiz game state
  'quizGameState',
  'activeQuizSessionId',
  'viewerLeaderboard',
  
  // Custom questions editor (NOT the question bank in IndexedDB)
  'customQuestions',
  'customQuestionsEditor',
  
  // Quiz settings (these get overwritten with defaults)
  'episodeNumber',
  'correctAnswerScore',
  'wrongAnswerPenalty',
  'lifelinePenalty',
  'timerDuration',
  'masterTimerDuration',
  'passedQuestionTimer',
  'revealCountdownDuration',
  'rapidFireDuration',
  'showActivityFeed',
  'showDifficultyBadge',
  'showSaveIndicator',
  'showToastMessages',
  'showIntroAnimation',
  'youtubeIntegrationEnabled',
  'disableLivePanelDuringPowerplay',
  'showYouTubeAutoPostPanel',
  'showEngagementHeatmap',
  'showViewerPredictions',
  'maskViewerResponses',
  'powerplayEnabled',
  'tickerEnabled',
  'tickerMessageRegular',
  'tickerMessagePowerplay',
  'questionsPerCategory',
  'maxUsedCountThreshold',
  'questionImportMergeMode',
  'shuffleQuestions',
  'teamLifelines',
  'tvModeEnabled',
  'fixedLeaderboard',
  'quizAnalyticsEnabled',
  
  // Branding
  'quizBranding',
  
  // Session data
  'sessionQuestionPools',
  'sessionSubjects',
  
  // YouTube data
  'youtubeViewerLeaderboard',
  
  // Game IDs (for fresh start)
  'frontendQuizGameId',
];

// IndexedDB stores/keys to clear on reset (except questions store)
export const RESETTABLE_INDEXEDDB_STORES = [
  'sessionPool',
  'usedQuestions', 
  // 'quizSessions', // Keep history
];

// Apply all default settings to IndexedDB-backed browser storage
export const applyAllDefaults = async (): Promise<void> => {
  const settings = DEFAULT_QUIZ_SETTINGS;
  const branding = DEFAULT_BRANDING;
  
  await writeMirroredAdminSettings({
    teamConfigs: getDefaultTeamConfigs(),
    episodeNumber: settings.episodeNumber,
    correctAnswerScore: settings.correctAnswerScore,
    wrongAnswerPenalty: settings.wrongAnswerPenalty,
    lifelinePenalty: settings.lifelinePenalty,
    timerDuration: settings.timerDuration,
    masterTimerDuration: settings.masterTimerDuration,
    passedQuestionTimer: settings.passedQuestionTimer,
    revealCountdownDuration: settings.revealCountdownDuration,
    rapidFireDuration: settings.rapidFireDuration,
    showActivityFeed: settings.showActivityFeed,
    showDifficultyBadge: settings.showDifficultyBadge,
    showSaveIndicator: settings.showSaveIndicator,
    showToastMessages: settings.showToastMessages,
    showIntroAnimation: settings.showIntroAnimation,
    youtubeIntegrationEnabled: settings.youtubeIntegrationEnabled,
    disableLivePanelDuringPowerplay: settings.disableLivePanelDuringPowerplay,
    showYouTubeAutoPostPanel: settings.showYouTubeAutoPostPanel,
    showEngagementHeatmap: settings.showEngagementHeatmap,
    showViewerPredictions: settings.showViewerPredictions,
    maskViewerResponses: settings.maskViewerResponses,
    powerplayEnabled: settings.powerplayEnabled,
    tickerEnabled: settings.tickerEnabled,
    tickerMessageRegular: settings.tickerMessageRegular,
    tickerMessagePowerplay: settings.tickerMessagePowerplay,
    questionsPerCategory: settings.questionsPerCategory,
    maxUsedCountThreshold: settings.maxUsedCountThreshold,
    questionImportMergeMode: settings.questionImportMergeMode,
    shuffleQuestions: settings.shuffleQuestions,
    teamLifelines: settings.teamLifelines,
    tvModeEnabled: settings.tvModeEnabled,
    fixedLeaderboard: settings.fixedLeaderboard,
    showSequenceNumbers: settings.showSequenceNumbers,
    minimumCorrectScore: settings.minimumCorrectScore,
    quizAnalyticsEnabled: settings.quizAnalyticsEnabled,
    quizBranding: branding,
  });
  
  // Apply language
  localStorage.setItem('appLanguage', DEFAULT_LANGUAGE);

  // App mode + SSE defaults
  localStorage.setItem('appOperationMode', 'frontend_scoring');
  localStorage.setItem('sseStreamEnabled', 'true');
  localStorage.setItem('sseStreamServerUrl', DEFAULT_SSE_STREAM_URL);
  
  // Dispatch events to notify components
  window.dispatchEvent(new Event('settingsReset'));
  window.dispatchEvent(new Event('tvModeChanged'));
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: DEFAULT_LANGUAGE }));
};

// Clear IndexedDB stores that should be reset.
export const clearResettableIndexedDB = async (): Promise<void> => {
  await clearMirroredAdminSettings();
  clearStoredQuizRunConfigs();
};

// Clear all cookies except quizdb-related ones
const clearAllCookies = (): void => {
  if (typeof document === 'undefined') return;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const name = cookie.split('=')[0].trim();
    // Preserve quizdb-related cookies
    if (name.toLowerCase().includes('quizdb')) continue;
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${name}=; path=/; max-age=0; domain=${window.location.hostname}; SameSite=Lax`;
  }
};

// Full reset function - clears everything and applies defaults
export const performFullReset = async (): Promise<void> => {
  // Clear all cookies except quizdb
  clearAllCookies();

  // Clear resettable localStorage keys
  RESETTABLE_LOCALSTORAGE_KEYS.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear resettable IndexedDB stores
  await clearResettableIndexedDB();
  
  // Clear session storage
  sessionStorage.clear();
  
  // Apply all defaults
  await applyAllDefaults();
  
  // Clear YouTube leaderboard
  try {
    clearYouTubeLeaderboard();
  } catch (e) {
    console.warn('Failed to clear YouTube leaderboard:', e);
  }
  
  // Clear session questions
  try {
    clearSessionQuestions();
  } catch (e) {
    console.warn('Failed to clear session questions:', e);
  }
  
  // Abort orphaned sessions (no-op: IndexedDB sessions removed)
  try {
    // Sessions are now managed via sessionStorage and backend
  } catch (e) {
    console.warn('Failed to abort orphaned sessions:', e);
  }
};
