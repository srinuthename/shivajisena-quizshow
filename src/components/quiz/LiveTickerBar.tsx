import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

interface LiveTickerBarProps {
  isPowerplayActive: boolean;
  regularMessage: string;
  powerplayMessage: string;
  enabled?: boolean;
}

export const LiveTickerBar = ({
  isPowerplayActive,
  regularMessage,
  powerplayMessage,
  enabled = true,
}: LiveTickerBarProps) => {
  const { t } = useTranslation();

  if (!enabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`mt-4 px-4 py-3 rounded-lg border-2 relative overflow-hidden
        ${isPowerplayActive
          ? "bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-primary/40"
          : "bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-primary/40"
        }`}
    >
      <motion.div
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        style={{ backgroundSize: "200% 100%" }}
      />

      <div className="flex items-center gap-3 relative z-10 overflow-hidden w-full">
        {/* Message */}
        <motion.p className="text-base font-bold truncate">
          {isPowerplayActive ? powerplayMessage : regularMessage}
        </motion.p>

        {/* Status indicators — right aligned */}
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          {/* POWER PLAY indicator */}
          <div className="flex items-center gap-2">
            {isPowerplayActive && (
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
              />
            )}
            <motion.div
              animate={
                isPowerplayActive
                  ? { opacity: [0.8, 1, 0.8] }
                  : { opacity: 0.4 }
              }
              transition={
                isPowerplayActive
                  ? { duration: 1.2, repeat: Infinity }
                  : { duration: 0 }
              }
              className={`px-2 py-0.5 rounded-sm text-xs font-black tracking-wide shadow-md
                ${isPowerplayActive
                  ? "bg-amber-500 text-black"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              {t.powerPlay}
            </motion.div>
          </div>

          {/* LIVE indicator */}
          <div className="flex items-center gap-2">
            <motion.div
              animate={
                isPowerplayActive
                  ? { opacity: 0.4 }
                  : { opacity: [0.8, 1, 0.8] }
              }
              transition={
                isPowerplayActive
                  ? { duration: 0 }
                  : { duration: 1.2, repeat: Infinity }
              }
              className={`px-2 py-0.5 rounded-sm text-xs font-black tracking-wide shadow-md
                ${isPowerplayActive
                  ? "bg-muted text-muted-foreground"
                  : "bg-red-600 text-white"
                }`}
            >
              {t.liveLabel}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};