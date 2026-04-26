import { Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ParticipantCounterProps {
  count: number;
  isActive: boolean;
  className?: string;
}

export const ParticipantCounter = ({
  count,
  isActive,
  className,
}: ParticipantCounterProps) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl",
        "bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20",
        "border-2 border-primary/30",
        "shadow-lg shadow-primary/10",
        isActive && "animate-pulse",
        className
      )}
    >
      <div className="relative">
        <Users className="h-5 w-5 text-primary" />
        {isActive && (
          <motion.div
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </div>
      
      <div className="flex flex-col items-start">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Participants
        </span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={count}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="text-2xl font-bold text-primary tabular-nums"
          >
            {count.toLocaleString()}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
