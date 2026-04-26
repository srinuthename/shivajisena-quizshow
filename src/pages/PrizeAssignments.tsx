import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Save, RefreshCcw, Award, Gift, ShieldCheck, ShieldX, Trophy, Users, Coins, XCircle, Truck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import { getAnalyticsQuizRuns } from "@/services/analyticsApi";
import {
  assignPrize,
  getPrizePolicy,
  getPrizeAwards,
  getPrizeSuggestions,
  IneligibilityReasonCode,
  PrizeAwardRecord,
  PrizeCategory,
  PrizeCandidate,
  PrizeEligibilityDecision,
  PrizeType,
  revokePrizeAward,
  updatePrizeAward,
  markPrizeDelivered,
} from "@/services/prizeApi";
import { getQuizResults, getQuizRunMeta, updateQuizRunMeta } from "@/services/quizResultsApi";
import { computePrizeQualifiedSlots, PRIZE_SLOTS, PrizeQualifiedSlot } from "@/lib/prizeQualification";
import { useToast } from "@/hooks/use-toast";

type PrizeModality = "coupon" | "cash";

type CandidateRow = {
  prizeType: PrizeType;
  rank: number;
  channelId: string;
  category: PrizeCategory;
  prizeModality: PrizeModality;
  couponCode: string;
  couponProvider: string;
  couponTitle: string;
  couponValueLabel: string;
  couponRedeemUrl: string;
  cashAmount: string;
  cashCurrency: string;
  cashReference: string;
};

type LuckyCandidateRow = {
  prizeType: "luckydip";
  prizeInstance: number;
  channelId: string;
  category: PrizeCategory;
  prizeModality: PrizeModality;
  couponCode: string;
  couponProvider: string;
  couponTitle: string;
  couponValueLabel: string;
  couponRedeemUrl: string;
  cashAmount: string;
  cashCurrency: string;
  cashReference: string;
};

const REASON_LABELS: Record<IneligibilityReasonCode, string> = {
  profile_missing: "Profile Missing",
  account_too_new: "New Account",
  insufficient_participations: "Low Participation",
  cooldown_active: "Cooldown",
  lucky_already_used: "",
  prior_prize_winner: "Past Prize Winner",
};

const RANKED_PRIZE_TYPES: PrizeType[] = PRIZE_SLOTS;
const CATEGORY_LABELS: Record<PrizeCategory, string> = {
  regular: "Regular",
  onlyonceinlifetime: "Once in a Lifetime",
};

const COUPON_STATUS_LABELS: Record<string, string> = {
  unassigned: "No Coupon",
  assigned: "Pending Claim",
  viewed: "Viewed",
  claimed: "Claimed",
  revoked: "Revoked",
};

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

const buildDefaultRows = (prizeTypes: PrizeType[]): CandidateRow[] =>
  prizeTypes.map((prizeType, index) => ({
    prizeType,
    rank: index + 1,
    channelId: "",
    category: "regular",
    prizeModality: "coupon",
    couponCode: "",
    couponProvider: "",
    couponTitle: "",
    couponValueLabel: "",
    couponRedeemUrl: "",
    cashAmount: "",
    cashCurrency: "INR",
    cashReference: "",
  }));

type QuizMetaForm = {
  gameTitle: string;
  episodeName: string;
  episodeNumber: string;
  quizShowName: string;
};

type AwardInlineEdit = {
  prizeType: PrizeType;
  prizeInstance: number;
  candidateChannelId: string;
  assignedChannelId: string;
  category: PrizeCategory;
  prizeModality: PrizeModality;
  couponCode: string;
  couponProvider: string;
  couponTitle: string;
  couponValueLabel: string;
  couponRedeemUrl: string;
  cashAmount: string;
  cashCurrency: string;
  cashReference: string;
};

const prizeTypeUiLabel = (prizeType: PrizeType, prizeInstance?: number): string => {
  if (prizeType === "quizfirst") return "🏆1 First Prize";
  if (prizeType === "quizsecond") return "🏆2 Second Prize";
  if (prizeType === "quizthird") return "🏆3 Third Prize";
  if (prizeType === "luckydip") return `⭐ Lucky Dip #${Number(prizeInstance || 1)}`;
  return "🎖️ Custom Prize";
};

type RankedViewer = {
  odytChannelId: string;
  userName: string;
  totalScore: number;
  correctAnswers: number;
  totalResponses: number;
  avgResponseTimeMs: number;
  rank: number;
};

const PrizeAssignmentsPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { applicationId } = useApp();
  const { toast } = useToast();
  const appId = useMemo(() => String(applicationId || "").trim(), [applicationId]);
  const [frontendQuizGameId, setFrontendQuizGameId] = useState("");
  const [enabledRankedPrizeTypes, setEnabledRankedPrizeTypes] = useState<PrizeType[]>(RANKED_PRIZE_TYPES);
  const [rows, setRows] = useState<CandidateRow[]>(buildDefaultRows(RANKED_PRIZE_TYPES));
  const [luckyRows, setLuckyRows] = useState<LuckyCandidateRow[]>([]);
  const [quizRunOptions, setQuizRunOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [runIdInput, setRunIdInput] = useState("");
  const [decisions, setDecisions] = useState<PrizeEligibilityDecision[]>([]);
  const [awards, setAwards] = useState<PrizeAwardRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [savingDrafts, setSavingDrafts] = useState(false);
  const [savingQuizMeta, setSavingQuizMeta] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  const [revokingAwardId, setRevokingAwardId] = useState<string | null>(null);
  const [savingAwardId, setSavingAwardId] = useState<string | null>(null);
  const [deliveringAwardId, setDeliveringAwardId] = useState<string | null>(null);
  const [awardEdits, setAwardEdits] = useState<Record<string, AwardInlineEdit>>({});
  const editorCardRef = useRef<HTMLDivElement | null>(null);
  const skipNextAutoLoadRef = useRef(false);
  const [qualifiedSlots, setQualifiedSlots] = useState<PrizeQualifiedSlot[]>([]);
  const [rankedViewers, setRankedViewers] = useState<RankedViewer[]>([]);
  const [rankingSource, setRankingSource] = useState<"backend" | "none">("none");
  const [quizMeta, setQuizMeta] = useState<QuizMetaForm>({
    gameTitle: "",
    episodeName: "",
    episodeNumber: "",
    quizShowName: "",
  });

  const rankedViewerNameByChannel = useMemo(() => {
    const next: Record<string, string> = {};
    for (const viewer of rankedViewers) {
      const channelId = String(viewer.odytChannelId || "").trim();
      if (!channelId) continue;
      next[channelId] = String(viewer.userName || "Viewer");
    }
    return next;
  }, [rankedViewers]);

  const nextLuckyPrizeInstance = useMemo(() => {
    const maxAssigned = awards.reduce((max, award) => {
      if (award.prizeType !== "luckydip" || award.couponStatus === "revoked") return max;
      return Math.max(max, Number(award.prizeInstance || 1));
    }, 0);
    const maxDraft = luckyRows.reduce((max, row) => Math.max(max, Number(row.prizeInstance || 0)), 0);
    return Math.max(maxAssigned, maxDraft) + 1;
  }, [awards, luckyRows]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const runs = await getAnalyticsQuizRuns(1, 250, "");
      if (!active || !runs.success || !runs.data) return;
      setQuizRunOptions(
        (runs.data.runs || [])
          .sort((a, b) => {
            const aTs = Date.parse(a.updatedAt || a.closedAtServer || a.createdAtServer || "");
            const bTs = Date.parse(b.updatedAt || b.closedAtServer || b.createdAtServer || "");
            return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
          })
          .map((r) => ({
            id: r.frontendQuizGameId,
            label: `${r.frontendQuizGameId} | ${r.status.toUpperCase()} | Ep ${r.episodeNumber || "?"} | ${r.episodeName || r.gameTitle || "Untitled"}`,
          }))
      );
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!appId) return;
      const policy = await getPrizePolicy(appId);
      if (!active) return;
      const rankedPrizeTypes = (policy.data?.enabledPrizeTypes || [])
        .filter((prizeType): prizeType is PrizeType => RANKED_PRIZE_TYPES.includes(prizeType));
      setEnabledRankedPrizeTypes(rankedPrizeTypes.length ? rankedPrizeTypes : RANKED_PRIZE_TYPES);
    };
    void run();
    return () => {
      active = false;
    };
  }, [appId]);

  useEffect(() => {
    setRows((prev) =>
      buildDefaultRows(enabledRankedPrizeTypes).map((row) => {
        const existing = prev.find((candidate) => candidate.prizeType === row.prizeType);
        return existing ? { ...row, ...existing, rank: row.rank } : row;
      })
    );
  }, [enabledRankedPrizeTypes]);

  const fetchPerformanceRanking = useCallback(async (runId: string) => {
    if (!runId) {
      setRankedViewers([]);
      setRankingSource("none");
      return;
    }
    const result = await getQuizResults(runId);
    const viewers = result.data?.liveLeaderboard?.viewers || [];
    if (!result.success || !Array.isArray(viewers) || viewers.length === 0) {
      setRankedViewers([]);
      setRankingSource("none");
      return;
    }
    const ranked = viewers
      .map((viewer) => ({
        odytChannelId: String(viewer.odytChannelId || ""),
        userName: String(viewer.userName || "Viewer"),
        totalScore: Number(viewer.totalScore || 0),
        correctAnswers: Number(viewer.correctAnswers || 0),
        totalResponses: Number(viewer.totalResponses || 0),
        avgResponseTimeMs: Number(viewer.avgResponseTimeMs || 0),
        rank: Number(viewer.rank || 0),
      }))
      .filter((viewer) => viewer.odytChannelId)
      .sort((a, b) => {
        if (a.rank > 0 && b.rank > 0) return a.rank - b.rank;
        return b.totalScore - a.totalScore;
      })
      .map((viewer, idx) => ({ ...viewer, rank: idx + 1 }));
    setRankedViewers(ranked);
    setRankingSource("backend");

    const rankedCandidates = ranked.slice(0, enabledRankedPrizeTypes.length);
    if (!rankedCandidates.length) return;
    setRows((prev) =>
      prev.map((row) => {
        const hit = rankedCandidates.find((v) => v.rank === row.rank);
        if (!hit) return row;
        return { ...row, channelId: hit.odytChannelId || row.channelId };
      })
    );
  }, [enabledRankedPrizeTypes.length]);

  const updateRow = (index: number, patch: Partial<CandidateRow>) => {
    setDraftDirty(true);
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateLuckyRow = (prizeInstance: number, patch: Partial<LuckyCandidateRow>) => {
    setDraftDirty(true);
    setLuckyRows((prev) =>
      prev.map((row) => (row.prizeInstance === prizeInstance ? { ...row, ...patch } : row))
    );
  };

  const addLuckyRow = () => {
    setDraftDirty(true);
    setLuckyRows((prev) => [
      ...prev,
      {
        prizeType: "luckydip",
        prizeInstance: nextLuckyPrizeInstance,
        channelId: "",
        category: "onlyonceinlifetime",
        prizeModality: "coupon",
        couponCode: "",
        couponProvider: "",
        couponTitle: "",
        couponValueLabel: "",
        couponRedeemUrl: "",
        cashAmount: "",
        cashCurrency: "INR",
        cashReference: "",
      },
    ]);
  };

  const discardLuckyDraft = () => {
    setLuckyRows([]);
    setDraftDirty(true);
    toast({ title: "Lucky Draft Discarded", description: "All unsaved lucky winner rows have been removed." });
  };

  const removeLuckyRow = (prizeInstance: number) => {
    setDraftDirty(true);
    setLuckyRows((prev) => prev.filter((row) => row.prizeInstance !== prizeInstance));
  };

  const loadAssignmentsIntoEditor = useCallback((awardList: PrizeAwardRecord[]) => {
    const activeAwards = (awardList || []).filter((award) => award.couponStatus !== "revoked");
    const rankedAwards = activeAwards.filter((award) => award.prizeType !== "luckydip");
    const luckyAwards = activeAwards
      .filter((award) => award.prizeType === "luckydip")
      .sort((a, b) => Number(a.prizeInstance || 1) - Number(b.prizeInstance || 1));

    setRows(
      buildDefaultRows(enabledRankedPrizeTypes).map((row) => {
        const award = rankedAwards.find((item) => item.prizeType === row.prizeType);
        return award
          ? {
              ...row,
              channelId: String(award.assignedChannelId || ""),
              category: award.category || "regular",
              prizeModality: (award.prizeModality || "coupon") as PrizeModality,
              couponCode: String(award.couponCode || ""),
              couponProvider: String(award.couponProvider || ""),
              couponTitle: String(award.couponTitle || ""),
              couponValueLabel: String(award.couponValueLabel || ""),
              couponRedeemUrl: String(award.couponRedeemUrl || ""),
              cashAmount: award.cashAmount != null ? String(award.cashAmount) : "",
              cashCurrency: String(award.cashCurrency || "INR"),
              cashReference: String(award.cashReference || ""),
              rank: Number(award.rank || row.rank),
            }
          : row;
      })
    );

    setLuckyRows(
      luckyAwards.map((award) => ({
        prizeType: "luckydip",
        prizeInstance: Number(award.prizeInstance || 1),
        channelId: String(award.assignedChannelId || ""),
        category: (award.category || "onlyonceinlifetime") as PrizeCategory,
        prizeModality: (award.prizeModality || "coupon") as PrizeModality,
        couponCode: String(award.couponCode || ""),
        couponProvider: String(award.couponProvider || ""),
        couponTitle: String(award.couponTitle || ""),
        couponValueLabel: String(award.couponValueLabel || ""),
        couponRedeemUrl: String(award.couponRedeemUrl || ""),
        cashAmount: award.cashAmount != null ? String(award.cashAmount) : "",
        cashCurrency: String(award.cashCurrency || "INR"),
        cashReference: String(award.cashReference || ""),
      }))
    );
    setDraftDirty(false);
  }, [enabledRankedPrizeTypes]);

  const fetchAwards = useCallback(async (runId: string) => {
    if (!runId) return;
    const result = await getPrizeAwards({ applicationId: appId, frontendQuizGameId: runId, limit: 100 });
    if (result.success && result.data) {
      const nextAwards = result.data.awards || [];
      setAwards(nextAwards);
      return nextAwards;
    }
    return [];
  }, [appId]);

  useEffect(() => {
    if (!frontendQuizGameId) return;
    if (!awards.length) return;
    if (draftDirty) return;
    if (skipNextAutoLoadRef.current) {
      skipNextAutoLoadRef.current = false;
      return;
    }
    loadAssignmentsIntoEditor(awards);
  }, [awards, draftDirty, enabledRankedPrizeTypes, frontendQuizGameId, loadAssignmentsIntoEditor]);

  const onRunSelected = async (runId: string) => {
    setFrontendQuizGameId(runId);
    setRunIdInput(runId);
    setDecisions([]);
    setQualifiedSlots([]);
    setLuckyRows([]);
    setDraftDirty(false);
    const [metaResult, nextAwards] = await Promise.all([
      getQuizRunMeta(runId),
      fetchAwards(runId),
      fetchPerformanceRanking(runId),
    ]);
    loadAssignmentsIntoEditor(nextAwards || []);
    if (metaResult.success && metaResult.data) {
      setQuizMeta({
        gameTitle: String(metaResult.data.gameTitle || ""),
        episodeName: String(metaResult.data.episodeName || ""),
        episodeNumber: String(metaResult.data.episodeNumber || ""),
        quizShowName: String(metaResult.data.quizShowName || metaResult.data.gameTitle || ""),
      });
    }
  };

  useEffect(() => {
    setRunIdInput(frontendQuizGameId);
  }, [frontendQuizGameId]);

  const handleRunInputChange = (value: string) => {
    const nextValue = value.trim();
    setRunIdInput(nextValue);
    if (!nextValue) {
      setFrontendQuizGameId("");
      setDecisions([]);
      setQualifiedSlots([]);
      setLuckyRows([]);
      setAwards([]);
      setRankedViewers([]);
      setRankingSource("none");
      setQuizMeta({
        gameTitle: "",
        episodeName: "",
        episodeNumber: "",
        quizShowName: "",
      });
      return;
    }

    const exactMatch = quizRunOptions.find((run) => run.id === nextValue);
    if (exactMatch && exactMatch.id !== frontendQuizGameId) {
      void onRunSelected(exactMatch.id);
    }
  };

  useEffect(() => {
    if (!frontendQuizGameId) return;
    const timer = window.setInterval(() => {
      void Promise.all([fetchAwards(frontendQuizGameId), fetchPerformanceRanking(frontendQuizGameId)]);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [fetchAwards, fetchPerformanceRanking, frontendQuizGameId]);

  const onSuggest = async () => {
    setError(null);
    if (!appId || !frontendQuizGameId) {
      setError("applicationId and frontendQuizGameId are required");
      return;
    }
    const rowCandidates: PrizeCandidate[] = rows
      .filter((row) => row.channelId.trim())
      .map((row) => ({
        channelId: row.channelId.trim(),
        prizeType: row.prizeType,
        rank: row.rank,
        category: row.category,
      }));
    const luckyCandidates: PrizeCandidate[] = luckyRows
      .filter((row) => row.channelId.trim())
      .map((row) => ({
        channelId: row.channelId.trim(),
        prizeType: "luckydip" as const,
        rank: row.prizeInstance,
        category: row.category,
      }));
    const poolCandidates: PrizeCandidate[] = rankedViewers
      .slice(0, 50)
      .flatMap((viewer) =>
        enabledRankedPrizeTypes.map((prizeType) => ({
          channelId: viewer.odytChannelId,
          prizeType,
          rank: viewer.rank,
          category: "regular" as const,
        }))
      );
    const dedupeMap = new Map<string, PrizeCandidate>();
    for (const candidate of [...poolCandidates, ...rowCandidates, ...luckyCandidates]) {
      if (!candidate.channelId) continue;
      dedupeMap.set(`${candidate.prizeType}:${candidate.channelId}`, candidate);
    }
    const candidates = Array.from(dedupeMap.values());
    if (!candidates.length) {
      setError("Add at least one candidate channelId");
      return;
    }
    setLoadingSuggestions(true);
    const result = await getPrizeSuggestions({
      applicationId: appId,
      frontendQuizGameId,
      candidates,
    });
    setLoadingSuggestions(false);
    if (!result.success || !result.data) {
      setError(result.error || "Failed to fetch eligibility");
      return;
    }
    const nextDecisions = result.data.decisions || [];
    setDecisions(nextDecisions);
    if (rankedViewers.length) {
      setQualifiedSlots(computePrizeQualifiedSlots(rankedViewers, nextDecisions, enabledRankedPrizeTypes));
    } else {
      setQualifiedSlots([]);
    }
  };

  const applySuggestedWinners = () => {
    if (!qualifiedSlots.length) return;
    setDraftDirty(true);
    setRows((prev) =>
      prev.map((row) => {
        const slot = qualifiedSlots.find((s) => s.prizeType === row.prizeType);
        if (!slot?.selectedViewer?.odytChannelId) return row;
        return {
          ...row,
          channelId: slot.selectedViewer.odytChannelId,
          rank: slot.slotRank,
        };
      })
    );
  };

  async function savePrizeDrafts() {
    setError(null);
    if (!appId || !frontendQuizGameId) {
      setError("applicationId and frontendQuizGameId are required");
      return;
    }

    const draftValidationError = validateDraftAssignments();
    if (draftValidationError) {
      setError(draftValidationError);
      toast({
        title: "Draft Conflict",
        description: draftValidationError,
        variant: "destructive",
      });
      return;
    }

    const slotMutations: Array<() => Promise<{ success: boolean; error?: string }>> = [];

    for (const row of rows) {
      const slotKey = `${row.prizeType}:1`;
      const existingAward = activeAwardBySlot.get(slotKey);
      const channelId = row.channelId.trim();
      if (!channelId && existingAward?._id) {
        slotMutations.push(async () => {
          const result = await revokePrizeAward({
            awardId: existingAward._id,
            revokedBy: "prize-assignments-page",
            reason: "slot cleared from prize assignments draft",
          });
          return { success: result.success, error: result.error };
        });
        continue;
      }
      if (!channelId) continue;

      const decision = decisions.find((d) => d.prizeType === row.prizeType && d.channelId === channelId);
      if (existingAward?._id) {
        slotMutations.push(async () => {
          const result = await updatePrizeAward({
            awardId: existingAward._id,
            candidateChannelId: channelId,
            assignedChannelId: channelId,
            category: row.category,
            rank: row.rank,
            prizeModality: row.prizeModality,
            couponCode: row.couponCode.trim(),
            couponProvider: row.couponProvider.trim() || null,
            couponTitle: row.couponTitle.trim() || null,
            couponValue: row.couponValueLabel.trim() || null,
            couponRedeemUrl: row.couponRedeemUrl.trim() || null,
            cashAmount: row.prizeModality === "cash" && row.cashAmount ? Number(row.cashAmount) : null,
            cashCurrency: row.prizeModality === "cash" ? (row.cashCurrency || "INR") : null,
            cashReference: row.prizeModality === "cash" ? (row.cashReference.trim() || null) : null,
            updatedBy: "prize-assignments-page",
            override: decision?.eligibilityStatus === "ineligible",
            overrideReason:
              decision?.eligibilityStatus === "ineligible"
                ? "manual override from prize assignments page"
                : undefined,
            replaceExisting: true,
          });
          return { success: result.success, error: result.error };
        });
      } else {
        slotMutations.push(async () => {
          const result = await assignPrize({
            applicationId: appId,
            frontendQuizGameId,
            prizeType: row.prizeType,
            prizeInstance: 1,
            category: row.category,
            rank: row.rank,
            candidateChannelId: channelId,
            assignedChannelId: channelId,
            prizeModality: row.prizeModality,
            couponCode: row.couponCode.trim(),
            couponProvider: row.couponProvider.trim() || null,
            couponTitle: row.couponTitle.trim() || null,
            couponValue: row.couponValueLabel.trim() || null,
            couponRedeemUrl: row.couponRedeemUrl.trim() || null,
            cashAmount: row.prizeModality === "cash" && row.cashAmount ? Number(row.cashAmount) : null,
            cashCurrency: row.prizeModality === "cash" ? (row.cashCurrency || "INR") : null,
            cashReference: row.prizeModality === "cash" ? (row.cashReference.trim() || null) : null,
            assignedBy: "prize-assignments-page",
            override: decision?.eligibilityStatus === "ineligible",
            overrideReason:
              decision?.eligibilityStatus === "ineligible"
                ? "manual override from prize assignments page"
                : undefined,
            replaceExisting: true,
          });
          return { success: result.success, error: result.error };
        });
      }
    }

    for (const row of luckyRows) {
      const slotKey = `luckydip:${Number(row.prizeInstance || 1)}`;
      const existingAward = activeAwardBySlot.get(slotKey);
      const channelId = row.channelId.trim();
      if (!channelId && existingAward?._id) {
        slotMutations.push(async () => {
          const result = await revokePrizeAward({
            awardId: existingAward._id,
            revokedBy: "prize-assignments-page",
            reason: "lucky slot cleared from prize assignments draft",
          });
          return { success: result.success, error: result.error };
        });
        continue;
      }
      if (!channelId) continue;

      const decision = decisions.find((d) => d.prizeType === "luckydip" && d.channelId === channelId);
      if (existingAward?._id) {
        slotMutations.push(async () => {
          const result = await updatePrizeAward({
            awardId: existingAward._id,
            candidateChannelId: channelId,
            assignedChannelId: channelId,
            category: row.category,
            rank: row.prizeInstance,
            prizeModality: row.prizeModality,
            couponCode: row.couponCode.trim(),
            couponProvider: row.couponProvider.trim() || null,
            couponTitle: row.couponTitle.trim() || null,
            couponValue: row.couponValueLabel.trim() || null,
            couponRedeemUrl: row.couponRedeemUrl.trim() || null,
            cashAmount: row.prizeModality === "cash" && row.cashAmount ? Number(row.cashAmount) : null,
            cashCurrency: row.prizeModality === "cash" ? (row.cashCurrency || "INR") : null,
            cashReference: row.prizeModality === "cash" ? (row.cashReference.trim() || null) : null,
            updatedBy: "prize-assignments-page",
            override: decision?.eligibilityStatus === "ineligible",
            overrideReason:
              decision?.eligibilityStatus === "ineligible"
                ? "manual override from prize assignments page"
                : undefined,
            replaceExisting: true,
          });
          return { success: result.success, error: result.error };
        });
      } else {
        slotMutations.push(async () => {
          const result = await assignPrize({
            applicationId: appId,
            frontendQuizGameId,
            prizeType: "luckydip",
            prizeInstance: row.prizeInstance,
            category: row.category,
            rank: row.prizeInstance,
            candidateChannelId: channelId,
            assignedChannelId: channelId,
            prizeModality: row.prizeModality,
            couponCode: row.couponCode.trim(),
            couponProvider: row.couponProvider.trim() || null,
            couponTitle: row.couponTitle.trim() || null,
            couponValue: row.couponValueLabel.trim() || null,
            couponRedeemUrl: row.couponRedeemUrl.trim() || null,
            cashAmount: row.prizeModality === "cash" && row.cashAmount ? Number(row.cashAmount) : null,
            cashCurrency: row.prizeModality === "cash" ? (row.cashCurrency || "INR") : null,
            cashReference: row.prizeModality === "cash" ? (row.cashReference.trim() || null) : null,
            assignedBy: "prize-assignments-page",
            override: decision?.eligibilityStatus === "ineligible",
            overrideReason:
              decision?.eligibilityStatus === "ineligible"
                ? "manual override from prize assignments page"
                : undefined,
            replaceExisting: true,
          });
          return { success: result.success, error: result.error };
        });
      }
    }

    setAssigning(true);
    setSavingDrafts(true);
    const failures: string[] = [];
    for (const mutate of slotMutations) {
      const result = await mutate();
      if (!result.success) failures.push(String(result.error || "Unknown prize save error"));
    }
    setAssigning(false);
    setSavingDrafts(false);

    const [nextAwards] = await Promise.all([fetchAwards(frontendQuizGameId), fetchPerformanceRanking(frontendQuizGameId)]);
    loadAssignmentsIntoEditor(nextAwards || []);

    if (failures.length) {
      const message = failures[0];
      setError(message);
      toast({
        title: "Some Prize Changes Failed",
        description: message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Prize Assignments Saved",
      description: "Creates, updates, overrides, and cleared slots were saved successfully.",
    });
  }

  const editAwardInForm = useCallback((award: PrizeAwardRecord) => {
    skipNextAutoLoadRef.current = true;
    setDraftDirty(true);
    if (award.prizeType === "luckydip") {
      setLuckyRows((prev) => {
        const next = [...prev];
        const idx = next.findIndex((row) => row.prizeInstance === Number(award.prizeInstance || 1));
        const value: LuckyCandidateRow = {
          prizeType: "luckydip",
          prizeInstance: Number(award.prizeInstance || 1),
          channelId: String(award.assignedChannelId || ""),
          category: (award.category || "onlyonceinlifetime") as PrizeCategory,
          prizeModality: (award.prizeModality || "coupon") as PrizeModality,
          couponCode: String(award.couponCode || ""),
          couponProvider: String(award.couponProvider || ""),
          couponTitle: String(award.couponTitle || ""),
          couponValueLabel: String(award.couponValueLabel || ""),
          couponRedeemUrl: String(award.couponRedeemUrl || ""),
          cashAmount: award.cashAmount != null ? String(award.cashAmount) : "",
          cashCurrency: String(award.cashCurrency || "INR"),
          cashReference: String(award.cashReference || ""),
        };
        if (idx >= 0) next[idx] = value;
        else next.push(value);
        return next.sort((a, b) => a.prizeInstance - b.prizeInstance);
      });
      window.setTimeout(() => {
        editorCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.prizeType === award.prizeType
          ? {
              ...row,
              channelId: String(award.assignedChannelId || ""),
              category: (award.category || row.category) as PrizeCategory,
              prizeModality: (award.prizeModality || row.prizeModality || "coupon") as PrizeModality,
              couponCode: String(award.couponCode || ""),
              couponProvider: String(award.couponProvider || ""),
              couponTitle: String(award.couponTitle || ""),
              couponValueLabel: String(award.couponValueLabel || ""),
              couponRedeemUrl: String(award.couponRedeemUrl || ""),
              cashAmount: award.cashAmount != null ? String(award.cashAmount) : "",
              cashCurrency: String(award.cashCurrency || "INR"),
              cashReference: String(award.cashReference || ""),
              rank: Number(award.rank || row.rank),
            }
          : row
      )
    );
    window.setTimeout(() => {
      editorCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const reuseRevokedAward = useCallback((award: PrizeAwardRecord) => {
    editAwardInForm(award);
    toast({
      title: "Revoked Prize Loaded",
      description: "The revoked assignment has been loaded back into the editor for reuse.",
    });
  }, [editAwardInForm, toast]);

  const handleRevokeAward = useCallback(async (award: PrizeAwardRecord) => {
    if (!award?._id) return;
    setRevokingAwardId(award._id);
    const result = await revokePrizeAward({
      awardId: award._id,
      revokedBy: "prize-assignments-page",
      reason: "manual revoke from prize assignments",
    });
    setRevokingAwardId(null);
    if (!result.success) {
      setError(result.error || "Failed to revoke award");
      toast({
        title: "Revoke Failed",
        description: String(result.error || "Could not revoke the prize assignment."),
        variant: "destructive",
      });
      return;
    }
    if (frontendQuizGameId) {
      const nextAwards = await fetchAwards(frontendQuizGameId);
      loadAssignmentsIntoEditor(nextAwards || []);
    }
    toast({
      title: "Prize Revoked",
      description: "The prize slot is available for assignment again.",
    });
  }, [fetchAwards, frontendQuizGameId, loadAssignmentsIntoEditor, toast]);

  const onSaveQuizMeta = async () => {
    setError(null);
    if (!frontendQuizGameId) {
      setError("Select a run before editing quiz information");
      return;
    }
    setSavingQuizMeta(true);
    const result = await updateQuizRunMeta(frontendQuizGameId, {
      gameTitle: quizMeta.gameTitle.trim(),
      episodeName: quizMeta.episodeName.trim(),
      episodeNumber: quizMeta.episodeNumber.trim(),
      quizShowName: quizMeta.quizShowName.trim(),
    });
    setSavingQuizMeta(false);
    if (!result.success) {
      setError(result.error || "Failed to save quiz information");
      return;
    }
    setQuizRunOptions((prev) =>
      prev.map((run) =>
        run.id === frontendQuizGameId
          ? {
              ...run,
              label: `${run.id} | Ep ${quizMeta.episodeNumber.trim() || "?"} | ${quizMeta.episodeName.trim() || quizMeta.gameTitle.trim() || "Untitled"}`,
            }
          : run
      )
    );
  };

  const awardStats = useMemo(() => {
    const active = awards.filter((a) => a.couponStatus !== "revoked");
    const revoked = awards.filter((a) => a.couponStatus === "revoked");
    const claimed = awards.filter((a) => a.couponStatus === "claimed");
    const withCoupon = active.filter((a) => a.couponCode);
    return { total: awards.length, active: active.length, revoked: revoked.length, claimed: claimed.length, withCoupon: withCoupon.length };
  }, [awards]);

  const activeAwards = useMemo(
    () => awards.filter((award) => award.couponStatus !== "revoked"),
    [awards]
  );

  const revokedAwards = useMemo(
    () => awards.filter((award) => award.couponStatus === "revoked"),
    [awards]
  );

  const draftSummary = useMemo(() => {
    const rankedDrafts = rows.filter((row) => row.channelId.trim());
    const luckyDrafts = luckyRows.filter((row) => row.channelId.trim());
    return {
      ranked: rankedDrafts,
      lucky: luckyDrafts,
      total: rankedDrafts.length + luckyDrafts.length,
    };
  }, [rows, luckyRows]);

  const activeAwardBySlot = useMemo(() => {
    const next = new Map<string, PrizeAwardRecord>();
    for (const award of activeAwards) {
      next.set(`${award.prizeType}:${Number(award.prizeInstance || 1)}`, award);
    }
    return next;
  }, [activeAwards]);

  const inlineSlotOptions = useMemo(() => {
    const options: Array<{ key: string; prizeType: PrizeType; prizeInstance: number; label: string }> = [];
    for (const prizeType of enabledRankedPrizeTypes) {
      options.push({
        key: `${prizeType}:1`,
        prizeType,
        prizeInstance: 1,
        label: prizeTypeUiLabel(prizeType, 1),
      });
    }
    const luckyInstances = new Set<number>();
    for (const award of awards) {
      if (award.prizeType === "luckydip") luckyInstances.add(Number(award.prizeInstance || 1));
    }
    for (const row of luckyRows) {
      luckyInstances.add(Number(row.prizeInstance || 1));
    }
    Array.from(luckyInstances)
      .sort((a, b) => a - b)
      .forEach((prizeInstance) => {
        options.push({
          key: `luckydip:${prizeInstance}`,
          prizeType: "luckydip",
          prizeInstance,
          label: prizeTypeUiLabel("luckydip", prizeInstance),
        });
      });
    return options;
  }, [awards, enabledRankedPrizeTypes, luckyRows]);

  const resetDraftToActiveAwards = useCallback(() => {
    skipNextAutoLoadRef.current = true;
    loadAssignmentsIntoEditor(awards);
    toast({
      title: "Draft Reset",
      description: "The editor now matches the saved active awards for this run.",
    });
  }, [awards, loadAssignmentsIntoEditor, toast]);

  const clearDraft = useCallback(() => {
    skipNextAutoLoadRef.current = true;
    setRows(buildDefaultRows(enabledRankedPrizeTypes));
    setLuckyRows([]);
    setDraftDirty(true);
    toast({
      title: "Draft Cleared",
      description: "Saved awards remain untouched until you save the draft again.",
    });
  }, [enabledRankedPrizeTypes, toast]);

  const validateDraftAssignments = useCallback(() => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      const channelId = row.channelId.trim();
      if (!channelId) continue;
      const label = prizeTypeUiLabel(row.prizeType, 1);
      if (seen.has(channelId)) {
        return `Draft conflict: ${channelId} is assigned to both ${seen.get(channelId)} and ${label}.`;
      }
      seen.set(channelId, label);
    }
    for (const row of luckyRows) {
      const channelId = row.channelId.trim();
      if (!channelId) continue;
      const label = prizeTypeUiLabel("luckydip", row.prizeInstance);
      if (seen.has(channelId)) {
        return `Draft conflict: ${channelId} is assigned to both ${seen.get(channelId)} and ${label}.`;
      }
      seen.set(channelId, label);
    }
    return null;
  }, [luckyRows, rows]);

  useEffect(() => {
    const next: Record<string, AwardInlineEdit> = {};
    for (const award of awards) {
      if (!award?._id) continue;
      next[award._id] = {
        prizeType: award.prizeType,
        prizeInstance: Number(award.prizeInstance || 1),
        candidateChannelId: String(award.candidateChannelId || award.assignedChannelId || ""),
        assignedChannelId: String(award.assignedChannelId || ""),
        category: (award.category || "regular") as PrizeCategory,
        prizeModality: (award.prizeModality || "coupon") as PrizeModality,
        couponCode: String(award.couponCode || ""),
        couponProvider: String(award.couponProvider || ""),
        couponTitle: String(award.couponTitle || ""),
        couponValueLabel: String(award.couponValueLabel || ""),
        couponRedeemUrl: String(award.couponRedeemUrl || ""),
        cashAmount: award.cashAmount != null ? String(award.cashAmount) : "",
        cashCurrency: String(award.cashCurrency || "INR"),
        cashReference: String(award.cashReference || ""),
      };
    }
    setAwardEdits(next);
  }, [awards]);

  const updateAwardEdit = useCallback((awardId: string, patch: Partial<AwardInlineEdit>) => {
    setAwardEdits((prev) => ({
      ...prev,
      [awardId]: {
        prizeType: prev[awardId]?.prizeType || "quizfirst",
        prizeInstance: prev[awardId]?.prizeInstance || 1,
        candidateChannelId: prev[awardId]?.candidateChannelId || "",
        assignedChannelId: prev[awardId]?.assignedChannelId || "",
        category: prev[awardId]?.category || "regular",
        prizeModality: prev[awardId]?.prizeModality || "coupon",
        couponCode: prev[awardId]?.couponCode || "",
        couponProvider: prev[awardId]?.couponProvider || "",
        couponTitle: prev[awardId]?.couponTitle || "",
        couponValueLabel: prev[awardId]?.couponValueLabel || "",
        couponRedeemUrl: prev[awardId]?.couponRedeemUrl || "",
        cashAmount: prev[awardId]?.cashAmount || "",
        cashCurrency: prev[awardId]?.cashCurrency || "INR",
        cashReference: prev[awardId]?.cashReference || "",
        ...patch,
      },
    }));
  }, []);

  const saveAwardInline = useCallback(async (award: PrizeAwardRecord) => {
    const draft: AwardInlineEdit = awardEdits[award._id] || {
      prizeType: award.prizeType,
      prizeInstance: Number(award.prizeInstance || 1),
      candidateChannelId: String(award.candidateChannelId || award.assignedChannelId || ""),
      assignedChannelId: String(award.assignedChannelId || ""),
      category: (award.category || "regular") as PrizeCategory,
      prizeModality: (award.prizeModality || "coupon") as PrizeModality,
      couponCode: String(award.couponCode || ""),
      couponProvider: String(award.couponProvider || ""),
      couponTitle: String(award.couponTitle || ""),
      couponValueLabel: String(award.couponValueLabel || ""),
      couponRedeemUrl: String(award.couponRedeemUrl || ""),
      cashAmount: award.cashAmount != null ? String(award.cashAmount) : "",
      cashCurrency: String(award.cashCurrency || "INR"),
      cashReference: String(award.cashReference || ""),
    };

    const assignedChannelId = String(draft.assignedChannelId || "").trim();
    if (!assignedChannelId) {
      toast({
        title: "Channel ID Required",
        description: "Enter a participant channel ID before saving this award.",
        variant: "destructive",
      });
      return;
    }

    setSavingAwardId(award._id);
    const result = await updatePrizeAward({
      awardId: award._id,
      prizeType: draft.prizeType,
      prizeInstance: draft.prizeInstance,
      candidateChannelId: String(draft.candidateChannelId || assignedChannelId).trim(),
      assignedChannelId,
      category: draft.category,
      couponCode: String(draft.couponCode || "").trim(),
      couponProvider: draft.couponProvider.trim() || null,
      couponTitle: draft.couponTitle.trim() || null,
      couponValue: draft.couponValueLabel.trim() || null,
      couponRedeemUrl: draft.couponRedeemUrl.trim() || null,
      rank: draft.prizeType === "luckydip" ? Number(draft.prizeInstance || 1) : Number(award.rank || 1),
      updatedBy: "prize-assignments-inline-card",
      override: true,
      overrideReason: "inline admin update from prize assignments card",
      replaceExisting: true,
    });
    setSavingAwardId(null);

    if (!result.success) {
      setError(result.error || "Failed to save award");
      toast({
        title: "Award Save Failed",
        description: String(result.error || "The award could not be updated."),
        variant: "destructive",
      });
      return;
    }

    if (frontendQuizGameId) {
      const nextAwards = await fetchAwards(frontendQuizGameId);
      if (!draftDirty) loadAssignmentsIntoEditor(nextAwards || []);
    }

    toast({
      title: "Award Updated",
      description: `${prizeTypeUiLabel(draft.prizeType, draft.prizeInstance)} was saved successfully.`,
    });
  }, [awardEdits, draftDirty, fetchAwards, frontendQuizGameId, loadAssignmentsIntoEditor, toast]);

  const renderAwardCard = (award: PrizeAwardRecord) => {
    const isRevoked = award.couponStatus === "revoked";
    const statusColor = isRevoked ? "text-destructive" : award.couponStatus === "claimed" ? "text-green-500" : "text-muted-foreground";
    const edit: AwardInlineEdit = awardEdits[award._id] || {
      prizeType: award.prizeType,
      prizeInstance: Number(award.prizeInstance || 1),
      candidateChannelId: String(award.candidateChannelId || award.assignedChannelId || ""),
      assignedChannelId: String(award.assignedChannelId || ""),
      category: (award.category || "regular") as PrizeCategory,
      prizeModality: (award.prizeModality || "coupon") as PrizeModality,
      couponCode: String(award.couponCode || ""),
      couponProvider: String(award.couponProvider || ""),
      couponTitle: String(award.couponTitle || ""),
      couponValueLabel: String(award.couponValueLabel || ""),
      couponRedeemUrl: String(award.couponRedeemUrl || ""),
      cashAmount: award.cashAmount != null ? String(award.cashAmount) : "",
      cashCurrency: String(award.cashCurrency || "INR"),
      cashReference: String(award.cashReference || ""),
    };
    const selectedSlotKey = `${edit.prizeType}:${Number(edit.prizeInstance || 1)}`;
    const isInlineDirty =
      String(edit.prizeType || "") !== String(award.prizeType || "") ||
      Number(edit.prizeInstance || 1) !== Number(award.prizeInstance || 1) ||
      String(edit.candidateChannelId || "") !== String(award.candidateChannelId || award.assignedChannelId || "") ||
      String(edit.assignedChannelId || "") !== String(award.assignedChannelId || "") ||
      String(edit.category || "regular") !== String(award.category || "regular") ||
      String(edit.couponCode || "") !== String(award.couponCode || "");

    return (
      <motion.div key={award._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`rounded-lg border p-3 text-sm ${isRevoked ? "opacity-70 border-destructive/20 bg-destructive/5" : "border-border/50 bg-card/40"}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold">{prizeTypeUiLabel(award.prizeType, award.prizeInstance)}</span>
          <Badge variant={isRevoked ? "destructive" : award.couponStatus === "claimed" ? "default" : "secondary"} className="text-[10px]">
            {award.couponStatus}
          </Badge>
        </div>
        <p className="text-xs text-foreground truncate">
          {rankedViewerNameByChannel[String(award.assignedChannelId || "").trim()] || "Unknown"}
        </p>
        <p className="text-xs text-muted-foreground truncate">{award.assignedChannelId}</p>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
          <span className={statusColor}>eligibility: {award.eligibilityStatus}</span>
          <span className="text-muted-foreground">category: {award.category}</span>
          {award.couponCode && <span className="text-muted-foreground">coupon: {award.couponCode}</span>}
        </div>
        {!isRevoked ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Prize Slot</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedSlotKey}
                onChange={(e) => {
                  const [nextPrizeTypeRaw, nextPrizeInstanceRaw] = String(e.target.value || "").split(":");
                  const nextPrizeType = (nextPrizeTypeRaw || award.prizeType) as PrizeType;
                  const nextPrizeInstance = Number(nextPrizeInstanceRaw || 1);
                  updateAwardEdit(award._id, {
                    prizeType: nextPrizeType,
                    prizeInstance: Number.isFinite(nextPrizeInstance) ? nextPrizeInstance : 1,
                  });
                }}
              >
                {inlineSlotOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assigned Channel ID</Label>
              <Input
                value={edit.assignedChannelId}
                onChange={(e) => updateAwardEdit(award._id, { assignedChannelId: e.target.value })}
                placeholder="UC..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Candidate Channel ID</Label>
              <Input
                value={edit.candidateChannelId}
                onChange={(e) => updateAwardEdit(award._id, { candidateChannelId: e.target.value })}
                placeholder="UC..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={edit.category}
                onChange={(e) => updateAwardEdit(award._id, { category: e.target.value as PrizeCategory })}
              >
                <option value="regular">regular</option>
                <option value="onlyonceinlifetime">onlyonceinlifetime</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Coupon Code</Label>
              <Input
                value={edit.couponCode}
                onChange={(e) => updateAwardEdit(award._id, { couponCode: e.target.value })}
                placeholder="e.g. AMZN-XXXX-YYYY"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Provider</Label>
              <Input
                value={edit.couponProvider}
                onChange={(e) => updateAwardEdit(award._id, { couponProvider: e.target.value })}
                placeholder="Amazon"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Coupon Title</Label>
              <Input
                value={edit.couponTitle}
                onChange={(e) => updateAwardEdit(award._id, { couponTitle: e.target.value })}
                placeholder="Amazon Gift Card ₹500"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Value</Label>
              <Input
                value={edit.couponValueLabel}
                onChange={(e) => updateAwardEdit(award._id, { couponValueLabel: e.target.value })}
                placeholder="₹500"
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label className="text-xs">Redeem URL</Label>
              <Input
                value={edit.couponRedeemUrl}
                onChange={(e) => updateAwardEdit(award._id, { couponRedeemUrl: e.target.value })}
                placeholder="https://amazon.in/redeem"
              />
            </div>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => editAwardInForm(award)}>
            Edit In Form
          </Button>
          {isRevoked ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => reuseRevokedAward(award)}>
              Reuse Assignment
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!isInlineDirty || savingAwardId === award._id}
                onClick={() => void saveAwardInline(award)}
              >
                {savingAwardId === award._id ? "Saving…" : "Save This Award"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={savingAwardId === award._id}
                onClick={() =>
                  updateAwardEdit(award._id, {
                    prizeType: award.prizeType,
                    prizeInstance: Number(award.prizeInstance || 1),
                    candidateChannelId: String(award.candidateChannelId || award.assignedChannelId || ""),
                    assignedChannelId: String(award.assignedChannelId || ""),
                    category: (award.category || "regular") as PrizeCategory,
                    couponCode: String(award.couponCode || ""),
                    couponProvider: String(award.couponProvider || ""),
                    couponTitle: String(award.couponTitle || ""),
                    couponValueLabel: String(award.couponValueLabel || ""),
                    couponRedeemUrl: String(award.couponRedeemUrl || ""),
                  })
                }
              >
                Reset Card
              </Button>
            </>
          )}
          {!isRevoked ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={revokingAwardId === award._id || savingAwardId === award._id}
              onClick={() => void handleRevokeAward(award)}
            >
              {revokingAwardId === award._id ? "Revoking…" : "Revoke"}
            </Button>
          ) : null}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-4">
      {!embedded && (
        <PageHeader
          title="Prize Assignments"
          icon={Award}
          description="Manage saved prize records for a quiz run with a proper draft editor, update flow, and revoke/reuse controls."
        />
      )}

      {/* Summary Stat Cards */}
      {frontendQuizGameId && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Awards', value: awardStats.total, icon: Trophy, color: 'text-yellow-500' },
            { label: 'Active', value: awardStats.active, icon: ShieldCheck, color: 'text-green-500' },
            { label: 'Claimed', value: awardStats.claimed, icon: Gift, color: 'text-primary' },
            { label: 'With Coupon', value: awardStats.withCoupon, icon: Coins, color: 'text-amber-500' },
            { label: 'Revoked', value: awardStats.revoked, icon: XCircle, color: 'text-destructive' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ranked Viewers count */}
      {frontendQuizGameId && rankedViewers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{rankedViewers.length} ranked viewers loaded from backend</span>
          <Badge variant="outline" className="ml-2">{qualifiedSlots.length} qualified slots computed</Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Run Selection</CardTitle>
          <CardDescription>Select the quiz run you want to manage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="runId">Quiz Run</Label>
          <Input
            id="runId"
            list="quiz-run-options"
            value={runIdInput}
            onChange={(e) => handleRunInputChange(e.target.value)}
            placeholder="Paste or choose a quiz run"
          />
          <datalist id="quiz-run-options">
            {quizRunOptions.map((run) => (
              <option key={run.id} value={run.id}>
                {run.label}
              </option>
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">Application: {appId || "Not set"} {frontendQuizGameId ? `• Active Run: ${frontendQuizGameId}` : ""}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Performance Source: {rankingSource === "backend" ? "Backend Quiz Results" : "Not Available"}</Badge>
            <Badge variant="outline">Prize Source: Backend Prize Awards</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!frontendQuizGameId) return;
                void Promise.all([fetchAwards(frontendQuizGameId), fetchPerformanceRanking(frontendQuizGameId)]);
              }}
              disabled={!frontendQuizGameId}
            >
              <RefreshCcw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiz Information</CardTitle>
          <CardDescription>Edit backend metadata for this quiz run.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gameTitle">Quiz Name</Label>
            <Input
              id="gameTitle"
              value={quizMeta.gameTitle}
              onChange={(e) => setQuizMeta((prev) => ({ ...prev, gameTitle: e.target.value }))}
              placeholder="Quiz Show"
              disabled={!frontendQuizGameId}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quizShowName">Quiz Show Name</Label>
            <Input
              id="quizShowName"
              value={quizMeta.quizShowName}
              onChange={(e) => setQuizMeta((prev) => ({ ...prev, quizShowName: e.target.value }))}
              placeholder="Quiz Show"
              disabled={!frontendQuizGameId}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="episodeName">Episode Name</Label>
            <Input
              id="episodeName"
              value={quizMeta.episodeName}
              onChange={(e) => setQuizMeta((prev) => ({ ...prev, episodeName: e.target.value }))}
              placeholder="Episode 2"
              disabled={!frontendQuizGameId}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="episodeNumber">Episode Number</Label>
            <Input
              id="episodeNumber"
              value={quizMeta.episodeNumber}
              onChange={(e) => setQuizMeta((prev) => ({ ...prev, episodeNumber: e.target.value }))}
              placeholder="2"
              disabled={!frontendQuizGameId}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={onSaveQuizMeta} disabled={!frontendQuizGameId || savingQuizMeta}>
              <Save className="mr-2 h-4 w-4" />
              {savingQuizMeta ? "Saving…" : "Save Quiz Information"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card ref={editorCardRef}>
        <CardHeader>
          <CardTitle>Candidates</CardTitle>
          <CardDescription>
            Edit the draft for this run, then save it. Saving handles creates, updates, overrides, and slot clears.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.prizeType} className="grid gap-2 md:grid-cols-6">
              <div>
                <Label>Prize Type</Label>
                <Input value={prizeTypeUiLabel(row.prizeType)} readOnly />
              </div>
              <div>
                <Label>Rank</Label>
                <Input value={row.rank} readOnly />
              </div>
              <div className="md:col-span-2">
                <Label>Channel ID</Label>
                <Input
                  value={row.channelId}
                  onChange={(e) => updateRow(index, { channelId: e.target.value })}
                  placeholder="UC..."
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  User: {rankedViewerNameByChannel[row.channelId.trim()] || "Unknown"}
                </p>
              </div>
              <div>
                <Label>Category</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={row.category}
                  onChange={(e) => updateRow(index, { category: e.target.value as PrizeCategory })}
                >
                  <option value="regular">regular</option>
                  <option value="onlyonceinlifetime">onlyonceinlifetime</option>
                </select>
              </div>
              <div>
                <Label>Coupon Code</Label>
                <Input value={row.couponCode} onChange={(e) => updateRow(index, { couponCode: e.target.value })} placeholder="e.g. AMZN-XXXX-YYYY" />
              </div>
              <div>
                <Label>Provider</Label>
                <Input value={row.couponProvider} onChange={(e) => updateRow(index, { couponProvider: e.target.value })} placeholder="Amazon" />
              </div>
              <div className="md:col-span-2">
                <Label>Coupon Title</Label>
                <Input value={row.couponTitle} onChange={(e) => updateRow(index, { couponTitle: e.target.value })} placeholder="Amazon Gift Card ₹500" />
              </div>
              <div>
                <Label>Value</Label>
                <Input value={row.couponValueLabel} onChange={(e) => updateRow(index, { couponValueLabel: e.target.value })} placeholder="₹500" />
              </div>
              <div className="md:col-span-5">
                <Label>Redeem URL</Label>
                <Input value={row.couponRedeemUrl} onChange={(e) => updateRow(index, { couponRedeemUrl: e.target.value })} placeholder="https://amazon.in/redeem" />
              </div>
            </div>
          ))}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={onSuggest} disabled={loadingSuggestions}>
              <Sparkles className="mr-2 h-4 w-4" />
              {loadingSuggestions ? "Evaluating…" : "Get Suggestions"}
            </Button>
            <Button onClick={applySuggestedWinners} variant="outline" disabled={!qualifiedSlots.length}>
              Use Suggested Winners
            </Button>
            <Button onClick={() => void savePrizeDrafts()} disabled={assigning || savingDrafts} variant="secondary">
              <Save className="mr-2 h-4 w-4" />
              {savingDrafts ? "Saving…" : "Save Prize Assignments"}
            </Button>
            <Button type="button" variant="outline" onClick={resetDraftToActiveAwards} disabled={!frontendQuizGameId}>
              Reload Saved Awards
            </Button>
            <Button type="button" variant="outline" onClick={clearDraft} disabled={!frontendQuizGameId}>
              Clear Draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lucky Winners</CardTitle>
          <CardDescription>Manage lucky-dip assignments for this run. Revoked lucky slots can be reused here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {luckyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lucky winner rows added yet.</p>
          ) : (
            luckyRows.map((row) => (
              <div key={row.prizeInstance} className="grid gap-2 md:grid-cols-6">
                <div>
                  <Label>Prize Type</Label>
                  <Input value={prizeTypeUiLabel("luckydip", row.prizeInstance)} readOnly />
                </div>
                <div>
                  <Label>Lucky Slot</Label>
                  <Input value={row.prizeInstance} readOnly />
                </div>
                <div className="md:col-span-2">
                  <Label>Channel ID</Label>
                  <Input
                    value={row.channelId}
                    onChange={(e) => updateLuckyRow(row.prizeInstance, { channelId: e.target.value })}
                    placeholder="UC..."
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    User: {rankedViewerNameByChannel[row.channelId.trim()] || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={row.category}
                    onChange={(e) => updateLuckyRow(row.prizeInstance, { category: e.target.value as PrizeCategory })}
                  >
                    <option value="onlyonceinlifetime">onlyonceinlifetime</option>
                    <option value="regular">regular</option>
                  </select>
                </div>
                <div>
                  <Label>Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={row.couponCode}
                      onChange={(e) => updateLuckyRow(row.prizeInstance, { couponCode: e.target.value })}
                      placeholder="e.g. AMZN-XXXX-YYYY"
                    />
                    <Button type="button" variant="outline" onClick={() => removeLuckyRow(row.prizeInstance)}>
                      Remove
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Provider</Label>
                  <Input value={row.couponProvider} onChange={(e) => updateLuckyRow(row.prizeInstance, { couponProvider: e.target.value })} placeholder="Amazon" />
                </div>
                <div className="md:col-span-2">
                  <Label>Coupon Title</Label>
                  <Input value={row.couponTitle} onChange={(e) => updateLuckyRow(row.prizeInstance, { couponTitle: e.target.value })} placeholder="Amazon Gift Card ₹500" />
                </div>
                <div>
                  <Label>Value</Label>
                  <Input value={row.couponValueLabel} onChange={(e) => updateLuckyRow(row.prizeInstance, { couponValueLabel: e.target.value })} placeholder="₹500" />
                </div>
                <div className="md:col-span-5">
                  <Label>Redeem URL</Label>
                  <Input value={row.couponRedeemUrl} onChange={(e) => updateLuckyRow(row.prizeInstance, { couponRedeemUrl: e.target.value })} placeholder="https://amazon.in/redeem" />
                </div>
              </div>
            ))
          )}
          <Button type="button" variant="outline" onClick={addLuckyRow} disabled={!frontendQuizGameId}>
            Add Lucky Winner
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggested Prize-Qualified Order</CardTitle>
          <CardDescription>Raw ranking is unchanged; this is only a recommendation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {qualifiedSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Run suggestions to see who should receive prize slots after eligibility checks.
            </p>
          ) : (
            qualifiedSlots.map((slot) => (
              <div key={slot.prizeType} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{prizeTypeUiLabel(slot.prizeType)}</Badge>
                  <span className="text-sm">
                    Suggested winner: <span className="font-semibold">{slot.selectedViewer?.userName || "No eligible viewer found"}</span>
                  </span>
                  {slot.selectedViewer ? <Badge variant="secondary">Raw Rank #{slot.selectedViewer.rank}</Badge> : null}
                  {slot.selectedDecision?.priorityScore !== undefined ? (
                    <Badge variant="outline">Suggestion Score {Math.round(Number(slot.selectedDecision.priorityScore || 0))}</Badge>
                  ) : null}
                </div>
                {slot.passReason ? <p className="mt-1 text-xs text-amber-600">Prize passes forward: {slot.passReason}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw Top Ranking</CardTitle>
          <CardDescription>Score-based order from quiz engine (unaltered).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rankedViewers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backend final ranking snapshot found for this run.</p>
          ) : (
            rankedViewers.map((viewer) => (
              <div key={viewer.odytChannelId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <p>
                    #{viewer.rank} {viewer.userName}
                  </p>
                  <p className="text-xs text-muted-foreground">{viewer.odytChannelId}</p>
                </div>
                <p className="text-muted-foreground">{viewer.totalScore} pts</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eligibility Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {decisions.map((d) => (
                <motion.div key={`${d.prizeType}:${d.channelId}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-lg border p-4 transition-colors ${d.eligibilityStatus === "eligible" ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {d.eligibilityStatus === "eligible"
                        ? <ShieldCheck className="h-4 w-4 text-green-500" />
                        : <ShieldX className="h-4 w-4 text-destructive" />}
                      <span className="font-medium text-sm">{prizeTypeUiLabel(d.prizeType)}</span>
                    </div>
                    <Badge variant={d.eligibilityStatus === "eligible" ? "default" : "destructive"}>
                      {d.eligibilityStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">{d.channelId}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Participations: {d.properParticipations}</span>
                    <span>Non-win: {Number(d.nonWinningProperParticipations || 0)}</span>
                    {Number.isFinite(Number(d.currentQuizAccuracyPct)) ? (
                      <span>Accuracy: {Math.round(Number(d.currentQuizAccuracyPct || 0))}%</span>
                    ) : null}
                    {d.cooldownRemaining > 0 && <Badge variant="outline" className="text-[10px]">Cooldown: {d.cooldownRemaining}</Badge>}
                  </div>
                  {Array.isArray(d.softFlags) && d.softFlags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.softFlags.map((flag) => (
                        <Badge key={flag} variant="outline" className="text-[10px] border-amber-500/40 text-amber-700">
                          {String(flag).replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {Array.isArray(d.positiveSignals) && d.positiveSignals.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.positiveSignals.map((signal) => (
                        <Badge key={signal} variant="outline" className="text-[10px] border-green-500/40 text-green-700">
                          {String(signal).replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {d.ineligibilityReasons?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.ineligibilityReasons
                        .filter((r) => r !== "lucky_already_used")
                        .map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px] border-destructive/40 text-destructive">{REASON_LABELS[r] || r}</Badge>
                        ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Award Audit</CardTitle>
          <CardDescription>Review active and revoked backend records. Use the draft editor above to save updates back to the run.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Draft Changes</h3>
                <p className="text-xs text-muted-foreground">These are the assignments currently loaded in the editor form.</p>
              </div>
              <Badge variant="outline">{draftSummary.total} draft assignments</Badge>
            </div>
            {draftSummary.total === 0 ? (
              <p className="text-sm text-muted-foreground">No draft prize assignments are filled in yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {draftSummary.ranked.map((row) => (
                  <div key={`draft-ranked-${row.prizeType}`} className="rounded-md border border-border/40 bg-background/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{prizeTypeUiLabel(row.prizeType)}</span>
                      <Badge variant="secondary">Rank #{row.rank}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-foreground">{rankedViewerNameByChannel[row.channelId.trim()] || "Unknown"}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.channelId}</p>
                  </div>
                ))}
                {draftSummary.lucky.map((row) => (
                  <div key={`draft-lucky-${row.prizeInstance}`} className="rounded-md border border-border/40 bg-background/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{prizeTypeUiLabel("luckydip", row.prizeInstance)}</span>
                      <Badge variant="secondary">Lucky #{row.prizeInstance}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-foreground">{rankedViewerNameByChannel[row.channelId.trim()] || "Unknown"}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.channelId}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Active Awards</h3>
                <p className="text-xs text-muted-foreground">These assignments are currently live for the selected quiz run.</p>
              </div>
              <Badge variant="outline">{activeAwards.length} active</Badge>
            </div>
            {activeAwards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active awards assigned for this run.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {activeAwards.map((award) => renderAwardCard(award))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Revoked Awards</h3>
                <p className="text-xs text-muted-foreground">These no longer occupy a prize slot and can be reused from the editor.</p>
              </div>
              <Badge variant="outline">{revokedAwards.length} revoked</Badge>
            </div>
            {revokedAwards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revoked awards for this run.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {revokedAwards.map((award) => renderAwardCard(award))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrizeAssignmentsPage;
