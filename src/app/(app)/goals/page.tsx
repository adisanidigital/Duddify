"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { PageMotion } from "@/components/motion";
import { PrivateValue } from "@/components/private-value";
import { cn, formatCurrency, isoDate } from "@/lib/utils";
import { useHousehold } from "@/lib/hooks/use-household";
import { useTransactions } from "@/lib/hooks/use-data";
import {
  avgMonthlyNetSavings,
  computeFeasibility,
  deleteGoal,
  horizonOf,
  loadGoals,
  monthsBetween,
  upsertGoal,
  type Goal,
  type GoalHorizon,
} from "@/lib/goals";
import { useFeatureFlags } from "@/lib/feature-flags";
import { aiGoalAdvice } from "@/lib/ai";
import {
  Plus,
  Target,
  Sparkles,
  Trash2,
  Pencil,
  CheckCircle2,
  CalendarClock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const HORIZONS: { id: GoalHorizon; label: string; hint: string }[] = [
  { id: "short", label: "Short-term", hint: "Up to 1 year — emergency fund, gadget, trip" },
  { id: "medium", label: "Medium-term", hint: "1–3 years — car, big trip, course" },
  { id: "long", label: "Long-term", hint: "3+ years — house, retirement, kids' education" },
];

export default function GoalsPage() {
  const { data: hh } = useHousehold();
  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";
  const yearStart = React.useMemo(
    () => isoDate(new Date(new Date().getFullYear() - 1, 0, 1)),
    []
  );
  const { data: txs = [] } = useTransactions({ from: yearStart });

  const [goals, setGoals] = React.useState<Goal[]>([]);
  React.useEffect(() => {
    setGoals(loadGoals(hh?.id));
  }, [hh?.id]);

  const [editing, setEditing] = React.useState<Partial<Goal> | null>(null);
  const [tab, setTab] = React.useState<"all" | GoalHorizon>("all");

  const avgSavings = React.useMemo(() => avgMonthlyNetSavings(txs, 6), [txs]);
  const grouped = React.useMemo(() => {
    const m: Record<GoalHorizon, Goal[]> = { short: [], medium: [], long: [] };
    for (const g of goals) m[horizonOf(g.deadline)].push(g);
    return m;
  }, [goals]);

  const visible: Goal[] =
    tab === "all" ? goals : grouped[tab];

  const saveGoal = (g: Goal) => {
    if (!hh?.id) return;
    setGoals(upsertGoal(hh.id, g));
    setEditing(null);
    toast.success("Goal saved");
  };

  const removeGoal = (id: string) => {
    if (!hh?.id) return;
    const removed = goals.find((g) => g.id === id);
    if (!removed) return;
    setGoals(deleteGoal(hh.id, id));
    toast.success(`Deleted "${removed.title}"`, {
      duration: 8000,
      action: {
        label: "Undo",
        onClick: () => {
          if (!hh?.id) return;
          setGoals(upsertGoal(hh.id, removed));
        },
      },
    });
  };

  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const overallPct = totalTarget ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  return (
    <PageMotion className="container max-w-5xl py-4 md:py-8 space-y-5">
      <PageHeader
        title="Goals"
        description="Plan and track what you're saving towards"
        actions={
          <Button
            onClick={() =>
              setEditing({
                title: "",
                target: 0,
                saved: 0,
                deadline: isoDate(new Date(new Date().getFullYear() + 1, 0, 1)),
              })
            }
          >
            <Plus /> New goal
          </Button>
        }
      />

      {/* Summary */}
      {goals.length > 0 && (
        <Card>
          <CardContent className="p-5 grid md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Total saved / target
                  </div>
                  <div className="text-2xl font-bold tabular-nums mt-0.5">
                    <PrivateValue mask="••••">
                      {formatCurrency(totalSaved, currency, locale)}
                    </PrivateValue>
                    <span className="text-muted-foreground text-base font-normal">
                      {" "}/{" "}
                      <PrivateValue mask="•••">
                        {formatCurrency(totalTarget, currency, locale)}
                      </PrivateValue>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Avg monthly savings
                  </div>
                  <div className="text-lg font-semibold tabular-nums">
                    <PrivateValue mask="•••">
                      {formatCurrency(Math.max(0, avgSavings), currency, locale)}
                    </PrivateValue>
                  </div>
                </div>
              </div>
              <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {overallPct}% there · {goals.length} active goal{goals.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Tip:</strong> avg monthly savings is your
              income minus expenses over the last 6 months. The goal advisor below uses
              this to estimate feasibility.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Horizon tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="short">Short-term</TabsTrigger>
          <TabsTrigger value="medium">Medium-term</TabsTrigger>
          <TabsTrigger value="long">Long-term</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState onAdd={() => setEditing({ title: "", target: 0, saved: 0, deadline: isoDate(new Date(new Date().getFullYear() + 1, 0, 1)) })} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence initial={false}>
            {visible.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                avgSavings={avgSavings}
                currency={currency}
                locale={locale}
                onEdit={() => setEditing(g)}
                onDelete={() => removeGoal(g.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <GoalDialog
        initial={editing}
        onClose={() => setEditing(null)}
        onSave={saveGoal}
        currency={currency}
      />
    </PageMotion>
  );
}

function GoalCard({
  goal,
  avgSavings,
  currency,
  locale,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  avgSavings: number;
  currency: string;
  locale: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const f = React.useMemo(() => computeFeasibility(goal, avgSavings), [goal, avgSavings]);
  const pct = goal.target ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;

  const statusStyles = {
    "on-track": { ring: "ring-success/30", chip: "bg-success/15 text-success", label: "On track" },
    tight: { ring: "ring-warning/30", chip: "bg-warning/15 text-warning", label: "Tight" },
    "off-track": { ring: "ring-destructive/30", chip: "bg-destructive/15 text-destructive", label: "Off track" },
    done: { ring: "ring-success/30", chip: "bg-success/15 text-success", label: "Achieved 🎉" },
  }[f.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
    >
      <Card className={cn("overflow-hidden ring-1", statusStyles.ring)}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate flex items-center gap-2">
                <Target className="h-4 w-4 text-primary shrink-0" />
                {goal.title}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 inline-flex items-center gap-1.5">
                <CalendarClock className="h-3 w-3" />
                {new Date(goal.deadline).toLocaleDateString(locale, {
                  month: "short",
                  year: "numeric",
                })}
                · {Math.round(f.monthsLeft)} mo left
              </CardDescription>
            </div>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider rounded-full px-1.5 py-0.5 font-medium",
                statusStyles.chip
              )}
            >
              {statusStyles.label}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1 tabular-nums">
              <span>
                <PrivateValue mask="•••">
                  {formatCurrency(goal.saved, currency, locale)}
                </PrivateValue>
              </span>
              <span className="text-muted-foreground">
                <PrivateValue mask="•••">
                  {formatCurrency(goal.target, currency, locale)}
                </PrivateValue>
              </span>
            </div>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "h-full rounded-full",
                  f.status === "on-track" || f.status === "done"
                    ? "bg-success"
                    : f.status === "tight"
                    ? "bg-warning"
                    : "bg-destructive"
                )}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md bg-accent/40 p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Need / month
              </div>
              <div className="font-medium tabular-nums mt-0.5">
                <PrivateValue mask="•••">
                  {formatCurrency(f.requiredPerMonth, currency, locale)}
                </PrivateValue>
              </div>
            </div>
            <div className="rounded-md bg-accent/40 p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Saving / month
              </div>
              <div className="font-medium tabular-nums mt-0.5">
                <PrivateValue mask="•••">
                  {formatCurrency(Math.max(0, avgSavings), currency, locale)}
                </PrivateValue>
              </div>
            </div>
            <div className="rounded-md bg-accent/40 p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Remaining
              </div>
              <div className="font-medium tabular-nums mt-0.5">
                <PrivateValue mask="•••">
                  {formatCurrency(f.remaining, currency, locale)}
                </PrivateValue>
              </div>
            </div>
          </div>

          {/* AI advisor */}
          <AIGoalAdvisor goal={goal} avgSavings={avgSavings} currency={currency} />

          {goal.notes && (
            <div className="text-xs text-muted-foreground border-t pt-2 italic">
              {goal.notes}
            </div>
          )}

          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AIGoalAdvisor({
  goal,
  avgSavings,
  currency,
}: {
  goal: Goal;
  avgSavings: number;
  currency: string;
}) {
  const { flags } = useFeatureFlags();
  const [advice, setAdvice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errored, setErrored] = React.useState(false);

  if (!flags.ai) return null;

  const fetchAdvice = async () => {
    setLoading(true);
    setErrored(false);
    try {
      const f = computeFeasibility(goal, avgSavings);
      const out = await aiGoalAdvice({
        title: goal.title,
        target: goal.target,
        saved: goal.saved,
        monthsLeft: Math.round(f.monthsLeft),
        avgMonthlySavings: Math.max(0, avgSavings),
        currency,
      });
      setAdvice(out);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary font-medium mb-1">
        <Sparkles className="h-3 w-3" />
        AI coach
      </div>
      {advice ? (
        <div className="text-xs leading-relaxed">{advice}</div>
      ) : errored ? (
        <div className="text-xs text-muted-foreground">
          Couldn&apos;t reach the AI service. Try again in a moment.
        </div>
      ) : loading ? (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
        </div>
      ) : (
        <button
          type="button"
          onClick={fetchAdvice}
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          <Sparkles className="h-3 w-3" /> Ask the AI coach if this is realistic
        </button>
      )}
    </div>
  );
}

function GoalDialog({
  initial,
  onClose,
  onSave,
  currency,
}: {
  initial: Partial<Goal> | null;
  onClose: () => void;
  onSave: (g: Goal) => void;
  currency: string;
}) {
  const [title, setTitle] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [saved, setSaved] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!initial) return;
    setTitle(initial.title ?? "");
    setTarget(initial.target ? String(initial.target) : "");
    setSaved(initial.saved ? String(initial.saved) : "");
    setDeadline(initial.deadline ?? isoDate(new Date(new Date().getFullYear() + 1, 0, 1)));
    setNotes(initial.notes ?? "");
  }, [initial]);

  const submit = () => {
    const t = parseFloat(target);
    if (!title.trim()) return toast.error("Give the goal a name");
    if (!t || t <= 0) return toast.error("Target must be a positive number");
    if (!deadline) return toast.error("Pick a deadline");
    const s = parseFloat(saved || "0");
    const goal: Goal = {
      id: initial?.id ?? cryptoRandomId(),
      title: title.trim(),
      target: t,
      saved: isFinite(s) && s >= 0 ? s : 0,
      deadline,
      horizon: horizonOf(deadline),
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    onSave(goal);
  };

  const monthsLeft = deadline ? Math.round(monthsBetween(new Date(), new Date(deadline))) : 0;

  return (
    <Dialog open={!!initial} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>
            We&apos;ll use your average monthly savings to estimate feasibility.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>What are you saving for?</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Trip to Japan, emergency fund, MBA…"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Target ({currency})</Label>
              <Input
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="200000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Already saved</Label>
              <Input
                inputMode="decimal"
                value={saved}
                onChange={(e) => setSaved(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            {deadline && (
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {monthsLeft} months away · {horizonOf(deadline)}-term
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Why this matters to you…"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">Horizons:</span>
            {HORIZONS.map((h) => (
              <span
                key={h.id}
                className={cn(
                  "text-[10px] rounded-full px-2 py-0.5 border",
                  deadline && horizonOf(deadline) === h.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-border text-muted-foreground"
                )}
                title={h.hint}
              >
                {h.label}
              </span>
            ))}
          </div>
          <Button size="lg" className="w-full" onClick={submit}>
            {initial?.id ? "Save changes" : "Create goal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
          <Target className="h-7 w-7" />
        </div>
        <div className="font-semibold text-base">Set your first goal</div>
        <div className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Tell us what you&apos;re saving towards and we&apos;ll track progress
          + tell you if you&apos;re on pace based on your average savings.
        </div>
        <Button onClick={onAdd} className="mt-4">
          <Plus /> New goal
        </Button>
        <div className="mt-6 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-success" /> Saved on this device
          {" "}
          <span aria-hidden>·</span>
          {" "}
          <TrendingUp className="h-3 w-3 text-primary" /> Uses your last 6 months of data
        </div>
      </CardContent>
    </Card>
  );
}

function cryptoRandomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
