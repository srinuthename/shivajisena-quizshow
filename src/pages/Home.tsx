import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import kiwiMascot from "@/assets/monk-mascot.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthContext";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  Sparkles, PlayCircle, Cpu, Zap, Trophy,
  ArrowRight, Radio, BarChart3, Shield, Clock, Eye, Target, Volume2,
  Users, AlertTriangle, X, ShieldAlert, Lock, FileText
} from "lucide-react";
import { getAppMode, APP_MODE_CONFIGS } from "@/config/appMode";
import { SESSION_EXPIRED_FLAG_KEY } from "@/lib/authInterceptor";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const FEATURES = [
  { icon: Users, title: "Team Quiz", desc: "2–4 team competitive gameplay with lifelines, scoring, and turn management", color: "text-accent" },
  { icon: Eye, title: "Viewer Scoring", desc: "YouTube chat viewers earn points for correct answers — real-time leaderboard", color: "text-primary" },
  { icon: Zap, title: "Powerplay Mode", desc: "Rapid-fire rounds where one team answers all questions against the clock", color: "text-secondary" },
  { icon: Radio, title: "SSE Live Stream", desc: "Server-Sent Events pipeline for real-time answer ingestion from YouTube Live", color: "text-accent" },
  { icon: BarChart3, title: "Live Analytics", desc: "Response distribution charts, hype meters, and participation tracking", color: "text-primary" },
  { icon: Trophy, title: "Podium Finish", desc: "Animated leaderboards with confetti, medals, and celebration effects", color: "text-secondary" },
  { icon: Shield, title: "Session Recovery", desc: "IndexedDB persistence ensures quizzes survive page reloads", color: "text-accent" },
  { icon: Volume2, title: "Sound Engine", desc: "Synthesized sound effects, background music, and dramatic reveals", color: "text-primary" },
];

const ARCHITECTURE_STEPS = [
  { label: "YouTube Live Chat", emoji: "💬", color: "bg-destructive/20 border-destructive/40" },
  { label: "SSE Orchestrator", emoji: "⚡", color: "bg-accent/20 border-accent/40" },
  { label: "React Frontend", emoji: "⚛️", color: "bg-primary/20 border-primary/40" },
  { label: "Live Leaderboards", emoji: "🏆", color: "bg-secondary/20 border-secondary/40" },
];

