import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, Monitor, Users, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";

const BOARDS = [
  {
    title: "Spectator Board",
    description: "Main quiz show board with question, teams, timers, and spectator-facing effects.",
    href: "/spectator",
    icon: Monitor,
  },
  {
    title: "Viewer Leaderboard",
    description: "Viewer-only OBS board for live cumulative rankings and quiz-end audience standings.",
    href: "/viewers",
    icon: Users,
  },
  {
    title: "Quiz Mirror",
    description: "Read-only mirror of the host quiz screen — perfect for a second monitor or browser source.",
    href: "/quiz/mirror",
    icon: MonitorPlay,
  },
] as const;

const ObsBoards = ({ embedded = false }: { embedded?: boolean }) => {
  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4 md:p-6 relative z-10"}>
      <div className={`${embedded ? "" : "max-w-6xl mx-auto"} space-y-6`}>
        {!embedded && (
          <PageHeader
            title="OBS Boards"
            icon={Monitor}
            description="Launch the fullscreen output boards used in OBS scenes"
          />
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {BOARDS.map((board, index) => {
            const Icon = board.icon;
            return (
              <motion.div key={board.href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
                <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Icon className="h-6 w-6 text-primary" /> {board.title}
                    </CardTitle>
                    <CardDescription>{board.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-3">
                    <Button asChild className="gap-2">
                      <a href={board.href} target="_blank" rel="noopener noreferrer">
                        Open Board <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to={board.href}>Open Here</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ObsBoards;
