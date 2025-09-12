import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="sm"
      className="fixed top-4 right-4 z-50 border-biblical-gold text-biblical-gold hover:bg-biblical-gold/20"
    >
      <Languages className="mr-2 h-4 w-4" />
      {language === 'en' ? t('Telugu') : t('English')}
    </Button>
  );
}