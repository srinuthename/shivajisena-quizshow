import { useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Award, Star } from "lucide-react";
import { Confetti } from "./Confetti";

interface FinalWinnerMessageProps {
  onComplete: () => void;
}

export function FinalWinnerMessage({ onComplete }: FinalWinnerMessageProps) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 10000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center glass-background">
      <Confetti isActive={true} />
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex flex-col items-center text-center max-w-2xl px-8"
      >
        {/* Trophy Icon */}
        <motion.div
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative mb-6"
        >
          <Trophy className="w-24 h-24 text-academic-gold" />
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity 
            }}
            className="absolute inset-0 bg-academic-gold/30 rounded-full blur-xl"
          />
        </motion.div>

        {/* Main Message */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-academic-gold via-secondary to-accent bg-clip-text text-transparent"
        >
          SPP News Quiz Vijetha!
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-2xl md:text-3xl text-academic-text mb-6"
        >
          Congratulations! on your achievement.
        </motion.p>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ 
                opacity: 0,
                x: Math.random() * 400 - 200,
                y: Math.random() * 400 - 200
              }}
              animate={{
                opacity: [0, 1, 0],
                y: [0, -30, 0],
                rotate: 360
              }}
              transition={{
                duration: 3,
                delay: i * 0.2,
                repeat: Infinity,
                repeatDelay: 1
              }}
            >
              {i % 2 === 0 ? (
                <Star className="w-6 h-6 text-accent" />
              ) : (
                <Award className="w-6 h-6 text-secondary" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}