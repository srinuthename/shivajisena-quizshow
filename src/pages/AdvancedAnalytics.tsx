import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Coins, Medal, Search, Trophy, Users, Activity, Clock, Target, TrendingUp, Zap, Hash, Percent, Timer, Eye, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnimatedScore } from '@/components/AnimatedScore';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import {
  getAnalyticsOverview, getViewerAnalytics, getViewerDrilldown,
  getAnalyticsQuizRuns, getQuizRunActions, getQuizRunUsers,
  type AnalyticsOverview, type AnalyticsQuizRunRow, type QuizRunActionRow,
  type QuizRunUserSummaryRow, type ViewerAnalyticsRow, type ViewerDrilldownData,
} from '@/services/analyticsApi';
import { isQuizAnalyticsEnabled } from '@/lib/analyticsIdentity';

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value || 0);
const formatPercent = (value: number) => `${(value || 0).toFixed(1)}%`;

const initials = (row: { displayName?: string; userName?: string }) => {
  const source = row.displayName || row.userName || 'Viewer';
  return source.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 173 58% 39%))",
  "hsl(var(--chart-3, 197 37% 24%))",
  "hsl(var(--chart-4, 43 74% 66%))",
  "hsl(var(--chart-5, 27 87% 67%))",
];

type SandboxPreset = 'strict' | 'balanced' | 'lenient';
const KPI_CARDS_PER_PAGE = 6;
const TOP_PERFORMERS_PER_PAGE = 8;

