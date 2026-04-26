import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PartnerLogosSlideshowProps {
  logos: string[];
  interval?: number;
  className?: string;
}

export const PartnerLogosSlideshow = ({ 
  logos, 
  interval = 4000,
  className = ""
}: PartnerLogosSlideshowProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (logos.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % logos.length);
    }, interval);

    return () => clearInterval(timer);
  }, [logos.length, interval]);

  if (logos.length === 0) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={logos[currentIndex]}
          alt={`Partner ${currentIndex + 1}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          className="h-16 w-16 md:h-20 md:w-20 object-contain rounded-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </AnimatePresence>
    </div>
  );
};
