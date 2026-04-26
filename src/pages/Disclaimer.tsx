import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Disclaimer: React.FC = () => {
  return (
    <div className="min-h-screen p-4 md:p-8 relative z-10 bg-gradient-to-b from-background via-background to-muted/20">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <Card className="border-destructive/30 bg-card/95">
          <CardContent className="p-6 md:p-10 space-y-5">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <ShieldAlert className="h-9 w-9 text-destructive" aria-hidden="true" />
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Disclaimer</h1>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              This software is provided on an <strong>"as-is"</strong> basis without warranties of any kind,
              express or implied — including but not limited to the warranties of merchantability, fitness for a
              particular purpose, and non-infringement.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Live-streaming integrations, scoring, leaderboards, prize workflows, and analytics depend on
              third-party services (YouTube, OAuth providers, network infrastructure, hosting) which may be
              unavailable, delayed, rate-limited, or inaccurate at any time. We make no guarantees regarding
              uptime, data accuracy, or the completion of any quiz session.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong>Use at your own risk.</strong> ThinMonk EduTech and its contributors will not be
              responsible for any direct, indirect, incidental, consequential, or punitive loss — including but
              not limited to loss of data, viewers, revenue, prizes, opportunities, or reputation — arising out
              of the use of, or inability to use, this platform.
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              You are solely responsible for compliance with applicable laws (including broadcast, gaming, and
              data-protection regulations) in your jurisdiction when using this platform.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Disclaimer;
