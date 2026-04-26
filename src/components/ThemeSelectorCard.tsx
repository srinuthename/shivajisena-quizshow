import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { COLOR_THEMES } from "@/config/colorThemes";
import { useColorTheme } from "@/hooks/useColorTheme";
import { Check, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const ThemeSelectorCard = () => {
  const { activeThemeId, setTheme } = useColorTheme();

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId);
    const theme = COLOR_THEMES.find(t => t.id === themeId);
    toast({
      title: "Theme Applied",
      description: `${theme?.name || themeId} theme is now active`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          Color Theme
        </CardTitle>
        <CardDescription>
          Choose a color palette for your quiz show
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {COLOR_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`relative p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                activeThemeId === theme.id
                  ? 'border-primary ring-2 ring-primary/30 shadow-lg'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Selected indicator */}
              {activeThemeId === theme.id && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}
              
              {/* Color swatches */}
              <div className="flex gap-1 mb-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: theme.preview.primary }}
                  title="Primary"
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: theme.preview.secondary }}
                  title="Secondary"
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: theme.preview.accent }}
                  title="Accent"
                />
              </div>
              
              {/* Theme name & description */}
              <h3 className="font-semibold text-sm text-left">{theme.name}</h3>
              <p className="text-xs text-muted-foreground text-left mt-1">
                {theme.description}
              </p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
