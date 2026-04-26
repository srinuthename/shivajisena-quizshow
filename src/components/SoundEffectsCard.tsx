import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, VolumeX, Play, Sparkles, Zap, PartyPopper } from "lucide-react";
import { useSounds } from "@/hooks/useSounds";
import { Slider } from "@/components/ui/slider";

const EFFECTS_KEY = "quizSoundEffects";

interface SoundEffectsSettings {
  soundEnabled: boolean;
  correctSound: boolean;
  wrongSound: boolean;
  buzzerSound: boolean;
  tickSound: boolean;
  confettiIntensity: "none" | "subtle" | "full";
  screenFlash: boolean;
  volume: number;
}

const DEFAULT_SETTINGS: SoundEffectsSettings = {
  soundEnabled: true,
  correctSound: true,
  wrongSound: true,
  buzzerSound: true,
  tickSound: true,
  confettiIntensity: "full",
  screenFlash: true,
  volume: 50,
};

const loadSettings = (): SoundEffectsSettings => {
  try {
    const saved = localStorage.getItem(EFFECTS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const SoundEffectsCard = () => {
  const [settings, setSettings] = useState<SoundEffectsSettings>(loadSettings);
  const { playCorrect, playWrong, playBuzzer, playTick } = useSounds();

  useEffect(() => {
    localStorage.setItem(EFFECTS_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback(<K extends keyof SoundEffectsSettings>(key: K, value: SoundEffectsSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const soundItems = [
    { key: "correctSound" as const, label: "Correct Answer", icon: "✅", play: playCorrect },
    { key: "wrongSound" as const, label: "Wrong Answer", icon: "❌", play: playWrong },
    { key: "buzzerSound" as const, label: "Buzzer", icon: "🔔", play: playBuzzer },
    { key: "tickSound" as const, label: "Timer Tick", icon: "⏱️", play: playTick },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          Sound & Effects
        </CardTitle>
        <CardDescription>
          Control sound effects, confetti intensity, and screen flash effects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            {settings.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-primary" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label>Master Sound</Label>
              <p className="text-xs text-muted-foreground">Enable or disable all sound effects</p>
            </div>
          </div>
          <Switch
            checked={settings.soundEnabled}
            onCheckedChange={(v) => update("soundEnabled", v)}
          />
        </div>

        {/* Volume Slider */}
        <div className="px-4 space-y-2">
          <Label>Volume: {settings.volume}%</Label>
          <Slider
            value={[settings.volume]}
            onValueChange={([v]) => update("volume", v)}
            min={0}
            max={100}
            step={5}
            disabled={!settings.soundEnabled}
          />
        </div>

        {/* Individual Sounds */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {soundItems.map(({ key, label, icon, play }) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/30"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <Label className="text-sm">{label}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  disabled={!settings.soundEnabled || !settings[key]}
                  onClick={play}
                >
                  <Play className="h-3 w-3" />
                </Button>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={(v) => update(key, v)}
                  disabled={!settings.soundEnabled}
                  className="scale-90"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Confetti Intensity */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/30">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-amber-500" />
            <div>
              <Label>Confetti Intensity</Label>
              <p className="text-xs text-muted-foreground">Controls celebration effects</p>
            </div>
          </div>
          <Select
            value={settings.confettiIntensity}
            onValueChange={(v) => update("confettiIntensity", v as "none" | "subtle" | "full")}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="subtle">Subtle</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Screen Flash */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/30">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <div>
              <Label>Screen Flash Effects</Label>
              <p className="text-xs text-muted-foreground">Flash green/red on correct/wrong answers</p>
            </div>
          </div>
          <Switch
            checked={settings.screenFlash}
            onCheckedChange={(v) => update("screenFlash", v)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SoundEffectsCard;
