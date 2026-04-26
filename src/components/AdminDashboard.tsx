import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trophy, Users, Clock, CheckCircle, Target, TrendingUp, BarChart3, Activity, Zap, Award } from "lucide-react";
import type { QuizSessionRecord } from "@/hooks/useQuizSession";
import { AnimatedScore } from "@/components/AnimatedScore";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 173 58% 39%))",
  "hsl(var(--chart-3, 197 37% 24%))",
  "hsl(var(--chart-4, 43 74% 66%))",
  "hsl(var(--chart-5, 27 87% 67%))",
];

interface AdminDashboardProps {
  sessions?: QuizSessionRecord[];
}

export const AdminDashboard = ({ sessions: propSessions }: AdminDashboardProps) => {
  const [sessions, setSessions] = useState<QuizSessionRecord[]>(propSessions || []);
  const [loading, setLoading] = useState(!propSessions);

  useEffect(() => {
    if (propSessions) { setSessions(propSessions); return; }
    // Sessions are now backend-only; parent should provide via props
    setLoading(false);
  }, [propSessions]);

  const stats = useMemo(() => {
    const completed = sessions.filter(s => s.status === "completed");
    const totalViewers = sessions.reduce((s, x) => s + (x.totalViewers || 0), 0);
    const totalResponses = sessions.reduce((s, x) => s + (x.totalViewerResponses || 0), 0);
    const totalQuestions = sessions.reduce((s, x) => s + (x.totalQuestions || 0), 0);
    const avgViewers = sessions.length > 0 ? totalViewers / sessions.length : 0;
    const avgDuration = completed.length > 0
      ? completed.reduce((s, x) => s + ((x.endedAt || x.startedAt) - x.startedAt), 0) / completed.length / 60000
      : 0;
    return { total: sessions.length, completed: completed.length, totalViewers, totalResponses, totalQuestions, avgViewers, avgDuration };
  }, [sessions]);

  const teamWinData = useMemo(() => {
    const wins: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.teamLeaderboard.length > 0) {
        const winner = [...s.teamLeaderboard].sort((a, b) => a.rank - b.rank)[0];
        if (winner) wins[winner.teamName] = (wins[winner.teamName] || 0) + 1;
      }
    });
    return Object.entries(wins).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const viewerParticipation = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => a.startedAt - b.startedAt)
      .slice(-10)
      .map(s => ({
        label: `Ep ${s.episodeNumber}`,
        viewers: s.totalViewers || 0,
        responses: s.totalViewerResponses || 0,
      }));
  }, [sessions]);

  const topViewers = useMemo(() => {
    const map = new Map<string, { name: string; score: number; quizzes: number }>();
    sessions.forEach(s => {
      s.viewerLeaderboard.forEach(v => {
        const existing = map.get(v.odytChannelId);
        if (existing) {
          existing.score += v.totalScore;
          existing.quizzes += 1;
        } else {
          map.set(v.odytChannelId, { name: v.userName, score: v.totalScore, quizzes: 1 });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [sessions]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No quiz history yet</p>
        <p className="text-sm mt-2">Start your first quiz to see dashboard stats here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Quizzes Played", value: stats.total, icon: History, color: "text-primary" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
          { label: "Total Viewers", value: stats.totalViewers, icon: Users, color: "text-blue-400" },
          { label: "Total Responses", value: stats.totalResponses, icon: Target, color: "text-amber-400" },
          { label: "Avg Viewers", value: Math.round(stats.avgViewers), icon: TrendingUp, color: "text-purple-400" },
          { label: "Avg Duration", value: stats.avgDuration, icon: Clock, color: "text-cyan-400", suffix: "m" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card/80 border-border/50">
                <CardContent className="p-4 text-center">
                  <Icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                  <div className="text-2xl font-bold text-foreground">
                    {'suffix' in s ? `${(s.value as number).toFixed(1)}${s.suffix}` : <AnimatedScore value={s.value as number} />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team Win Distribution */}
        {teamWinData.length > 0 && (
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" /> Team Win Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={teamWinData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}>
                    {teamWinData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Participation Trend */}
        {viewerParticipation.length > 1 && (
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Viewer Participation Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={viewerParticipation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="viewers" fill="hsl(var(--primary))" name="Viewers" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="responses" fill="hsl(var(--chart-2, 173 58% 39%))" name="Responses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Viewers */}
      {topViewers.length > 0 && (
        <Card className="bg-card/80 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" /> Top Viewers (Across Sessions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topViewers.map((viewer, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-8 justify-center">#{idx + 1}</Badge>
                    <div>
                      <div className="font-medium text-foreground text-sm">{viewer.name}</div>
                      <div className="text-xs text-muted-foreground">{viewer.quizzes} quiz{viewer.quizzes > 1 ? 'zes' : ''}</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary">{viewer.score}</div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {sessions.slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                  <div>
                    <div className="font-medium text-sm text-foreground">Episode {s.episodeNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.totalViewers} viewers · {s.totalViewerResponses} responses
                    </div>
                  </div>
                  <Badge variant={s.status === 'completed' ? 'default' : 'secondary'}>{s.status}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
