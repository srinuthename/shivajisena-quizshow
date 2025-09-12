import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'te';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Biblical characters
    'Lot': 'Lot',
    'Judah': 'Judah', 
    'Tamar': 'Tamar',
    'Amnon': 'Amnon',
    'Reuben': 'Reuben',
    'Jacob': 'Jacob',
    'Bilhah': 'Bilhah',
    'Absalom': 'Absalom',
    'David': 'David',
    'Bathsheba': 'Bathsheba',
    
    // Host controls
    'Start Game': 'Start Game',
    'Lock Answer': 'Lock Answer',
    'Resume Timer': 'Resume Timer',
    'Pause Timer': 'Pause Timer',
    'Fetch Viewer Votes': 'Fetch Viewer Votes',
    'Allow Answer Change': 'Allow Answer Change',
    'Reveal Answer': 'Reveal Answer',
    'Next Question': 'Next Question',
    'Display Results': 'Display Results',
    'Host Controls': 'Host Controls',
    'Current Phase:': 'Current Phase:',
    
    // Language toggle
    'Language': 'Language',
    'English': 'English',
    'Telugu': 'Telugu'
  },
  te: {
    // Biblical characters in Telugu
    'Lot': 'లోతు',
    'Judah': 'యూదా', 
    'Tamar': 'తామారు',
    'Amnon': 'అమ్నోను',
    'Reuben': 'రూబేను',
    'Jacob': 'యాకోబు',
    'Bilhah': 'బిల్హా',
    'Absalom': 'అబ్షాలోమ్',
    'David': 'దావీదు',
    'Bathsheba': 'బత్షేబ',
    
    // Host controls in Telugu
    'Start Game': 'ఆట ప్రారంభించు',
    'Lock Answer': 'జవాబు లాక్ చేయి',
    'Resume Timer': 'టైమర్ కొనసాగించు',
    'Pause Timer': 'టైమర్ ఆపు',
    'Fetch Viewer Votes': 'వీక్షకుల ఓట్లు తీసుకోవాలి',
    'Allow Answer Change': 'జవాబు మార్చడానికి అనుమతించు', 
    'Reveal Answer': 'సమాధానం చూపించు',
    'Next Question': 'తదుపరి ప్రశ్న',
    'Display Results': 'ఫలితాలు చూపించు',
    'Host Controls': 'హోస్ట్ నియంత్రణలు',
    'Current Phase:': 'ప్రస్తుత దశ:',
    
    // Language toggle
    'Language': 'భాష',
    'English': 'ఆంగ్లం',
    'Telugu': 'తెలుగు'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'te' : 'en');
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}