import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { motion } from "framer-motion";
import { useTVMode } from "@/hooks/useTVMode";
import { useTranslation } from "@/hooks/useTranslation";
import { Team } from "@/types/quiz";

interface NowPlayingCardProps {
  team: Team;
  isQuestionActive: boolean;
}

export const NowPlayingCard = ({ team, isQuestionActive }: NowPlayingCardProps) => {
  const { tvModeEnabled } = useTVMode();
  const { t } = useTranslation();

  if (tvModeEnabled) {
    return (
      <Card className="p-2 bg-gradient-to-br from-card via-muted/50 to-secondary/30">
        <div className="flex items-center gap-4">
          <Users className="h-10 w-10 text-primary" />
          <span className="text-xl font-bold text-primary uppercase tracking-wide">
            {t.nowPlayingLabel}
          </span>
          <Badge className={`${team.color} text-2xl px-6 py-2 font-black`}>
            {team.name}
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      animate={
        isQuestionActive
          ? {
            scale: [1, 1.02, 1],
            boxShadow: [
              "0 0 20px hsl(var(--primary) / 0.3)",
              "0 0 40px hsl(var(--primary) / 0.5)",
              "0 0 20px hsl(var(--primary) / 0.3)",
            ],
          }
          : {}
      }
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <Card
        className={`p-4 bg-gradient-to-br from-card via-card to-primary/20 border-2 ${isQuestionActive
          ? "border-primary shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
          : "border-border/50"
          }`}
      >
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t.nowPlayingLabel}
          </span>
          <Badge className={`${team.color} text-lg px-4 py-1 font-extrabold`}>
            {team.name}
          </Badge>
        </div>
      </Card>
    </motion.div>
  );
};