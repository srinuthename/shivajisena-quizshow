import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranding } from "@/hooks/useBranding";
import { getDefaultLogo } from "@/config/brandingConfig";
import { readQuizHostChannel } from "@/lib/quizHostChannel";
import { Image, Upload, X, RotateCcw, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSounds } from "@/hooks/useSounds";
import { optimizeImageUpload } from "@/lib/optimizeImageUpload";

const EPISODE_PREFIX_OPTIONS = [
  { value: "Episode", label: "Episode" },
  { value: "Show", label: "Show" },
  { value: "#", label: "#" },
  { value: "Part", label: "Part" },
  { value: "Round", label: "Round" },
];

export const BrandingEditorCard = () => {
  const { branding, updateBranding, resetBranding } = useBranding();
  const { playCorrect, playTick } = useSounds();
  const [logoInputMode, setLogoInputMode] = useState<'url' | 'upload'>('upload');
  const [partnerLogoUrl, setPartnerLogoUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const partnerFileInputRef = useRef<HTMLInputElement>(null);
  const defaultLogo = getDefaultLogo();
  const connectedHostTitle = String(readQuizHostChannel().quizHostChannelTitle || '').trim();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const dataUrl = await optimizeImageUpload(file, {
        maxWidth: 160,
        maxHeight: 160,
        maxBytes: 60 * 1024,
        quality: 0.76,
      });
      updateBranding({ logoUrl: dataUrl });
      playCorrect();
      toast({
        title: "Logo Uploaded",
        description: "Your custom logo has been saved",
      });
    } catch {
      toast({
        title: "Upload Failed",
        description: "Could not optimize this logo image.",
        variant: "destructive",
      });
    }
  };

  const handlePartnerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Please upload an image smaller than 2MB", variant: "destructive" });
      return;
    }

    try {
      const dataUrl = await optimizeImageUpload(file, {
        maxWidth: 160,
        maxHeight: 96,
        maxBytes: 45 * 1024,
        quality: 0.72,
      });
      const newLogos = [...(branding.partnerLogos || []), dataUrl];
      updateBranding({ partnerLogos: newLogos });
      playTick();
      toast({ title: "Partner Logo Added" });
    } catch {
      toast({
        title: "Upload Failed",
        description: "Could not optimize this partner logo.",
        variant: "destructive",
      });
    }
  };

  const addPartnerLogoByUrl = () => {
    if (!partnerLogoUrl.trim()) return;
    const newLogos = [...(branding.partnerLogos || []), partnerLogoUrl.trim()];
    updateBranding({ partnerLogos: newLogos });
    setPartnerLogoUrl('');
    playTick();
    toast({ title: "Partner Logo Added" });
  };

  const removePartnerLogo = (index: number) => {
    const newLogos = branding.partnerLogos?.filter((_, i) => i !== index) || [];
    updateBranding({ partnerLogos: newLogos });
  };

  const handleLogoUrlChange = (url: string) => {
    updateBranding({ logoUrl: url || '' });
  };

  const handleReset = () => {
    resetBranding();
    playCorrect();
    toast({
      title: "Branding Reset",
      description: "All branding settings restored to defaults",
    });
  };

  const logoSrc = branding.logoUrl || defaultLogo;

  return (
    <Card className="card-streaming">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary animate-pulse" />
          Show Branding
        </CardTitle>
        <CardDescription>
          Customize your quiz show identity and logos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-3">
          <Label>Channel Logo</Label>
          
          {/* Logo Preview */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={logoSrc}
                alt="Show Logo"
                className="h-20 w-20 object-contain rounded-lg border-2 border-primary/30 bg-muted animate-pulse-ring"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultLogo;
                }}
              />
              {branding.logoUrl && (
                <button
                  onClick={() => updateBranding({ logoUrl: '' })}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80 transition-transform hover:scale-110"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              {/* Toggle between URL and Upload */}
              <div className="flex gap-2">
                <Button
                  variant={logoInputMode === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLogoInputMode('upload')}
                  className="btn-streaming"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
                <Button
                  variant={logoInputMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLogoInputMode('url')}
                  className="btn-streaming"
                >
                  URL
                </Button>
              </div>

              {logoInputMode === 'upload' ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full btn-streaming"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                </>
              ) : (
                <Input
                  placeholder="https://example.com/logo.png"
                  value={branding.logoUrl?.startsWith('data:') ? '' : branding.logoUrl}
                  onChange={(e) => handleLogoUrlChange(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Channel Name (mandatory) */}
        <div className="space-y-2">
          <Label htmlFor="channelName">Channel Name <span className="text-destructive">*</span></Label>
          <Input
            id="channelName"
            value={branding.channelName || ''}
            onChange={(e) => updateBranding({ channelName: e.target.value })}
            placeholder="Your channel name"
            required
            className="border-primary/30 focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            {connectedHostTitle
              ? `Defaults to the connected host channel title (${connectedHostTitle}), but you can override it here for branding.`
              : 'Displayed in the quiz banner header. Defaults to YT Live Quiz until a host channel is connected.'}
          </p>
        </div>

        {/* Partner Logos Slideshow */}
        <div className="space-y-3">
          <Label>Partner Logos (Slideshow)</Label>
          <p className="text-xs text-muted-foreground">Add logos for sponsors/partners to show during the quiz.</p>
          
          {/* Current Partner Logos */}
          {branding.partnerLogos && branding.partnerLogos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {branding.partnerLogos.map((logo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={logo}
                    alt={`Partner ${index + 1}`}
                    className="h-12 w-12 object-contain rounded border border-border bg-muted transition-transform hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.5'; }}
                  />
                  <button
                    onClick={() => removePartnerLogo(index)}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Partner Logo */}
          <div className="flex gap-2">
            <input
              ref={partnerFileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePartnerLogoUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => partnerFileInputRef.current?.click()}
              className="btn-streaming"
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
            <Input
              placeholder="Or paste image URL"
              value={partnerLogoUrl}
              onChange={(e) => setPartnerLogoUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addPartnerLogoByUrl}
              disabled={!partnerLogoUrl.trim()}
              className="btn-streaming"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Reset Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="w-full btn-streaming hover:bg-destructive/10 hover:border-destructive"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  );
};
