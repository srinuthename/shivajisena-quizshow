// Connection Quality Indicator - Simplified types for non-SSE usage

import { memo } from "react";
import { WifiOff, SignalLow, SignalMedium, SignalHigh, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Local type definitions (previously imported from SSE hook)
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
export type ConnectionQuality = "excellent" | "good" | "poor" | "offline";

interface ConnectionQualityIndicatorProps {
  status: ConnectionStatus;
  quality: ConnectionQuality;
  lastHeartbeat: number | null;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  messageRate: number;
  onReconnect: () => void;
  compact?: boolean;
}

const getQualityIcon = (quality: ConnectionQuality, status: ConnectionStatus) => {
  if (status === "connecting") {
    return <Loader2 className="w-4 h-4 animate-spin text-amber-400" />;
  }
  
  switch (quality) {
    case "excellent":
      return <SignalHigh className="w-4 h-4 text-emerald-400" />;
    case "good":
      return <SignalMedium className="w-4 h-4 text-emerald-400" />;
    case "poor":
      return <SignalLow className="w-4 h-4 text-amber-400" />;
    case "offline":
    default:
      return <WifiOff className="w-4 h-4 text-rose-400" />;
  }
};

const getQualityText = (quality: ConnectionQuality, status: ConnectionStatus): string => {
  if (status === "connecting") return "Connecting...";
  
  switch (quality) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "poor":
      return "Poor";
    case "offline":
    default:
      return "Offline";
  }
};

const getQualityColor = (quality: ConnectionQuality, status: ConnectionStatus): string => {
  if (status === "connecting") return "text-amber-400";
  
  switch (quality) {
    case "excellent":
      return "text-emerald-400";
    case "good":
      return "text-emerald-400";
    case "poor":
      return "text-amber-400";
    case "offline":
    default:
      return "text-rose-400";
  }
};

export const ConnectionQualityIndicator = memo(({
  status,
  quality,
  lastHeartbeat,
  reconnectAttempt,
  maxReconnectAttempts,
  messageRate,
  onReconnect,
  compact = false,
}: ConnectionQualityIndicatorProps) => {
  const heartbeatAge = lastHeartbeat ? Math.floor((Date.now() - lastHeartbeat) / 1000) : null;
  
  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <p>Status: {status}</p>
      <p>Quality: {getQualityText(quality, status)}</p>
      {heartbeatAge !== null && <p>Last heartbeat: {heartbeatAge}s ago</p>}
      <p>Message rate: {messageRate}/sec</p>
      {reconnectAttempt > 0 && (
        <p>Reconnecting: {reconnectAttempt}/{maxReconnectAttempts}</p>
      )}
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={status !== "connected" ? onReconnect : undefined}>
              {getQualityIcon(quality, status)}
              {status !== "connected" && (
                <RefreshCw className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md bg-card/50 border border-border/50",
              status !== "connected" && "cursor-pointer hover:bg-card/70"
            )}
            onClick={status !== "connected" ? onReconnect : undefined}
          >
            {getQualityIcon(quality, status)}
            <span className={cn("text-xs font-medium", getQualityColor(quality, status))}>
              {getQualityText(quality, status)}
            </span>
            {messageRate > 0 && (
              <span className="text-xs text-muted-foreground">
                {messageRate}/s
              </span>
            )}
            {status !== "connected" && (
              <RefreshCw className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ConnectionQualityIndicator.displayName = "ConnectionQualityIndicator";
