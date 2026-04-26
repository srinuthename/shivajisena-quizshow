export type CookieConsentStatus = "accepted" | "mandatory" | "rejected";

const COOKIE_CONSENT_KEY = "cookieConsentStatus";

export const getCookieConsentStatus = (): CookieConsentStatus | null => {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === "accepted" || value === "mandatory" || value === "rejected") return value;
    return null;
  } catch {
    return null;
  }
};

export const setCookieConsentStatus = (status: CookieConsentStatus): void => {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, status);
    window.dispatchEvent(new CustomEvent("cookieConsentChanged", { detail: status }));
  } catch {
    // no-op
  }
};
