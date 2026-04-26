import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Radio, Wifi, WifiOff, Loader2, Save, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { issueScopedSseToken } from '@/lib/sseAuth';
import {
  getSSEStreamUrl,
  setSSEStreamUrl,
  isSSEEnabled,
  setSSEEnabled,
  getSSEReconnectDelay,
  setSSEReconnectDelay,
  getSSEHeartbeatTimeout,
  setSSEHeartbeatTimeout,
  getViewerAnswerDelay,
  setViewerAnswerDelay,
  getViewerPostRevealGraceMs,
  setViewerPostRevealGraceMs,
  getAppMode,
  modeRequiresSSE,
  DEFAULT_SSE_STREAM_URL,
} from '@/config/appMode';
import { HOST_PRODUCT_KEY } from '@/config/hostProduct';

const toEventsEndpoint = (rawUrl: string): string => {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.endsWith('/sse') || trimmed.endsWith('/api/events') || trimmed.endsWith('/stream')) {
    return trimmed;
  }
  return `${trimmed}/sse`;
};

export const SSEServerConfigCard = () => {
  const appMode = getAppMode();
  const isSSERequired = modeRequiresSSE(appMode);
  
  const [sseEnabled, setSseEnabledState] = useState(isSSEEnabled);
  const [sseUrl, setSseUrl] = useState(getSSEStreamUrl);
  const [heartbeatTimeout, setHeartbeatTimeout] = useState(getSSEHeartbeatTimeout().toString());
  const [reconnectDelay, setReconnectDelay] = useState((getSSEReconnectDelay() / 1000).toString());
  const [viewerDelay, setViewerDelay] = useState(getViewerAnswerDelay().toString());
  const [postRevealGrace, setPostRevealGrace] = useState(getViewerPostRevealGraceMs().toString());
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const handleSSEChange = (e: CustomEvent<boolean>) => {
      setSseEnabledState(e.detail);
    };
    window.addEventListener('sseEnabledChanged', handleSSEChange as EventListener);
    return () => {
      window.removeEventListener('sseEnabledChanged', handleSSEChange as EventListener);
    };
  }, []);

  const handleSSEToggle = (enabled: boolean) => {
    setSseEnabledState(enabled);
    setSSEEnabled(enabled);
    
    if (enabled) {
      toast.info('SSE Stream enabled - testing connection...');
      setTimeout(() => {
        handleTestConnection();
      }, 500);
    } else {
      toast.info('SSE Stream disabled');
      setConnectionStatus('unknown');
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('unknown');

    try {
      const endpoint = toEventsEndpoint(sseUrl);
      if (!endpoint) {
        setConnectionStatus('failed');
        setIsTesting(false);
        toast.error('SSE URL is empty');
        return;
      }
      const origin = new URL(endpoint, window.location.origin).origin;
      const url = new URL('/streams/events', origin);
      const token = await issueScopedSseToken({
        baseUrl: origin,
        tenantId: 'default-org',
        applicationId: HOST_PRODUCT_KEY,
        resourceId: 'sse-test',
        consumer: HOST_PRODUCT_KEY,
      });
      url.searchParams.set('tenantId', 'default-org');
      url.searchParams.set('applicationId', HOST_PRODUCT_KEY);
      url.searchParams.set('resourceId', 'sse-test');
      url.searchParams.set('consumer', HOST_PRODUCT_KEY);
      url.searchParams.set('token', token);

      const eventSource = new EventSource(url.toString());
      
      const timeout = setTimeout(() => {
        eventSource.close();
        setConnectionStatus('failed');
        setIsTesting(false);
        toast.error('Connection timeout - no response from server');
      }, 10000);

      eventSource.onopen = () => {
        clearTimeout(timeout);
        eventSource.close();
        setConnectionStatus('connected');
        setIsTesting(false);
        toast.success('SSE stream connection successful!');
      };

      eventSource.onerror = () => {
        clearTimeout(timeout);
        eventSource.close();
        setConnectionStatus('failed');
        setIsTesting(false);
        toast.error('SSE stream connection failed');
      };
    } catch {
      setConnectionStatus('failed');
      setIsTesting(false);
      toast.error('Failed to connect to SSE stream server');
    }
  };

  useEffect(() => {
    setConnectionStatus(sseEnabled ? 'unknown' : 'failed');
  }, [sseEnabled, sseUrl]);

  const handleSaveConfig = () => {
    setSSEStreamUrl(sseUrl);
    setSSEHeartbeatTimeout(parseInt(heartbeatTimeout) || 45);
    setSSEReconnectDelay((parseInt(reconnectDelay) || 3) * 1000);
    setViewerAnswerDelay(parseInt(viewerDelay) || 500);
    setViewerPostRevealGraceMs(parseInt(postRevealGrace) || getViewerPostRevealGraceMs());
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    toast.success('SSE configuration saved');
  };

  const hasChanges = 
    sseUrl !== getSSEStreamUrl() ||
    parseInt(heartbeatTimeout) !== getSSEHeartbeatTimeout() ||
    parseInt(reconnectDelay) * 1000 !== getSSEReconnectDelay() ||
    parseInt(viewerDelay) !== getViewerAnswerDelay() ||
    parseInt(postRevealGrace) !== getViewerPostRevealGraceMs();

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">SSE Stream Server</CardTitle>
            {isSSERequired && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>
          <Switch
            checked={sseEnabled}
            onCheckedChange={handleSSEToggle}
            aria-label="Toggle SSE stream"
          />
        </div>
        <CardDescription>
          Server-Sent Events connection for real-time answer streaming
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Server URL */}
        <div className="space-y-2">
          <Label htmlFor="sse-url">SSE Server URL</Label>
          <div className="flex gap-2">
            <Input
              id="sse-url"
              placeholder={DEFAULT_SSE_STREAM_URL}
              value={sseUrl}
              onChange={(e) => setSseUrl(e.target.value)}
              disabled={!sseEnabled}
              className="flex-1 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleTestConnection}
              disabled={!sseEnabled || isTesting}
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
          <span className="text-sm font-medium">Stream Status</span>
          {sseEnabled ? (
            connectionStatus === 'connected' ? (
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
            )
          ) : (
            <Badge variant="outline" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Disabled
            </Badge>
          )}
        </div>

        {/* Advanced Settings */}
        {sseEnabled && (
          <>
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground">Advanced Settings</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heartbeat-timeout">Heartbeat Timeout (seconds)</Label>
                  <Input
                    id="heartbeat-timeout"
                    type="number"
                    min="10"
                    max="120"
                    value={heartbeatTimeout}
                    onChange={(e) => setHeartbeatTimeout(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Time to wait for heartbeat before reconnecting
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reconnect-delay">Reconnect Delay (seconds)</Label>
                  <Input
                    id="reconnect-delay"
                    type="number"
                    min="1"
                    max="30"
                    value={reconnectDelay}
                    onChange={(e) => setReconnectDelay(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Initial delay before reconnecting
                  </p>
                </div>
              </div>

              {/* Viewer Answer Delay - for frontend scoring latency compensation */}
              <div className="space-y-2">
                <Label htmlFor="viewer-delay">Viewer Answer Delay (ms)</Label>
                <Input
                  id="viewer-delay"
                  type="number"
                  min="0"
                  max="5000"
                  step="100"
                  value={viewerDelay}
                  onChange={(e) => setViewerDelay(e.target.value)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Latency compensation factor for viewer response timing (default: 500ms)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="post-reveal-grace">Post-Reveal Grace Window (ms)</Label>
                <Input
                  id="post-reveal-grace"
                  type="number"
                  min="2000"
                  max="10000"
                  step="100"
                  value={postRevealGrace}
                  onChange={(e) => setPostRevealGrace(e.target.value)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Accept in-flight answers after reveal for this window (recommended: 5000-10000ms)
                </p>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveConfig}
              disabled={!hasChanges}
              className="w-full"
              variant={hasChanges ? "default" : "outline"}
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

            {/* Expected data format info */}
            <div className="p-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5">
              <p className="text-xs text-muted-foreground">
                <strong>Expected SSE format:</strong>{' '}
                <code className="bg-muted px-1 rounded">
                  {`{id, type: "ANSWER", channelId, displayName, avatar, answer: "A"|"B"|"C"|"D", receivedAtYT}`}
                </code>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
