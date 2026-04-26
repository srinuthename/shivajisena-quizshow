import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Ember {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type: 'ember' | 'sparkle';
}

export const FloatingEmbers = () => {
  const [embers, setEmbers] = useState<Ember[]>([]);

  useEffect(() => {
    const generateEmbers = () => {
      const newEmbers: Ember[] = [];
      for (let i = 0; i < 20; i++) {
        newEmbers.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 6 + 2,
          duration: Math.random() * 4 + 3,
          delay: Math.random() * 2,
          type: Math.random() > 0.6 ? 'sparkle' : 'ember'
        });
      }
      setEmbers(newEmbers);
    };

    generateEmbers();
    const interval = setInterval(generateEmbers, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <AnimatePresence>
        {embers.map((ember) => (
          <motion.div
            key={ember.id}
            initial={{ 
              opacity: 0, 
              y: `${ember.y + 20}vh`, 
              x: `${ember.x}vw`,
              scale: 0 
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: [`${ember.y}vh`, `${ember.y - 30}vh`],
              x: [`${ember.x}vw`, `${ember.x + (Math.random() - 0.5) * 10}vw`],
              scale: [0, 1, 1, 0]
            }}
            transition={{ 
              duration: ember.duration, 
              delay: ember.delay,
              ease: "easeOut",
              repeat: Infinity,
              repeatDelay: Math.random() * 2
            }}
            className="absolute"
          >
            {ember.type === 'sparkle' ? (
              <div 
                className="rounded-full animate-pulse"
                style={{
                  width: ember.size * 1.5,
                  height: ember.size * 1.5,
                  background: 'radial-gradient(circle, hsl(45 100% 70%) 0%, hsl(35 100% 50%) 50%, transparent 70%)',
                  boxShadow: `0 0 ${ember.size * 2}px hsl(45 100% 60%), 0 0 ${ember.size * 4}px hsl(35 100% 50%)`
                }}
              />
            ) : (
              <div 
                className="rounded-full"
                style={{
                  width: ember.size,
                  height: ember.size,
                  background: `radial-gradient(circle, hsl(25 100% 60%) 0%, hsl(15 100% 45%) 60%, transparent 100%)`,
                  boxShadow: `0 0 ${ember.size}px hsl(25 100% 50%), 0 0 ${ember.size * 2}px hsl(15 90% 40%)`
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};