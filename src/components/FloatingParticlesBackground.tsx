import { memo, useMemo } from "react";
import { useLocation } from "react-router-dom";

// Lightweight CSS-only floating particles (no framer-motion overhead)
// Hidden on fullscreen pages like /quiz, /spectator

const HIDDEN_PATHS = ["/quiz", "/spectator", "/quiz/end/teams", "/quiz/end/viewers"];

const FloatingParticlesBackground = memo(() => {
  const location = useLocation();
  const shouldHide = HIDDEN_PATHS.some(p => location.pathname.startsWith(p));

  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animDuration: `${12 + Math.random() * 18}s`,
      animDelay: `${Math.random() * 10}s`,
      size: `${2 + Math.random() * 3}px`,
      opacity: 0.15 + Math.random() * 0.2,
    }));
  }, []);

  if (shouldHide) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            bottom: "-10px",
            animation: `floatUp ${p.animDuration} linear ${p.animDelay} infinite`,
          }}
        />
      ))}
    </div>
  );
});

FloatingParticlesBackground.displayName = "FloatingParticlesBackground";

export default FloatingParticlesBackground;
