// Powerplay Flash Animations
// Extracted from TeamQuiz for better maintainability

import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface PowerplayFlashProps {
  isActive: boolean;
}

export const PowerplayStartFlash = ({ isActive }: PowerplayFlashProps) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] pointer-events-none"
        >
          {/* Lightning flash overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0.5, 1, 0.3, 0.8, 0],
              backgroundColor: ['hsl(40 100% 50%)', 'hsl(25 100% 60%)', 'hsl(40 100% 50%)']
            }}
            transition={{ duration: 1, times: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1] }}
            className="absolute inset-0 bg-gradient-to-br from-orange-400 via-yellow-300 to-amber-500"
          />

          {/* Central lightning bolt */}
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: [0, 1.5, 1.2], rotate: [0, 5, 0] }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Zap className="w-64 h-64 text-white drop-shadow-[0_0_60px_rgba(255,200,0,1)]" />
          </motion.div>

          {/* POWERPLAY text */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, type: "spring" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center mt-48">
              <motion.h1
                animate={{
                  textShadow: [
                    '0 0 20px rgba(255,200,0,0.8)',
                    '0 0 60px rgba(255,100,0,1)',
                    '0 0 20px rgba(255,200,0,0.8)'
                  ]
                }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-6xl md:text-8xl font-black text-white tracking-wider"
                style={{ textShadow: '0 0 40px rgba(255,150,0,1), 0 4px 0 rgba(200,100,0,1)' }}
              >
                ⚡ {t.powerplay.toUpperCase()} ⚡
              </motion.h1>
            </div>
          </motion.div>

          {/* Electric particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: '50%',
                y: '50%',
                scale: 0
              }}
              animate={{
                x: `${20 + Math.random() * 60}%`,
                y: `${20 + Math.random() * 60}%`,
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
              className="absolute w-4 h-4 rounded-full bg-yellow-300 shadow-[0_0_20px_rgba(255,200,0,1)]"
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const PowerplayEndFlash = ({ isActive }: PowerplayFlashProps) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] pointer-events-none"
        >
          {/* Fade out overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.8, 0.5, 0.3, 0],
              backgroundColor: ['hsl(220 20% 20%)', 'hsl(220 30% 15%)', 'hsl(220 20% 10%)']
            }}
            transition={{ duration: 1.2, times: [0, 0.2, 0.5, 0.8, 1] }}
            className="absolute inset-0 bg-gradient-to-br from-slate-700 via-gray-800 to-slate-900"
          />

          {/* Central lightning bolt fading */}
          <motion.div
            initial={{ scale: 1.2, opacity: 1 }}
            animate={{ scale: [1.2, 0.8, 0], opacity: [1, 0.5, 0] }}
            transition={{ duration: 0.8, ease: "easeIn" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Zap className="w-64 h-64 text-gray-400 drop-shadow-[0_0_30px_rgba(100,100,120,0.5)]" />
          </motion.div>

          {/* POWERPLAY ENDED text */}
          <motion.div
            initial={{ scale: 1, opacity: 1, y: 0 }}
            animate={{ scale: [1, 1.1, 0.9], opacity: [1, 1, 0], y: [0, -20, 50] }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center mt-48">
              <motion.h1
                className="text-5xl md:text-7xl font-black text-gray-300 tracking-wider"
                style={{ textShadow: '0 0 20px rgba(100,100,120,0.5), 0 4px 0 rgba(50,50,60,1)' }}
              >
                {t.powerplayEnded.toUpperCase()}
              </motion.h1>
            </div>
          </motion.div>

          {/* Fading particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: `${30 + Math.random() * 40}%`,
                y: `${30 + Math.random() * 40}%`,
                scale: 1,
                opacity: 0.8
              }}
              animate={{
                scale: [1, 0.5, 0],
                opacity: [0.8, 0.3, 0]
              }}
              transition={{ duration: 1, delay: i * 0.1 }}
              className="absolute w-3 h-3 rounded-full bg-gray-400 shadow-[0_0_10px_rgba(100,100,120,0.5)]"
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
