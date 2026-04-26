import { useState, useEffect, useCallback } from 'react';
import { BrandingConfig, DEFAULT_BRANDING, getBranding, getBrandingSync, saveBranding, generatePageTitle } from '@/config/brandingConfig';
import { QUIZ_HOST_CHANNEL_UPDATED_EVENT } from '@/lib/quizHostChannel';
import { ADMIN_SETTINGS_UPDATED_EVENT } from '@/lib/adminConfigPersistence';

export interface UseBrandingReturn {
  branding: BrandingConfig;
  updateBranding: (config: Partial<BrandingConfig>) => void;
  resetBranding: () => void;
  pageTitle: string;
  isLoading: boolean;
}

export const useBranding = (loadFromBackend: boolean = true): UseBrandingReturn => {
  // Start with sync read for immediate local defaults / saved branding.
  const [branding, setBranding] = useState<BrandingConfig>(() => getBrandingSync());
  const [isLoading, setIsLoading] = useState(loadFromBackend);

  // Listen for changes from other tabs and custom events
  // Also load from backend if needed (for quiz start/spectator views)
  useEffect(() => {
    const loadPersistedBranding = async () => {
      try {
        setBranding(await getBranding());
      } catch (err) {
        console.warn('Failed to load branding from IndexedDB settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (loadFromBackend) {
      void loadPersistedBranding();
    } else {
      setIsLoading(false);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quizBranding' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setBranding({ ...DEFAULT_BRANDING, ...parsed });
        } catch (err) {
          console.error('Failed to parse branding from storage event:', err);
        }
      }
    };

    // Also listen to custom event for same-tab updates
    const handleBrandingChange = async () => {
      const saved = await getBranding();
      setBranding(saved);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('brandingUpdated', handleBrandingChange);
    window.addEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleBrandingChange);
    window.addEventListener(QUIZ_HOST_CHANNEL_UPDATED_EVENT, handleBrandingChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('brandingUpdated', handleBrandingChange);
      window.removeEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleBrandingChange);
      window.removeEventListener(QUIZ_HOST_CHANNEL_UPDATED_EVENT, handleBrandingChange);
    };
  }, [loadFromBackend]);

  const updateBranding = useCallback((config: Partial<BrandingConfig>) => {
    setBranding(prev => {
      const updated = { ...prev, ...config };
      // Save async to IndexedDB-backed settings store
      saveBranding(updated).then(() => {
        // Dispatch custom event for same-tab listeners
        window.dispatchEvent(new Event('brandingUpdated'));
      }).catch(err => {
        console.error('Failed to save branding locally:', err);
      });
      return updated;
    });
  }, []);

  const resetBranding = useCallback(() => {
    setBranding(DEFAULT_BRANDING);
    saveBranding(DEFAULT_BRANDING).then(() => {
      // Dispatch custom event for same-tab listeners
      window.dispatchEvent(new Event('brandingUpdated'));
    }).catch(err => {
      console.error('Failed to reset branding:', err);
    });
  }, []);

  const pageTitle = generatePageTitle(branding);

  return {
    branding,
    updateBranding,
    resetBranding,
    pageTitle,
    isLoading,
  };
};
