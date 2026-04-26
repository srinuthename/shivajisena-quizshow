import { memo, useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface EmojiReaction {
  id: string;
  emoji: string;
  userName: string;
  x: number; // 0-100 percentage
}

const EMOJI_MAP: Record<string, string> = {
  fire: "🔥", flame: "🔥",
  clap: "👏", applause: "👏",
  love: "❤️", heart: "❤️",
  wow: "😮", omg: "😮",
  laugh: "😂", lol: "😂",
  thumbsup: "👍", like: "👍",
  star: "⭐", amazing: "⭐",
  trophy: "🏆", win: "🏆",
  lightning: "⚡", zap: "⚡",
  party: "🎉", celebrate: "🎉",
  muscle: "💪", strong: "💪",
  target: "🎯", bullseye: "🎯",
  cry: "😢", sad: "😢",
  think: "🤔", hmm: "🤔",
  rocket: "🚀", moon: "🚀",
  hundred: "💯", perfect: "💯",
  eyes: "👀", look: "👀",
};

// Direct emoji characters supported
const DIRECT_EMOJIS = new Set([
  "🔥","👏","❤️","😮","😂","👍","⭐","🏆","⚡","🎉",
  "💪","🎯","😢","🤔","🚀","💯","👀","✨","🙌","😍",
]);

/**
 * Detect emoji reaction from a chat message.
 * Supports: #🔥, #fire, #react-fire, #emoji-clap, or just the emoji character.
 */
export const detectEmojiReaction = (message: string): string | null => {
  const normalized = message.trim().toLowerCase();

  // Check #emoji patterns: #🔥, #fire, #react-fire, #emoji-clap
  const hashMatch = normalized.match(/^#(?:react-?|emoji-?)?(.+)$/);
  if (hashMatch) {
    const key = hashMatch[1].trim();
    // Direct emoji in hashtag
    if (DIRECT_EMOJIS.has(key)) return key;
    // Named emoji
    if (EMOJI_MAP[key]) return EMOJI_MAP[key];
  }

  // Single emoji character
  if (DIRECT_EMOJIS.has(normalized)) return normalized;

  return null;
};

const MAX_VISIBLE = 30;

interface AudienceReactionsProps {
  reactions: EmojiReaction[];
}

const FloatingEmoji = memo(({ reaction }: { reaction: EmojiReaction }) => (
  <motion.div
    key={reaction.id}
    initial={{ opacity: 0, y: 0, scale: 0.5 }}
    animate={{
      opacity: [0, 1, 1, 0],
      y: [0, -120, -300, -420],
      scale: [0.5, 1.2, 1, 0.8],
      x: [0, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 60],
    }}
    transition={{ duration: 3, ease: "easeOut" }}
    className="absolute pointer-events-none"
    style={{ left: `${reaction.x}%`, bottom: "10%" }}
  >
    <span className="text-3xl sm:text-4xl drop-shadow-lg">{reaction.emoji}</span>
  </motion.div>
));
FloatingEmoji.displayName = "FloatingEmoji";

export const AudienceReactions = memo(({ reactions }: AudienceReactionsProps) => {
  const visible = reactions.slice(-MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {visible.map((r) => (
          <FloatingEmoji key={r.id} reaction={r} />
        ))}
      </AnimatePresence>
    </div>
  );
});
AudienceReactions.displayName = "AudienceReactions";
