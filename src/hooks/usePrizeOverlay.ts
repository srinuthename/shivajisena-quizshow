import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assignPrize,
  getPrizeAwards,
  getPrizePolicy,
  getPrizeSuggestions,
  IneligibilityReasonCode,
  PrizePositiveSignalCode,
  PrizeAwardRecord,
  PrizeEligibilityDecision,
  PrizeSoftFlagCode,
  PrizeType,
  revokePrizeAward,
} from "@/services/prizeApi";

export interface PrizeOverlayViewer {
  odytChannelId: string;
  userName: string;
  rank: number;
}

export interface PrizeOverlayEntry {
  channelId: string;
  userName: string;
  rank: number;
  isIneligible: boolean;
  eligibilityStatus: "eligible" | "ineligible";
  properParticipations: number;
  nonWinningProperParticipations: number;
  requiredProperParticipations: number;
  luckyRequiredProperParticipations: number;
  reasonCodes: IneligibilityReasonCode[];
  reasonTags: string[];
  softFlags: PrizeSoftFlagCode[];
  softFlagTags: string[];
  positiveSignals: PrizePositiveSignalCode[];
  positiveSignalTags: string[];
  decisionsByPrizeType: Partial<Record<PrizeType, PrizeEligibilityDecision>>;
  assignedAwards: PrizeAwardRecord[];
}

export interface LuckySelection {
  channelId: string;
  userName: string;
  rank: number;
  luckyInstance: number;
}

const DEFAULT_PRIZE_TYPES: PrizeType[] = ["quizfirst", "quizsecond", "quizthird", "luckydip", "custom"];
const CHUNK_SIZE = 250;

const reasonToLabel = (reason: IneligibilityReasonCode): string => {
  if (reason === "cooldown_active") return "Past Winner";
  if (reason === "prior_prize_winner") return "Past Prize Winner";
  if (reason === "lucky_already_used") return "";
  if (reason === "account_too_new") return "New Account";
  if (reason === "insufficient_participations") return "Low Participation";
  if (reason === "profile_missing") return "Profile Missing";
  return reason;
};

const softFlagToLabel = (flag: PrizeSoftFlagCode): string => {
  if (flag === "recent_prize_winner") return "Recent Prize";
  if (flag === "frequent_prize_winner") return "Frequent Winner";
  if (flag === "low_current_quiz_engagement") return "Low Engagement";
  if (flag === "low_current_quiz_accuracy") return "Low Accuracy";
  if (flag === "low_non_winning_history") return "Thin Non-Win History";
  return flag;
};

const positiveSignalToLabel = (signal: PrizePositiveSignalCode): string => {
  if (signal === "first_time_prize_candidate") return "First-Time Prize";
  if (signal === "high_proper_participation") return "High Participation";
  if (signal === "strong_current_quiz_engagement") return "Good Engagement";
  if (signal === "strong_current_quiz_accuracy") return "Good Accuracy";
  if (signal === "strong_non_winning_history") return "Strong Non-Win History";
  return signal;
};

const RANKED_PRIZE_TYPES = new Set<PrizeType>(["quizfirst", "quizsecond", "quizthird"]);

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

