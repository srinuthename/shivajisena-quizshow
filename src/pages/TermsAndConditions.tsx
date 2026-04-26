import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const TermsAndConditions: React.FC = () => {
  return (
    <div className="min-h-screen p-4 md:p-8 relative z-10 bg-gradient-to-b from-background via-background to-muted/20">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <Card className="border-accent/30 bg-card/95">
          <CardContent className="p-6 md:p-10 space-y-5">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <FileText className="h-9 w-9 text-accent" aria-hidden="true" />
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Terms &amp; Conditions</h1>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              By signing in to or otherwise using this platform you acknowledge and agree to the following terms.
              Continued use of the software constitutes your <strong>full and unconditional acceptance</strong>{" "}
              of these terms.
            </p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Data we capture from your live chat</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              While you host a quiz, we capture and store <strong>publicly visible YouTube live chat data</strong>
              {" "}from your stream — including chat messages, author display names, channel IDs, channel
              thumbnails, and timestamps — for the purposes of quiz scoring, leaderboards, analytics, debugging,
              and product improvement.
            </p>

            <h2 className="text-lg font-semibold text-foreground pt-2">No sale or distribution</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We do <strong>not sell, rent, or distribute</strong> this data to third parties. Aggregate,
              anonymized analytics may be used internally to improve the product.
            </p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Opt-out & deletion requests</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Viewers and hosts may request opt-out at any later date by contacting the administrator at{" "}
              <a href="mailto:support@thinmonk.com" className="text-primary hover:underline">
                support@thinmonk.com
              </a>
              . Please note that <strong>full deletion is not guaranteed</strong> — backups, derived statistics,
              and aggregate analytics may persist after individual record removal, and some records may be
              retained as required by law.
            </p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Acceptable use</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You agree not to misuse the platform — including circumventing access controls, attempting to
              extract other users' data, running automated abuse, or violating YouTube's Terms of Service while
              using this product.
            </p>

            <h2 className="text-lg font-semibold text-foreground pt-2">Changes to these terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Material changes will be reflected on this page.
              Continued use after a change constitutes acceptance of the updated terms.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;
