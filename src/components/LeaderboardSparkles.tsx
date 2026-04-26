import { useEffect, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  type: "sparkle" | "ember";
}

interface LeaderboardSparklesProps {
  active?: boolean;
  count?: number;
}

const generateParticles = (count: number): Particle[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 3,
    type: Math.random() > 0.5 ? "sparkle" : "ember",
  }));

export const LeaderboardSparkles = memo(({ active = true, count = 12 }: LeaderboardSparklesProps) => {
  const [particles] = useState(() => generateParticles(count));

  if (!active) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={
            p.type === "sparkle"
              ? "absolute rounded-full bg-primary/30"
              : "absolute rounded-full bg-orange-400/25"
          }
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -20, -10, -30, 0],
            opacity: [0, 0.8, 0.4, 0.7, 0],
            scale: [0.5, 1.2, 0.8, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
});

LeaderboardSparkles.displayName = "LeaderboardSparkles";
export default LeaderboardSparkles;
