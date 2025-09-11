import { useEffect } from 'react';

interface KeyboardShortcuts {
  onStartGame?: () => void;
  onLockAnswer?: () => void;
  onFetchVotes?: () => void;
  onAllowChange?: () => void;
  onRevealAnswer?: () => void;
  onNextQuestion?: () => void;
  onTriggerFinalAnimation?: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onStartGame,
  onLockAnswer,
  onFetchVotes,
  onAllowChange,
  onRevealAnswer,
  onNextQuestion,
  onTriggerFinalAnimation,
  enabled = true,
}: KeyboardShortcuts) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Only respond if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 's':
          if (event.ctrlKey && onStartGame) {
            event.preventDefault();
            onStartGame();
          }
          break;
        case 'l':
          if (onLockAnswer) {
            event.preventDefault();
            onLockAnswer();
          }
          break;
        case 'v':
          if (onFetchVotes) {
            event.preventDefault();
            onFetchVotes();
          }
          break;
        case 'c':
          if (onAllowChange) {
            event.preventDefault();
            onAllowChange();
          }
          break;
        case 'r':
          if (onRevealAnswer) {
            event.preventDefault();
            onRevealAnswer();
          }
          break;
        case 'n':
          if (onNextQuestion) {
            event.preventDefault();
            onNextQuestion();
          }
          break;
        case 'f':
          if (onTriggerFinalAnimation) {
            event.preventDefault();
            onTriggerFinalAnimation();
          }
          break;
        case '?':
          // Show help dialog
          alert(`Keyboard Shortcuts:
• Ctrl+S: Start Game
• L: Lock Answer
• V: Show Viewer Votes
• C: Allow Change
• R: Reveal Answer
• N: Next Question
• F: Final Animation
• ?: Show this help`);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    enabled,
    onStartGame,
    onLockAnswer,
    onFetchVotes,
    onAllowChange,
    onRevealAnswer,
    onNextQuestion,
    onTriggerFinalAnimation,
  ]);
};