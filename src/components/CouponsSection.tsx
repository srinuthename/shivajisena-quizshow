import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Copy,
  CheckCircle2,
  Gift,
  ExternalLink,
  Loader2,
  ChevronRight,
  Sparkles,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getLoyaltyCoupons,
  markCouponClaimed,
  markCouponViewed,
  type LoyaltyCoupon,
} from "@/services/couponApi";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const statusVariant = (
  status: LoyaltyCoupon["status"],
): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "claimed") return "default";
  if (status === "assigned" || status === "viewed") return "secondary";
  if (status === "expired" || status === "revoked") return "destructive";
  return "outline";
};

const statusLabel = (status: LoyaltyCoupon["status"]) => {
  const map: Record<LoyaltyCoupon["status"], string> = {
    pending: "Pending",
    assigned: "Ready to claim",
    viewed: "Viewed",
    claimed: "Claimed",
    expired: "Expired",
    revoked: "Revoked",
  };
  return map[status] || status;
};

interface CouponsSectionProps {
  participantChannelId: string;
  /** When provided, only show coupons earned from this host channel. */
  hostChannelIdFilter?: string;
}

export const CouponsSection = ({
  participantChannelId,
  hostChannelIdFilter,
}: CouponsSectionProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<LoyaltyCoupon[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<LoyaltyCoupon | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const res = await getLoyaltyCoupons(participantChannelId);
    setCoupons(res.data?.coupons || []);
    setLoading(false);
  };

  useEffect(() => {
    if (participantChannelId) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantChannelId]);

  const visible = useMemo(() => {
    if (!hostChannelIdFilter) return coupons;
    return coupons.filter((c) => c.quizHostChannelId === hostChannelIdFilter);
  }, [coupons, hostChannelIdFilter]);

  const stats = useMemo(() => {
    const total = visible.length;
    const claimed = visible.filter((c) => c.status === "claimed").length;
    const ready = visible.filter(
      (c) => c.status === "assigned" || c.status === "viewed",
    ).length;
    return { total, claimed, ready };
  }, [visible]);

  const openCoupon = async (coupon: LoyaltyCoupon) => {
    setActive(coupon);
    setShowCode(false);
    setOpen(true);
  };

  const revealCode = async () => {
    if (!active) return;
    setShowCode(true);
    if (active.status === "assigned") {
      const res = await markCouponViewed(active.couponId);
      if (res.success && res.data) {
        const updated = res.data;
        setActive(updated);
        setCoupons((prev) =>
          prev.map((c) => (c.couponId === updated.couponId ? updated : c)),
        );
      }
    }
  };

  const copyCode = async () => {
    if (!active?.couponCode) return;
    try {
      await navigator.clipboard.writeText(active.couponCode);
      toast({ title: "Copied to clipboard", description: active.couponCode });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const claim = async () => {
    if (!active) return;
    setBusy(true);
    const res = await markCouponClaimed(active.couponId);
    setBusy(false);
    if (res.success && res.data) {
      const updated = res.data;
      setActive(updated);
      setCoupons((prev) =>
        prev.map((c) => (c.couponId === updated.couponId ? updated : c)),
      );
      toast({ title: "Marked as claimed", description: "Enjoy your reward 🎉" });
    } else {
      toast({
        title: "Could not mark claimed",
        description: res.error || "Try again later",
        variant: "destructive",
      });
    }
  };

  // ── Card (compact entry shown in the loyalty stat row) ──────────────────────
  return (
    <>
      <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => visible.length > 0 && openCoupon(visible[0])}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && visible.length > 0) openCoupon(visible[0]);
          }}
          className={`border-amber-400/40 bg-gradient-to-br from-amber-500/5 via-background to-amber-500/5 transition-all ${
            visible.length > 0 ? "cursor-pointer hover:shadow-md hover:border-amber-400/70" : "opacity-90"
          }`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15 shrink-0">
              <Ticket className="h-4 w-4 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Coupons Won</p>
              <p className="text-lg font-bold leading-tight text-amber-500">
                {loading ? "…" : stats.total}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {loading
                  ? "Loading"
                  : stats.total === 0
                    ? "None yet"
                    : `${stats.ready} ready · ${stats.claimed} claimed`}
              </p>
            </div>
            {visible.length > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Full coupons list — only show when there are coupons and not under a filter that has none */}
      {visible.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-4 border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> Your Coupons
              </h3>
              <Badge variant="outline" className="text-[10px]">
                {visible.length} total
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <button
                  key={c.couponId}
                  onClick={() => openCoupon(c)}
                  className="group text-left rounded-lg border border-border/60 p-3 hover:border-amber-400/60 hover:bg-amber-500/5 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {c.title || c.provider || "Coupon"}
                    </p>
                    <Badge variant={statusVariant(c.status)} className="text-[10px] shrink-0">
                      {statusLabel(c.status)}
                    </Badge>
                  </div>
                  {c.valueLabel && (
                    <p className="text-base font-bold text-amber-500 leading-tight">
                      {c.valueLabel}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground truncate mt-1">
                    {c.episodeName || c.frontendQuizGameId}
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    Assigned {fmtDate(c.assignedAt)}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={active.couponId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-amber-500" />
                    {active.title || active.provider || "Your coupon"}
                  </DialogTitle>
                  <DialogDescription>
                    Earned in {active.episodeName || active.frontendQuizGameId}
                    {active.quizHostChannelTitle ? ` on ${active.quizHostChannelTitle}` : ""}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(active.status)}>{statusLabel(active.status)}</Badge>
                    {active.provider && <Badge variant="outline">{active.provider}</Badge>}
                    {active.valueLabel && (
                      <Badge variant="outline" className="text-amber-500 border-amber-400/50">
                        {active.valueLabel}
                      </Badge>
                    )}
                  </div>

                  {active.description && (
                    <p className="text-sm text-muted-foreground">{active.description}</p>
                  )}

                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Coupon code</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-base font-semibold tracking-wide truncate">
                        {showCode
                          ? active.couponCode || "—"
                          : active.couponCode
                            ? "•".repeat(Math.min(12, active.couponCode.length))
                            : "—"}
                      </code>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => (showCode ? setShowCode(false) : revealCode())}
                          disabled={!active.couponCode}
                        >
                          {showCode ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={copyCode}
                          disabled={!showCode || !active.couponCode}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {active.expiresAt && (
                    <p className="text-[11px] text-muted-foreground">
                      Expires {fmtDate(active.expiresAt)}
                    </p>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  {active.redeemUrl && (
                    <Button asChild variant="outline" className="gap-2">
                      <a href={active.redeemUrl} target="_blank" rel="noopener noreferrer">
                        Redeem <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    onClick={claim}
                    disabled={busy || active.status === "claimed" || active.status === "expired" || active.status === "revoked"}
                    className="gap-2"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {active.status === "claimed" ? "Already claimed" : "Mark as claimed"}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CouponsSection;
