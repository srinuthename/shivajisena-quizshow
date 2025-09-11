import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Lock,
  Users,
  Eye,
  RefreshCw,
  Play,
  ChevronRight
} from "lucide-react";

interface HostControlsProps {
  phase: string;
  onLockAnswer: () => void;
  onFetchVotes: () => void;
  onAllowChange: () => void;
  onRevealAnswer: () => void;
  onNextQuestion: () => void;
  onDisplayResults: () => void;
  onStartGame: () => void;
  onTogglePause: () => void;   // ✅ keep this
  isPaused: boolean;
  isLoading?: boolean;
  fetchViewerVotes?: boolean;
  allowAnswerReview?: boolean;
  isLastQuestion?: boolean;
}



export function HostControls({
  phase,
  onLockAnswer,
  onFetchVotes,
  onAllowChange,
  onRevealAnswer,
  onNextQuestion,
  onDisplayResults,
  onStartGame,
  onTogglePause,   // ✅ add this
  isPaused,
  isLoading,
  fetchViewerVotes = false,
  allowAnswerReview = true,
  isLastQuestion = false,
}: HostControlsProps) {

  const renderControls = () => {
    switch (phase) {
      case 'waiting':
        return (
          <Button
            onClick={onStartGame}
            size="lg"
            className="w-full h-16 gradient-primary text-primary-foreground hover:glow-primary"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Game
          </Button>
        );

      case 'question':
        return (
          <div className="space-y-3">
            <Button
              onClick={onLockAnswer}
              size="lg"
              className="w-full h-16 border-2 border-academic-gold hover:bg-academic-gold/20 hover:glow-success"
              disabled={isLoading}
            >
              <Lock className="mr-2 h-5 w-5" />
              Lock Answer
            </Button>

            {/* Pause/Resume Button */}
            <Button
              onClick={onTogglePause}
              size="lg"
              className="w-full h-16 border-2 border-blue-500 hover:bg-blue-500/20 hover:glow-info"
            >
              {isPaused ? (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Resume Timer
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Pause Timer
                </>
              )}
            </Button>
          </div>
        );


      case 'guest-answered':
        if (fetchViewerVotes) {
          return (
            <Button
              onClick={onFetchVotes}
              size="lg"
              className="w-full h-16 border-2 border-primary hover:bg-primary/20 hover:glow-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>Loading...</>
              ) : (
                <>
                  <Users className="mr-2 h-5 w-5" />
                  Fetch Viewer Votes
                </>
              )}
            </Button>
          );
        } else if (allowAnswerReview) {
          // Show Allow Answer Change button when no viewer votes but answer review is enabled
          return (
            <div className="space-y-3">
              <Button
                onClick={onAllowChange}
                size="lg"
                className="w-full h-16 border-2 border-secondary hover:bg-secondary/20 hover:glow-secondary"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Allow Answer Change
              </Button>
              <Button
                onClick={onRevealAnswer}
                size="lg"
                className="w-full h-16 border-2 border-accent hover:bg-accent/20 hover:glow-accent"
              >
                <Eye className="mr-2 h-5 w-5" />
                Reveal Answer
              </Button>
            </div>
          );
        } else {
          return (
            <Button
              onClick={onRevealAnswer}
              size="lg"
              className="w-full h-16 border-2 border-accent hover:bg-accent/20 hover:glow-accent"
            >
              <Eye className="mr-2 h-5 w-5" />
              Reveal Answer
            </Button>
          );
        }

      case 'viewer-votes':
        if (allowAnswerReview) {
          return (
            <Button
              onClick={onAllowChange}
              size="lg"
              className="w-full h-16 border-2 border-secondary hover:bg-secondary/20 hover:glow-secondary"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Allow Answer Change
            </Button>
          );
        } else {
          return (
            <Button
              onClick={onRevealAnswer}
              size="lg"
              className="w-full h-16 border-2 border-accent hover:bg-accent/20 hover:glow-accent"
            >
              <Eye className="mr-2 h-5 w-5" />
              Reveal Answer
            </Button>
          );
        }

      case 'final-decision':
        return (
          <Button
            onClick={onRevealAnswer}
            size="lg"
            className="w-full h-16 border-2 border-accent hover:bg-accent/20 hover:glow-accent"
          >
            <Eye className="mr-2 h-5 w-5" />
            Reveal Answer
          </Button>
        );

      case 'revealed':
        return (
          <Button
            onClick={isLastQuestion ? onDisplayResults : onNextQuestion}
            size="lg"
            className="w-full h-16 gradient-secondary text-primary-foreground hover:glow-secondary"
          >
            <ChevronRight className="mr-2 h-5 w-5" />
            {isLastQuestion ? 'Display Results' : 'Next Question'}
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <h3 className="text-xl font-bold text-academic-gold">Host Controls</h3>
      <div className="space-y-3">
        {renderControls()}
      </div>
      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <p className="text-sm text-muted-foreground">Current Phase:</p>
        <p className="text-sm font-medium capitalize">{phase.replace("-", " ")}</p>
      </div>
    </div>
  );
}