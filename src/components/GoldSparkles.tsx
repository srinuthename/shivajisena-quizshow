import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  delay: number;
}

export const GoldSparkles = () => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const generateSparkles = () => {
      const newSparkles: Sparkle[] = [];
      for (let i = 0; i < 15; i++) {
        newSparkles.push({
          id: Date.now() + i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 16 + 8,
          rotation: Math.random() * 360,
          delay: Math.random() * 3
        });
      }
      setSparkles(newSparkles);
    };

    generateSparkles();
    const interval = setInterval(generateSparkles, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1.2, 0],
            rotate: [sparkle.rotation, sparkle.rotation + 180]
          }}
          transition={{ 
            duration: 2.5,
            delay: sparkle.delay,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: Math.random() * 4 + 2
          }}
          style={{
            position: 'absolute',
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path
              d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z"
              fill="url(#goldGradient)"
              filter="url(#glow)"
            />
            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(45, 100%, 70%)" />
                <stop offset="50%" stopColor="hsl(40, 100%, 55%)" />
                <stop offset="100%" stopColor="hsl(35, 100%, 45%)" />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>
        </motion.div>
      ))}
    </div>
  );
};