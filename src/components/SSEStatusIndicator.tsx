import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSSEEnabled } from "@/config/appMode";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SSEConnectionState = "connected" | "disconnected" | "connecting" | "reconnecting";

interface SSEStatusIndicatorProps {
  status: SSEConnectionState;
  className?: string;
  showLabel?: boolean;
}

export const SSEStatusIndicator = memo(({
  status,
  className,
  showLabel = false,
}: SSEStatusIndicatorProps) => {
  const [sseEnabled, setSSEEnabled] = useState(isSSEEnabled());

  // Listen for SSE enabled changes
  useEffect(() => {
    const handleSSEChange = () => {
      setSSEEnabled(isSSEEnabled());
    };

    window.addEventListener('sseEnabledChanged', handleSSEChange);
    return () => window.removeEventListener('sseEnabledChanged', handleSSEChange);
  }, []);

  // Don't show if SSE is disabled
  if (!sseEnabled) return null;

  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: Wifi,
          color: "text-emerald-400",
          bgColor: "bg-emerald-500/20",
          borderColor: "border-emerald-500/30",
          label: "Live",
          pulse: false,
        };
      case "connecting":
      case "reconnecting":
        return {
          icon: Loader2,
          color: "text-amber-400",
          bgColor: "bg-amber-500/20",
          borderColor: "border-amber-500/30",
          label: status === "connecting" ? "Connecting..." : "Reconnecting...",
          pulse: true,
        };
      case "disconnected":
      default:
        return {
          icon: WifiOff,
          color: "text-rose-400",
          bgColor: "bg-rose-500/20",
          borderColor: "border-rose-500/30",
          label: "Disconnected",
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full border",
              config.bgColor,
              config.borderColor,
              className
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 180, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Icon
                  className={cn(
                    "w-3.5 h-3.5",
                    config.color,
                    config.pulse && "animate-spin"
                  )}
                />
              </motion.div>
            </AnimatePresence>
            {showLabel && (
              <span className={cn("text-xs font-medium", config.color)}>
                {config.label}
              </span>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>SSE Stream: {config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

SSEStatusIndicator.displayName = "SSEStatusIndicator";
