import React, { useRef, useEffect, useMemo, useCallback, useState, memo } from "react";
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Users, Wifi, WifiOff, RefreshCw } from "lucide-react";
// `react-window` is imported dynamically to avoid build errors when dependency isn't installed yet

/* ================= TYPES ================= */

import { SupportingTeam } from "./TeamSupportBadge";

export interface ChatResponse {
  id: string;
  odytChannelId: string;
  userName: string;
  avatarUrl?: string;
  answer: string;
  responseTimeMs: number;
  isCorrect?: boolean | null;
  score?: number;
  serverSeq?: number;
  supportingTeam?: SupportingTeam;
}

interface YouTubeChatResponsesProps {
  isAnswerRevealed: boolean;
  correctAnswer: number | null;
  correctLabel?: string | null;
  questionActive: boolean;
  allResponses: ChatResponse[];
  displayedResponses: ChatResponse[];
  status: "disconnected" | "connecting" | "connected" | "error";
  onReconnect: () => void;
  isPowerplayActive?: boolean;
  maskResponses?: boolean;
}

/* ================= HELPERS ================= */

const normalizeAnswer = (answer: string): string =>
  answer.trim().toUpperCase();

// Stable color palette cycling by position hash to support arbitrary labels
const ANSWER_COLORS_LIST = [
  "bg-rose-500/80 text-white",
  "bg-sky-500/80 text-white",
  "bg-amber-500/80 text-white",
  "bg-emerald-500/80 text-white",
  "bg-violet-500/80 text-white",
  "bg-orange-500/80 text-white",
];

const getAnswerColor = (answer: string): string => {
  const idx = answer.charCodeAt(0) % ANSWER_COLORS_LIST.length;
  return ANSWER_COLORS_LIST[idx] || "bg-muted text-muted-foreground";
};

// Memoized response item to avoid re-renders when unrelated answers update
interface ResponseItemProps {
  response: ChatResponse;
  compact?: boolean;
  isAnswerRevealed?: boolean;
  maskResponses?: boolean;
  style?: React.CSSProperties;
}

