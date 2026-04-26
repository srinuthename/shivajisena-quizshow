import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Home, Settings, BarChart3, BookOpen, Award, LogOut, Youtube, Coins } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import quizLogo from "@/assets/monk-mascot.png";
import { getAppMode } from "@/config/appMode";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/admin", label: "Admin", icon: Settings },
  { path: "/quiz-management", label: "Quiz Bank", icon: BookOpen },
  { path: "/prizing", label: "Prize Assignments", icon: Award, hideInOffline: true },
  { path: "/advanced", label: "Analytics", icon: BarChart3, hideInOffline: true },
  { path: "/loyalty", label: "Loyalty", icon: Coins, hideInOffline: true },
];

// Pages where nav should be hidden (fullscreen experiences)
const HIDDEN_PATHS = ["/quiz", "/spectator", "/quiz/end/teams", "/quiz/end/viewers", "/quiz/mirror"];

const isHiddenPath = (pathname: string): boolean =>
  HIDDEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const SessionBadge = () => {
  const { user, logout, loginWithGoogle } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 text-xs"
        onClick={() => {
          try {
            loginWithGoogle(`${location.pathname}${location.search}` || "/admin");
          } catch (err) {
            console.error("[GlobalNav] failed to start sign-in", err);
          }
        }}
      >
        <Youtube className="h-3.5 w-3.5" />
        Sign in
      </Button>
    );
  }

  const channelTitle = String(user.youtubeChannelTitle || "").trim();
  const initials = (user.userName || user.userEmail || "U")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "U";

  // Prefer the connected YouTube channel thumbnail to make channel identity
  // unmistakable across the app; fall back to the Google profile picture.
  const avatarSrc = user.youtubeChannelThumbnail || user.profilePicture || "";
  const avatarAlt = channelTitle
    ? `${channelTitle} (YouTube channel)`
    : user.userName || user.userEmail || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 pl-1 pr-2.5 py-1 hover:bg-muted/70 transition"
          aria-label="Account menu"
        >
          {avatarSrc ? (
            <span className="relative inline-flex">
              <img
                src={avatarSrc}
                alt={avatarAlt}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="h-6 w-6 rounded-full object-cover ring-1 ring-primary/30"
              />
              {user.youtubeChannelThumbnail ? (
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-background ring-1 ring-border"
                  aria-hidden="true"
                  title="YouTube channel"
                >
                  <Youtube className="h-2 w-2 text-rose-500" />
                </span>
              ) : null}
            </span>
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary ring-1 ring-primary/30">
              {initials}
            </span>
          )}
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-[11px] font-medium text-foreground/90 max-w-[160px] truncate">
              {user.userName || channelTitle || "Account"}
            </span>
            {channelTitle || user.youtubeChannelId ? (
              <span className="text-[10px] text-muted-foreground max-w-[160px] truncate">
                <Youtube className="inline-block h-3 w-3 mr-0.5 -mt-0.5 text-rose-500" />
                {channelTitle || user.youtubeChannelId}
              </span>
            ) : (
              <span className="text-[10px] text-amber-500">No YouTube channel</span>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="text-sm font-medium truncate">{user.userName || channelTitle || "Account"}</div>
          {channelTitle ? (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Youtube className="h-3 w-3 text-rose-500" />
              <span className="truncate">{channelTitle}</span>
            </div>
          ) : null}
          {user.youtubeChannelId ? (
            <div className="text-[10px] text-muted-foreground/80 truncate font-mono">
              {user.youtubeChannelId}
            </div>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const GlobalNav = () => {
  const location = useLocation();
  const [appMode, setAppModeState] = useState(() => getAppMode());
  useEffect(() => {
    const sync = () => setAppModeState(getAppMode());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "appOperationMode") sync();
    };
    window.addEventListener("appModeChanged", sync as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("appModeChanged", sync as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const isOffline = appMode === "offline";
  const shouldHide = isHiddenPath(location.pathname);
  if (shouldHide) return null;

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-50 backdrop-blur-xl bg-card/80 border-b border-border/50 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        {/* Logo + Brand */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <motion.img
            src={quizLogo}
            alt="YT Live Quiz"
            className="h-8 w-8 rounded-lg"
            whileHover={{ rotate: 12, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
          />
          <span className="font-bold text-lg text-primary hidden sm:inline animate-text-shimmer">
            YT Live Quiz
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1 min-w-0">
          {NAV_ITEMS
            .filter((item) => !(isOffline && item.hideInOffline))
            .map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;

            return (
              <Link
                key={path}
                to={path}
                className={`
                  relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <SessionBadge />
          <ThemeToggle />
        </div>
      </div>
    </motion.nav>
  );
};

export default GlobalNav;
