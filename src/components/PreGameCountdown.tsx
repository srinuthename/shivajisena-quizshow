import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Team } from "@/types/quiz";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Zap, Star, Trophy } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import confetti from "canvas-confetti";

interface PreGameCountdownProps {
  teams: Team[];
  episodeNumber: string;
  onComplete: () => void;
}

export const PreGameCountdown = ({ teams, episodeNumber, onComplete }: PreGameCountdownProps) => {
  const [phase, setPhase] = useState<"countdown" | "teams" | "go">("countdown");
  const [countdownValue, setCountdownValue] = useState(10);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(-1);
  const { playDrumroll, playCountdownTick, playVictoryFanfare, playBigReveal } = useSounds();

  // Countdown phase
  useEffect(() => {
    if (phase === "countdown") {
      playDrumroll();
      
      if (countdownValue > 0) {
        playCountdownTick(countdownValue);
        const timer = setTimeout(() => {
          setCountdownValue(prev => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setPhase("teams");
        setCurrentTeamIndex(0);
      }
    }
  }, [phase, countdownValue, playDrumroll, playCountdownTick]);

  // Team introduction phase
  useEffect(() => {
    if (phase === "teams" && currentTeamIndex >= 0) {
      if (currentTeamIndex < teams.length) {
        playBigReveal();
        const timer = setTimeout(() => {
          setCurrentTeamIndex(prev => prev + 1);
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        setPhase("go");
        playVictoryFanfare();
        
        // Epic confetti burst
        const duration = 3000;
        const end = Date.now() + duration;
        
        const frame = () => {
          confetti({
            particleCount: 7,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ffd700', '#ff6b35', '#22c55e', '#3b82f6']
          });
          confetti({
            particleCount: 7,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#ffd700', '#ff6b35', '#22c55e', '#3b82f6']
          });
          
          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
        
        setTimeout(onComplete, 2000);
      }
    }
  }, [phase, currentTeamIndex, teams.length, playBigReveal, playVictoryFanfare, onComplete]);

  const getTeamGradient = (index: number) => {
    const gradients = [
      "from-amber-400 via-orange-500 to-yellow-500",
      "from-purple-500 via-pink-500 to-rose-500",
      "from-blue-400 via-cyan-500 to-teal-500",
      "from-red-500 via-rose-500 to-pink-500"
    ];
    return gradients[index % gradients.length];
  };

  const getTeamIcon = (index: number) => {
    const icons = [Star, Zap, Trophy, Users];
    const Icon = icons[index % icons.length];
    return <Icon className="w-12 h-12" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/30"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: window.innerHeight + 50,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
              y: -50,
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Countdown phase */}
      <AnimatePresence mode="wait">
        {phase === "countdown" && (
          <motion.div
            key="countdown"
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-2xl md:text-4xl font-bold text-primary/80 mb-8"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              Get Ready!
            </motion.div>
            
            <motion.div
              key={countdownValue}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <span className="text-[200px] md:text-[300px] font-black bg-gradient-to-br from-primary via-accent to-secondary bg-clip-text text-transparent animate-energy-pulse">
                {countdownValue}
              </span>
              
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-8 border-primary/50"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.5, opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
            
            <motion.div
              className="mt-8 text-xl text-muted-foreground"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              YT Live Quiz Show - Episode #{episodeNumber}
            </motion.div>
          </motion.div>
        )}

        {/* Team introduction phase */}
        {phase === "teams" && currentTeamIndex < teams.length && (
          <motion.div
            key={`team-${currentTeamIndex}`}
            initial={{ x: -500, opacity: 0, rotate: -15 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ x: 500, opacity: 0, rotate: 15 }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
            className="text-center"
          >
            <motion.div
              className={`inline-block p-12 rounded-3xl bg-gradient-to-br ${getTeamGradient(currentTeamIndex)} shadow-2xl`}
              animate={{ 
                boxShadow: [
                  "0 0 20px rgba(255,215,0,0.3)",
                  "0 0 60px rgba(255,215,0,0.6)",
                  "0 0 20px rgba(255,215,0,0.3)"
                ]
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {/* Team Avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                <Avatar className="w-40 h-40 mx-auto border-8 border-white/50 shadow-xl">
                  {teams[currentTeamIndex].avatar ? (
                    <AvatarImage src={teams[currentTeamIndex].avatar} alt={teams[currentTeamIndex].name} />
                  ) : null}
                  <AvatarFallback className="bg-white/20 text-white text-4xl">
                    {getTeamIcon(currentTeamIndex)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Team Name */}
              <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-6xl md:text-8xl font-black text-white mt-8 drop-shadow-lg"
              >
                {teams[currentTeamIndex].name}
              </motion.h1>

              {/* Team Members */}
              {teams[currentTeamIndex].members && teams[currentTeamIndex].members.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-6 flex flex-wrap justify-center gap-3"
                >
                  {teams[currentTeamIndex].members.map((member, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8 + idx * 0.1 }}
                      className="px-4 py-2 bg-white/30 rounded-full text-white font-semibold text-lg backdrop-blur-sm"
                    >
                      {member}
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Sparkles around the card */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-primary"
                style={{
                  left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 8)}%`,
                  top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 8)}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  rotate: [0, 180],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              >
                <Star className="w-6 h-6 fill-current" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* GO phase */}
        {phase === "go" && (
          <motion.div
            key="go"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="text-center"
          >
            <motion.span
              className="text-[150px] md:text-[250px] font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent"
              animate={{ 
                scale: [1, 1.1, 1],
                filter: [
                  "drop-shadow(0 0 20px rgba(255,215,0,0.5))",
                  "drop-shadow(0 0 60px rgba(255,215,0,0.8))",
                  "drop-shadow(0 0 20px rgba(255,215,0,0.5))"
                ]
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              GO!
            </motion.span>
            
            {/* Burst lines */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 w-2 h-32 bg-gradient-to-b from-primary to-transparent origin-bottom"
                style={{ rotate: `${i * 30}deg` }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
