import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedScoreProps {
  value: number;
  className?: string;
  duration?: number;
}

export const AnimatedScore = ({ value, className = "", duration = 0.8 }: AnimatedScoreProps) => {
  const spring = useSpring(0, { stiffness: 100, damping: 20, duration: duration * 1000 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return (
    <motion.span className={className}>
      {displayValue}
    </motion.span>
  );
};

export default AnimatedScore;
