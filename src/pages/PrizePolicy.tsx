import { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/context/AppContext";
import { getPrizePolicy, PrizeType, updatePrizePolicy } from "@/services/prizeApi";

const ALL_PRIZE_TYPES: PrizeType[] = ["quizfirst", "quizsecond", "quizthird", "luckydip", "custom"];

const PrizePolicyPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { applicationId } = useApp();
  const appId = useMemo(() => String(applicationId || "").trim(), [applicationId]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownQuizCount, setCooldownQuizCount] = useState(10);
  const [minAccountAgeDays, setMinAccountAgeDays] = useState(180);
  const [minProperParticipations, setMinProperParticipations] = useState(10);
  const [luckyMinProperParticipations, setLuckyMinProperParticipations] = useState(20);
  const [properParticipationMinAnswersPerQuiz, setProperParticipationMinAnswersPerQuiz] = useState(10);
  const [recentPrizeLookbackQuizCount, setRecentPrizeLookbackQuizCount] = useState(20);
  const [minCurrentQuizAnswersForSuggestion, setMinCurrentQuizAnswersForSuggestion] = useState(5);
  const [minCurrentQuizAccuracyPctForSuggestion, setMinCurrentQuizAccuracyPctForSuggestion] = useState(40);
  const [luckyOnceLifetimeEnabled, setLuckyOnceLifetimeEnabled] = useState(true);
  const [enabledPrizeTypes, setEnabledPrizeTypes] = useState<PrizeType[]>(["quizfirst", "quizsecond", "quizthird", "luckydip"]);
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!appId) {
        setLoading(false);
        setError("applicationId is missing");
        return;
      }
      setLoading(true);
      setError(null);
      const result = await getPrizePolicy(appId);
      if (!active) return;
      if (!result.success || !result.data) {
        setError(result.error || "Failed to load policy");
        setLoading(false);
        return;
      }
      setCooldownQuizCount(result.data.cooldownQuizCount);
      setMinAccountAgeDays(result.data.minAccountAgeDays);
      setMinProperParticipations(result.data.minProperParticipations);
      setLuckyMinProperParticipations(
        Math.max(
          (result.data.minProperParticipations || 0) * 2,
          Number(result.data.luckyMinProperParticipations || 0)
        )
      );
      setProperParticipationMinAnswersPerQuiz(result.data.properParticipationMinAnswersPerQuiz);
      setRecentPrizeLookbackQuizCount(result.data.recentPrizeLookbackQuizCount || 20);
      setMinCurrentQuizAnswersForSuggestion(result.data.minCurrentQuizAnswersForSuggestion || 5);
      setMinCurrentQuizAccuracyPctForSuggestion(result.data.minCurrentQuizAccuracyPctForSuggestion || 40);
      setLuckyOnceLifetimeEnabled(result.data.luckyOnceLifetimeEnabled);
      setEnabledPrizeTypes(result.data.enabledPrizeTypes || []);
      setLoading(false);
    };
    run();
    return () => {
      active = false;
    };
  }, [appId]);

  const togglePrizeType = (type: PrizeType) => {
    setEnabledPrizeTypes((prev) => (prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]));
  };

  const onSave = async () => {
    if (!appId) return;
    setSaving(true);
    setError(null);
    const result = await updatePrizePolicy({
      applicationId: appId,
      cooldownQuizCount,
      minAccountAgeDays,
      minProperParticipations,
      luckyMinProperParticipations,
      properParticipationMinAnswersPerQuiz,
      recentPrizeLookbackQuizCount,
      minCurrentQuizAnswersForSuggestion,
      minCurrentQuizAccuracyPctForSuggestion,
      luckyOnceLifetimeEnabled,
      enabledPrizeTypes,
      updatedBy: "admin-ui",
    });
    if (!result.success) {
      setError(result.error || "Failed to save policy");
    }
    setSaving(false);
  };

  const content = (
    <>
      {!embedded && (
        <PageHeader
          title="Prize Policy"
          icon={ShieldCheck}
          description="Configurable eligibility and cooldown rules."
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Policy Configuration</CardTitle>
          <CardDescription>Application: {appId || "Not set"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading policy…</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cooldownQuizCount">Cooldown (quizzes)</Label>
              <Input
                id="cooldownQuizCount"
                type="number"
                value={cooldownQuizCount}
                onChange={(e) => setCooldownQuizCount(Number(e.target.value || 0))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minAccountAgeDays">Min account age (days)</Label>
              <Input
                id="minAccountAgeDays"
                type="number"
                value={minAccountAgeDays}
                onChange={(e) => setMinAccountAgeDays(Number(e.target.value || 0))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minProperParticipations">Min Proper Participations (ranked winners)</Label>
              <Input
                id="minProperParticipations"
                type="number"
                value={minProperParticipations}
                onChange={(e) => {
                  const rankedMin = Number(e.target.value || 0);
                  setMinProperParticipations(rankedMin);
                  setLuckyMinProperParticipations((prev) => Math.max(prev, rankedMin * 2));
                }}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="luckyMinProperParticipations">Lucky Min Proper Participations</Label>
              <Input
                id="luckyMinProperParticipations"
                type="number"
                value={luckyMinProperParticipations}
                onChange={(e) => setLuckyMinProperParticipations(Math.max(minProperParticipations * 2, Number(e.target.value || 0)))}
                min={minProperParticipations * 2}
              />
              <p className="text-xs text-muted-foreground">Must be at least 2x ranked-winner proper participation minimum.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="properParticipationMinAnswersPerQuiz">Min scored answers per quiz (to count as a proper participation)</Label>
              <Input
                id="properParticipationMinAnswersPerQuiz"
                type="number"
                value={properParticipationMinAnswersPerQuiz}
                onChange={(e) => setProperParticipationMinAnswersPerQuiz(Number(e.target.value || 1))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recentPrizeLookbackQuizCount">Soft penalty lookback (participated quizzes)</Label>
              <Input
                id="recentPrizeLookbackQuizCount"
                type="number"
                value={recentPrizeLookbackQuizCount}
                onChange={(e) => setRecentPrizeLookbackQuizCount(Number(e.target.value || 0))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minCurrentQuizAnswersForSuggestion">Soft suggestion floor: current quiz answers</Label>
              <Input
                id="minCurrentQuizAnswersForSuggestion"
                type="number"
                value={minCurrentQuizAnswersForSuggestion}
                onChange={(e) => setMinCurrentQuizAnswersForSuggestion(Number(e.target.value || 0))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minCurrentQuizAccuracyPctForSuggestion">Soft suggestion floor: current quiz accuracy %</Label>
              <Input
                id="minCurrentQuizAccuracyPctForSuggestion"
                type="number"
                value={minCurrentQuizAccuracyPctForSuggestion}
                onChange={(e) =>
                  setMinCurrentQuizAccuracyPctForSuggestion(
                    Math.max(0, Math.min(100, Number(e.target.value || 0)))
                  )
                }
                min={0}
                max={100}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">Lucky once-in-lifetime</p>
              <p className="text-xs text-muted-foreground">Block future lucky dip wins for a channel after first lucky win.</p>
            </div>
            <Switch checked={luckyOnceLifetimeEnabled} onCheckedChange={setLuckyOnceLifetimeEnabled} />
          </div>

          <div className="space-y-2">
            <p className="font-medium text-sm">Enabled prize types</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PRIZE_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={enabledPrizeTypes.includes(type) ? "default" : "outline"}
                  onClick={() => togglePrizeType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onSave} disabled={loading || saving || !appId}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save Policy"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return <div className="container mx-auto max-w-4xl p-4 space-y-4">{content}</div>;
};

export default PrizePolicyPage;
