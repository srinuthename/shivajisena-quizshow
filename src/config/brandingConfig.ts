// Branding Configuration - Multi-tenant quiz game customization
// Uses IndexedDB-backed admin settings storage

import { getMandatoryCookie, setMandatoryCookie } from '@/lib/mandatoryCookies';
import { readQuizHostChannel } from '@/lib/quizHostChannel';
import { readMirroredAdminSetting, readMirroredAdminSettingSync, writeMirroredAdminSetting } from '@/lib/adminConfigPersistence';

export interface BrandingConfig {
  showTitle: string;           // Main quiz show title
  logoUrl: string;             // URL or base64 data URL for logo
  channelName: string;         // Channel/organization name (mandatory)
  episodePrefix: string;       // "Episode", "Show", "#", etc.
  episodeNumber: string;       // Current episode number
  quizName: string;            // Current quiz name (renamed from topicName)
  partnerLogos: string[];      // Array of partner logo URLs for slideshow
}

// Import the default logo
import defaultLogo from '@/assets/monk-mascot.png';

export const DEFAULT_BRANDING: BrandingConfig = {
  showTitle: 'Quiz Show',
  logoUrl: '',  // Empty means use default asset
  channelName: import.meta.env.VITE_DEFAULT_BRAND_NAME || 'YT Live Quiz',  // Default channel name
  episodePrefix: 'Episode',
  episodeNumber: '1',
  quizName: 'General Knowledge',
  partnerLogos: [],  // Empty - no default partner logos
};

// Export default logo for components to use
export const getDefaultLogo = () => defaultLogo;

// Generate page title from branding config
export const generatePageTitle = (branding: BrandingConfig): string => {
  const parts: string[] = [];
  
  if (branding.channelName) {
    parts.push(branding.channelName);
  }
  
  if (branding.showTitle) {
    parts.push(branding.showTitle);
  }
  
  if (branding.episodePrefix && branding.episodeNumber) {
    parts.push(`${branding.episodePrefix} #${branding.episodeNumber}`);
  } else if (branding.episodeNumber) {
    parts.push(`#${branding.episodeNumber}`);
  }
  
  return parts.join(' ') || 'Quiz Show';
};

const BRANDING_KEY = 'quizBranding';

const resolvePreferredChannelName = () => {
  const hostChannelTitle = String(readQuizHostChannel().quizHostChannelTitle || '').trim();
  return hostChannelTitle || DEFAULT_BRANDING.channelName || 'YT Live Quiz';
};

const normalizeBranding = (value: Partial<BrandingConfig> | null | undefined): BrandingConfig => {
  const merged = { ...DEFAULT_BRANDING, ...(value || {}) };
  const savedChannelName = String(merged.channelName || '').trim();
  const preferredChannelName = resolvePreferredChannelName();
  return {
    ...merged,
    channelName:
      !savedChannelName || savedChannelName === DEFAULT_BRANDING.channelName
        ? preferredChannelName
        : savedChannelName,
  };
};

// Get branding from IndexedDB-backed admin settings
export const getBranding = async (): Promise<BrandingConfig> => {
  try {
    return normalizeBranding(await readMirroredAdminSetting<BrandingConfig>('quizBranding', DEFAULT_BRANDING));
  } catch (e) {
    console.error('Failed to read branding from IndexedDB settings:', e);
  }
  return normalizeBranding(DEFAULT_BRANDING);
};

// Synchronous get for initial state
export const getBrandingSync = (): BrandingConfig => {
  try {
    const cookieChannelName = getMandatoryCookie('mandatory_channel_name');
    const cookieLogoUrl = getMandatoryCookie('mandatory_logo_url');
    if (cookieChannelName || cookieLogoUrl) {
      return normalizeBranding({
        ...DEFAULT_BRANDING,
        channelName: cookieChannelName || DEFAULT_BRANDING.channelName,
        logoUrl: cookieLogoUrl || DEFAULT_BRANDING.logoUrl,
      });
    }
    const parsed = normalizeBranding(readMirroredAdminSettingSync<BrandingConfig>('quizBranding', DEFAULT_BRANDING));
    setMandatoryCookie('mandatory_channel_name', parsed.channelName || DEFAULT_BRANDING.channelName);
    const cookieLogo = parsed.logoUrl && parsed.logoUrl.length <= 1800 ? parsed.logoUrl : "";
    setMandatoryCookie('mandatory_logo_url', cookieLogo);
    return parsed;
  } catch (e) {
    console.error('Failed to read branding from IndexedDB settings:', e);
  }
  return normalizeBranding(DEFAULT_BRANDING);
};

// Save branding to IndexedDB-backed admin settings store
export const saveBranding = async (config: BrandingConfig): Promise<void> => {
  const normalizedConfig = normalizeBranding(config);
  try {
    await writeMirroredAdminSetting('quizBranding', normalizedConfig);
    setMandatoryCookie('mandatory_channel_name', normalizedConfig.channelName || DEFAULT_BRANDING.channelName);
    const cookieLogo = normalizedConfig.logoUrl && normalizedConfig.logoUrl.length <= 1800 ? normalizedConfig.logoUrl : "";
    setMandatoryCookie('mandatory_logo_url', cookieLogo);
  } catch (e) {
    console.error('Failed to save branding to IndexedDB settings:', e);
  }
};

// Episode prefix options for dropdown
export const EPISODE_PREFIX_OPTIONS = [
  { value: 'Episode', label: 'Episode' },
  { value: 'Show', label: 'Show' },
  { value: '#', label: '#' },
  { value: 'Part', label: 'Part' },
  { value: 'Round', label: 'Round' },
  { value: '', label: '(None)' },
];

// Convert file to base64 data URL
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
