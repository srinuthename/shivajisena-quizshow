import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Target, Lock, Unlock, Crown, TrendingUp, Users } from "lucide-react";
import { Team } from "@/types/quiz";

export interface ViewerPrediction {
  odytChannelId: string;
  userName: string;
  avatarUrl: string;
  predictedTeam: string; // team name
  predictedAt: number;
}

interface ViewerPredictionSystemProps {
  predictions: Map<string, ViewerPrediction>;
  teams: Team[];
  scores: number[];
  isLocked: boolean;
  onLockToggle: () => void;
  compact?: boolean;
}

const PREDICTION_HASHTAGS: Record<string, string> = {
  "#predict-east": "east",
  "#predict-west": "west",
  "#predict-north": "north",
  "#predict-south": "south",
  "#predicteast": "east",
  "#predictwest": "west",
  "#predictnorth": "north",
  "#predictsouth": "south",
};

/** Detect prediction hashtag from a message */
export const detectPredictionHashtag = (message: string): string | null => {
  const normalized = message.trim().toLowerCase().replace(/\s+/g, "");
  return PREDICTION_HASHTAGS[normalized] || null;
};

/** Check if a team name matches a direction keyword */
const matchesTeam = (teamName: string, keyword: string): boolean =>
  teamName.toLowerCase().includes(keyword);

export const ViewerPredictionSystem = memo(({
  predictions, teams, scores, isLocked, onLockToggle, compact = false,
}: ViewerPredictionSystemProps) => {
  // Count predictions per team
  const predictionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teams.forEach(t => { counts[t.name] = 0; });
    predictions.forEach(p => {
      // Match prediction to team
      for (const team of teams) {
        if (matchesTeam(team.name, p.predictedTeam)) {
          counts[team.name] = (counts[team.name] || 0) + 1;
          break;
        }
      }
    });
    return counts;
  }, [predictions, teams]);

  const totalPredictions = predictions.size;

  // Find current leader
  const leader = useMemo(() => {
    let best = 0, bestIdx = 0;
    scores.forEach((s, i) => { if (s > best) { best = s; bestIdx = i; } });
    return best > 0 ? teams[bestIdx]?.name : null;
  }, [scores, teams]);

  // How many predicted correctly (predicted the current leader)
  const correctPredictions = useMemo(() => {
    if (!leader) return 0;
    let count = 0;
    predictions.forEach(p => {
      if (matchesTeam(leader, p.predictedTeam)) count++;
    });
    return count;
  }, [predictions, leader]);

  return (
    <div className="leaderboard-glossy rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Viewer Predictions</span>
          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/30">
            {totalPredictions}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLockToggle}
          className="h-7 px-2 text-xs gap-1"
        >
          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {isLocked ? "Locked" : "Open"}
        </Button>
      </div>

      {/* Prediction bars */}
      <div className="space-y-1.5">
        {teams.map((team, idx) => {
          const count = predictionCounts[team.name] || 0;
          const pct = totalPredictions > 0 ? Math.round((count / totalPredictions) * 100) : 0;
          const isLeader = leader && matchesTeam(team.name, leader.toLowerCase().replace("#", ""));
          return (
            <motion.div key={team.id} layout className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{team.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{count}</span>
                  <span className="text-muted-foreground/50">({pct}%)</span>
                  {isLeader && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                </div>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Accuracy stat */}
      {leader && totalPredictions > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-2">
          <span className="flex items-center gap-1">
            <Crown className="w-3 h-3 text-yellow-400" /> Current leader: <span className="text-foreground font-medium">{leader}</span>
          </span>
          <span className="text-emerald-400 font-medium">
            {correctPredictions} correct ({totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0}%)
          </span>
        </div>
      )}
    </div>
  );
});

ViewerPredictionSystem.displayName = "ViewerPredictionSystem";
