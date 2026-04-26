import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart3, Coins, Medal, Search, Trophy, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  getAnalyticsOverview,
  getAnalyticsQuizRuns,
  getQuizRunActions,
  getQuizRunUsers,
  getViewerAnalytics,
  getViewerDrilldown,
  type AnalyticsOverview,
  type AnalyticsQuizRunRow,
  type QuizRunActionRow,
  type QuizRunUserSummaryRow,
  type ViewerAnalyticsRow,
  type ViewerDrilldownData,
} from '@/services/analyticsApi';
import { isQuizAnalyticsEnabled } from '@/lib/analyticsIdentity';

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value || 0);
const formatPercent = (value: number) => `${(value || 0).toFixed(1)}%`;

const initials = (row: { displayName?: string; userName?: string }) => {
  const source = row.displayName || row.userName || 'Viewer';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
};

const Analytics = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [rows, setRows] = useState<ViewerAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
  const [sandboxEarlyMs, setSandboxEarlyMs] = useState('5000');
  const [sandboxLateMs, setSandboxLateMs] = useState('20000');
  const [sandboxMinAccepted, setSandboxMinAccepted] = useState('3');
  const [sandboxMinPct, setSandboxMinPct] = useState('60');
  const [sandboxPreset, setSandboxPreset] = useState<'strict' | 'balanced' | 'lenient'>('balanced');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [sandboxRows, setSandboxRows] = useState<
    Array<{
      odytChannelId: string;
      name: string;
      accepted: number;
      avgResponseMs: number;
      earlyCount: number;
      lateCount: number;
      earlyPct: number;
      latePct: number;
      candidateTitles: string[];
    }>
  >([]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      const [overviewRes, viewersRes, runsRes] = await Promise.all([
        getAnalyticsOverview(),
        getViewerAnalytics(page, 25, search),
        getAnalyticsQuizRuns(1, 50),
      ]);

      if (cancelled) return;

      if (!overviewRes.success || !viewersRes.success || !runsRes.success) {
        setError(overviewRes.error || viewersRes.error || runsRes.error || 'Failed to load analytics');
        setOverview(null);
        setRows([]);
        setRuns([]);
        setTotalPages(1);
      } else {
        setOverview(overviewRes.data || null);
        setRows(viewersRes.data?.viewers || []);
        const nextRuns = runsRes.data?.runs || [];
        setRuns(nextRuns);
        if (!selectedRunId && nextRuns.length > 0) {
          setSelectedRunId(nextRuns[0].frontendQuizGameId);
        }
        setTotalPages(Math.max(1, viewersRes.data?.totalPages || 1));
      }

      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [page, search, selectedRunId]);

  const statCards = useMemo(() => {
    return [
      {
        title: 'Completed Quizzes',
        value: formatNumber(overview?.totalCompletedQuizzes || 0),
        icon: Trophy,
        helper: 'Only completed sessions are counted',
      },
      {
        title: 'Unique Participants',
        value: formatNumber(overview?.totalUniqueViewers || 0),
        icon: Users,
        helper: 'Distinct viewer IDs across quizzes',
      },
      {
        title: 'Total Coins Awarded',
        value: formatNumber(overview?.totalScoreAwarded || 0),
        icon: Coins,
        helper: 'Coins map directly to final score',
      },
      {
        title: 'Total Responses',
        value: formatNumber(overview?.totalResponses || 0),
        icon: BarChart3,
        helper: 'From final live leaderboard snapshots',
      },
    ];
  }, [overview]);

  const episodeKpis = useMemo(() => overview?.episodeKpis || [], [overview]);

  const loadRunActions = useCallback(async (runId: string, pageToLoad = 1) => {
    if (!runId) {
      setRunActions([]);
      setRunActionTotalPages(1);
      return;
    }
    setRunActionsLoading(true);
    const result = await getQuizRunActions(runId, {
      page: pageToLoad,
      limit: 80,
      odytChannelId: selectedUserId || undefined,
      actionType: actionTypeFilter || undefined,
      questionIndex: questionIndexFilter === '' ? '' : Number(questionIndexFilter),
      sortOrder: 'desc',
    });
    if (!result.success) {
      setRunActions([]);
      setRunActionTotalPages(1);
    } else {
      setRunActions(result.data?.actions || []);
      setRunActionTotalPages(Math.max(1, result.data?.totalPages || 1));
    }
    setRunActionsLoading(false);
  }, [selectedUserId, actionTypeFilter, questionIndexFilter]);

  useEffect(() => {
    if (!selectedRunId) {
      setRunUsers([]);
      setRunActions([]);
      return;
    }
    let cancelled = false;
    const loadRunUsers = async () => {
      const usersRes = await getQuizRunUsers(selectedRunId, 200);
      if (cancelled) return;
      if (!usersRes.success) {
        setRunUsers([]);
      } else {
        setRunUsers(usersRes.data?.users || []);
      }
      setRunActionPage(1);
    };
    void loadRunUsers();
    return () => {
      cancelled = true;
    };
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
    if (!selectedRunId) {
      setSandboxRows([]);
      return;
    }
    const earlyMs = Math.max(0, Number(sandboxEarlyMs) || 0);
    const lateMs = Math.max(0, Number(sandboxLateMs) || 0);
    const minAccepted = Math.max(1, Number(sandboxMinAccepted) || 1);
    const minPct = Math.max(0, Math.min(100, Number(sandboxMinPct) || 0));
    if (lateMs <= earlyMs) {
      setSandboxError('Late threshold must be greater than early threshold.');
      setSandboxRows([]);
      return;
    }

    setSandboxLoading(true);
    setSandboxError(null);
    try {
      const byUser = new Map<
        string,
        {
          odytChannelId: string;
          name: string;
          accepted: number;
          totalResponseMs: number;
          earlyCount: number;
          lateCount: number;
        }
      >();

      let page = 1;
      let totalPages = 1;
      do {
        const res = await getQuizRunActions(selectedRunId, {
          page,
          limit: 500,
          actionType: 'scored_answer',
          sortOrder: 'desc',
        });
        if (!res.success) {
          throw new Error(res.error || 'Failed to load action timeline');
        }
        const actions = res.data?.actions || [];
        totalPages = Math.max(1, res.data?.totalPages || 1);
        for (const action of actions) {
          const userId = String(action.odytChannelId || '').trim();
          if (!userId) continue;
          const responseMs = Number(action.responseTimeMs);
          if (!Number.isFinite(responseMs) || responseMs < 0) continue;
          const existing = byUser.get(userId) || {
            odytChannelId: userId,
            name: action.displayName || action.userName || userId,
            accepted: 0,
            totalResponseMs: 0,
            earlyCount: 0,
            lateCount: 0,
          };
          existing.accepted += 1;
          existing.totalResponseMs += responseMs;
          if (responseMs <= earlyMs) existing.earlyCount += 1;
          if (responseMs >= lateMs) existing.lateCount += 1;
          if (!existing.name && (action.displayName || action.userName)) {
            existing.name = action.displayName || action.userName || userId;
          }
          byUser.set(userId, existing);
        }
        page += 1;
      } while (page <= totalPages);

      const rows = Array.from(byUser.values())
        .filter((u) => u.accepted >= minAccepted)
        .map((u) => {
          const avgResponseMs = u.accepted > 0 ? u.totalResponseMs / u.accepted : 0;
          const earlyPct = u.accepted > 0 ? (u.earlyCount / u.accepted) * 100 : 0;
          const latePct = u.accepted > 0 ? (u.lateCount / u.accepted) * 100 : 0;
          const candidateTitles: string[] = [];
          if (u.earlyCount >= minAccepted && earlyPct >= minPct) candidateTitles.push('Early Bird');
          if (u.lateCount >= minAccepted && latePct >= minPct) candidateTitles.push('Late Comer');
          return {
            odytChannelId: u.odytChannelId,
            name: u.name,
            accepted: u.accepted,
            avgResponseMs,
            earlyCount: u.earlyCount,
            lateCount: u.lateCount,
            earlyPct,
            latePct,
            candidateTitles,
          };
        })
        .filter((r) => r.candidateTitles.length > 0)
        .sort((a, b) => b.candidateTitles.length - a.candidateTitles.length || b.accepted - a.accepted);

      setSandboxRows(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to compute sandbox titles';
      setSandboxError(message);
      setSandboxRows([]);
    } finally {
      setSandboxLoading(false);
    }
  }, [selectedRunId, sandboxEarlyMs, sandboxLateMs, sandboxMinAccepted, sandboxMinPct]);

  const applySandboxPreset = useCallback((preset: 'strict' | 'balanced' | 'lenient') => {
    setSandboxPreset(preset);
    if (preset === 'strict') {
      setSandboxEarlyMs('3000');
      setSandboxLateMs('24000');
      setSandboxMinAccepted('5');
      setSandboxMinPct('75');
      return;
    }
    if (preset === 'lenient') {
      setSandboxEarlyMs('7000');
      setSandboxLateMs('16000');
      setSandboxMinAccepted('2');
      setSandboxMinPct('50');
      return;
    }
    // balanced
    setSandboxEarlyMs('5000');
    setSandboxLateMs('20000');
    setSandboxMinAccepted('3');
    setSandboxMinPct('60');
  }, []);

  const openDrilldown = async (row: ViewerAnalyticsRow) => {
    setDrilldownOpen(true);
    setDrilldown(null);
    setDrilldownError(null);
    setDrilldownLoading(true);
    const result = await getViewerDrilldown(row.odytChannelId, 40);
    if (!result.success) {
      setDrilldownError(result.error || 'Failed to load viewer details');
      setDrilldownLoading(false);
      return;
    }
    setDrilldown(result.data || null);
    setDrilldownLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Viewer Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Built from final live viewer leaderboard documents (completed quizzes only).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back To Admin
            </Button>
          </Link>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Analytics Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Make sure orchestrator and MongoDB are connected. IndexDB fallback is intentionally not used for this page.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!analyticsEnabled ? (
        <Card className="border-amber-400/40">
          <CardHeader>
            <CardTitle>Analytics Toggle Is OFF</CardTitle>
            <CardDescription>
              Enable `Viewer Analytics Storage` in Admin to persist completed quiz snapshots in MongoDB.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold">{loading ? '...' : card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Episode KPI Cards</CardTitle>
          <CardDescription>Auto-computed per completed episode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {episodeKpis.map((kpi) => (
              <div key={kpi.frontendQuizGameId} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{kpi.episodeName || kpi.frontendQuizGameId}</div>
                    <div className="text-xs text-muted-foreground">
                      {kpi.frontendQuizGameId} {kpi.endedAt ? `· ${new Date(kpi.endedAt).toLocaleString()}` : ''}
                    </div>
                  </div>
                  <Badge variant="secondary">Q {formatNumber(kpi.totalQuestions || 0)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border p-2"><span className="text-muted-foreground">Overall Accuracy</span><div className="font-semibold">{formatPercent(kpi.overallAccuracyPct)}</div></div>
                  <div className="rounded border p-2"><span className="text-muted-foreground">Mean Accuracy</span><div className="font-semibold">{formatPercent(kpi.meanViewerAccuracyPct)}</div></div>
                  <div className="rounded border p-2"><span className="text-muted-foreground">Median Accuracy</span><div className="font-semibold">{formatPercent(kpi.medianViewerAccuracyPct)}</div></div>
                  <div className="rounded border p-2"><span className="text-muted-foreground">Avg Response</span><div className="font-semibold">{formatNumber(Math.round(kpi.avgViewerResponseMs || 0))} ms</div></div>
                  <div className="rounded border p-2"><span className="text-muted-foreground">Top Scorer</span><div className="font-semibold truncate">{kpi.topScorerName || '-'}</div><div className="text-muted-foreground">{formatNumber(kpi.topScorerScore || 0)} coins</div></div>
                  <div className="rounded border p-2"><span className="text-muted-foreground">Fastest Responder</span><div className="font-semibold truncate">{kpi.fastestAvgResponderName || '-'}</div><div className="text-muted-foreground">{formatNumber(Math.round(kpi.fastestAvgResponseMs || 0))} ms</div></div>
                  <div className="rounded border p-2"><span className="text-muted-foreground">Accuracy {'>='}50%</span><div className="font-semibold">{formatNumber(kpi.viewersAccuracyAtLeast50Pct || 0)}</div></div>
                  <div className="rounded border p-2"><span className="text-muted-foreground">Top1 Score Share</span><div className="font-semibold">{formatPercent(kpi.scoreConcentrationTop1Pct)}</div></div>
                </div>
              </div>
            ))}
          </div>
          {!loading && episodeKpis.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed episode KPI records yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per-User Action Timeline (By Quiz Run)</CardTitle>
          <CardDescription>Inspect raw accepted/rejected answer actions for title-rule validation (early bird / late comer, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Quiz Run</label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
              >
                <option value="">Select run</option>
                {runs.map((run) => (
                  <option key={run.frontendQuizGameId} value={run.frontendQuizGameId}>
                    {(run.episodeName || run.gameTitle || run.frontendQuizGameId)} · {run.status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Viewer</label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={!selectedRunId}
              >
                <option value="">All viewers</option>
                {runUsers.map((user) => (
                  <option key={user.odytChannelId} value={user.odytChannelId}>
                    {(user.displayName || user.userName || user.odytChannelId)} ({user.totalActions})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Action Type</label>
              <Input
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value)}
                placeholder="accepted_answer / rejected_after_close"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Question Index</label>
              <Input
                value={questionIndexFilter}
                onChange={(e) => setQuestionIndexFilter(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="e.g. 0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-md border p-2">
              <div className="text-sm font-semibold mb-2">Run User Summary</div>
              <div className="max-h-56 overflow-auto space-y-1">
                {runUsers.map((u) => (
                  <button
                    key={u.odytChannelId}
                    type="button"
                    className={`w-full text-left rounded border p-2 text-xs ${selectedUserId === u.odytChannelId ? 'border-primary' : ''}`}
                    onClick={() => setSelectedUserId((prev) => prev === u.odytChannelId ? '' : u.odytChannelId)}
                  >
                    <div className="font-medium truncate">{u.displayName || u.userName || u.odytChannelId}</div>
                    <div className="text-muted-foreground truncate">{u.odytChannelId}</div>
                    <div className="mt-1 text-muted-foreground">
                      actions {formatNumber(u.totalActions)} · accepted {formatNumber(u.acceptedAnswers)} · rejected {formatNumber(u.rejectedActions)}
                    </div>
                  </button>
                ))}
                {selectedRunId && runUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No action users for this run.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-md border p-2">
              <div className="text-sm font-semibold mb-2">Action Timeline</div>
              <div className="max-h-56 overflow-auto">
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
                    {runActions.map((a) => (
                      <tr key={a.actionId} className="border-b/50">
                        <td className="py-1 pr-2">{a.eventServerTs ? new Date(a.eventServerTs).toLocaleTimeString() : '-'}</td>
                        <td className="py-1 pr-2 truncate max-w-[160px]">{a.displayName || a.userName || a.odytChannelId || '-'}</td>
                        <td className="py-1 pr-2">{a.questionIndex ?? '-'}</td>
                        <td className="py-1 pr-2">
                          <span className="font-medium">{a.actionType}</span>
                          {a.rejectionReason ? <span className="text-muted-foreground"> · {a.rejectionReason}</span> : null}
                        </td>
                        <td className="py-1 pr-2">{a.normalizedAnswer || a.rawAnswer || '-'}</td>
                        <td className="py-1 text-right">{a.responseTimeMs ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {runActionsLoading ? <p className="text-xs text-muted-foreground mt-2">Loading timeline...</p> : null}
                {!runActionsLoading && selectedRunId && runActions.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-2">No matching actions.</p>
                ) : null}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Page {runActionPage} of {runActionTotalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={runActionPage <= 1 || runActionsLoading} onClick={() => setRunActionPage((p) => Math.max(1, p - 1))}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={runActionPage >= runActionTotalPages || runActionsLoading} onClick={() => setRunActionPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">Title-Rule Sandbox (No Persistence)</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void computeTitleSandbox()}
                disabled={!selectedRunId || sandboxLoading}
              >
                {sandboxLoading ? 'Computing...' : 'Compute Candidates'}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Preset</label>
                <select
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={sandboxPreset}
                  onChange={(e) => applySandboxPreset(e.target.value as 'strict' | 'balanced' | 'lenient')}
                >
                  <option value="strict">Strict</option>
                  <option value="balanced">Balanced</option>
                  <option value="lenient">Lenient</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Early Bird {'<='} ms</label>
                <Input value={sandboxEarlyMs} onChange={(e) => setSandboxEarlyMs(e.target.value.replace(/[^\d]/g, ''))} />
              </div>
                <div>
                  <label className="text-xs text-muted-foreground">Late Comer {'>='} ms</label>
                  <Input value={sandboxLateMs} onChange={(e) => setSandboxLateMs(e.target.value.replace(/[^\d]/g, ''))} />
                </div>
              <div>
                <label className="text-xs text-muted-foreground">Min Accepted</label>
                <Input value={sandboxMinAccepted} onChange={(e) => setSandboxMinAccepted(e.target.value.replace(/[^\d]/g, ''))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Min %</label>
                <Input value={sandboxMinPct} onChange={(e) => setSandboxMinPct(e.target.value.replace(/[^\d]/g, ''))} />
              </div>
            </div>
            {sandboxError ? <p className="text-xs text-destructive">{sandboxError}</p> : null}
            <div className="max-h-52 overflow-auto">
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
                  {sandboxRows.map((row) => (
                    <tr key={row.odytChannelId} className="border-b/50">
                      <td className="py-1 pr-2 truncate max-w-[180px]">{row.name}</td>
                      <td className="py-1 pr-2 text-right">{formatNumber(row.accepted)}</td>
                      <td className="py-1 pr-2 text-right">{formatNumber(Math.round(row.avgResponseMs))}</td>
                      <td className="py-1 pr-2 text-right">{formatPercent(row.earlyPct)}</td>
                      <td className="py-1 pr-2 text-right">{formatPercent(row.latePct)}</td>
                      <td className="py-1">{row.candidateTitles.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!sandboxLoading && sandboxRows.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">No candidate titles under current thresholds.</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Medal className="h-5 w-5 text-amber-500" />
            Top Performers
          </CardTitle>
          <CardDescription>Highest cumulative coin/score earners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(overview?.topPerformers || []).map((row, idx) => (
              <div key={row.odytChannelId} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="secondary" className="w-8 justify-center">#{idx + 1}</Badge>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={row.avatarUrl || ''} alt={row.displayName || row.userName || row.odytChannelId} referrerPolicy="no-referrer" />
                    <AvatarFallback>{initials(row)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{row.displayName || row.userName || row.odytChannelId}</div>
                    <div className="text-xs text-muted-foreground truncate">{row.odytChannelId}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatNumber(row.totalScore)} coins</div>
                  <div className="text-xs text-muted-foreground">{row.firstPlaces}x #1 · best #{row.bestRank}</div>
                </div>
              </div>
            ))}
            {!loading && (overview?.topPerformers || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed quiz analytics yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Participants</CardTitle>
          <CardDescription>Cumulative stats by viewer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or channel id"
              className="max-w-sm"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-2">Viewer</th>
                  <th className="text-right py-2 px-2">Coins</th>
                  <th className="text-right py-2 px-2">Quizzes</th>
                  <th className="text-right py-2 px-2">#1/#2/#3</th>
                  <th className="text-right py-2 px-2">Best Rank</th>
                  <th className="text-right py-2 pl-2">Correct</th>
                  <th className="text-right py-2 pl-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.odytChannelId} className="border-b/50">
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={row.avatarUrl || ''} alt={row.displayName || row.userName || row.odytChannelId} referrerPolicy="no-referrer" />
                          <AvatarFallback>{initials(row)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{row.displayName || row.userName || row.odytChannelId}</div>
                          <div className="text-xs text-muted-foreground truncate">{row.odytChannelId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">{formatNumber(row.totalScore)}</td>
                    <td className="py-2 px-2 text-right">{formatNumber(row.quizzesPlayed)}</td>
                    <td className="py-2 px-2 text-right">{row.firstPlaces}/{row.secondPlaces}/{row.thirdPlaces}</td>
                    <td className="py-2 px-2 text-right">#{row.bestRank || '-'}</td>
                    <td className="py-2 pl-2 text-right">{formatNumber(row.totalCorrectAnswers)}</td>
                    <td className="py-2 pl-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => void openDrilldown(row)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">No rows found for this filter.</p>
          ) : null}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Viewer Session History</DialogTitle>
            <DialogDescription>
              Per-quiz final leaderboard snapshots for this viewer.
            </DialogDescription>
          </DialogHeader>
          {drilldownLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {drilldownError ? <p className="text-sm text-destructive">{drilldownError}</p> : null}
          {!drilldownLoading && !drilldownError && drilldown ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="rounded border p-2"><span className="text-muted-foreground">Quizzes</span><div className="font-semibold">{formatNumber(drilldown.summary.quizzesPlayed)}</div></div>
                <div className="rounded border p-2"><span className="text-muted-foreground">Coins</span><div className="font-semibold">{formatNumber(drilldown.summary.totalScore)}</div></div>
                <div className="rounded border p-2"><span className="text-muted-foreground">Podiums</span><div className="font-semibold">{drilldown.summary.firstPlaces}/{drilldown.summary.secondPlaces}/{drilldown.summary.thirdPlaces}</div></div>
                <div className="rounded border p-2"><span className="text-muted-foreground">Best Rank</span><div className="font-semibold">#{drilldown.summary.bestRank || '-'}</div></div>
              </div>
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-2">Episode</th>
                      <th className="text-right py-2 px-2">Rank</th>
                      <th className="text-right py-2 px-2">Coins</th>
                      <th className="text-right py-2 px-2">Correct</th>
                      <th className="text-right py-2 px-2">Responses</th>
                      <th className="text-right py-2 pl-2">Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldown.sessions.map((s) => (
                      <tr key={s.frontendQuizGameId} className="border-b/50">
                        <td className="py-2 pr-2">
                          <div className="font-medium">{s.episodeName || s.frontendQuizGameId}</div>
                          <div className="text-xs text-muted-foreground">{s.frontendQuizGameId}</div>
                        </td>
                        <td className="py-2 px-2 text-right">#{s.rank}</td>
                        <td className="py-2 px-2 text-right">{formatNumber(s.totalScore)}</td>
                        <td className="py-2 px-2 text-right">{formatNumber(s.correctAnswers)}</td>
                        <td className="py-2 px-2 text-right">{formatNumber(s.totalResponses)}</td>
                        <td className="py-2 pl-2 text-right">{s.endedAt ? new Date(s.endedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analytics;
