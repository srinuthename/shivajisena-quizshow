// Main Translation Manager
// Combines all language translations and provides utility functions

import { Language, TranslationStrings } from './types';
import { en } from './en';
import { te } from './te';
import { getMandatoryCookie, setMandatoryCookie } from '@/lib/mandatoryCookies';

export const translations: Record<Language, TranslationStrings> = {
  en,
  te,
};

// Default language
export const DEFAULT_LANGUAGE: Language = 'en';

// Get current language from localStorage
export const getCurrentLanguage = (): Language => {
  const cookieLang = getMandatoryCookie('mandatory_language');
  if (cookieLang === 'te' || cookieLang === 'en') {
    return cookieLang;
  }
  const saved = localStorage.getItem('appLanguage');
  if (saved === 'te' || saved === 'en') {
    setMandatoryCookie('mandatory_language', saved);
    return saved;
  }
  return DEFAULT_LANGUAGE;
};

// Set current language to localStorage
export const setCurrentLanguage = (lang: Language): void => {
  localStorage.setItem('appLanguage', lang);
  setMandatoryCookie('mandatory_language', lang);
  // Dispatch event for components to react
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
};

// Get translation string
export const t = (key: keyof TranslationStrings): string => {
  const lang = getCurrentLanguage();
  const value = translations[lang][key];
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return value;
};

// Get translation with interpolation
export const tFormat = (key: keyof TranslationStrings, ...args: (string | number)[]): string => {
  let text = t(key);
  args.forEach((arg, index) => {
    text = text.replace(`{${index}}`, String(arg));
  });
  return text;
};

// Get team names for current language
export const getTeamNames = (): string[] => {
  const lang = getCurrentLanguage();
  return translations[lang].teamNames;
};

// Re-export types
export type { Language, TranslationStrings };
