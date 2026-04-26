// Translation system for Quiz Application
// Centralized exports for multi-language support

export { 
  translations, 
  DEFAULT_LANGUAGE, 
  getCurrentLanguage, 
  setCurrentLanguage, 
  t, 
  tFormat, 
  getTeamNames 
} from './translations';

export type { Language, TranslationStrings } from './types';
