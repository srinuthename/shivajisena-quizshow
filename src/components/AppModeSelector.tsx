import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import { Globe, Zap, Radio as RadioIcon, Lock } from 'lucide-react';

/**
 * Frontend Scoring is the only supported mode now.
 * The selector is rendered as a locked, read-only card so the rest of the
 * admin UI keeps its visual rhythm without exposing toggles for retired modes.
 */
export const AppModeSelector = () => {
  const { t } = useTranslation();

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-base md:text-lg">{t.appMode}</CardTitle>
          </div>
          <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
            <Lock className="h-3 w-3" />
            Locked
          </Badge>
        </div>
        <CardDescription className="text-xs md:text-sm">
          Scoring mode is fixed for this release.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border-2 border-primary bg-primary/5 p-4">
          <span className="mt-0.5 text-amber-500">
            <Zap className="h-5 w-5" />
          </span>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{t.frontendScoringMode}</span>
              <Badge variant="secondary" className="text-[10px]">Active</Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              {t.frontendScoringModeDesc}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="text-[10px]">
                <RadioIcon className="mr-1 h-3 w-3" />
                SSE
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                <Zap className="mr-1 h-3 w-3" />
                {t.viewerScoring}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
