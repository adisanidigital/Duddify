"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { CategoryIcon } from "@/components/category-icon";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import { groupByCategory } from "@/lib/analytics";
import { cn, formatCurrency, isoDate, pct, startOfMonth, endOfMonth } from "@/lib/utils";
import { PageMotion } from "@/components/motion";
import { WhatIfSimulator } from "@/components/what-if-simulator";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Category } from "@/lib/types";
import { Pencil, Plus, X } from "lucide-react";

export default function BudgetsPage() {
  const [ref, setRef] = React.useState(() => startOfMonth(new Date()));
  const [editing, setEditing] = React.useState<Category | null>(null);
  const { data: hh } = useHousehold();
  const { data: categories = [] } = useCategories();
  const from = isoDate(startOfMonth(ref));
  const to = isoDate(endOfMonth(ref));
  const { data: txs = [] } = useTransactions({ from, to });

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  const expenses = txs.filter((t) => t.type === "expense");
  const byCat = new Map(groupByCategory(expenses, categories).map((g) => [g.category.id, g]));
  const expenseCats = categories.filter((c) => c.type === "expense");

  const withBudget = expenseCats.filter((c) => c.monthly_budget && Number(c.monthly_budget) > 0);
  const without = expenseCats.filter((c) => !c.monthly_budget || Number(c.monthly_budget) === 0);

  const totalBudget = withBudget.reduce((s, c) => s + Number(c.monthly_budget), 0);
  const totalSpent = withBudget.reduce((s, c) => s + (byCat.get(c.id)?.total ?? 0), 0);
  const remaining = totalBudget - totalSpent;
  const overallPct = totalBudget ? Math.min(120, pct(totalSpent, totalBudget)) : 0;

  return (
    <PageMotion className="container max-w-5xl py-4 md:py-8 space-y-5">
      <PageHeader
        title="Budgets"
        description="Tap any category to set or edit its monthly limit"
        actions={<MonthPicker value={ref} onChange={setRef} locale={locale} />}
      />

      {/* Hero summary with combined ring */}
      <Card className="overflow-hidden surface">
        <CardContent className="p-5">
          <div className="grid md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Spent / Budget</div>
                  <div className="text-3xl font-bold tabular-nums">
                    <span className={remaining < 0 ? "text-destructive" : ""}>
                      {formatCurrency(totalSpent, currency, locale)}
                    </span>
                    <span className="text-muted-foreground"> / {formatCurrency(totalBudget, currency, locale)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Remaining</div>
                  <div
                    className={cn(
                      "text-2xl font-semibold tabular-nums",
                      remaining >= 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {formatCurrency(remaining, currency, locale)}
                  </div>
                </div>
              </div>
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    overallPct > 100 ? "bg-destructive" : overallPct > 80 ? "bg-warning" : "bg-success"
                  )}
                  style={{ width: `${Math.min(100, overallPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{overallPct}% used</span>
                <span>{withBudget.length} budgets active · {without.length} unset</span>
              </div>
            </div>
            <div className="hidden md:block text-xs text-muted-foreground leading-relaxed">
              Tap any row below to set or edit a budget. We&apos;ll show progress bars and warn you if you go over.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active budgets</CardTitle>
          <CardDescription>
            {withBudget.length === 0
              ? "No budgets yet — set your first below."
              : `${withBudget.length} categor${withBudget.length === 1 ? "y" : "ies"} with a monthly limit`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withBudget.length === 0 ? null : (
            <div className="space-y-4">
              {withBudget.map((c) => {
                const spent = byCat.get(c.id)?.total ?? 0;
                const budget = Number(c.monthly_budget);
                const p = Math.min(120, pct(spent, budget));
                const over = spent > budget;
                return (
                  <button
                    key={c.id}
                    onClick={() => setEditing(c)}
                    className="w-full text-left rounded-lg p-3 -m-3 hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CategoryIcon name={c.icon} color={c.color} size={16} />
                        <span className="text-sm font-medium">{c.name}</span>
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-sm tabular-nums">
                        <span className={over ? "text-destructive font-medium" : ""}>
                          {formatCurrency(spent, currency, locale)}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}/ {formatCurrency(budget, currency, locale)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          over ? "bg-destructive" : p > 80 ? "bg-warning" : "bg-success"
                        )}
                        style={{ width: `${Math.min(100, p)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                      <span>{p}% used</span>
                      <span>
                        {over
                          ? `Over by ${formatCurrency(spent - budget, currency, locale)}`
                          : `${formatCurrency(budget - spent, currency, locale)} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {without.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Set a budget</CardTitle>
            <CardDescription>
              Tap a category to set its monthly limit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {without.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setEditing(c)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent hover:border-primary/40 transition-all text-left group"
                >
                  <CategoryIcon name={c.icon} color={c.color} size={16} />
                  <span className="text-sm flex-1 truncate">{c.name}</span>
                  <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <WhatIfSimulator
        rows={expenseCats
          .map((c) => ({ category: c, spent: byCat.get(c.id)?.total ?? 0 }))
          .sort((a, b) => b.spent - a.spent)}
        currency={currency}
        locale={locale}
      />

      <BudgetEditDialog
        category={editing}
        onClose={() => setEditing(null)}
        currency={currency}
        locale={locale}
      />
    </PageMotion>
  );
}

function BudgetEditDialog({
  category,
  onClose,
  currency,
  locale,
}: {
  category: Category | null;
  onClose: () => void;
  currency: string;
  locale: string;
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (category) {
      setValue(category.monthly_budget ? String(category.monthly_budget) : "");
    }
  }, [category]);

  const save = async (clear?: boolean) => {
    if (!category) return;
    const amt = clear ? null : value ? parseFloat(value) : null;
    if (!clear && amt !== null && (isNaN(amt) || amt <= 0)) {
      return toast.error("Enter a positive amount, or tap Remove");
    }
    setBusy(true);
    const { error } = await supabase
      .from("categories")
      .update({ monthly_budget: amt })
      .eq("id", category.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["categories"] });
    toast.success(clear ? "Budget removed" : "Budget saved");
    onClose();
  };

  // Suggested amounts
  const suggestions = [1000, 2500, 5000, 10000, 25000, 50000];

  return (
    <Dialog open={!!category} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        {category && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <CategoryIcon name={category.icon} color={category.color} size={18} />
                <DialogTitle>{category.name}</DialogTitle>
              </div>
              <DialogDescription>
                Set a monthly spending limit. Leave at 0 to remove.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Monthly limit ({currency})
                </Label>
                <Input
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="text-2xl font-semibold h-14 tabular-nums"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue(String(s))}
                    className="px-2.5 py-1 rounded-full border bg-card text-xs hover:bg-accent hover:border-primary/40 transition-colors tabular-nums"
                  >
                    {formatCurrency(s, currency, locale)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                {category.monthly_budget && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => save(true)}
                    disabled={busy}
                  >
                    <X className="h-4 w-4" /> Remove
                  </Button>
                )}
                <Button
                  type="button"
                  className="flex-1"
                  size="lg"
                  onClick={() => save(false)}
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save budget"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
