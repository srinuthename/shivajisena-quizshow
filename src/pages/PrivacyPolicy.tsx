import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen p-4 md:p-8 relative z-10 bg-gradient-to-b from-background via-background to-muted/20">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <Card className="border-primary/30 bg-card/95">
          <CardContent className="p-6 md:p-10 space-y-5">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Lock className="h-9 w-9 text-primary" aria-hidden="true" />
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Privacy Policy</h1>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              We respect your privacy. This policy explains what information we collect when you use the
              platform, how we use it, and the controls you have.
            </p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Information we collect from Google</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you sign in with Google we receive your <strong>email address and display name</strong>{" "}
              directly from Google. Any additional profile details we use — such as your{" "}
              <strong>YouTube channel title, channel ID, channel handle, channel thumbnail, and profile
              picture</strong> — are obtained from YouTube's public APIs using the access you grant during
              sign-in. We do not request any private content scopes.
            </p>

            <h2 className="text-lg font-semibold text-foreground pt-2">How we use your information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use this information solely to operate the quiz host experience: authenticating your session,
              displaying your identity in the app, binding the quizzes you create to your account, and routing
              live-chat ingestion to your channel. We do <strong>not</strong> share, sell, or rent your personal
              information to third parties.
            </p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Cookies & local storage</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cookies and browser storage are used for session persistence (keeping you logged in), product
              configuration, and — with your consent — Google Analytics for product improvement. You may revoke
              analytics consent at any time via the cookie banner.
            </p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For privacy questions or data requests, contact{" "}
              <a href="mailto:support@thinmonk.com" className="text-primary hover:underline">
                support@thinmonk.com
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
