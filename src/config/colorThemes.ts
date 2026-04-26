// Color Theme System - Multi-tenant quiz game color palettes

export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    // Core colors (HSL values without 'hsl()' wrapper)
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
    // Energy/decorative colors
    energyYellow: string;
    energyRed: string;
    energyOrange: string;
    energyGlow: string;
    // Button gradients
    btnPrimaryFrom: string;
    btnPrimaryTo: string;
  };
  // Preview colors for theme selector (hex for display)
  preview: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'royal-saffron',
    name: 'Royal Saffron',
    description: 'Traditional gold and maroon - warm and regal',
    colors: {
      background: '15 18% 8%',
      foreground: '45 90% 96%',
      card: '12 20% 12%',
      cardForeground: '45 90% 96%',
      popover: '10 22% 10%',
      popoverForeground: '45 85% 94%',
      primary: '42 92% 52%',
      primaryForeground: '15 25% 8%',
      secondary: '0 55% 22%',
      secondaryForeground: '45 100% 97%',
      muted: '12 15% 18%',
      mutedForeground: '40 35% 65%',
      accent: '25 90% 48%',
      accentForeground: '15 25% 8%',
      destructive: '0 75% 48%',
      destructiveForeground: '45 100% 96%',
      border: '15 18% 24%',
      input: '12 18% 14%',
      ring: '42 92% 52%',
      energyYellow: '42 92% 52%',
      energyRed: '0 68% 38%',
      energyOrange: '25 90% 48%',
      energyGlow: '42 100% 62%',
      btnPrimaryFrom: '42 92% 48%',
      btnPrimaryTo: '25 88% 48%',
    },
    preview: {
      primary: '#f59e0b',
      secondary: '#7c2d12',
      accent: '#ea580c',
    },
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Cool cyan and navy - modern and tech-forward',
    colors: {
      background: '210 25% 8%',
      foreground: '200 90% 96%',
      card: '215 22% 12%',
      cardForeground: '200 90% 96%',
      popover: '212 25% 10%',
      popoverForeground: '200 85% 94%',
      primary: '195 85% 50%',
      primaryForeground: '210 30% 8%',
      secondary: '220 60% 25%',
      secondaryForeground: '200 100% 97%',
      muted: '215 18% 18%',
      mutedForeground: '200 35% 65%',
      accent: '175 80% 45%',
      accentForeground: '210 30% 8%',
      destructive: '0 75% 48%',
      destructiveForeground: '200 100% 96%',
      border: '215 20% 24%',
      input: '215 20% 14%',
      ring: '195 85% 50%',
      energyYellow: '195 85% 50%',
      energyRed: '220 60% 40%',
      energyOrange: '175 80% 45%',
      energyGlow: '195 100% 62%',
      btnPrimaryFrom: '195 85% 45%',
      btnPrimaryTo: '175 80% 45%',
    },
    preview: {
      primary: '#0ea5e9',
      secondary: '#1e3a5f',
      accent: '#14b8a6',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural emerald and earth tones - organic and fresh',
    colors: {
      background: '150 20% 7%',
      foreground: '140 80% 96%',
      card: '155 18% 11%',
      cardForeground: '140 80% 96%',
      popover: '152 22% 9%',
      popoverForeground: '140 75% 94%',
      primary: '145 75% 45%',
      primaryForeground: '150 30% 8%',
      secondary: '160 50% 20%',
      secondaryForeground: '140 100% 97%',
      muted: '155 15% 16%',
      mutedForeground: '140 30% 60%',
      accent: '85 70% 50%',
      accentForeground: '150 30% 8%',
      destructive: '0 75% 48%',
      destructiveForeground: '140 100% 96%',
      border: '155 18% 22%',
      input: '155 18% 13%',
      ring: '145 75% 45%',
      energyYellow: '85 70% 50%',
      energyRed: '160 50% 35%',
      energyOrange: '145 75% 45%',
      energyGlow: '145 90% 55%',
      btnPrimaryFrom: '145 75% 40%',
      btnPrimaryTo: '85 70% 45%',
    },
    preview: {
      primary: '#22c55e',
      secondary: '#14532d',
      accent: '#84cc16',
    },
  },
  {
    id: 'purple-royalty',
    name: 'Purple Royalty',
    description: 'Luxurious purple and gold - premium and elegant',
    colors: {
      background: '270 20% 8%',
      foreground: '280 80% 96%',
      card: '275 22% 12%',
      cardForeground: '280 80% 96%',
      popover: '272 25% 10%',
      popoverForeground: '280 75% 94%',
      primary: '270 75% 55%',
      primaryForeground: '270 30% 98%',
      secondary: '45 85% 50%',
      secondaryForeground: '270 30% 10%',
      muted: '275 15% 18%',
      mutedForeground: '280 30% 65%',
      accent: '315 70% 50%',
      accentForeground: '270 30% 98%',
      destructive: '0 75% 48%',
      destructiveForeground: '280 100% 96%',
      border: '275 18% 24%',
      input: '275 18% 14%',
      ring: '270 75% 55%',
      energyYellow: '45 85% 50%',
      energyRed: '315 70% 50%',
      energyOrange: '270 75% 55%',
      energyGlow: '270 90% 65%',
      btnPrimaryFrom: '270 75% 50%',
      btnPrimaryTo: '315 70% 50%',
    },
    preview: {
      primary: '#a855f7',
      secondary: '#eab308',
      accent: '#ec4899',
    },
  },
];

export const DEFAULT_THEME_ID =import.meta.env.VITE_DEFAULT_BRAND_THEME_COLOR || 'royal-saffron';

export const getThemeById = (id: string): ColorTheme | undefined => {
  return COLOR_THEMES.find(theme => theme.id === id);
};

export const getDefaultTheme = (): ColorTheme => {
  return COLOR_THEMES.find(theme => theme.id === DEFAULT_THEME_ID) || COLOR_THEMES[0];
};
