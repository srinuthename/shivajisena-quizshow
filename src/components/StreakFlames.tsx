import { motion, AnimatePresence } from "framer-motion";

interface StreakFlamesProps {
  streak: number;
  size?: "sm" | "md" | "lg";
}

export const StreakFlames = ({ streak, size = "md" }: StreakFlamesProps) => {
  if (streak < 3) return null;

  const sizeMultiplier = size === "sm" ? 0.6 : size === "lg" ? 1.4 : 1;
  
  // Determine flame intensity
  const intensity = streak >= 10 ? "golden" : streak >= 5 ? "big" : "small";
  
  const flameConfigs = {
    small: {
      flames: 3,
      baseHeight: 16 * sizeMultiplier,
      colors: ["#ff6b35", "#ff8c42", "#ffa94d"],
      glowColor: "rgba(255, 107, 53, 0.5)",
    },
    big: {
      flames: 5,
      baseHeight: 24 * sizeMultiplier,
      colors: ["#ff4500", "#ff6b35", "#ff8c42", "#ffa94d", "#ffd43b"],
      glowColor: "rgba(255, 69, 0, 0.6)",
    },
    golden: {
      flames: 7,
      baseHeight: 32 * sizeMultiplier,
      colors: ["#ffd700", "#ffb700", "#ff9500", "#ff7300", "#ff5100", "#ffd700", "#fff"],
      glowColor: "rgba(255, 215, 0, 0.8)",
    },
  };

  const config = flameConfigs[intensity];

  return (
    <div 
      className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ filter: `drop-shadow(0 0 ${intensity === "golden" ? 8 : 4}px ${config.glowColor})` }}
    >
      <AnimatePresence>
        <div className="flex items-end justify-center gap-[1px]">
          {Array.from({ length: config.flames }).map((_, i) => {
            const isCenter = i === Math.floor(config.flames / 2);
            const distanceFromCenter = Math.abs(i - Math.floor(config.flames / 2));
            const heightVariation = 1 - distanceFromCenter * 0.15;
            const height = config.baseHeight * heightVariation;
            const delay = i * 0.05;

            return (
              <motion.div
                key={i}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ 
                  scaleY: [1, 1.2, 0.9, 1.1, 1],
                  opacity: 1,
                }}
                transition={{
                  scaleY: {
                    duration: 0.4 + Math.random() * 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay,
                  },
                  opacity: { duration: 0.2, delay }
                }}
                style={{
                  width: `${3 * sizeMultiplier}px`,
                  height: `${height}px`,
                  background: `linear-gradient(to top, ${config.colors[i % config.colors.length]}, transparent)`,
                  borderRadius: "50% 50% 20% 20%",
                  transformOrigin: "bottom",
                }}
              />
            );
          })}
        </div>
      </AnimatePresence>
      
      {/* Sparkles for golden inferno */}
      {intensity === "golden" && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute w-1 h-1 rounded-full bg-yellow-300"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.5],
                y: [-5, -15, -25],
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.4,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Compact version for leaderboard rows
export const StreakFlamesBadge = ({ streak }: { streak: number }) => {
  if (streak < 3) return null;

  const intensity = streak >= 10 ? "golden" : streak >= 5 ? "big" : "small";
  
  const colors = {
    small: "from-orange-400 to-orange-600",
    big: "from-orange-500 to-red-500",
    golden: "from-yellow-400 via-orange-400 to-red-500",
  };

  const glows = {
    small: "shadow-orange-500/30",
    big: "shadow-orange-500/50",
    golden: "shadow-yellow-500/60",
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`
        flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
        bg-gradient-to-r ${colors[intensity]}
        shadow-lg ${glows[intensity]}
      `}
    >
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="text-[10px]"
      >
        🔥
      </motion.span>
      <span className="text-[10px] font-bold text-white">{streak}</span>
    </motion.div>
  );
};
