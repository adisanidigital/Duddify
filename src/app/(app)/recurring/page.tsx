"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { CategoryIcon } from "@/components/category-icon";
import { useCategories } from "@/lib/hooks/use-data";
import { useHousehold, useSession } from "@/lib/hooks/use-household";
import { createClient } from "@/lib/supabase/client";
import type { RecurringRule, TxType } from "@/lib/types";
import { Plus, Trash2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, isoDate } from "@/lib/utils";
import { PageMotion } from "@/components/motion";

function useRecurring() {
  const supabase = createClient();
  const { data: hh } = useHousehold();
  return useQuery({
    queryKey: ["recurring", hh?.id],
    enabled: !!hh?.id,
    queryFn: async (): Promise<RecurringRule[]> => {
      const { data, error } = await supabase
        .from("recurring_rules")
        .select("*")
        .eq("household_id", hh!.id)
        .order("next_run_on");
      if (error) throw error;
      return (data ?? []) as RecurringRule[];
    },
  });
}

export default function RecurringPage() {
  const { data: hh } = useHousehold();
  const { data: rules = [] } = useRecurring();
  const { data: categories = [] } = useCategories();
  const catById = new Map(categories.map((c) => [c.id, c] as const));
  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  return (
    <PageMotion className="container max-w-4xl py-4 md:py-8 space-y-4">
      <PageHeader
        title="Recurring"
        description="Auto-create rent, salary, SIPs and more"
        actions={<RuleDialog />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{rules.length} rules</CardTitle>
          <CardDescription>
            These run automatically each day. Make sure pg_cron is enabled (see{" "}
            <code className="text-xs">supabase/cron.sql</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              No recurring rules yet. Add one for rent, salary or your monthly SIP.
            </p>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => {
                const c = catById.get(r.category_id);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <CategoryIcon
                      name={c?.icon ?? "circle"}
                      color={c?.color ?? "#64748b"}
                      size={18}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c?.name ?? "Uncategorised"}
                        {!r.active && (
                          <span className="ml-2 text-[10px] text-muted-foreground">PAUSED</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.frequency} • next on{" "}
                        {new Date(r.next_run_on).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {r.note ? ` • ${r.note}` : ""}
                      </div>
                    </div>
                    <div className="font-semibold tabular-nums text-sm">
                      {formatCurrency(Number(r.amount), currency, locale)}
                    </div>
                    <RuleActions rule={r} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageMotion>
  );
}

function RuleDialog() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { data: hh } = useHousehold();
  const { data: session } = useSession();
  const { data: categories = [] } = useCategories();

  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<TxType>("expense");
  const [categoryId, setCategoryId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [frequency, setFrequency] = React.useState<"daily" | "weekly" | "monthly" | "yearly">(
    "monthly"
  );
  const [nextRun, setNextRun] = React.useState(isoDate(new Date()));
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const cats = categories.filter((c) => c.type === type);
  React.useEffect(() => {
    if (!cats.find((c) => c.id === categoryId)) setCategoryId(cats[0]?.id ?? "");
  }, [type, cats, categoryId]);

  const save = async () => {
    if (!hh || !session) return;
    if (!amount || !categoryId) return toast.error("Amount and category required");
    setBusy(true);
    const { error } = await supabase.from("recurring_rules").insert({
      household_id: hh.id,
      category_id: categoryId,
      type,
      amount: parseFloat(amount),
      note: note || null,
      frequency,
      day_of_month: frequency === "monthly" ? new Date(nextRun).getDate() : null,
      next_run_on: nextRun,
      created_by: session.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["recurring"] });
    toast.success("Rule created");
    setOpen(false);
    setAmount("");
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New rule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New recurring rule</DialogTitle>
          <DialogDescription>
            A transaction will be auto-created each cycle.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TxType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {cats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Next run on</Label>
              <Input type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Apartment rent" />
          </div>
          <Button onClick={save} disabled={busy} size="lg" className="w-full">
            {busy ? "Saving…" : "Create rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RuleActions({ rule }: { rule: RecurringRule }) {
  const supabase = createClient();
  const qc = useQueryClient();

  const toggle = async () => {
    const { error } = await supabase
      .from("recurring_rules")
      .update({ active: !rule.active })
      .eq("id", rule.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["recurring"] });
  };

  const remove = async () => {
    if (!confirm("Delete this rule?")) return;
    const { error } = await supabase.from("recurring_rules").delete().eq("id", rule.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["recurring"] });
  };

  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle">
        {rule.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete">
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
