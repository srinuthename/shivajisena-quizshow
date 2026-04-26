import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, ArrowLeft, Copy, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import { getAppMode, getApiServerUrl, getSSEBaseUrl, getSSEStreamUrl, DEFAULT_SSE_STREAM_URL } from "@/config/appMode";
import { getMyPrizeAwards, markPrizeClaimed, markPrizeViewed, startPrizeClaimAuth } from "@/services/prizeApi";

const getBaseUrl = (): string => {
  const sseUrl = getSSEStreamUrl();
  if (sseUrl !== DEFAULT_SSE_STREAM_URL) return getSSEBaseUrl();
  return getApiServerUrl();
};

const isOfflineMode = (): boolean => getAppMode() === 'offline' || getApiServerUrl().trim().length === 0;

const PrizeClaimPage = () => {
  const { applicationId } = useApp();
  const appId = useMemo(() => String(applicationId || localStorage.getItem("applicationId") || "").trim(), [applicationId]);
  const [channelId, setChannelId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [awards, setAwards] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setError(null);
    if (isOfflineMode()) {
      setError("Offline mode is active. Prize claiming is unavailable.");
      return;
    }
    if (!appId || !channelId.trim()) {
      setError("applicationId and channelId are required");
      return;
    }
    const redirectUri = `${window.location.origin}/prizes/claim`;
    const result = await startPrizeClaimAuth({
      applicationId: appId,
      channelId: channelId.trim(),
      displayName: displayName.trim(),
      redirectUri,
    });
    if (!result.success || !result.data) {
      setError(result.error || "Failed to start claim auth");
      return;
    }
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      setError("Offline mode is active. Prize claiming is unavailable.");
      return;
    }
    window.location.assign(`${baseUrl}${result.data.callbackPath}`);
  };

  const loadAwards = async () => {
    if (isOfflineMode()) {
      setError("Offline mode is active. Prize history is unavailable.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getMyPrizeAwards();
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.error || "Failed to load awards");
      return;
    }
    setAwards(result.data.awards || []);
  };

  const copyCoupon = async (awardId: string, code: string) => {
    if (isOfflineMode()) {
      setError("Offline mode is active. Prize operations are unavailable.");
      return;
    }
    if (!code) return;
    await navigator.clipboard.writeText(code);
    await markPrizeViewed(awardId);
    await loadAwards();
  };

  const markClaimed = async (awardId: string) => {
    if (isOfflineMode()) {
      setError("Offline mode is active. Prize operations are unavailable.");
      return;
    }
    await markPrizeClaimed(awardId);
    await loadAwards();
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prize Claim Portal</h1>
          <p className="text-sm text-muted-foreground">Authenticate channel, view awards, copy coupon codes.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Application: {appId || "Not set"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="claimChannelId">YouTube Channel ID</Label>
            <Input id="claimChannelId" value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="UC..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claimDisplayName">Display Name (optional)</Label>
            <Input id="claimDisplayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button onClick={onLogin}>
              <Gift className="mr-2 h-4 w-4" />
              Login To Claim
            </Button>
            <Button onClick={loadAwards} variant="secondary" disabled={loading}>
              {loading ? "Loading…" : "Load My Awards"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Awards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {awards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No claimable awards.</p>
          ) : (
            awards.map((award) => (
              <div key={award._id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{award.prizeType}</p>
                  <Badge>{award.couponStatus}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Run: {award.frontendQuizGameId}</p>
                <div className="mt-2 flex gap-2">
                  <Input value={award.couponCode || ""} readOnly />
                  <Button onClick={() => copyCoupon(award._id, award.couponCode || "")} variant="outline">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button onClick={() => markClaimed(award._id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark Claimed
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrizeClaimPage;
