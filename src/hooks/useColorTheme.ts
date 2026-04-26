import { useState, useEffect, useCallback } from 'react';
import { COLOR_THEMES, ColorTheme, DEFAULT_THEME_ID, getThemeById, getDefaultTheme } from '@/config/colorThemes';
import { getMandatoryCookie, setMandatoryCookie } from '@/lib/mandatoryCookies';

const STORAGE_KEY = 'quizColorTheme';

// Apply theme CSS variables to document root
const applyTheme = (theme: ColorTheme): void => {
  const root = document.documentElement;
  
  // Apply all color variables using setProperty for proper priority
  const setVar = (name: string, value: string) => {
    root.style.setProperty(name, value, 'important');
  };
  
  setVar('--background', theme.colors.background);
  setVar('--foreground', theme.colors.foreground);
  setVar('--card', theme.colors.card);
  setVar('--card-foreground', theme.colors.cardForeground);
  setVar('--popover', theme.colors.popover);
  setVar('--popover-foreground', theme.colors.popoverForeground);
  setVar('--primary', theme.colors.primary);
  setVar('--primary-foreground', theme.colors.primaryForeground);
  setVar('--secondary', theme.colors.secondary);
  setVar('--secondary-foreground', theme.colors.secondaryForeground);
  setVar('--muted', theme.colors.muted);
  setVar('--muted-foreground', theme.colors.mutedForeground);
  setVar('--accent', theme.colors.accent);
  setVar('--accent-foreground', theme.colors.accentForeground);
  setVar('--destructive', theme.colors.destructive);
  setVar('--destructive-foreground', theme.colors.destructiveForeground);
  setVar('--border', theme.colors.border);
  setVar('--input', theme.colors.input);
  setVar('--ring', theme.colors.ring);
  
  // Energy/decorative colors
  setVar('--energy-yellow', theme.colors.energyYellow);
  setVar('--energy-red', theme.colors.energyRed);
  setVar('--energy-orange', theme.colors.energyOrange);
  setVar('--energy-glow', theme.colors.energyGlow);
  
  // Button gradients
  setVar('--btn-primary-from', theme.colors.btnPrimaryFrom);
  setVar('--btn-primary-to', theme.colors.btnPrimaryTo);
  
  // Dispatch custom event for other components to know theme changed
  window.dispatchEvent(new CustomEvent('colorThemeChanged', { detail: theme }));
};

// Clear inline styles (reset to CSS defaults)
const clearThemeStyles = (): void => {
  const root = document.documentElement;
  const vars = [
    '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
    '--border', '--input', '--ring', '--energy-yellow', '--energy-red',
    '--energy-orange', '--energy-glow', '--btn-primary-from', '--btn-primary-to'
  ];
  vars.forEach(v => root.style.removeProperty(v));
};

// Get saved theme ID from localStorage
const getSavedThemeId = (): string => {
  try {
    const cookieTheme = getMandatoryCookie('mandatory_color_theme');
    if (cookieTheme && getThemeById(cookieTheme)) {
      return cookieTheme;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && getThemeById(saved)) {
      setMandatoryCookie('mandatory_color_theme', saved);
      return saved;
    }
  } catch (e) {
    console.error('Failed to read theme from localStorage:', e);
  }
  return DEFAULT_THEME_ID;
};

// Save theme ID to localStorage
const saveThemeId = (themeId: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
    setMandatoryCookie('mandatory_color_theme', themeId);
  } catch (e) {
    console.error('Failed to save theme to localStorage:', e);
  }
};

export interface UseColorThemeReturn {
  activeTheme: ColorTheme;
  activeThemeId: string;
  themes: ColorTheme[];
  setTheme: (themeId: string) => void;
  resetToDefault: () => void;
}

// Initialize theme on first load (runs once before React renders)
let initialized = false;
const initTheme = () => {
  if (initialized) return;
  initialized = true;
  const themeId = getSavedThemeId();
  const theme = getThemeById(themeId) || getDefaultTheme();
  applyTheme(theme);
};

// Run initialization immediately
initTheme();

export const useColorTheme = (): UseColorThemeReturn => {
  const [activeThemeId, setActiveThemeId] = useState<string>(() => getSavedThemeId());
  
  const activeTheme = getThemeById(activeThemeId) || getDefaultTheme();

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  // Listen for changes from other tabs AND same-tab custom event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newTheme = getThemeById(e.newValue);
        if (newTheme) {
          setActiveThemeId(e.newValue);
          applyTheme(newTheme);
        }
      }
    };

    // Listen for same-tab theme changes via custom event
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ColorTheme>;
      if (customEvent.detail) {
        setActiveThemeId(customEvent.detail.id);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('colorThemeChanged', handleThemeChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('colorThemeChanged', handleThemeChange);
    };
  }, []);

  const setTheme = useCallback((themeId: string) => {
    const theme = getThemeById(themeId);
    if (theme) {
      setActiveThemeId(themeId);
      saveThemeId(themeId);
      applyTheme(theme);
    }
  }, []);

  const resetToDefault = useCallback(() => {
    clearThemeStyles();
    setActiveThemeId(DEFAULT_THEME_ID);
    saveThemeId(DEFAULT_THEME_ID);
    const theme = getDefaultTheme();
    applyTheme(theme);
  }, []);

  return {
    activeTheme,
    activeThemeId,
    themes: COLOR_THEMES,
    setTheme,
    resetToDefault,
  };
};
