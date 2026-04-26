import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useQuizGame } from '@/context/QuizGameContext';
import { Youtube, ChevronDown, ChevronUp, Loader2, Trash2, Pause, Play, Plus, Radio, Copy, Check, Bot, Zap, Settings2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Storage keys for dummy answer settings
const DUMMY_ENABLED_KEY = 'dummyAnswersEnabled';
const DUMMY_RATE_KEY = 'dummyAnswersRate';
const DUMMY_CORRECT_PROB_KEY = 'dummyAnswersCorrectProb';

export interface DummyAnswerSettings {
  enabled: boolean;
  answersPerMinute: number;
  correctAnswerProbability: number;
}

interface StreamManagerPanelProps {
  onDummySettingsChange?: (settings: DummyAnswerSettings) => void;
}

export const StreamManagerPanel = ({ onDummySettingsChange }: StreamManagerPanelProps) => {
  const { 
    frontendQuizGameId: streamFrontendQuizGameId, 
    connectedStreams, 
    isLoadingStreams, 
    addStream, 
    removeStream, 
    toggleStream, 
    refreshStreams 
  } = useQuizGame();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [copiedGameId, setCopiedGameId] = useState(false);
  const [showDummySettings, setShowDummySettings] = useState(false);

  // Dummy answer settings
  const [dummyEnabled, setDummyEnabled] = useState(() => {
    try {
      return localStorage.getItem(DUMMY_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [answersPerMinute, setAnswersPerMinute] = useState(() => {
    try {
      return parseInt(localStorage.getItem(DUMMY_RATE_KEY) || '30', 10);
    } catch {
      return 30;
    }
  });

  const [correctProbability, setCorrectProbability] = useState(() => {
    try {
      return parseFloat(localStorage.getItem(DUMMY_CORRECT_PROB_KEY) || '0.4');
    } catch {
      return 0.4;
    }
  });

  // Persist and notify settings changes
  useEffect(() => {
    try {
      localStorage.setItem(DUMMY_ENABLED_KEY, dummyEnabled.toString());
      localStorage.setItem(DUMMY_RATE_KEY, answersPerMinute.toString());
      localStorage.setItem(DUMMY_CORRECT_PROB_KEY, correctProbability.toString());
    } catch (e) {
      console.error('Failed to persist dummy answer settings:', e);
    }

    onDummySettingsChange?.({
      enabled: dummyEnabled,
      answersPerMinute,
      correctAnswerProbability: correctProbability,
    });
  }, [dummyEnabled, answersPerMinute, correctProbability, onDummySettingsChange]);

  // Refresh streams on mount and when streamFrontendQuizGameId changes
  useEffect(() => {
    if (streamFrontendQuizGameId) {
      refreshStreams();
    }
  }, [streamFrontendQuizGameId, refreshStreams]);

  const handleAddStream = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube video URL",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    const result = await addStream(videoUrl);
    
    if (result.success) {
      toast({
        title: "Stream Added",
        description: "YouTube stream connected successfully",
      });
      setVideoUrl('');
    } else {
      toast({
        title: "Failed to Add Stream",
        description: result.error || "Could not connect to stream",
        variant: "destructive",
      });
    }
    setIsAdding(false);
  };

  const handleRemoveStream = async (videoId: string) => {
    const result = await removeStream(videoId);
    if (result.success) {
      toast({
        title: "Stream Removed",
        description: "YouTube stream disconnected",
      });
    }
  };

  const handleToggleStream = async (videoId: string) => {
    const result = await toggleStream(videoId);
    if (result.success) {
      toast({
        title: result.isStopped ? "Stream Paused" : "Stream Resumed",
        description: result.isStopped ? "Stream monitoring paused" : "Stream monitoring resumed",
      });
    }
  };

  const copyGameId = () => {
    if (streamFrontendQuizGameId) {
      navigator.clipboard.writeText(streamFrontendQuizGameId);
      setCopiedGameId(true);
      setTimeout(() => setCopiedGameId(false), 2000);
    }
  };

  const handleDummyToggle = (checked: boolean) => {
    setDummyEnabled(checked);
    toast({
      title: checked ? "Dummy Answers Enabled" : "Dummy Answers Disabled",
      description: checked 
        ? `Generating ~${answersPerMinute} dummy answers per minute` 
        : "Dummy answer generation stopped",
    });
  };

  const activeStreamCount = connectedStreams.filter(s => !s.isStopped).length;

  if (!streamFrontendQuizGameId) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              onClick={() => setIsExpanded(true)}
              variant="outline"
              className="gap-2 bg-background/95 backdrop-blur-sm shadow-lg border-primary/20 hover:border-primary/40"
            >
              <Youtube className="h-4 w-4 text-red-500" />
              <span>{connectedStreams.length} Stream{connectedStreams.length !== 1 ? 's' : ''}</span>
              {activeStreamCount > 0 && (
                <Badge variant="default" className="ml-1 bg-green-500 text-white">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                  {activeStreamCount}
                </Badge>
              )}
              {dummyEnabled && (
                <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-600">
                  <Bot className="h-3 w-3" />
                </Badge>
              )}
              <ChevronUp className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="w-80 shadow-xl bg-background/95 backdrop-blur-sm border-primary/20">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-red-500" />
                  Stream Manager
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(false)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Add Stream Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="YouTube video URL..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStream()}
                    className="text-sm h-8"
                    disabled={isAdding}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddStream}
                    disabled={isAdding || !videoUrl.trim()}
                    className="h-8 px-3"
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Stream List */}
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {isLoadingStreams ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading streams...
                    </div>
                  ) : connectedStreams.length === 0 ? (
                    <div className="text-center py-2 text-muted-foreground text-sm">
                      No streams connected
                    </div>
                  ) : (
                    connectedStreams.map((stream) => (
                      <div
                        key={stream.streamId || stream.videoId}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full ${stream.isStopped ? 'bg-muted-foreground' : 'bg-green-500 animate-pulse'}`} />
                          <span className="truncate font-mono text-xs">{stream.videoId}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            mode: {stream.transformMode || "unknown"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleToggleStream(stream.streamId || stream.videoId)}
                          >
                            {stream.isStopped ? (
                              <Play className="h-3 w-3" />
                            ) : (
                              <Pause className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveStream(stream.streamId || stream.videoId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Dummy Answers Section */}
                <Collapsible open={showDummySettings} onOpenChange={setShowDummySettings}>
                  <div className="border-t border-border pt-3">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">Dummy Answers</span>
                          {dummyEnabled && (
                            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600">
                              <Zap className="h-3 w-3 mr-1" />
                              {answersPerMinute}/min
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={dummyEnabled}
                            onCheckedChange={handleDummyToggle}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Settings2 className={`h-4 w-4 transition-transform ${showDummySettings ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="pt-3 space-y-4">
                      {/* Answers per minute */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Answers per minute</Label>
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{answersPerMinute}</span>
                        </div>
                        <Slider
                          value={[answersPerMinute]}
                          onValueChange={([val]) => setAnswersPerMinute(val)}
                          min={5}
                          max={120}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>5</span>
                          <span>120</span>
                        </div>
                      </div>

                      {/* Correct answer probability */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Correct answer %</Label>
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{Math.round(correctProbability * 100)}%</span>
                        </div>
                        <Slider
                          value={[correctProbability * 100]}
                          onValueChange={([val]) => setCorrectProbability(val / 100)}
                          min={10}
                          max={90}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>10%</span>
                          <span>90%</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Generates simulated viewer answers for testing. Works alongside real YouTube answers.
                      </p>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* Game ID Footer */}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Game ID:</span>
                    <button
                      onClick={copyGameId}
                      className="flex items-center gap-1 font-mono hover:text-foreground transition-colors"
                    >
                      <span className="truncate max-w-[140px]">{streamFrontendQuizGameId.slice(-12)}...</span>
                      {copiedGameId ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
