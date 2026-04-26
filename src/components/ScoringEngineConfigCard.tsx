import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Server, Loader2, Save, Check, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  getScoringEngineUrl,
  setScoringEngineUrl,
  getGraceWindowMs,
  setGraceWindowMs,
  getPollIntervalMs,
  setPollIntervalMs,
  testScoringEngineConnection,
  DEFAULT_SCORING_ENGINE_URL,
} from '@/config/scoringEngineConfig';

export const ScoringEngineConfigCard = () => {
  const [url, setUrl] = useState(getScoringEngineUrl);
  const [graceWindow, setGraceWindow] = useState(getGraceWindowMs() / 1000);
  const [pollInterval, setPollIntervalState] = useState(getPollIntervalMs() / 1000);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [isSaved, setIsSaved] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('unknown');
    const result = await testScoringEngineConnection(url);
    setConnectionStatus(result.success ? 'connected' : 'failed');
    setIsTesting(false);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleSave = () => {
    setScoringEngineUrl(url);
    setGraceWindowMs(graceWindow * 1000);
    setPollIntervalMs(pollInterval * 1000);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    toast.success('Scoring Engine configuration saved');
  };

  const hasChanges =
    url !== getScoringEngineUrl() ||
    graceWindow * 1000 !== getGraceWindowMs() ||
    pollInterval * 1000 !== getPollIntervalMs();

  return (
    <Card className="border-emerald-500/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-emerald-500" />
          <CardTitle className="text-lg">Scoring Engine</CardTitle>
          <Badge variant="destructive" className="text-xs">Required</Badge>
        </div>
        <CardDescription>
          Backend service for viewer scoring, grace window, and leaderboard aggregation
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* URL */}
        <div className="space-y-2">
          <Label htmlFor="scoring-url">Scoring Engine URL</Label>
          <div className="flex gap-2">
            <Input
              id="scoring-url"
              placeholder={DEFAULT_SCORING_ENGINE_URL}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleTestConnection}
              disabled={isTesting}
              title="Test connection"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm font-medium">Status</span>
          {connectionStatus === 'connected' ? (
            <Badge className="bg-green-600 text-white gap-1">
              <Wifi className="h-3 w-3" />
              Connected
            </Badge>
          ) : connectionStatus === 'failed' ? (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Failed
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Not Tested
            </Badge>
          )}
        </div>

        {/* Grace Window */}
        <div className="space-y-2">
          <Label>Grace Window: {graceWindow}s</Label>
          <Slider
            min={0}
            max={30}
            step={1}
            value={[graceWindow]}
            onValueChange={([v]) => setGraceWindow(v)}
          />
          <p className="text-xs text-muted-foreground">
            After question close, the backend keeps accepting answers for this duration to compensate for YouTube broadcast latency.
          </p>
        </div>

        {/* Poll Interval */}
        <div className="space-y-2">
          <Label>Poll Interval: {pollInterval}s</Label>
          <Slider
            min={1}
            max={15}
            step={1}
            value={[pollInterval]}
            onValueChange={([v]) => setPollIntervalState(v)}
          />
          <p className="text-xs text-muted-foreground">
            How often the frontend polls the scoring engine for updated leaderboards.
          </p>
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="w-full"
          variant={hasChanges ? 'default' : 'outline'}
        >
          {isSaved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
