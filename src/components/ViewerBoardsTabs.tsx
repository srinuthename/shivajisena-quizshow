import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Trophy } from "lucide-react";
import { LiveLeaderboard, LeaderboardEntry } from "./LiveLeaderboard";
import { QuestionLeaderboard } from "./QuestionLeaderboard";
import { ChatResponse } from "./YouTubeChatResponses";
import { PrizeType } from "@/services/prizeApi";
import { PrizeOverlayEntry } from "@/hooks/usePrizeOverlay";

type ViewerBoardsTab = "question" | "cumulative";

interface ViewerBoardsTabsProps {
  questionResponses: ChatResponse[];
  cumulativeEntries: LeaderboardEntry[];
  isAnswerRevealed: boolean;
  correctAnswer: number | null;
  maskResponses?: boolean;
  isExpanded?: boolean;
  showTabs?: boolean;
  tab?: ViewerBoardsTab;
  onTabChange?: (tab: ViewerBoardsTab) => void;
  tabOrder?: ViewerBoardsTab[];
  showDevDebug?: boolean;
  enablePrizeAdminControls?: boolean;
  prizeTypeOptions?: PrizeType[];
  prizeOverlayByChannel?: Record<string, PrizeOverlayEntry>;
  selectedPrizeByChannel?: Record<string, PrizeType>;
  assigningByChannel?: Record<string, boolean>;
  xpLevelByChannel?: Record<string, number>;
  onSelectPrizeType?: (channelId: string, prizeType: PrizeType) => void;
  onAssignPrize?: (channelId: string) => void;
  onSelectLuckyWinner?: () => any;
  onAssignSelectedLucky?: () => any;
  onRemoveAward?: (awardId: string) => void;
  defaultShowCumulativeDecorativeBadges?: boolean;
}

export const ViewerBoardsTabs = ({
  questionResponses,
  cumulativeEntries,
  isAnswerRevealed,
  correctAnswer,
  maskResponses = false,
  isExpanded = false,
  showTabs = true,
  tab,
  onTabChange,
  tabOrder = ["question", "cumulative"],
  showDevDebug = false,
  enablePrizeAdminControls = false,
  prizeTypeOptions = [],
  prizeOverlayByChannel = {},
  selectedPrizeByChannel = {},
  assigningByChannel = {},
  xpLevelByChannel = {},
  onSelectPrizeType,
  onAssignPrize,
  onSelectLuckyWinner,
  onAssignSelectedLucky,
  onRemoveAward,
  defaultShowCumulativeDecorativeBadges = false,
}: ViewerBoardsTabsProps) => {
  const [internalTab, setInternalTab] = useState<ViewerBoardsTab>(tab || "question");
  const activeTab = tab ?? internalTab;
  const setActiveTab = (next: ViewerBoardsTab) => {
    if (!tab) setInternalTab(next);
    onTabChange?.(next);
  };

  const uniqueQuestionUsers = useMemo(
    () => new Set(questionResponses.map((r) => r.odytChannelId)).size,
    [questionResponses]
  );

  const questionBoard = (
    <div className="h-full min-h-0 overflow-y-auto pr-2 [scrollbar-gutter:stable]">
      <QuestionLeaderboard
        responses={questionResponses}
        isRevealed={isAnswerRevealed}
        correctAnswer={correctAnswer}
        maskResponses={maskResponses}
        isExpanded={isExpanded}
      />
    </div>
  );

  const cumulativeBoard = (
    <div className="h-full min-h-0 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
      <LiveLeaderboard
        entries={cumulativeEntries}
        isConnected={true}
        isExpanded={isExpanded}
        defaultShowDecorativeBadges={defaultShowCumulativeDecorativeBadges}
        enablePrizeAdminControls={enablePrizeAdminControls}
        prizeTypeOptions={prizeTypeOptions}
        prizeOverlayByChannel={prizeOverlayByChannel}
        selectedPrizeByChannel={selectedPrizeByChannel}
        assigningByChannel={assigningByChannel}
        xpLevelByChannel={xpLevelByChannel}
        onSelectPrizeType={onSelectPrizeType}
        onAssignPrize={onAssignPrize}
        onSelectLuckyWinner={onSelectLuckyWinner}
        onAssignSelectedLucky={onAssignSelectedLucky}
        onRemoveAward={onRemoveAward}
      />
    </div>
  );

  if (!showTabs) {
    return activeTab === "question" ? questionBoard : cumulativeBoard;
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewerBoardsTab)} className="h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <TabsList className="grid grid-cols-2">
          {tabOrder.map((entry) =>
            entry === "question" ? (
              <TabsTrigger key={entry} value="question" className="gap-2">
                <Target className="h-4 w-4" />
                Q-Board
              </TabsTrigger>
            ) : (
              <TabsTrigger key={entry} value="cumulative" className="gap-2">
                <Trophy className="h-4 w-4" />
                Total
              </TabsTrigger>
            )
          )}
        </TabsList>
        {showDevDebug && (
          <div className="text-[11px] text-muted-foreground font-mono">
            Q:{questionResponses.length}/{uniqueQuestionUsers} · T:{cumulativeEntries.length}
          </div>
        )}
      </div>

      <TabsContent
        value="question"
        className="mt-0 h-full min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
      >
        {questionBoard}
      </TabsContent>

      <TabsContent
        value="cumulative"
        className="mt-0 h-full min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
      >
        {cumulativeBoard}
      </TabsContent>
    </Tabs>
  );
};
