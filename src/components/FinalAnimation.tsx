import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Star } from "lucide-react";
import { Confetti } from "./Confetti";

interface FinalAnimationProps {
  onComplete: () => void;
}

const FinalAnimation = ({ onComplete }: FinalAnimationProps) => {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const textTimer = setTimeout(() => setShowText(true), 1500);
    const completeTimer = setTimeout(() => onComplete(), 5000);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <Confetti isActive={true} />
      
      <div className="relative flex flex-col items-center">
        {/* Central Flame */}
        <motion.div
          initial={{ scale: 0, rotate: 0 }}
          animate={{ 
            scale: [0, 1.5, 1], 
            rotate: [0, 180, 360] 
          }}
          transition={{ 
            duration: 2, 
            ease: "easeInOut" 
          }}
          className="relative"
        >
          <Flame 
            className="w-32 h-32 text-yellow-500" 
            fill="currentColor"
          />
          <motion.div
            animate={{ 
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.2, 1] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-40 h-40 rounded-full bg-yellow-500/30 blur-xl" />
          </motion.div>
        </motion.div>

        {/* Orbiting Stars */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 0 
            }}
            animate={{
              x: Math.cos((i * Math.PI * 2) / 8) * 150,
              y: Math.sin((i * Math.PI * 2) / 8) * 150,
              opacity: 1,
              rotate: 360,
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              rotate: {
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          >
            <Star 
              className="w-8 h-8 text-yellow-400" 
              fill="currentColor"
            />
          </motion.div>
        ))}

        {/* Text Animation */}
        {showText && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="absolute -bottom-20 text-center"
          >
            <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Akhanda Jyothi Ignited!
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              The eternal flame burns bright
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FinalAnimation;