const ResponseItem = memo(function ResponseItem({ response, compact = false, isAnswerRevealed = false, maskResponses = false, style }: ResponseItemProps) {
  const avatarSeed = response.odytChannelId || response.userName;
  if (compact) {
    return (
      <div style={style} className="flex items-center gap-3 px-2">
        <Avatar className="w-8 h-8 border-2 border-border shadow-sm">
          <AvatarImage
            src={response.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
            alt={response.userName}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            loading="eager"
          />
          <AvatarFallback>{response.userName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="text-sm font-semibold truncate">{response.userName}</div>
          <div className="text-xs text-muted-foreground">
            {response.answer} {response.score ? `+${response.score}` : ''}
            {/* DEBUG: Show serverSeq only in dev mode */}
            {import.meta.env.DEV && response.serverSeq !== undefined ? `  #${response.serverSeq}` : ''}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={style} className="static-response-item">
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative">
          <Avatar className="w-12 h-12 border-2 border-border shadow-lg">
            <AvatarImage
              src={response.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
              alt={response.userName}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              loading="eager"
            />
            <AvatarFallback>{response.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          {/* ONLY show answer badge if NOT revealed AND NOT masked */}
          {!isAnswerRevealed && !maskResponses && (
            <span className={`absolute -bottom-1 -right-1 w-6 h-6 p-0 flex items-center justify-center text-xs font-bold shadow-md ${getAnswerColor(response.answer)}`}>
              {response.answer}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-center max-w-[72px] truncate">
          {response.userName}
        </span>
        {/* DEBUG: Show serverSeq only in dev mode for debugging */}
        {import.meta.env.DEV && response.serverSeq !== undefined && (
          <span className="text-[10px] text-muted-foreground opacity-50">#{response.serverSeq}</span>
        )}
        {/* ONLY show score after answer is revealed */}
        {isAnswerRevealed && response.score !== undefined && response.score > 0 && (
          <span className="text-xs text-emerald-500 font-bold">+{response.score}</span>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  // Re-render only when key display fields change
  return (
    prev.response.id === next.response.id &&
    prev.response.score === next.response.score &&
    prev.response.isCorrect === next.response.isCorrect &&
    prev.response.avatarUrl === next.response.avatarUrl &&
    prev.response.userName === next.response.userName &&
    prev.isAnswerRevealed === next.isAnswerRevealed &&
    prev.maskResponses === next.maskResponses &&
    prev.compact === next.compact
  );
});

/* ================= COMPONENT ================= */

export const YouTubeChatResponses = ({
  isAnswerRevealed,
  correctAnswer,
  correctLabel = null,
  questionActive,
  allResponses,
  displayedResponses,
  status,
  onReconnect,
  isPowerplayActive = false,
  maskResponses = false,
}: YouTubeChatResponsesProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /* ===== Auto-scroll only while question is active ===== */
  // Debounced scroll to avoid layout thrashing
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (!isAnswerRevealed) {
      debouncedScroll();
    }
    // Cleanup on unmount
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [displayedResponses, isAnswerRevealed, debouncedScroll]);

  /* ===== Derived data (memoized) ===== */

  const normalizedAllResponses = useMemo(
    () =>
      allResponses.map((r) => ({
        ...r,
        answer: normalizeAnswer(r.answer),
      })),
    [allResponses]
  );

  const effectiveCorrectLabel = correctLabel ?? null;

  const correctResponses = useMemo(() => {
    if (effectiveCorrectLabel === null) return [];
    return normalizedAllResponses.filter((r) => r.answer === effectiveCorrectLabel);
  }, [normalizedAllResponses, effectiveCorrectLabel]);

  const visibleResponses = isAnswerRevealed && effectiveCorrectLabel !== null
    ? correctResponses
    : displayedResponses;

  const VIRTUALIZE_THRESHOLD = 200;
  // Animation thresholds: only use expensive Framer Motion layout animations for very small lists
  const MOTION_LAYOUT_THRESHOLD = 20; // use Framer Motion layout only for <= 20 items
  const useFramerMotion = visibleResponses.length <= MOTION_LAYOUT_THRESHOLD;
  const useSimpleRender = visibleResponses.length > MOTION_LAYOUT_THRESHOLD && visibleResponses.length <= VIRTUALIZE_THRESHOLD;
  // When responses exceed VIRTUALIZE_THRESHOLD, show a recent window to limit DOM nodes; prefer virtualization
  const visibleWindow = visibleResponses.length > VIRTUALIZE_THRESHOLD
    ? visibleResponses.slice(visibleResponses.length - VIRTUALIZE_THRESHOLD)
    : visibleResponses;
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    const el = scrollContainerRef.current;
    const updateWidth = () => {
      if (el) setContainerWidth(el.clientWidth || 800);
      else setContainerWidth(Math.min(window.innerWidth, 800));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Dynamically import react-window when virtualization is required
  // no-op: using simple windowing for large lists instead of external virtualization library

  const answerCounts = useMemo(() => {
    return normalizedAllResponses.reduce((acc, r) => {
      acc[r.answer] = (acc[r.answer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [normalizedAllResponses]);

  if (!questionActive) return null;

  /* ================= UI ================= */

  const outerContent = (
    <div className="w-full">
      <div className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-md rounded-xl border border-border/50 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2 border-b border-border/50 bg-gradient-to-r from-red-500/20 to-red-600/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">LiveChat Answers</span>

            <div className="flex items-center gap-1 ml-2">
              {status === "connected" && (
                <Wifi className="w-3 h-3 text-emerald-400" />
              )}
              {status === "connecting" && (
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              )}
              {(status === "disconnected" || status === "error") && (
                <button
                  onClick={onReconnect}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300"
                >
                  <WifiOff className="w-3 h-3" />
                  <span className="text-xs">Answers Closed</span>
                </button>
              )}
            </div>
          </div>

          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {allResponses.length}
          </Badge>
        </div>

        {/* Revealed stats */}
        {isAnswerRevealed && effectiveCorrectLabel !== null && (
          <div className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/10 border-b border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-bold">
                  {correctResponses.length} Correct
                </span>
              </div>

              <div className="flex gap-3">
                {Object.keys(answerCounts).sort().map((ans) => {
                  const count = answerCounts[ans] || 0;
                  const isCorrect = ans === effectiveCorrectLabel;
                  return (
                    <span
                      key={ans}
                      className={`text-xs font-bold ${isCorrect
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                        }`}
                    >
                      {ans}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Responses */}
        <div
          ref={scrollContainerRef}
          className="p-4 max-h-64 overflow-y-auto scroll-smooth"
        >
          <div className="flex flex-wrap gap-3 items-start">
            {visibleResponses.length > VIRTUALIZE_THRESHOLD ? (
              // Large list: render a recent window to limit DOM nodes
              <div className="flex flex-wrap gap-3 items-start">
                {visibleWindow.map((response) => (
                  <ResponseItem key={response.id} response={response} isAnswerRevealed={isAnswerRevealed} maskResponses={maskResponses} />
                ))}
              </div>
            ) : useFramerMotion ? (
              <AnimatePresence initial={false} mode="popLayout">
                {visibleResponses.map((response) => (
                  <motion.div
                    key={response.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <ResponseItem response={response} isAnswerRevealed={isAnswerRevealed} maskResponses={maskResponses} />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-wrap gap-3 items-start">
                {visibleResponses.map((response) => {
                  const avatarSeed = response.odytChannelId || response.userName;
                  return (
                    <div key={response.id} className="static-response-item">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="relative">
                          <Avatar className="w-12 h-12 border-2 border-border shadow-lg">
                            <AvatarImage
                              src={
                                response.avatarUrl ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`
                              }
                              alt={response.userName}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              loading="eager"
                            />
                            <AvatarFallback>
                              {response.userName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {/* ONLY show answer badge if NOT revealed AND NOT masked */}
                          {!isAnswerRevealed && !maskResponses && (
                            <span
                              className={`absolute -bottom-1 -right-1 w-6 h-6 p-0 flex items-center justify-center text-xs font-bold shadow-md ${getAnswerColor(response.answer)}`}
                            >
                              {response.answer}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-center max-w-[72px] truncate">
                          {response.userName}
                        </span>
                        {/* ONLY show score after answer is revealed */}
                        {isAnswerRevealed && response.score !== undefined && response.score > 0 && (
                          <span className="text-xs text-emerald-500 font-bold">+{response.score}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Conditionally use motion wrapper for small lists only
  if (useFramerMotion) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        {outerContent.props.children}
      </motion.div>
    );
  }

  // Plain wrapper for larger lists to avoid Framer Motion runtime cost
  return outerContent;
};

export default YouTubeChatResponses;
