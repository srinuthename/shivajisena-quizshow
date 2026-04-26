/**
 * Boot-time admin config hydration.
 *
 * Reads the host's saved admin workspace config from IndexedDB-backed browser
 * storage and warms the in-memory cache so every page (TeamQuiz, QuizMirror,
 * YouTubeLivePanel, ...) sees the host's settings on a fresh route mount.
 *
 * The Admin page still owns the editing UI; this helper keeps the rest of
 * the app in sync with whatever the host saved last.
 */

import { ADMIN_SETTINGS_UPDATED_EVENT, hydrateMirroredAdminSettings } from '@/lib/adminConfigPersistence';

let _hydrated = false;

/**
 * Hydrate localStorage from the backend admin config for the current host.
 * Idempotent per channel — safe to call on every mount.
 */
export const hydrateAdminConfigFromBackend = async (
  applicationId: string | null
): Promise<boolean> => {
  if (!applicationId) return false;
  if (_hydrated) return false;

  try {
    await hydrateMirroredAdminSettings();
    _hydrated = true;
    try {
      window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_UPDATED_EVENT, { detail: { hydrated: true } }));
    } catch {
      // ignore
    }
    return true;
  } catch {
    _hydrated = false;
    return false;
  }
};

export const resetAdminConfigHydrationGate = (): void => {
  _hydrated = false;
};
