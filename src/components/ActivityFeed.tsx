import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, X, ArrowRight, Clock, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

export interface ActivityLog {
  id: string;
  type: "correct" | "wrong" | "pass" | "master" | "penalty" | "powerplay" | "skip";
  teamName: string;
  teamColor: string;
  timestamp: Date;
  points?: number;
  message?: string;
}

interface ActivityFeedProps {
  activities: ActivityLog[];
}

export const ActivityFeed = ({ activities }: ActivityFeedProps) => {
  const { t } = useTranslation();

  const getIcon = (type: ActivityLog["type"]) => {
    switch (type) {
      case "correct":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "wrong":
        return <X className="h-4 w-4 text-red-600" />;
      case "pass":
        return <ArrowRight className="h-4 w-4 text-orange-600" />;
      case "master":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "penalty":
        return <X className="h-4 w-4 text-amber-600" />;
      case "powerplay":
        return <Zap className="h-4 w-4 text-orange-500" />;
      case "skip":
        return <ArrowRight className="h-4 w-4 text-cyan-600" />;
    }
  };

  const getActionText = (activity: ActivityLog) => {
    // Use custom message if provided
    if (activity.message) {
      return activity.message;
    }
    
    switch (activity.type) {
      case "correct":
        return `${t.answeredCorrectly} (+${activity.points})`;
      case "wrong":
        return `${t.answeredIncorrectly} (${activity.points})`;
      case "pass":
        return t.passedQuestion;
      case "master":
        return t.questionToMaster;
      case "penalty":
        return `${t.usedLifeline} (${activity.points})`;
      case "powerplay":
        return t.activatedPowerplay;
      case "skip":
        return t.skippedQuestion;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {t.activityFeed}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {activities.slice().reverse().map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="mt-0.5">{getIcon(activity.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={activity.teamColor} variant="outline">
                        {activity.teamName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">
                      {getActionText(activity)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {activities.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {t.gameNotStarted}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