const AdvancedAnalytics = ({ embedded = false }: { embedded?: boolean }) => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [rows, setRows] = useState<ViewerAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [episodeSearchInput, setEpisodeSearchInput] = useState('');
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [episodePage, setEpisodePage] = useState(1);
  const [topPerformerSearchInput, setTopPerformerSearchInput] = useState('');
  const [topPerformerSearch, setTopPerformerSearch] = useState('');
  const [topPerformerPage, setTopPerformerPage] = useState(1);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldown, setDrilldown] = useState<ViewerDrilldownData | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);
  const [analyticsEnabled] = useState<boolean>(() => isQuizAnalyticsEnabled());
  const [runs, setRuns] = useState<AnalyticsQuizRunRow[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [runUsers, setRunUsers] = useState<QuizRunUserSummaryRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [questionIndexFilter, setQuestionIndexFilter] = useState('');
  const [runActions, setRunActions] = useState<QuizRunActionRow[]>([]);
  const [runActionPage, setRunActionPage] = useState(1);
  const [runActionTotalPages, setRunActionTotalPages] = useState(1);
  const [runActionsLoading, setRunActionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sandboxEarlyMs, setSandboxEarlyMs] = useState('5000');
  const [sandboxLateMs, setSandboxLateMs] = useState('20000');
  const [sandboxMinAccepted, setSandboxMinAccepted] = useState('3');
  const [sandboxMinPct, setSandboxMinPct] = useState('60');
  const [sandboxPreset, setSandboxPreset] = useState<SandboxPreset>('balanced');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [sandboxRows, setSandboxRows] = useState<
    Array<{
      odytChannelId: string; name: string; accepted: number; avgResponseMs: number;
      earlyCount: number; lateCount: number; earlyPct: number; latePct: number;
      candidateTitles: string[];
    }>
  >([]);

  useEffect(() => {
    const id = window.setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setEpisodePage(1);
      setEpisodeSearch(episodeSearchInput.trim().toLowerCase());
    }, 300);
    return () => window.clearTimeout(id);
  }, [episodeSearchInput]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setTopPerformerPage(1);
      setTopPerformerSearch(topPerformerSearchInput.trim().toLowerCase());
    }, 300);
    return () => window.clearTimeout(id);
  }, [topPerformerSearchInput]);

  const loadMainData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, viewersRes, runsRes] = await Promise.all([
        getAnalyticsOverview(1000),
        getViewerAnalytics(page, 25, search),
        // Show finished runs only — both `closed` and `ended` are completed states.
        // Hide `created` (open) and `aborted` runs from the analytics workspace.
        getAnalyticsQuizRuns(1, 50, 'closed,ended'),
      ]);
      if (!overviewRes.success || !viewersRes.success || !runsRes.success) {
        setError(overviewRes.error || viewersRes.error || runsRes.error || 'Failed to load analytics');
        setOverview(null); setRows([]); setRuns([]); setTotalPages(1);
      } else {
        setOverview(overviewRes.data || null);
        setRows(viewersRes.data?.viewers || []);
        const nextRuns = runsRes.data?.runs || [];
        setRuns(nextRuns);
        if (!selectedRunId && nextRuns.length > 0) setSelectedRunId(nextRuns[0].frontendQuizGameId);
        setTotalPages(Math.max(1, viewersRes.data?.totalPages || 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    }
    setLoading(false);
  }, [page, search, selectedRunId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await loadMainData();
    };
    void run();
    return () => { cancelled = true; };
  }, [loadMainData]);

  const statCards = useMemo(() => [
    { title: 'Completed Quizzes', value: formatNumber(overview?.totalCompletedQuizzes || 0), icon: Trophy, helper: 'Only completed sessions', color: 'text-yellow-400' },
    { title: 'Unique Participants', value: formatNumber(overview?.totalUniqueViewers || 0), icon: Users, helper: 'Distinct viewer IDs', color: 'text-blue-400' },
    { title: 'Total Coins Awarded', value: formatNumber(overview?.totalScoreAwarded || 0), icon: Coins, helper: 'Maps to final score', color: 'text-amber-400' },
    { title: 'Total Responses', value: formatNumber(overview?.totalResponses || 0), icon: BarChart3, helper: 'From final snapshots', color: 'text-green-400' },
  ], [overview]);

  const episodeKpis = useMemo(() => overview?.episodeKpis || [], [overview]);
  const filteredEpisodeKpis = useMemo(() => {
    if (!episodeSearch) return episodeKpis;
    return episodeKpis.filter((kpi) => {
      const haystack = [
        kpi.episodeName,
        kpi.frontendQuizGameId,
        kpi.episodeNumber,
        kpi.topScorerName,
        kpi.fastestAvgResponderName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(episodeSearch);
    });
  }, [episodeKpis, episodeSearch]);
  const episodeTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredEpisodeKpis.length / KPI_CARDS_PER_PAGE)),
    [filteredEpisodeKpis.length]
  );
  const paginatedEpisodeKpis = useMemo(() => {
    const start = (episodePage - 1) * KPI_CARDS_PER_PAGE;
    return filteredEpisodeKpis.slice(start, start + KPI_CARDS_PER_PAGE);
  }, [filteredEpisodeKpis, episodePage]);

  const episodeAccuracyData = useMemo(() =>
    episodeKpis.map(k => ({
      name: k.episodeName?.replace(/^.*-\s*/, 'Ep ') || k.frontendQuizGameId.slice(0, 8),
      overall: k.overallAccuracyPct,
      mean: k.meanViewerAccuracyPct,
      median: k.medianViewerAccuracyPct,
    })).slice(-10),
    [episodeKpis]
  );

  const episodeParticipationData = useMemo(() =>
    episodeKpis.map(k => ({
      name: k.episodeName?.replace(/^.*-\s*/, 'Ep ') || k.frontendQuizGameId.slice(0, 8),
      viewers: k.totalUniqueViewers || 0,
      responses: k.totalResponses || 0,
      avgResponse: Math.round(k.avgViewerResponseMs || 0),
    })).slice(-10),
    [episodeKpis]
  );

  const topPerformersChartData = useMemo(() =>
    (overview?.topPerformers || []).slice(0, 8).map(p => ({
      name: (p.displayName || p.userName || p.odytChannelId).slice(0, 12),
      score: p.totalScore,
      quizzes: p.quizzesPlayed,
    })),
    [overview]
  );
  const filteredTopPerformers = useMemo(() => {
    const rows = overview?.topPerformers || [];
    if (!topPerformerSearch) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.displayName,
        row.userName,
        row.odytChannelId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(topPerformerSearch);
    });
  }, [overview, topPerformerSearch]);
  const topPerformerTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTopPerformers.length / TOP_PERFORMERS_PER_PAGE)),
    [filteredTopPerformers.length]
  );
  const paginatedTopPerformers = useMemo(() => {
    const start = (topPerformerPage - 1) * TOP_PERFORMERS_PER_PAGE;
    return filteredTopPerformers.slice(start, start + TOP_PERFORMERS_PER_PAGE);
  }, [filteredTopPerformers, topPerformerPage]);

  // Response time trend across episodes
  const responseTimeTrend = useMemo(() =>
    episodeKpis.map(k => ({
      name: k.episodeName?.replace(/^.*-\s*/, 'Ep ') || k.frontendQuizGameId.slice(0, 8),
      avgMs: Math.round(k.avgViewerResponseMs || 0),
      fastestMs: Math.round(k.fastestAvgResponseMs || 0),
    })).slice(-10),
    [episodeKpis]
  );

  // Score concentration across episodes
  const scoreConcentrationData = useMemo(() =>
    episodeKpis.map(k => ({
      name: k.episodeName?.replace(/^.*-\s*/, 'Ep ') || k.frontendQuizGameId.slice(0, 8),
      top1Pct: k.scoreConcentrationTop1Pct || 0,
      above50Pct: k.viewersAccuracyAtLeast50Pct || 0,
    })).slice(-10),
    [episodeKpis]
  );

  const loadRunActions = useCallback(async (runId: string, pageToLoad = 1) => {
    if (!runId) { setRunActions([]); setRunActionTotalPages(1); return; }
    setRunActionsLoading(true);
    const result = await getQuizRunActions(runId, {
      page: pageToLoad, limit: 80,
      odytChannelId: selectedUserId || undefined,
      actionType: actionTypeFilter || undefined,
      questionIndex: questionIndexFilter === '' ? '' : Number(questionIndexFilter),
      sortOrder: 'desc',
    });
    if (!result.success) { setRunActions([]); setRunActionTotalPages(1); }
    else { setRunActions(result.data?.actions || []); setRunActionTotalPages(Math.max(1, result.data?.totalPages || 1)); }
    setRunActionsLoading(false);
  }, [selectedUserId, actionTypeFilter, questionIndexFilter]);

  useEffect(() => {
    if (!selectedRunId) { setRunUsers([]); setRunActions([]); return; }
    let cancelled = false;
    const loadRunUsers = async () => {
      const usersRes = await getQuizRunUsers(selectedRunId, 200);
      if (cancelled) return;
      setRunUsers(!usersRes.success ? [] : usersRes.data?.users || []);
      setRunActionPage(1);
    };
    void loadRunUsers();
    return () => { cancelled = true; };
  }, [selectedRunId, loadRunActions]);

  useEffect(() => {
    if (!selectedRunId) return;
    setRunActionPage(1);
    void loadRunActions(selectedRunId, 1);
  }, [selectedRunId, selectedUserId, actionTypeFilter, questionIndexFilter, loadRunActions]);

  useEffect(() => {
    if (!selectedRunId) return;
    void loadRunActions(selectedRunId, runActionPage);
  }, [runActionPage, selectedRunId, loadRunActions]);

  const computeTitleSandbox = useCallback(async () => {
    if (!selectedRunId) { setSandboxRows([]); return; }
    const earlyMs = Math.max(0, Number(sandboxEarlyMs) || 0);
    const lateMs = Math.max(0, Number(sandboxLateMs) || 0);
    const minAccepted = Math.max(1, Number(sandboxMinAccepted) || 1);
    const minPct = Math.max(0, Math.min(100, Number(sandboxMinPct) || 0));
    if (lateMs <= earlyMs) { setSandboxError('Late threshold must be greater than early threshold.'); setSandboxRows([]); return; }

    setSandboxLoading(true); setSandboxError(null);
    try {
      const byUser = new Map<string, { odytChannelId: string; name: string; accepted: number; totalResponseMs: number; earlyCount: number; lateCount: number; }>();
      let pg = 1; let tp = 1;
      do {
        const res = await getQuizRunActions(selectedRunId, { page: pg, limit: 500, actionType: 'scored_answer', sortOrder: 'desc' });
        if (!res.success) throw new Error(res.error || 'Failed to load');
        const actions = res.data?.actions || [];
        tp = Math.max(1, res.data?.totalPages || 1);
        for (const action of actions) {
          const userId = String(action.odytChannelId || '').trim();
          if (!userId) continue;
          const responseMs = Number(action.responseTimeMs);
          if (!Number.isFinite(responseMs) || responseMs < 0) continue;
          const existing = byUser.get(userId) || { odytChannelId: userId, name: action.displayName || action.userName || userId, accepted: 0, totalResponseMs: 0, earlyCount: 0, lateCount: 0 };
          existing.accepted += 1;
          existing.totalResponseMs += responseMs;
          if (responseMs <= earlyMs) existing.earlyCount += 1;
          if (responseMs >= lateMs) existing.lateCount += 1;
          if (!existing.name && (action.displayName || action.userName)) existing.name = action.displayName || action.userName || userId;
          byUser.set(userId, existing);
        }
        pg += 1;
      } while (pg <= tp);

      const result = Array.from(byUser.values())
        .filter(u => u.accepted >= minAccepted)
        .map(u => {
          const avgResponseMs = u.accepted > 0 ? u.totalResponseMs / u.accepted : 0;
          const earlyPct = u.accepted > 0 ? (u.earlyCount / u.accepted) * 100 : 0;
          const latePct = u.accepted > 0 ? (u.lateCount / u.accepted) * 100 : 0;
          const candidateTitles: string[] = [];
          if (u.earlyCount >= minAccepted && earlyPct >= minPct) candidateTitles.push('Early Bird');
          if (u.lateCount >= minAccepted && latePct >= minPct) candidateTitles.push('Late Comer');
          return { odytChannelId: u.odytChannelId, name: u.name, accepted: u.accepted, avgResponseMs, earlyCount: u.earlyCount, lateCount: u.lateCount, earlyPct, latePct, candidateTitles };
        })
        .filter(r => r.candidateTitles.length > 0)
        .sort((a, b) => b.candidateTitles.length - a.candidateTitles.length || b.accepted - a.accepted);
      setSandboxRows(result);
    } catch (err) {
      setSandboxError(err instanceof Error ? err.message : 'Failed to compute');
      setSandboxRows([]);
    } finally { setSandboxLoading(false); }
  }, [selectedRunId, sandboxEarlyMs, sandboxLateMs, sandboxMinAccepted, sandboxMinPct]);

  const applySandboxPreset = useCallback((preset: SandboxPreset) => {
    setSandboxPreset(preset);
    const presets = {
      strict: ['3000', '24000', '5', '75'],
      balanced: ['5000', '20000', '3', '60'],
      lenient: ['7000', '16000', '2', '50'],
    };
    const [e, l, m, p] = presets[preset];
    setSandboxEarlyMs(e); setSandboxLateMs(l); setSandboxMinAccepted(m); setSandboxMinPct(p);
  }, []);

  const parseSandboxPreset = (value: string): SandboxPreset =>
    value === 'strict' || value === 'lenient' ? value : 'balanced';

  const openDrilldown = async (row: ViewerAnalyticsRow) => {
    setDrilldownOpen(true); setDrilldown(null); setDrilldownError(null); setDrilldownLoading(true);
    const result = await getViewerDrilldown(row.odytChannelId, 40);
    if (!result.success) { setDrilldownError(result.error || 'Failed to load'); }
    else { setDrilldown(result.data || null); }
    setDrilldownLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 relative z-10">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {!embedded && (
          <PageHeader
            title="Advanced Analytics"
            icon={BarChart3}
            description="Backend analytics workspace — scored data, run reports, and viewer insights"
            actions={
              <Button variant="outline" size="sm" onClick={() => void loadMainData()} disabled={loading} className="h-9 rounded-lg gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            }
          />
        )}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">Analytics Unavailable</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Make sure orchestrator and MongoDB are connected. No IndexedDB fallback.</p>
            </CardContent>
          </Card>
        )}

        {!analyticsEnabled && (
          <Card className="border-amber-400/40 bg-amber-400/5">
            <CardHeader>
              <CardTitle className="text-amber-500">Analytics Toggle Is OFF</CardTitle>
              <CardDescription>Enable `Viewer Analytics Storage` in Admin to persist scored answer rows in MongoDB.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-lg transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${card.color}`} /> {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-foreground">{loading ? '...' : card.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{card.helper}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" className="gap-1"><Activity className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="participants" className="gap-1"><Users className="h-3.5 w-3.5" /> Participants</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1"><Clock className="h-3.5 w-3.5" /> Timeline</TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-1"><Zap className="h-3.5 w-3.5" /> Sandbox</TabsTrigger>
          </TabsList>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Episode Charts - 2 rows */}
            {episodeAccuracyData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-card/80 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> Accuracy Trends by Episode
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={episodeAccuracyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="overall" stroke="hsl(var(--primary))" strokeWidth={2} name="Overall" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="mean" stroke="hsl(var(--chart-2, 173 58% 39%))" strokeWidth={2} name="Mean" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="median" stroke="hsl(var(--chart-4, 43 74% 66%))" strokeWidth={2} name="Median" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" /> Participation by Episode
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={episodeParticipationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="viewers" fill="hsl(var(--primary))" name="Viewers" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="responses" fill="hsl(var(--chart-2, 173 58% 39%))" name="Responses" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Second row of charts */}
            {(responseTimeTrend.length > 0 || scoreConcentrationData.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {responseTimeTrend.length > 1 && (
                  <Card className="bg-card/80 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Timer className="h-4 w-4 text-cyan-400" /> Response Time Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={responseTimeTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="ms" />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="avgMs" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Avg Response" />
                          <Area type="monotone" dataKey="fastestMs" stroke="hsl(var(--chart-4, 43 74% 66%))" fill="hsl(var(--chart-4, 43 74% 66%) / 0.15)" name="Fastest Avg" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {scoreConcentrationData.length > 1 && (
                  <Card className="bg-card/80 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Percent className="h-4 w-4 text-violet-400" /> Score Concentration & Quality
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={scoreConcentrationData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="top1Pct" stroke="hsl(var(--chart-5, 27 87% 67%))" strokeWidth={2} name="Top1 Score %" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="above50Pct" stroke="hsl(var(--chart-2, 173 58% 39%))" strokeWidth={2} name="Viewers ≥50% Acc" dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Top Performers Chart */}
            {topPerformersChartData.length > 0 && (
              <Card className="bg-card/80 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" /> Top Scorers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topPerformersChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} width={90} />
                      <Tooltip />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Total Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Episode KPI Cards */}
            <Card className="bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Episode KPI Cards
                </CardTitle>
                <CardDescription>Auto-computed per completed episode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={episodeSearchInput}
                      onChange={(e) => setEpisodeSearchInput(e.target.value)}
                      placeholder="Search by episode, run ID, or scorer"
                      className="max-w-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Showing {paginatedEpisodeKpis.length} of {filteredEpisodeKpis.length} cards
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {paginatedEpisodeKpis.map((kpi, kpiIdx) => (
                    <motion.div key={kpi.frontendQuizGameId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: kpiIdx * 0.03 }}
                      className="rounded-lg border border-border/50 p-4 space-y-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">{kpi.episodeName || kpi.frontendQuizGameId}</div>
                          <div className="text-xs text-muted-foreground">
                            {kpi.frontendQuizGameId} {kpi.endedAt ? `· ${new Date(kpi.endedAt).toLocaleString()}` : ''}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">Q {formatNumber(kpi.totalQuestions || 0)}</Badge>
                          <Badge variant="outline">{formatNumber(kpi.totalUniqueViewers || 0)} viewers</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {[
                          { label: 'Overall Accuracy', value: formatPercent(kpi.overallAccuracyPct) },
                          { label: 'Mean Accuracy', value: formatPercent(kpi.meanViewerAccuracyPct) },
                          { label: 'Median Accuracy', value: formatPercent(kpi.medianViewerAccuracyPct) },
                          { label: 'Avg Response', value: `${formatNumber(Math.round(kpi.avgViewerResponseMs || 0))} ms` },
                          { label: 'Top Scorer', value: kpi.topScorerName || '-', sub: `${formatNumber(kpi.topScorerScore || 0)} coins` },
                          { label: 'Fastest Responder', value: kpi.fastestAvgResponderName || '-', sub: `${formatNumber(Math.round(kpi.fastestAvgResponseMs || 0))} ms` },
                          { label: 'Acc ≥50%', value: formatNumber(kpi.viewersAccuracyAtLeast50Pct || 0) },
                          { label: 'Top1 Score Share', value: formatPercent(kpi.scoreConcentrationTop1Pct) },
                        ].map(item => (
                          <div key={item.label} className="rounded border border-border/40 p-2 bg-background/50">
                            <span className="text-muted-foreground">{item.label}</span>
                            <div className="font-semibold text-foreground truncate">{item.value}</div>
                            {'sub' in item && item.sub && <div className="text-muted-foreground">{item.sub}</div>}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
                {!loading && filteredEpisodeKpis.length === 0 && <p className="text-sm text-muted-foreground">No completed episode KPI records found.</p>}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Page {episodePage} of {episodeTotalPages}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={episodePage <= 1} onClick={() => setEpisodePage((p) => Math.max(1, p - 1))}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={episodePage >= episodeTotalPages} onClick={() => setEpisodePage((p) => Math.min(episodeTotalPages, p + 1))}>Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers List */}
            <Card className="bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Medal className="h-5 w-5 text-amber-500" /> Top Performers
                </CardTitle>
                <CardDescription>Highest cumulative coin/score earners</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={topPerformerSearchInput}
                      onChange={(e) => setTopPerformerSearchInput(e.target.value)}
                      placeholder="Search by username or channel ID"
                      className="max-w-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Showing {paginatedTopPerformers.length} of {filteredTopPerformers.length} performers
                  </p>
                </div>
                <div className="space-y-2">
                  {paginatedTopPerformers.map((row, idx) => (
                    <motion.div key={row.odytChannelId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="secondary" className="w-8 justify-center">
                          #{((topPerformerPage - 1) * TOP_PERFORMERS_PER_PAGE) + idx + 1}
                        </Badge>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={row.avatarUrl || ''} alt={row.displayName || row.userName || row.odytChannelId} referrerPolicy="no-referrer" />
                          <AvatarFallback>{initials(row)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate text-foreground">{row.displayName || row.userName || row.odytChannelId}</div>
                          <div className="text-xs text-muted-foreground">{row.quizzesPlayed} quizzes • {row.totalCorrectAnswers} correct</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{formatNumber(row.totalScore)}</div>
                        <div className="text-xs text-muted-foreground">{row.firstPlaces}× #1 · best #{row.bestRank}</div>
                      </div>
                    </motion.div>
                  ))}
                  {!loading && filteredTopPerformers.length === 0 && <p className="text-sm text-muted-foreground">No performers found.</p>}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Page {topPerformerPage} of {topPerformerTotalPages}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={topPerformerPage <= 1} onClick={() => setTopPerformerPage((p) => Math.max(1, p - 1))}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={topPerformerPage >= topPerformerTotalPages} onClick={() => setTopPerformerPage((p) => Math.min(topPerformerTotalPages, p + 1))}>Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PARTICIPANTS TAB ===== */}
          <TabsContent value="participants" className="mt-6 space-y-6">
            <Card className="bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> All Participants</CardTitle>
                <CardDescription>Cumulative stats by viewer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by name or channel id" className="max-w-sm" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-2">Viewer</th>
                        <th className="text-right py-2 px-2">Coins</th>
                        <th className="text-right py-2 px-2">Quizzes</th>
                        <th className="text-right py-2 px-2">#1/#2/#3</th>
                        <th className="text-right py-2 px-2">Best</th>
                        <th className="text-right py-2 pl-2">Correct</th>
                        <th className="text-right py-2 pl-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.odytChannelId} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={row.avatarUrl || ''} referrerPolicy="no-referrer" />
                                <AvatarFallback>{initials(row)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium truncate text-foreground">{row.displayName || row.userName || row.odytChannelId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-primary">{formatNumber(row.totalScore)}</td>
                          <td className="py-2 px-2 text-right">{formatNumber(row.quizzesPlayed)}</td>
                          <td className="py-2 px-2 text-right">{row.firstPlaces}/{row.secondPlaces}/{row.thirdPlaces}</td>
                          <td className="py-2 px-2 text-right">#{row.bestRank || '-'}</td>
                          <td className="py-2 pl-2 text-right">{formatNumber(row.totalCorrectAnswers)}</td>
                          <td className="py-2 pl-2 text-right">
                            <Button variant="outline" size="sm" onClick={() => void openDrilldown(row)}>View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground mt-3">No rows found.</p>}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TIMELINE TAB ===== */}
          <TabsContent value="timeline" className="mt-6 space-y-6">
            <Card className="bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Per-User Action Timeline</CardTitle>
                <CardDescription>Inspect raw accepted/rejected answer actions for title-rule validation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Quiz Run</label>
                    <select className="w-full rounded-md border border-border bg-background p-2 text-sm" value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
                      <option value="">Select run</option>
                      {runs.map(run => <option key={run.frontendQuizGameId} value={run.frontendQuizGameId}>{run.episodeName || run.gameTitle || run.frontendQuizGameId} [{run.frontendQuizGameId.slice(0, 8)}] · {run.status}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Viewer</label>
                    <select className="w-full rounded-md border border-border bg-background p-2 text-sm" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} disabled={!selectedRunId}>
                      <option value="">All viewers</option>
                      {runUsers.map(user => <option key={user.odytChannelId} value={user.odytChannelId}>{user.displayName || user.userName || user.odytChannelId} ({user.totalActions})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Action Type</label>
                    <Input value={actionTypeFilter} onChange={(e) => setActionTypeFilter(e.target.value)} placeholder="scored_answer / rejected_*" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Question Index</label>
                    <Input value={questionIndexFilter} onChange={(e) => setQuestionIndexFilter(e.target.value.replace(/[^\d]/g, ''))} placeholder="e.g. 0" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/50 p-3 bg-muted/10">
                    <div className="text-sm font-semibold mb-2 text-foreground">Run User Summary</div>
                    <ScrollArea className="h-56">
                      <div className="space-y-1">
                        {runUsers.map(u => (
                          <button key={u.odytChannelId} type="button"
                            className={`w-full text-left rounded-lg border p-2 text-xs transition-colors ${selectedUserId === u.odytChannelId ? 'border-primary bg-primary/10' : 'border-border/40 hover:bg-muted/40'}`}
                            onClick={() => setSelectedUserId(prev => prev === u.odytChannelId ? '' : u.odytChannelId)}>
                            <div className="font-medium truncate text-foreground">{u.displayName || u.userName || u.odytChannelId}</div>
                            <div className="mt-1 text-muted-foreground">
                              actions {formatNumber(u.totalActions)} · accepted {formatNumber(u.acceptedAnswers)} · rejected {formatNumber(u.rejectedActions)}
                            </div>
                          </button>
                        ))}
                        {selectedRunId && runUsers.length === 0 && <p className="text-xs text-muted-foreground">No users.</p>}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="rounded-lg border border-border/50 p-3 bg-muted/10">
                    <div className="text-sm font-semibold mb-2 text-foreground">Action Timeline</div>
                    <ScrollArea className="h-56">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-1 pr-2">Time</th>
                            <th className="text-left py-1 pr-2">Viewer</th>
                            <th className="text-left py-1 pr-2">Q</th>
                            <th className="text-left py-1 pr-2">Action</th>
                            <th className="text-left py-1 pr-2">Ans</th>
                            <th className="text-right py-1">RT(ms)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runActions.map(a => (
                            <tr key={a.actionId} className="border-b border-border/20">
                              <td className="py-1 pr-2">{a.eventServerTs ? new Date(a.eventServerTs).toLocaleTimeString() : '-'}</td>
                              <td className="py-1 pr-2 truncate max-w-[140px]">{a.displayName || a.userName || a.odytChannelId || '-'}</td>
                              <td className="py-1 pr-2">{a.questionIndex ?? '-'}</td>
                              <td className="py-1 pr-2">
                                <span className="font-medium">{a.actionType}</span>
                                {a.rejectionReason && <span className="text-muted-foreground"> · {a.rejectionReason}</span>}
                              </td>
                              <td className="py-1 pr-2">{a.normalizedAnswer || a.rawAnswer || '-'}</td>
                              <td className="py-1 text-right">{a.responseTimeMs ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {runActionsLoading && <p className="text-xs text-muted-foreground mt-2">Loading...</p>}
                      {!runActionsLoading && selectedRunId && runActions.length === 0 && <p className="text-xs text-muted-foreground mt-2">No matching actions.</p>}
                    </ScrollArea>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Page {runActionPage}/{runActionTotalPages}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={runActionPage <= 1 || runActionsLoading} onClick={() => setRunActionPage(p => Math.max(1, p - 1))}>Prev</Button>
                        <Button variant="outline" size="sm" disabled={runActionPage >= runActionTotalPages || runActionsLoading} onClick={() => setRunActionPage(p => p + 1)}>Next</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== SANDBOX TAB ===== */}
          <TabsContent value="sandbox" className="mt-6 space-y-6">
            <Card className="bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-amber-400" /> Title-Rule Sandbox</CardTitle>
                <CardDescription>Experiment with early bird / late comer thresholds (no persistence)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <select className="rounded-md border border-border bg-background p-2 text-sm" value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
                      <option value="">Select quiz run</option>
                      {runs.map(run => <option key={run.frontendQuizGameId} value={run.frontendQuizGameId}>{run.episodeName || run.gameTitle || run.frontendQuizGameId} [{run.frontendQuizGameId.slice(0, 8)}]</option>)}
                    </select>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void computeTitleSandbox()} disabled={!selectedRunId || sandboxLoading}>
                    {sandboxLoading ? 'Computing...' : 'Compute Candidates'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Preset</label>
                    <select className="w-full rounded-md border border-border bg-background p-2 text-sm" value={sandboxPreset}
                      onChange={(e) => applySandboxPreset(parseSandboxPreset(e.target.value))}>
                      <option value="strict">Strict</option>
                      <option value="balanced">Balanced</option>
                      <option value="lenient">Lenient</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Early Bird ≤ ms</label><Input value={sandboxEarlyMs} onChange={(e) => setSandboxEarlyMs(e.target.value.replace(/[^\d]/g, ''))} /></div>
                  <div><label className="text-xs text-muted-foreground">Late Comer ≥ ms</label><Input value={sandboxLateMs} onChange={(e) => setSandboxLateMs(e.target.value.replace(/[^\d]/g, ''))} /></div>
                  <div><label className="text-xs text-muted-foreground">Min Accepted</label><Input value={sandboxMinAccepted} onChange={(e) => setSandboxMinAccepted(e.target.value.replace(/[^\d]/g, ''))} /></div>
                  <div><label className="text-xs text-muted-foreground">Min %</label><Input value={sandboxMinPct} onChange={(e) => setSandboxMinPct(e.target.value.replace(/[^\d]/g, ''))} /></div>
                </div>
                {sandboxError && <p className="text-xs text-destructive">{sandboxError}</p>}
                <ScrollArea className="h-52">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1 pr-2">Viewer</th>
                        <th className="text-right py-1 pr-2">Accepted</th>
                        <th className="text-right py-1 pr-2">Avg(ms)</th>
                        <th className="text-right py-1 pr-2">Early%</th>
                        <th className="text-right py-1 pr-2">Late%</th>
                        <th className="text-left py-1">Candidate Titles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sandboxRows.map(row => (
                        <tr key={row.odytChannelId} className="border-b border-border/20">
                          <td className="py-1 pr-2 truncate max-w-[180px]">{row.name}</td>
                          <td className="py-1 pr-2 text-right">{formatNumber(row.accepted)}</td>
                          <td className="py-1 pr-2 text-right">{formatNumber(Math.round(row.avgResponseMs))}</td>
                          <td className="py-1 pr-2 text-right">{formatPercent(row.earlyPct)}</td>
                          <td className="py-1 pr-2 text-right">{formatPercent(row.latePct)}</td>
                          <td className="py-1">
                            {row.candidateTitles.map(t => (
                              <Badge key={t} variant="outline" className="mr-1 text-[10px]">{t}</Badge>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!sandboxLoading && sandboxRows.length === 0 && <p className="text-xs text-muted-foreground mt-2">No candidates under current thresholds.</p>}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Drilldown Dialog */}
        <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" /> Viewer Session History
              </DialogTitle>
              <DialogDescription>Per-quiz final leaderboard snapshots for this viewer.</DialogDescription>
            </DialogHeader>
            {drilldownLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {drilldownError && <p className="text-sm text-destructive">{drilldownError}</p>}
            {!drilldownLoading && !drilldownError && drilldown && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {[
                    { label: 'Quizzes', value: formatNumber(drilldown.summary.quizzesPlayed), icon: Trophy, color: 'text-yellow-400' },
                    { label: 'Total Score', value: formatNumber(drilldown.summary.totalScore), icon: Coins, color: 'text-amber-400' },
                    { label: 'Correct', value: formatNumber(drilldown.summary.totalCorrectAnswers), icon: Target, color: 'text-green-400' },
                    { label: '#1 Finishes', value: String(drilldown.summary.firstPlaces), icon: Medal, color: 'text-primary' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-lg border border-border/40 p-3 bg-muted/20">
                        <Icon className={`h-4 w-4 mb-1 ${item.color}`} />
                        <div className="font-semibold text-foreground">{item.value}</div>
                        <span className="text-muted-foreground text-xs">{item.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Performance Radar Chart */}
                {drilldown.sessions.length > 0 && (() => {
                  const sessions = drilldown.sessions;
                  const s = drilldown.summary;
                  const totalQ = sessions.reduce((sum, sess) => sum + (sess.totalResponses || 0), 0);
                  const accuracyPct = totalQ > 0 ? (s.totalCorrectAnswers / totalQ) * 100 : 0;
                  const avgRt = sessions.reduce((sum, sess) => sum + (sess.avgResponseTimeMs || 0), 0) / sessions.length;
                  const speedScore = Math.max(0, Math.min(100, 100 - (avgRt / 200)));
                  const consistencyScores = sessions.map(sess => sess.totalResponses > 0 ? (sess.correctAnswers / sess.totalResponses) * 100 : 0);
                  const meanAcc = consistencyScores.reduce((a, b) => a + b, 0) / (consistencyScores.length || 1);
                  const variance = consistencyScores.reduce((sum, v) => sum + (v - meanAcc) ** 2, 0) / (consistencyScores.length || 1);
                  const consistencyPct = Math.max(0, 100 - Math.sqrt(variance));
                  const participationPct = Math.min(100, s.quizzesPlayed * 10);
                  const rankScore = Math.max(0, Math.min(100, ((s.firstPlaces * 30) + (s.secondPlaces * 20) + (s.thirdPlaces * 10) + ((s.top10Places || 0) * 5))));
                  const radarData = [
                    { metric: 'Accuracy', value: Math.round(accuracyPct), fullMark: 100 },
                    { metric: 'Speed', value: Math.round(speedScore), fullMark: 100 },
                    { metric: 'Consistency', value: Math.round(consistencyPct), fullMark: 100 },
                    { metric: 'Participation', value: Math.round(participationPct), fullMark: 100 },
                    { metric: 'Rank Achievements', value: Math.min(100, Math.round(rankScore)), fullMark: 100 },
                  ];
                  return (
                    <div className="rounded-lg border border-border/40 p-3 bg-muted/10">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Performance Profile</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
                          <Radar name="Profile" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                {/* Score trend per session */}
                {drilldown.sessions.length > 1 && (
                  <div className="rounded-lg border border-border/40 p-3 bg-muted/10">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Score per Quiz</h4>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={drilldown.sessions.map(s => ({
                        name: s.episodeName?.replace(/^.*-\s*/, '') || s.frontendQuizGameId.slice(0, 8),
                        score: s.totalScore,
                        rank: s.rank,
                      }))}>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip />
                        <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <ScrollArea className="h-60">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1">Episode</th>
                        <th className="text-right py-1">Rank</th>
                        <th className="text-right py-1">Score</th>
                        <th className="text-right py-1">Correct</th>
                        <th className="text-right py-1">Avg RT</th>
                        <th className="text-left py-1">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drilldown.sessions.map(s => (
                        <tr key={s.frontendQuizGameId} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                          <td className="py-1 truncate max-w-[200px]">{s.episodeName || s.frontendQuizGameId}</td>
                          <td className="py-1 text-right font-semibold">#{s.rank}</td>
                          <td className="py-1 text-right font-semibold text-primary">{formatNumber(s.totalScore)}</td>
                          <td className="py-1 text-right">{s.correctAnswers}/{s.totalResponses}</td>
                          <td className="py-1 text-right">{formatNumber(Math.round(s.avgResponseTimeMs))}ms</td>
                          <td className="py-1">{s.endedAt ? new Date(s.endedAt).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
