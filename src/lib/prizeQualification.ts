import { FinalViewerLeaderboardEntry } from "@/lib/finalLeaderboardSnapshot";
import { PrizeEligibilityDecision, PrizeType } from "@/services/prizeApi";

export const PRIZE_SLOTS: PrizeType[] = ["quizfirst", "quizsecond", "quizthird"];

export const decisionKey = (prizeType: PrizeType, channelId: string): string =>
  `${prizeType}:${String(channelId || "").trim()}`;

export type PrizeQualifiedSlot = {
  prizeType: PrizeType;
  slotRank: number;
  rawViewer: FinalViewerLeaderboardEntry | null;
  selectedViewer: FinalViewerLeaderboardEntry | null;
  rawDecision?: PrizeEligibilityDecision;
  selectedDecision?: PrizeEligibilityDecision;
  passReason?: string;
};

const reasonText = (reasons: string[] = []): string =>
  reasons.length ? reasons.join(", ") : "Not eligible by current policy";

const compareDecisions = (
  aDecision: PrizeEligibilityDecision | undefined,
  bDecision: PrizeEligibilityDecision | undefined,
  aViewer: FinalViewerLeaderboardEntry,
  bViewer: FinalViewerLeaderboardEntry
): number => {
  const aScore = Number(aDecision?.priorityScore ?? Number.NEGATIVE_INFINITY);
  const bScore = Number(bDecision?.priorityScore ?? Number.NEGATIVE_INFINITY);
  if (aScore !== bScore) return bScore - aScore;
  const aRank = Number(aViewer.rank || 9999);
  const bRank = Number(bViewer.rank || 9999);
  if (aRank !== bRank) return aRank - bRank;
  return Number(bViewer.totalScore || 0) - Number(aViewer.totalScore || 0);
};

export const buildDecisionMap = (decisions: PrizeEligibilityDecision[] = []): Record<string, PrizeEligibilityDecision> => {
  const map: Record<string, PrizeEligibilityDecision> = {};
  for (const d of decisions) {
    map[decisionKey(d.prizeType, d.channelId)] = d;
  }
  return map;
};

export const computePrizeQualifiedSlots = (
  viewers: FinalViewerLeaderboardEntry[],
  decisions: PrizeEligibilityDecision[],
  prizeSlots: PrizeType[] = PRIZE_SLOTS
): PrizeQualifiedSlot[] => {
  const decisionMap = buildDecisionMap(decisions);
  const used = new Set<string>();
  const slots: PrizeQualifiedSlot[] = [];

  prizeSlots.forEach((prizeType, idx) => {
    const slotRank = idx + 1;
    const rawViewer = viewers[slotRank - 1] || null;
    const rawDecision = rawViewer ? decisionMap[decisionKey(prizeType, rawViewer.odytChannelId)] : undefined;

    let selectedViewer: FinalViewerLeaderboardEntry | null = null;
    let selectedDecision: PrizeEligibilityDecision | undefined;
    const orderedViewers = [...viewers].sort((a, b) =>
      compareDecisions(
        decisionMap[decisionKey(prizeType, a.odytChannelId)],
        decisionMap[decisionKey(prizeType, b.odytChannelId)],
        a,
        b
      )
    );
    for (const viewer of orderedViewers) {
      if (used.has(viewer.odytChannelId)) continue;
      const decision = decisionMap[decisionKey(prizeType, viewer.odytChannelId)];
      if (decision?.eligibilityStatus === "eligible") {
        selectedViewer = viewer;
        selectedDecision = decision;
        used.add(viewer.odytChannelId);
        break;
      }
    }

    let passReason: string | undefined;
    if (rawViewer && selectedViewer && rawViewer.odytChannelId !== selectedViewer.odytChannelId) {
      if (rawDecision?.eligibilityStatus === "ineligible") {
        passReason = `Rank #${slotRank} ineligible (${reasonText(rawDecision.ineligibilityReasons)})`;
      } else if ((selectedDecision?.priorityScore || 0) > (rawDecision?.priorityScore || 0)) {
        passReason = `Rank #${slotRank} moved by suggestion score`;
      } else if (used.has(rawViewer.odytChannelId)) {
        passReason = `Rank #${slotRank} moved due to higher-prize allocation`;
      } else {
        passReason = `Rank #${slotRank} moved by current suggestion rules`;
      }
    }

    slots.push({
      prizeType,
      slotRank,
      rawViewer,
      selectedViewer,
      rawDecision,
      selectedDecision,
      passReason,
    });
  });

  return slots;
};
