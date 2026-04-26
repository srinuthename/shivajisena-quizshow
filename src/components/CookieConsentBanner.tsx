import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Cookie, ChevronDown, ChevronUp } from "lucide-react";
import { getCookieConsentStatus, setCookieConsentStatus, CookieConsentStatus } from "@/lib/cookieConsent";

const CookieConsentBanner = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsentStatus() === null);
  }, []);

  const handleConsent = (status: CookieConsentStatus) => {
    setCookieConsentStatus(status);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div ref={ref} className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <Card className="max-w-3xl mx-auto border-primary/20 bg-card/98 shadow-2xl backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-secondary" />

        <div className="p-5 md:p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Cookie className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground mb-1">Cookie Preferences</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use cookies to ensure essential site functionality and improve your experience.
                You can choose which cookies to allow below.
              </p>
            </div>
          </div>

          {/* Expandable details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium mb-4 transition-colors"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showDetails ? "Hide details" : "Show cookie details"}
          </button>

          {showDetails && (
            <div className="mb-4 space-y-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">Mandatory (Always Active):</span>{" "}
                  Essential for site operation — language preference, branding/theme, session management.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Cookie className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">Analytics:</span>{" "}
                  Google Analytics to understand usage patterns and improve the experience.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Cookie className="w-3.5 h-3.5 text-secondary mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">Marketing:</span>{" "}
                  Third-party cookies for personalized content and advertising.
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => handleConsent("accepted")}
              className="font-semibold"
            >
              Accept All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConsent("mandatory")}
              className="border-primary/30 hover:bg-primary/10"
            >
              Mandatory Only
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleConsent("rejected")}
              className="text-muted-foreground hover:text-foreground"
            >
              Reject All
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/60 mt-3">
            By using this site, you agree to our cookie policy. You can change preferences anytime from settings.
          </p>
        </div>
      </Card>
    </div>
  );
});
CookieConsentBanner.displayName = "CookieConsentBanner";

export default CookieConsentBanner;
