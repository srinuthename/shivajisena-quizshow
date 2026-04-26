import { useTVMode } from "@/hooks/useTVMode";
import { useBranding } from "@/hooks/useBranding";
import { useTranslation } from "@/hooks/useTranslation";
import { getDefaultLogo } from "@/config/brandingConfig";
import { PartnerLogosSlideshow } from "@/components/PartnerLogosSlideshow";

interface QuizHeaderProps {
  className?: string;
}

export const QuizHeader = ({ className = "" }: QuizHeaderProps) => {
  const { tvModeEnabled } = useTVMode();
  const { branding } = useBranding();
  const { t } = useTranslation();
  return (
    <div className={`relative z-20 ${tvModeEnabled ? 'bg-primary border-4 border-primary/60 shadow-2xl' : 'bg-primary shadow-md'} text-primary-foreground ${tvModeEnabled ? 'p-2 md:p-3' : 'p-1.5 md:p-2'} mb-2 rounded-xl ${className}`}>
      <div className={`flex ${tvModeEnabled ? 'flex-row items-center justify-between' : 'flex-col md:flex-row items-center'} gap-2 ${tvModeEnabled ? 'md:gap-4' : 'md:gap-2'}`}>
        
        {/* LEFT SECTION: Logo + Channel Name + Show Title */}
        <div className={`flex items-center ${tvModeEnabled ? 'gap-3' : 'gap-1.5'} flex-shrink-0`}>
          <img
            src={branding.logoUrl || getDefaultLogo()}
            alt={`${branding.showTitle} Logo`}
            className={`${tvModeEnabled ? 'h-16 w-16 md:h-20 md:w-20' : 'h-16 w-16 md:h-20 md:w-20'} object-contain rounded-lg ${tvModeEnabled ? 'ring-2 ring-primary-foreground/30 shadow-lg' : 'drop-shadow-md'}`}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getDefaultLogo();
            }}
          />
          <div className="flex flex-col">
            {branding.channelName && (
              <span className={`${tvModeEnabled ? 'text-xl md:text-2xl tracking-wide' : 'text-[10px] md:text-xs'} font-semibold text-primary-foreground/90`}>
                {branding.channelName}
              </span>
            )}
            <span className={`${tvModeEnabled ? 'text-2xl md:text-3xl tracking-tight' : 'text-xs md:text-sm'} font-bold text-primary-foreground`}>
              {branding.showTitle}
            </span>
          </div>
        </div>

        {/* CENTER SECTION: Episode Info + Topic */}
        <div className={`flex-1 flex flex-col items-center ${tvModeEnabled ? 'gap-1' : 'gap-0.5'}`}>
          <div className="text-center">
            <div className={`${tvModeEnabled ? 'text-3xl md:text-4xl font-extrabold tracking-tight' : 'text-base md:text-lg font-bold'} text-primary-foreground`}>
              {branding.episodePrefix} #{branding.episodeNumber}
            </div>
            {branding.quizName && (
              <div className={`${tvModeEnabled ? 'text-xl md:text-2xl mt-1 font-medium' : 'text-xs md:text-sm'} text-primary-foreground/85`}>
                {branding.quizName}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SECTION: Partner Logos Slideshow */}
        {branding.partnerLogos && branding.partnerLogos.length > 0 && (
          <div className={`flex flex-col items-center ${tvModeEnabled ? 'gap-1' : 'gap-0.5'} flex-shrink-0`}>
            <PartnerLogosSlideshow 
              logos={branding.partnerLogos} 
              className={tvModeEnabled ? 'scale-100' : 'opacity-90 scale-90'}
            />
            <span className={`${tvModeEnabled ? 'text-sm md:text-base' : 'text-[8px] md:text-[10px]'} text-primary-foreground/70 font-medium tracking-wide`}>
              {t.poweredBy}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
