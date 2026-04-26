import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Users } from "lucide-react";

interface SpectatorEngagementProps {
  responseRate: number;
  totalResponses: number;
  uniqueResponders: number;
  isActive: boolean;
}

const EMOJIS = ["👍", "🔥", "👏", "⚡", "🎯", "💪", "🏆", "✨"];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

const AnimatedCounter = memo(({ value, label }: { value: number; label: string }) => (
  <div className="text-center">
    <motion.div
      key={value}
      initial={{ scale: 1.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-2xl lg:text-4xl font-bold text-primary tabular-nums"
    >
      {value.toLocaleString()}
    </motion.div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
));
AnimatedCounter.displayName = "AnimatedCounter";

export const SpectatorEngagement = memo(({
  responseRate,
  totalResponses,
  uniqueResponders,
  isActive,
}: SpectatorEngagementProps) => {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);
  const emojiIdRef = useRef(0);
  const maxHype = 20; // responses per second for full meter
  const hypePercent = Math.min((responseRate / maxHype) * 100, 100);

  // Spawn floating emojis based on response rate
  useEffect(() => {
    if (!isActive || responseRate <= 0) return;

    const interval = setInterval(() => {
      const count = Math.min(Math.ceil(responseRate / 4), 3);
      const newEmojis: FloatingEmoji[] = Array.from({ length: count }, () => ({
        id: emojiIdRef.current++,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: 10 + Math.random() * 80,
      }));
      setEmojis(prev => [...prev.slice(-20), ...newEmojis]);
    }, 800);

    return () => clearInterval(interval);
  }, [isActive, responseRate]);

  // Clean up old emojis
  useEffect(() => {
    if (emojis.length === 0) return;
    const timer = setTimeout(() => {
      setEmojis(prev => prev.slice(Math.max(0, prev.length - 15)));
    }, 3000);
    return () => clearTimeout(timer);
  }, [emojis.length]);

  if (!isActive) return null;

  return (
    <div className="relative">
      {/* Floating Emojis */}
      <div className="fixed bottom-0 left-0 right-0 h-screen pointer-events-none z-30 overflow-hidden">
        <AnimatePresence>
          {emojis.map(e => (
            <motion.div
              key={e.id}
              initial={{ opacity: 1, y: 0, x: `${e.x}vw`, scale: 0.5 }}
              animate={{ opacity: 0, y: -400, scale: 1.2, rotate: Math.random() * 40 - 20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute bottom-10 text-2xl lg:text-4xl"
              style={{ left: `${e.x}%` }}
            >
              {e.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Engagement Panel */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-card/80 backdrop-blur rounded-xl border border-border/50 p-3 lg:p-4 space-y-3"
      >
        {/* Pulsing Participant Counter */}
        <div className="flex items-center justify-around gap-4">
          <AnimatedCounter value={totalResponses} label="Responses" />
          <div className="h-8 w-px bg-border/50" />
          <AnimatedCounter value={uniqueResponders} label="Viewers" />
        </div>

        {/* Hype Meter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Flame className={`h-3 w-3 ${hypePercent > 50 ? "text-orange-500" : "text-muted-foreground"}`} />
              Hype Meter
            </span>
            <span className="text-primary font-bold">{Math.round(responseRate)}/s</span>
          </div>
          <div className="h-3 lg:h-4 rounded-full bg-muted/50 overflow-hidden border border-border/30">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                hypePercent > 75
                  ? "bg-gradient-to-r from-orange-500 to-red-500"
                  : hypePercent > 40
                  ? "bg-gradient-to-r from-primary to-accent"
                  : "bg-primary/60"
              }`}
              animate={{ width: `${hypePercent}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            />
          </div>
          {hypePercent > 75 && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-center text-xs font-bold text-orange-400"
            >
              🔥 ON FIRE! 🔥
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
});

SpectatorEngagement.displayName = "SpectatorEngagement";
export default SpectatorEngagement;
