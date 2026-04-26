import { useState, useEffect, forwardRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, AlertTriangle } from "lucide-react";
import { getActiveSession } from "@/lib/quizActiveSession";
import type { QuizSessionRecord } from "@/hooks/useQuizSession";
import { formatDistanceToNow } from "date-fns";

interface SessionRecoveryDialogProps {
  onRecover: (session: QuizSessionRecord) => void;
  onStartFresh: () => void;
}

export const SessionRecoveryDialog = forwardRef<HTMLDivElement, SessionRecoveryDialogProps>(
  ({ onRecover, onStartFresh }, ref) => {
  const [open, setOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<QuizSessionRecord | null>(null);

  useEffect(() => {
    const checkForActiveSession = async () => {
      try {
        const active = getActiveSession();
        if (active) {
          const session: QuizSessionRecord = {
            id: active.sessionId,
            episodeNumber: active.episodeNumber,
            startedAt: active.startedAt,
            createdAt: active.startedAt,
            status: 'active',
            totalQuestions: 0,
            totalViewerResponses: 0,
            totalViewers: 0,
            teamLeaderboard: [],
            viewerLeaderboard: [],
          };
          setActiveSession(session);
          setOpen(true);
        }
      } catch (error) {
        console.error("Failed to check for active session:", error);
      }
    };
    
    checkForActiveSession();
  }, []);

  const handleRecover = () => {
    if (activeSession) {
      onRecover(activeSession);
    }
    setOpen(false);
  };

  const handleStartFresh = () => {
    onStartFresh();
    setOpen(false);
  };

  if (!activeSession) return null;

  const timeSinceStart = formatDistanceToNow(activeSession.createdAt, { addSuffix: true });

  return (
    <div ref={ref}>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Previous Session Found
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  A quiz session was interrupted. Would you like to resume or start fresh?
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      Episode {activeSession.episodeNumber}
                    </span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      Interrupted
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Started {timeSinceStart}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {activeSession.totalViewers} viewers • {activeSession.totalViewerResponses} responses
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Note: Resuming will continue the session with existing scores intact.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartFresh}>
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRecover}>
              Resume Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

SessionRecoveryDialog.displayName = "SessionRecoveryDialog";