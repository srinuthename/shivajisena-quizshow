// Translation hook for React components
import { useState, useEffect, useCallback } from 'react';
import { 
  Language, 
  TranslationStrings, 
  translations, 
  getCurrentLanguage, 
  setCurrentLanguage,
  getTeamNames 
} from '@/config/translations';

export interface UseTranslationReturn {
  language: Language;
  t: TranslationStrings;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  teamNames: string[];
}

export const useTranslation = (): UseTranslationReturn => {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage);
  
  // Listen for language changes from other components
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<Language>) => {
      setLanguageState(event.detail);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);
  
  const setLanguage = useCallback((lang: Language) => {
    setCurrentLanguage(lang);
    setLanguageState(lang);
  }, []);
  
  const toggleLanguage = useCallback(() => {
    const newLang = language === 'te' ? 'en' : 'te';
    setLanguage(newLang);
  }, [language, setLanguage]);
  
  return {
    language,
    t: translations[language],
    setLanguage,
    toggleLanguage,
    teamNames: getTeamNames(),
  };
};