export const usePrizeOverlay = ({
  enabled,
  applicationId,
  frontendQuizGameId,
  viewers,
  pollMs = 10000,
  refreshKey,
}: {
  enabled: boolean;
  applicationId?: string | null;
  frontendQuizGameId: string;
  viewers: PrizeOverlayViewer[];
  pollMs?: number;
  refreshKey?: string | number | boolean;
}) => {
  const resolvedApplicationId = useMemo(
    () => String(applicationId || "").trim(),
    [applicationId]
  );
  const [policyEnabledTypes, setPolicyEnabledTypes] = useState<PrizeType[]>(DEFAULT_PRIZE_TYPES);
  const [properParticipationMinAnswersPerQuiz, setProperParticipationMinAnswersPerQuiz] = useState<number>(10);
  const [rankedMinProperParticipations, setRankedMinProperParticipations] = useState<number>(10);
  const [luckyMinProperParticipations, setLuckyMinProperParticipations] = useState<number>(20);
  const [overlayByChannel, setOverlayByChannel] = useState<Record<string, PrizeOverlayEntry>>({});
  const [awards, setAwards] = useState<PrizeAwardRecord[]>([]);
  const [selectedPrizeByChannel, setSelectedPrizeByChannel] = useState<Record<string, PrizeType>>({});
  const [assigningByChannel, setAssigningByChannel] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [luckySelection, setLuckySelection] = useState<LuckySelection | null>(null);
  const luckyPickedRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const viewersRef = useRef<PrizeOverlayViewer[]>(viewers);

  useEffect(() => {
    viewersRef.current = viewers;
  }, [viewers]);

  const baselinePrizeType = useMemo(() => {
    const first = policyEnabledTypes.find((t) => t !== "luckydip") || "quizfirst";
    return first;
  }, [policyEnabledTypes]);

  const viewersByChannel = useMemo(() => {
    const map = new Map<string, PrizeOverlayViewer>();
    for (const v of viewers) map.set(v.odytChannelId, v);
    return map;
  }, [viewers]);
  useEffect(() => {
    if (!enabled || !resolvedApplicationId) return;
    let active = true;
    (async () => {
      const policy = await getPrizePolicy(resolvedApplicationId);
      if (!active) return;
      const enabledTypes = (policy.data?.enabledPrizeTypes || []).filter(Boolean) as PrizeType[];
      setPolicyEnabledTypes(enabledTypes.length ? enabledTypes : DEFAULT_PRIZE_TYPES);
      setProperParticipationMinAnswersPerQuiz(
        Number(policy.data?.properParticipationMinAnswersPerQuiz || 10)
      );
      setRankedMinProperParticipations(
        Number(policy.data?.minProperParticipations || 10)
      );
      setLuckyMinProperParticipations(
        Number(policy.data?.luckyMinProperParticipations || 20)
      );
    })();
    return () => {
      active = false;
    };
  }, [enabled, resolvedApplicationId]);

  useEffect(() => {
    if (!enabled) return;
    setSelectedPrizeByChannel((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const v of viewers) {
        if (!next[v.odytChannelId]) {
          next[v.odytChannelId] = baselinePrizeType;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [enabled, viewers, baselinePrizeType]);

  const evaluateAll = useCallback(async () => {
    const now = Date.now();
    if (now < cooldownUntilRef.current) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    const currentViewers = viewersRef.current;
    if (!enabled || !resolvedApplicationId || !frontendQuizGameId || currentViewers.length === 0) {
      setOverlayByChannel({});
      setAwards([]);
      return;
    }
    inFlightRef.current = true;
    setLoading(true);
    try {
      const [awardsResult] = await Promise.all([
        getPrizeAwards({
          applicationId: resolvedApplicationId,
          frontendQuizGameId,
          limit: 1000,
        }),
      ]);
      const rawAwards = awardsResult.data?.awards || [];
      const normalizedAppId = String(resolvedApplicationId || "").trim();
      const normalizedGameId = String(frontendQuizGameId || "").trim();
      const awardsForRun = rawAwards.filter((award) => {
        const awardAppId = String(award.applicationId || "").trim();
        const awardGameId = String(award.frontendQuizGameId || "").trim();
        return awardAppId === normalizedAppId && awardGameId === normalizedGameId;
      });
      setAwards(awardsForRun);

      const evalTypes = Array.from(
        new Set<PrizeType>([...policyEnabledTypes, baselinePrizeType, "luckydip"])
      );
      const candidates = currentViewers.flatMap((viewer) =>
        evalTypes.map((prizeType) => ({
          channelId: viewer.odytChannelId,
          prizeType,
          rank: viewer.rank,
          category: prizeType === "luckydip" ? ("onlyonceinlifetime" as const) : ("regular" as const),
        }))
      );
      const parts = chunk(candidates, CHUNK_SIZE);
      const decisions: PrizeEligibilityDecision[] = [];
      for (const p of parts) {
        const res = await getPrizeSuggestions({
          applicationId: resolvedApplicationId,
          frontendQuizGameId,
          candidates: p,
        });
        if (res.success && res.data?.decisions) decisions.push(...res.data.decisions);
      }

      const decisionMap = new Map<string, PrizeEligibilityDecision>();
      for (const d of decisions) decisionMap.set(`${d.channelId}:${d.prizeType}`, d);

      const awardMap = new Map<string, PrizeAwardRecord[]>();
      for (const award of awardsForRun) {
        if (award.couponStatus === "revoked") continue;
        const key = String(award.assignedChannelId || "");
        if (!key) continue;
        const curr = awardMap.get(key) || [];
        curr.push(award);
        awardMap.set(key, curr);
      }

      const next: Record<string, PrizeOverlayEntry> = {};
      for (const viewer of currentViewers) {
        const channelId = viewer.odytChannelId;
        const baseline = decisionMap.get(`${channelId}:${baselinePrizeType}`);
        const lucky = decisionMap.get(`${channelId}:luckydip`);
        const currentRunLuckyAssigned = awardsForRun.some(
          (award) =>
            award.prizeType === "luckydip" &&
            String(award.assignedChannelId || "") === channelId &&
            award.couponStatus !== "revoked"
        );
        const reasons = new Set<IneligibilityReasonCode>();
        if (baseline?.ineligibilityReasons?.length) {
          for (const r of baseline.ineligibilityReasons) reasons.add(r);
        }
        if (lucky?.ineligibilityReasons?.includes("lucky_already_used") && !currentRunLuckyAssigned) {
          reasons.add("lucky_already_used");
        }
        const properParticipations = Math.max(
          Number(baseline?.properParticipations || 0),
          Number(lucky?.properParticipations || 0)
        );
        const nonWinningProperParticipations = Math.max(
          Number(baseline?.nonWinningProperParticipations || 0),
          Number(lucky?.nonWinningProperParticipations || 0)
        );
        const requiredProperParticipations = Math.max(
          0,
          Number(baseline?.requiredProperParticipations || rankedMinProperParticipations || 0)
        );
        const luckyRequiredProperParticipations = Math.max(
          requiredProperParticipations,
          Number(lucky?.requiredProperParticipations || luckyMinProperParticipations || requiredProperParticipations)
        );
        if (properParticipations < requiredProperParticipations) {
          reasons.add("insufficient_participations");
        }
        const reasonCodes = Array.from(reasons);
        const softFlags = Array.from(
          new Set([
            ...((baseline?.softFlags || []) as PrizeSoftFlagCode[]),
            ...((lucky?.softFlags || []) as PrizeSoftFlagCode[]),
          ])
        );
        const positiveSignals = Array.from(
          new Set([
            ...((baseline?.positiveSignals || []) as PrizePositiveSignalCode[]),
            ...((lucky?.positiveSignals || []) as PrizePositiveSignalCode[]),
          ])
        );
        const eligibilityStatus =
          baseline?.eligibilityStatus ||
          (reasonCodes.length > 0 ? "ineligible" : "eligible");
        next[channelId] = {
          channelId,
          userName: viewer.userName,
          rank: viewer.rank,
          isIneligible: eligibilityStatus === "ineligible",
          eligibilityStatus,
          properParticipations,
          nonWinningProperParticipations,
          requiredProperParticipations,
          luckyRequiredProperParticipations,
          reasonCodes,
          reasonTags: reasonCodes.map(reasonToLabel).filter(Boolean),
          softFlags,
          softFlagTags: softFlags.map(softFlagToLabel).filter(Boolean),
          positiveSignals,
          positiveSignalTags: positiveSignals.map(positiveSignalToLabel).filter(Boolean),
          decisionsByPrizeType: Object.fromEntries(
            evalTypes
              .map((t) => [t, decisionMap.get(`${channelId}:${t}`)])
              .filter(([, v]) => Boolean(v))
          ) as Partial<Record<PrizeType, PrizeEligibilityDecision>>,
          assignedAwards: awardMap.get(channelId) || [],
        };
      }
      setOverlayByChannel(next);
      setSelectedPrizeByChannel((prev) => {
        let changed = false;
        const nextSelection = { ...prev };
        const occupiedRankedPrizeByType = new Map<PrizeType, string>();
        for (const award of awardsForRun) {
          if (award.couponStatus === "revoked") continue;
          if (!RANKED_PRIZE_TYPES.has(award.prizeType)) continue;
          occupiedRankedPrizeByType.set(award.prizeType, String(award.assignedChannelId || ""));
        }

        for (const viewer of currentViewers) {
          const channelId = viewer.odytChannelId;
          const entry = next[channelId];
          const activeAssignedAwards = (entry?.assignedAwards || []).filter((award) => award.couponStatus !== "revoked");
          const currentSelection = nextSelection[channelId];

          const canUsePrizeType = (prizeType: PrizeType | undefined): boolean => {
            if (!prizeType) return false;
            if (!policyEnabledTypes.includes(prizeType)) return false;
            if (activeAssignedAwards.length > 0) return activeAssignedAwards.some((award) => award.prizeType === prizeType);
            if (prizeType === "custom") return true;
            const decision = entry?.decisionsByPrizeType?.[prizeType];
            if (decision && decision.eligibilityStatus !== "eligible") return false;
            if (RANKED_PRIZE_TYPES.has(prizeType)) {
              const occupiedBy = String(occupiedRankedPrizeByType.get(prizeType) || "");
              if (occupiedBy && occupiedBy !== channelId) return false;
            }
            return true;
          };

          if (canUsePrizeType(currentSelection)) {
            continue;
          }

          const nextType =
            policyEnabledTypes.find((type) => canUsePrizeType(type)) ||
            activeAssignedAwards[0]?.prizeType ||
            baselinePrizeType;

          if (nextSelection[channelId] !== nextType) {
            nextSelection[channelId] = nextType;
            changed = true;
          }
        }

        return changed ? nextSelection : prev;
      });
      cooldownUntilRef.current = 0;
    } catch (error) {
      // Apply a short backoff to avoid browser/network resource exhaustion loops.
      cooldownUntilRef.current = Date.now() + Math.max(5000, Math.min(30000, pollMs));
      console.warn("[PrizeOverlay] evaluateAll failed, backing off", error);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      if (queuedRef.current) {
        queuedRef.current = false;
        window.setTimeout(() => {
          void evaluateAll();
        }, 300);
      }
    }
  }, [enabled, resolvedApplicationId, frontendQuizGameId, policyEnabledTypes, baselinePrizeType, pollMs, rankedMinProperParticipations, luckyMinProperParticipations]);

  useEffect(() => {
    if (!enabled) return;
    void evaluateAll();
  }, [enabled, frontendQuizGameId, evaluateAll]);

  useEffect(() => {
    if (!enabled) return;
    if (refreshKey === undefined || refreshKey === null) return;
    void evaluateAll();
  }, [enabled, refreshKey, evaluateAll]);

  useEffect(() => {
    if (!enabled) return;
    if (pollMs <= 0) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    timer = setInterval(() => {
      void evaluateAll();
    }, Math.max(5000, pollMs));
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [enabled, evaluateAll, pollMs]);

  const luckyAssignedChannels = useMemo(() => {
    const set = new Set<string>();
    for (const award of awards) {
      if (award.prizeType === "luckydip" && award.assignedChannelId) set.add(String(award.assignedChannelId));
    }
    return set;
  }, [awards]);

  const nextLuckyInstance = useMemo(() => {
    let max = 0;
    for (const award of awards) {
      if (award.prizeType !== "luckydip") continue;
      const n = Number(award.prizeInstance || 1);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max + 1;
  }, [awards]);

  const assignForChannel = useCallback(
    async ({
      channelId,
      prizeType,
      couponCode = "",
      prizeInstance,
    }: {
      channelId: string;
      prizeType?: PrizeType;
      couponCode?: string;
      prizeInstance?: number;
    }) => {
      if (!enabled || !resolvedApplicationId || !frontendQuizGameId || !channelId) return { success: false };
      const selectedType = prizeType || selectedPrizeByChannel[channelId] || baselinePrizeType;
      const decision = overlayByChannel[channelId]?.decisionsByPrizeType?.[selectedType];
      const targetPrizeInstance = selectedType === "luckydip" ? prizeInstance || nextLuckyInstance : 1;
      const existingForSlot = awards.find(
        (award) =>
          award.prizeType === selectedType &&
          Number(award.prizeInstance || 1) === targetPrizeInstance &&
          award.couponStatus !== "revoked"
      );
      const existingAssignedChannelId = String(existingForSlot?.assignedChannelId || "");
      const isSameChannelAssignment = Boolean(existingForSlot) && existingAssignedChannelId === String(channelId);
      const isRankedPrize = RANKED_PRIZE_TYPES.has(selectedType);
      const currentAssignedAwards = overlayByChannel[channelId]?.assignedAwards || [];
      const otherAssignedAward = currentAssignedAwards.find(
        (award) =>
          award.couponStatus !== "revoked" &&
          !(
            award.prizeType === selectedType &&
            Number(award.prizeInstance || 1) === targetPrizeInstance
          )
      );
      const otherRankedAward = currentAssignedAwards.find(
        (award) =>
          award.couponStatus !== "revoked" &&
          RANKED_PRIZE_TYPES.has(award.prizeType) &&
          award.prizeType !== selectedType
      );

      if (isSameChannelAssignment) {
        return { success: true, data: existingForSlot };
      }

      if (otherAssignedAward) {
        return {
          success: false,
          error: "This participant already has a prize in this quiz. Remove that assignment before giving another prize.",
          data: otherAssignedAward,
        };
      }

      if (isRankedPrize && otherRankedAward) {
        return {
          success: false,
          error: "This participant already has a ranked prize in this quiz. Remove that assignment before giving another ranked prize.",
          data: otherRankedAward,
        };
      }

      const replaceExisting =
        Boolean(existingForSlot) &&
        existingAssignedChannelId !== String(channelId);

      // Optimistic UI: add a temporary award immediately
      const tempId = `temp-${Date.now()}-${channelId}`;
      const optimisticAward: PrizeAwardRecord = {
        _id: tempId,
        applicationId: resolvedApplicationId,
        frontendQuizGameId,
        prizeType: selectedType,
        prizeInstance: targetPrizeInstance,
        category: selectedType === "luckydip" ? "onlyonceinlifetime" : "regular",
        rank: viewersByChannel.get(channelId)?.rank ?? null,
        candidateChannelId: channelId,
        assignedChannelId: channelId,
        eligibilityStatus: decision?.eligibilityStatus || "eligible",
        ineligibilityReasons: decision?.ineligibilityReasons || [],
        cooldownRemaining: 0,
        couponCode: couponCode || undefined,
        couponStatus: "assigned",
        assignedAt: new Date().toISOString(),
      };

      // Save previous state for rollback
      const prevAwards = awards;
      const prevOverlay = overlayByChannel;

      setAwards((prev) => [
        ...prev.filter(
          (award) =>
            !(
              award.prizeType === selectedType &&
              Number(award.prizeInstance || 1) === targetPrizeInstance &&
              award.couponStatus !== "revoked"
            )
        ),
        optimisticAward,
      ]);
      setOverlayByChannel((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          const entry = next[key];
          next[key] = {
            ...entry,
            assignedAwards: entry.assignedAwards.filter(
              (award) =>
                !(
                  award.prizeType === selectedType &&
                  Number(award.prizeInstance || 1) === targetPrizeInstance &&
                  award.couponStatus !== "revoked"
                )
            ),
          };
        }
        const entry = next[channelId];
        if (!entry) return next;
        next[channelId] = {
          ...entry,
          assignedAwards: [...entry.assignedAwards, optimisticAward],
        };
        return next;
      });
      setAssigningByChannel((prev) => ({ ...prev, [channelId]: true }));

      try {
        const result = await assignPrize({
          applicationId: resolvedApplicationId,
          frontendQuizGameId,
          prizeType: selectedType,
          prizeInstance: targetPrizeInstance,
          category: selectedType === "luckydip" ? "onlyonceinlifetime" : "regular",
          rank: viewersByChannel.get(channelId)?.rank ?? null,
          candidateChannelId: channelId,
          assignedChannelId: channelId,
          couponCode,
          assignedBy: "leaderboard-inline",
          override: decision?.eligibilityStatus === "ineligible",
          overrideReason:
            decision?.eligibilityStatus === "ineligible"
              ? "manual admin decision from leaderboard"
              : undefined,
          replaceExisting,
        });
        if (!result.success) {
          // Rollback on failure
          setAwards(prevAwards);
          setOverlayByChannel(prevOverlay);
          console.warn("[PrizeOverlay] assignForChannel failed, rolled back", result.error);
        } else {
          // Refresh with real data
          void evaluateAll();
        }
        return result;
      } catch (err) {
        // Rollback on error
        setAwards(prevAwards);
        setOverlayByChannel(prevOverlay);
        console.error("[PrizeOverlay] assignForChannel error, rolled back", err);
        return { success: false, error: "Network error" };
      } finally {
        setAssigningByChannel((prev) => ({ ...prev, [channelId]: false }));
      }
    },
    [
      enabled,
      resolvedApplicationId,
      frontendQuizGameId,
      selectedPrizeByChannel,
      baselinePrizeType,
      overlayByChannel,
      nextLuckyInstance,
      awards,
      viewersByChannel,
      evaluateAll,
    ]
  );

  const selectLuckyWinner = useCallback(() => {
    const eligible = viewers.filter((v) => {
      const overlay = overlayByChannel[v.odytChannelId];
      const lucky = overlay?.decisionsByPrizeType?.luckydip;
      if (!lucky || lucky.eligibilityStatus !== "eligible") return false;
      if ((overlay?.assignedAwards || []).some((award) => award.couponStatus !== "revoked")) return false;
      if (luckyAssignedChannels.has(v.odytChannelId)) return false;
      if (luckyPickedRef.current.has(v.odytChannelId)) return false;
      return true;
    });
    if (eligible.length === 0) {
      setLuckySelection(null);
      return null;
    }
    const selected = eligible[Math.floor(Math.random() * eligible.length)];
    luckyPickedRef.current.add(selected.odytChannelId);
    const candidate = {
      channelId: selected.odytChannelId,
      userName: selected.userName,
      rank: selected.rank,
      luckyInstance: nextLuckyInstance,
    };
    setLuckySelection(candidate);
    return candidate;
  }, [viewers, overlayByChannel, luckyAssignedChannels, nextLuckyInstance]);

  const assignSelectedLucky = useCallback(async () => {
    if (!luckySelection) return { success: false };
    const result = await assignForChannel({
      channelId: luckySelection.channelId,
      prizeType: "luckydip",
      prizeInstance: luckySelection.luckyInstance,
    });
    if (result?.success) setLuckySelection(null);
    return result;
  }, [luckySelection, assignForChannel]);

  const removeAward = useCallback(
    async (awardId: string) => {
      if (!awardId) return { success: false };

      // Optimistic UI: remove award immediately
      const prevAwards = awards;
      const prevOverlay = overlayByChannel;

      setAwards((prev) => prev.filter((a) => a._id !== awardId));
      setOverlayByChannel((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          const entry = next[key];
          if (entry.assignedAwards.some((a) => a._id === awardId)) {
            next[key] = {
              ...entry,
              assignedAwards: entry.assignedAwards.filter((a) => a._id !== awardId),
            };
          }
        }
        return next;
      });

      try {
        const result = await revokePrizeAward({
          awardId,
          revokedBy: "leaderboard-inline",
          reason: "manual remove from leaderboard",
        });
        if (!result.success) {
          setAwards(prevAwards);
          setOverlayByChannel(prevOverlay);
          console.warn("[PrizeOverlay] removeAward failed, rolled back", result.error);
        } else {
          void evaluateAll();
        }
        return result;
      } catch (err) {
        setAwards(prevAwards);
        setOverlayByChannel(prevOverlay);
        console.error("[PrizeOverlay] removeAward error, rolled back", err);
        return { success: false, error: "Network error" };
      }
    },
    [awards, overlayByChannel, evaluateAll]
  );

  return {
    loading,
    policyEnabledTypes,
    properParticipationMinAnswersPerQuiz,
    overlayByChannel,
    awards,
    selectedPrizeByChannel,
    setSelectedPrizeByChannel,
    assigningByChannel,
    assignForChannel,
    evaluateAll,
    luckySelection,
    selectLuckyWinner,
    assignSelectedLucky,
    removeAward,
    clearLuckySelection: () => setLuckySelection(null),
  };
};