const Home = React.forwardRef<HTMLDivElement, Record<string, never>>((_props, ref) => {
  const [appMode, setAppMode] = useState(() => getAppMode());
  const [sessionExpired, setSessionExpired] = useState(false);
  const { user, loading, loginWithGoogle } = useAuth();

  const handleSignIn = () => {
    if (loading) return;
    if (user) {
      window.location.href = "/admin";
      return;
    }
    loginWithGoogle("/admin");
  };

  useEffect(() => {
    const sync = () => setAppMode(getAppMode());
    window.addEventListener("appModeChanged", sync as EventListener);
    return () => window.removeEventListener("appModeChanged", sync as EventListener);
  }, []);

  // Surface a one-shot "session expired" banner when the auth interceptor
  // has just redirected the user back here after a 401/403.
  useEffect(() => {
    try {
      const flag = sessionStorage.getItem(SESSION_EXPIRED_FLAG_KEY);
      if (flag) {
        sessionStorage.removeItem(SESSION_EXPIRED_FLAG_KEY);
        setSessionExpired(true);
      }
    } catch {
      // sessionStorage might not be available in some contexts
    }
    const onExpired = () => setSessionExpired(true);
    window.addEventListener("quizSessionExpired", onExpired);
    return () => window.removeEventListener("quizSessionExpired", onExpired);
  }, []);

  useEffect(() => {
    if (!sessionExpired) return;
    const t = window.setTimeout(() => setSessionExpired(false), 8000);
    return () => window.clearTimeout(t);
  }, [sessionExpired]);

  const modeConfig = APP_MODE_CONFIGS[appMode];
  const isOffline = appMode === "offline";

  return (
    <div ref={ref} className="min-h-screen p-4 md:p-8 relative z-10 bg-gradient-to-b from-background via-background to-muted/20 dark:from-background dark:via-background dark:to-background">
      <div className="mx-auto max-w-6xl space-y-10 md:space-y-16">
        <AnimatePresence>
          {sessionExpired ? (
            <motion.div
              key="session-expired-banner"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              role="status"
              aria-live="polite"
              className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground shadow-sm"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              <span className="flex-1">
                Your session expired. Please sign in again to continue.
              </span>
              <button
                type="button"
                onClick={() => setSessionExpired(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-primary/25 dark:border-primary/20 bg-card/95 dark:bg-card/70 p-8 md:p-14 shadow-xl dark:shadow-2xl">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 dark:bg-primary/25 blur-[100px]" aria-hidden="true" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-accent/10 dark:bg-accent/25 blur-[80px]" aria-hidden="true" />
          <div className="absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-secondary/8 dark:bg-secondary/15 blur-[60px]" aria-hidden="true" />

          <div className="relative z-10 space-y-6">
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <motion.img
                src={kiwiMascot}
                alt="Kiwi Mascot"
                className="h-16 w-16 md:h-24 md:w-24 drop-shadow-lg"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="flex flex-wrap gap-2">
                <Badge className="w-fit bg-primary text-primary-foreground">
                  <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
                  Live Quiz Platform
                </Badge>
              </div>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-7xl font-black tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                YT Live{" "}
              </span>
              <span className="relative inline-block min-w-[3ch]">
                <motion.span
                  className="text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0.3] }}
                  transition={{ delay: 0.5, duration: 1.5, times: [0, 0.3, 0.7, 1] }}
                >
                  Chat
                </motion.span>
                <motion.span
                  className="absolute left-0 top-1/2 h-[4px] md:h-[6px] bg-destructive rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1.2, duration: 0.4, ease: "easeInOut" }}
                  aria-hidden="true"
                />
              </span>
              <motion.span
                className="inline-block ml-2"
                style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
                initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
                animate={{ opacity: 1, scale: 1.1, rotate: -3 }}
                transition={{ delay: 1.8, type: "spring", stiffness: 180, damping: 12 }}
              >
                <span className="bg-gradient-to-r from-primary via-yellow-500 to-accent bg-clip-text text-transparent">
                  Quiz
                </span>
              </motion.span>
              <motion.span
                className="inline-block ml-2"
                initial={{ opacity: 0, scale: 0, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 2.2, type: "spring", stiffness: 300 }}
                aria-hidden="true"
              >
                <Sparkles className="h-8 w-8 md:h-12 md:w-12 text-primary inline" />
              </motion.span>
            </motion.h1>

            <motion.p
              className="max-w-3xl text-base md:text-xl text-muted-foreground leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              A production-ready YouTube-integrated quiz platform with live team gameplay,
              real-time viewer scoring via chat, stream orchestration through SSE events,
              and comprehensive admin controls.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-3 pt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GoogleSignInButton
                onClick={handleSignIn}
                disabled={loading}
                size="lg"
                className="font-bold"
              />
            </motion.div>
          </div>
        </section>

        {/* Architecture Diagram */}
        <section aria-label="Architecture overview">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-8 text-foreground"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            How It Works
          </motion.h2>

          <motion.div
            className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-0"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {ARCHITECTURE_STEPS.map((step, i) => (
              <motion.div key={step.label} className="flex items-center" variants={fadeUp} custom={i}>
                <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 ${step.color} backdrop-blur-sm`}>
                  <span className="text-2xl" aria-hidden="true">{step.emoji}</span>
                  <span className="font-semibold text-sm md:text-base text-foreground">{step.label}</span>
                </div>
                {i < ARCHITECTURE_STEPS.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground mx-2 hidden md:block" aria-hidden="true" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Features Grid */}
        <section aria-label="Platform features">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-center mb-8 text-foreground"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            Platform Features
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {FEATURES.map((feature, i) => (
              <motion.div key={feature.title} variants={fadeUp} custom={i + 1}>
                <Card className="group border-border/50 bg-card/85 dark:bg-card/50 hover:bg-card dark:hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-primary/10 h-full">
                  <CardContent className="p-5 space-y-3">
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <feature.icon className={`h-8 w-8 ${feature.color}`} aria-hidden="true" />
                    </motion.div>
                    <h3 className="font-bold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Legal: Disclaimer / Privacy / Terms — links to dedicated pages */}
        <section aria-label="Legal information" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/legal/disclaimer" className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
            <Card className="border-destructive/30 bg-card/85 dark:bg-card/50 hover:bg-card dark:hover:bg-card/80 hover:border-destructive/60 transition-all duration-300 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-destructive/10 h-full">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
                  </motion.div>
                  <h3 className="font-bold text-foreground">Disclaimer</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Software is provided <strong>"as-is"</strong>. Use at your own risk — ThinMonk EduTech is not
                  responsible for any direct or indirect loss arising out of the use of this platform.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive group-hover:underline">
                  Read full disclaimer <ArrowRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/legal/privacy" className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
            <Card className="border-primary/30 bg-card/85 dark:bg-card/50 hover:bg-card dark:hover:bg-card/80 hover:border-primary/60 transition-all duration-300 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-primary/10 h-full">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Lock className="h-6 w-6 text-primary" aria-hidden="true" />
                  </motion.div>
                  <h3 className="font-bold text-foreground">Privacy Policy</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We receive your <strong>email and name</strong> from Google. Channel details come from
                  YouTube's public APIs. We never sell or share your personal information.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                  Read privacy policy <ArrowRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link to="/legal/terms" className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
            <Card className="border-accent/30 bg-card/85 dark:bg-card/50 hover:bg-card dark:hover:bg-card/80 hover:border-accent/60 transition-all duration-300 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-accent/10 h-full">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <FileText className="h-6 w-6 text-accent" aria-hidden="true" />
                  </motion.div>
                  <h3 className="font-bold text-foreground">Terms &amp; Conditions</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We store <strong>public YouTube chat data</strong> for scoring &amp; analytics. Using this
                  software means full acceptance. Opt-out by emailing support — full deletion not guaranteed.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent group-hover:underline">
                  Read terms &amp; conditions <ArrowRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Footer */}
        <footer className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-4">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Powered by ThinMonk EduTech
        </footer>
      </div>
    </div>
  );
});

Home.displayName = "Home";

export default Home;
