import { useEffect } from 'react';
import { useBranding } from './useBranding';

/**
 * Hook to set the document title based on branding configuration
 * Format: <channel name> <Show title> <Episode Prefix> #<Episode Number>
 */
export const usePageTitle = () => {
  const { pageTitle } = useBranding();

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  return pageTitle;
};
