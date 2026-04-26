import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranding } from "@/hooks/useBranding";
import { Settings } from "lucide-react";

const EPISODE_PREFIX_OPTIONS = [
  { value: "Episode", label: "Episode" },
  { value: "Show", label: "Show" },
  { value: "#", label: "#" },
  { value: "Part", label: "Part" },
  { value: "Round", label: "Round" },
];

export const ShowConfigurationCard = () => {
  const { branding, updateBranding } = useBranding();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Show Configuration
        </CardTitle>
        <CardDescription>
          Configure show title, episode details, and quiz name
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show Title */}
        <div className="space-y-2">
          <Label htmlFor="showTitle">Show Title <span className="text-destructive">*</span></Label>
          <Input
            id="showTitle"
            value={branding.showTitle}
            onChange={(e) => updateBranding({ showTitle: e.target.value })}
            placeholder="Quiz Show"
            required
          />
        </div>

        {/* Episode Prefix and Number Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Episode Prefix */}
          <div className="space-y-2">
            <Label>Episode Prefix</Label>
            <Select
              value={branding.episodePrefix}
              onValueChange={(value) => updateBranding({ episodePrefix: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select prefix" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {EPISODE_PREFIX_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Episode Number */}
          <div className="space-y-2">
            <Label htmlFor="episodeNumber">Episode Number <span className="text-destructive">*</span></Label>
            <Input
              id="episodeNumber"
              type="text"
              value={branding.episodeNumber}
              onChange={(e) => updateBranding({ episodeNumber: e.target.value })}
              placeholder="1"
              required
            />
          </div>
        </div>

        {/* Quiz Name */}
        <div className="space-y-2">
          <Label htmlFor="quizName">Quiz Name</Label>
          <Input
            id="quizName"
            value={branding.quizName || ''}
            onChange={(e) => updateBranding({ quizName: e.target.value })}
            placeholder="e.g., Science, History, General Knowledge"
          />
        </div>

        {/* Preview */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
          <p className="text-sm font-medium">
            {branding.channelName ? `${branding.channelName} - ` : ''}
            {branding.showTitle || 'Quiz Show'} {branding.episodePrefix} #{branding.episodeNumber || '1'}
            {branding.quizName && ` • ${branding.quizName}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};