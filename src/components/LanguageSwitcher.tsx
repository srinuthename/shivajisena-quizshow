// Language switcher component
import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export const LanguageSwitcher = memo(({
  className,
  showLabel = true,
  size = 'default',
}: LanguageSwitcherProps) => {
  const { language, t, toggleLanguage } = useTranslation();
  
  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    default: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  };
  
  return (
    <Button
      variant="outline"
      onClick={toggleLanguage}
      className={cn(
        'gap-2 font-medium',
        sizeClasses[size],
        className
      )}
      title={t.switchLanguage}
    >
      <Globe className="w-4 h-4" />
      {showLabel && (
        <span>
          {language === 'te' ? 'EN' : 'తె'}
        </span>
      )}
    </Button>
  );
});

LanguageSwitcher.displayName = 'LanguageSwitcher';
