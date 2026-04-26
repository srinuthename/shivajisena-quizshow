import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCookieConsentStatus, setCookieConsentStatus } from "@/lib/cookieConsent";

const scriptId = "ga-script";
const setupId = "ga-setup";

const injectGoogleAnalytics = (measurementId: string) => {
  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }

  if (!document.getElementById(setupId)) {
    const setup = document.createElement("script");
    setup.id = setupId;
    setup.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', '${measurementId}', { send_page_view: false });
    `;
    document.head.appendChild(setup);
  }
};

export const AnalyticsManager = () => {
  const location = useLocation();
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const shouldTrack = location.pathname !== "/" && location.pathname !== "/auth/callback";

  useEffect(() => {
    if (!measurementId || !shouldTrack) return;
    if (getCookieConsentStatus() === null) {
      setCookieConsentStatus("accepted");
    }
    injectGoogleAnalytics(measurementId);
  }, [measurementId, shouldTrack]);

  useEffect(() => {
    if (!measurementId || !shouldTrack) return;
    if (typeof window.gtag !== "function") return;

    window.gtag("config", measurementId, {
      page_path: `${location.pathname}${location.search}`,
    });
  }, [location.pathname, location.search, measurementId, shouldTrack]);

  return null;
};

export default AnalyticsManager;
