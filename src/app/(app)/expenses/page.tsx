"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CategoryPie, DailyBar, StackedDailyBar } from "@/components/charts";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { MonthPicker } from "@/components/month-picker";
import { TransactionRow } from "@/components/transaction-row";
import { PageMotion, StaggerChildren, StaggerItem } from "@/components/motion";
import { CategoryDetailDialog } from "@/components/category-detail-dialog";
import { DayDetailDialog } from "@/components/day-detail-dialog";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Transaction } from "@/lib/types";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold, useHouseholdMembers } from "@/lib/hooks/use-household";
import type { Category } from "@/lib/types";
import {
  biggestTransactions,
  dailyHeatmap,
  groupByCategory,
  groupByDay,
  groupByDayAndCategory,
  inRange,
} from "@/lib/analytics";
import { formatCurrency, isoDate, pct, startOfMonth, endOfMonth, cn } from "@/lib/utils";

export default function ExpensesPage() {
  const [ref, setRef] = React.useState(() => startOfMonth(new Date()));
  const { data: hh } = useHousehold();
  const { data: categories = [] } = useCategories();
  const { data: members = [] } = useHouseholdMembers();
  const from = isoDate(startOfMonth(ref));
  const to = isoDate(endOfMonth(ref));
  const { data: txs = [] } = useTransactions({ from, to });
  const expenses = txs.filter((t) => t.type === "expense");
  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";
  const catById = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories]
  );
  const [drillCategory, setDrillCategory] = React.useState<Category | null>(null);
  const [drillDay, setDrillDay] = React.useState<string | null>(null);
  const [drillTx, setDrillTx] = React.useState<Transaction | null>(null);
  const windowLabel = ref.toLocaleString("default", { month: "long", year: "numeric" });

  const supabase = createClient();
  const qc = useQueryClient();
  const confirmDialog = useConfirmDialog();
  const drillTxFresh = React.useMemo(
    () => (drillTx ? expenses.find((t) => t.id === drillTx.id) ?? null : null),
    [drillTx, expenses]
  );

  const askDeleteTx = React.useCallback(
    (tx: Transaction) => {
      const c = catById.get(tx.category_id);
      const amountStr = formatCurrency(Number(tx.amount), currency, locale);
      confirmDialog({
        title: "Delete this transaction?",
        description: (
          <>
            <span className="font-medium text-foreground">
              {c?.name ?? "Uncategorised"}
            </span>{" "}
            · {amountStr}
            <br />
            <span className="text-muted-foreground">
              You&apos;ll have 8 seconds to undo right after.
            </span>
          </>
        ),
        confirmLabel: "Delete",
        onConfirm: async () => {
          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", tx.id);
          if (error) return toast.error(error.message);
          qc.invalidateQueries({ queryKey: ["transactions"] });
          toast.success(`Deleted${c ? ` "${c.name}"` : ""}`, {
            duration: 8000,
            action: {
              label: "Undo",
              onClick: async () => {
                const { id: _id, created_at: _ca, ...payload } = tx;
                const { error: e2 } = await supabase
                  .from("transactions")
                  .insert(payload);
                if (e2) toast.error(e2.message);
                else {
                  toast.success("Restored");
                  qc.invalidateQueries({ queryKey: ["transactions"] });
                }
              },
            },
          });
          setDrillTx(null);
        },
      });
    },
    [confirmDialog, catById, currency, locale, supabase, qc]
  );

  const byCat = groupByCategory(expenses, categories);
  const byDay = groupByDay(expenses);
  const stack = React.useMemo(
    () => groupByDayAndCategory(expenses, categories),
    [expenses, categories]
  );
  const total = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const heat = dailyHeatmap(expenses, ref);
  const biggest = biggestTransactions(expenses, 6);
  const avgPerDay = total / Math.max(1, new Date().getDate());
  const [dailyView, setDailyView] = React.useState<"total" | "split">("split");

  return (
    <PageMotion className="container max-w-6xl py-4 md:py-8 space-y-5">
      <PageHeader
        title="Expenses"
        description="Where your money is going"
        actions={<MonthPicker value={ref} onChange={setRef} locale={locale} />}
      />

      <StaggerChildren className="grid grid-cols-2 md:grid-cols-4 gap-3" delay={0.05}>
        <StaggerItem>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Total spent</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">
              {formatCurrency(total, currency, locale)}
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Transactions</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">{expenses.length}</div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Daily average</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">
              {formatCurrency(avgPerDay, currency, locale)}
            </div>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Top category</div>
            <div className="text-2xl font-semibold mt-1 truncate">
              {byCat[0]?.category.name ?? "—"}
            </div>
          </Card>
        </StaggerItem>
      </StaggerChildren>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Daily spend</CardTitle>
                <CardDescription>
                  Tap a bar to see the details for that day
                </CardDescription>
              </div>
              <div className="inline-flex rounded-lg border bg-card p-0.5">
                <button
                  type="button"
                  onClick={() => setDailyView("split")}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md transition-all",
                    dailyView === "split"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={dailyView === "split"}
                >
                  By category
                </button>
                <button
                  type="button"
                  onClick={() => setDailyView("total")}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md transition-all",
                    dailyView === "total"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={dailyView === "total"}
                >
                  Total
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dailyView === "split" && stack.series.length > 0 ? (
              <>
                <StackedDailyBar
                  data={stack.rows}
                  series={stack.series}
                  currency={currency}
                  locale={locale}
                  height={240}
                  onBarClick={setDrillDay}
                />
                {/* Compact legend below the chart */}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                  {[...stack.series].reverse().map((s) => (
                    <span key={s.key} className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span className="truncate max-w-[120px]">{s.name}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <DailyBar
                data={byDay}
                currency={currency}
                locale={locale}
                height={240}
                onBarClick={setDrillDay}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
            <CardDescription>Share of total spend</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie
              data={byCat.map(({ category, total }) => ({
                name: category.name,
                value: total,
                color: category.color,
              }))}
              currency={currency}
              locale={locale}
              height={260}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
            <CardDescription>{expenses.length} transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {byCat.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses this month.</p>
            ) : (
              <div className="space-y-3">
                {byCat.map(({ category, total: t, count }) => {
                  const p = pct(t, total);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setDrillCategory(category)}
                      className="w-full text-left rounded-lg p-2 -m-2 hover:bg-accent/60 active:bg-accent transition-colors group"
                      aria-label={`See transactions in ${category.name}`}
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                          <span className="text-xs text-muted-foreground">
                            · {count}
                          </span>
                        </div>
                        <div className="tabular-nums">
                          {formatCurrency(t, currency, locale)}{" "}
                          <span className="text-xs text-muted-foreground">({p}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${p}%`, background: category.color }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar heatmap</CardTitle>
            <CardDescription>Spend per day · tap a day to drill in</CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarHeatmap
              data={heat}
              monthRef={ref}
              currency={currency}
              locale={locale}
              onDayClick={setDrillDay}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biggest transactions</CardTitle>
          <CardDescription>Top single expenses this month</CardDescription>
        </CardHeader>
        <CardContent>
          {biggest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <StaggerChildren className="space-y-0.5" delay={0.04}>
              {biggest.map((t) => (
                <StaggerItem key={t.id}>
                  <TransactionRow
                    tx={t}
                    category={catById.get(t.category_id)}
                    currency={currency}
                    locale={locale}
                  />
                </StaggerItem>
              ))}
            </StaggerChildren>
          )}
        </CardContent>
      </Card>

      <CategoryDetailDialog
        open={!!drillCategory}
        onOpenChange={(v) => !v && setDrillCategory(null)}
        category={drillCategory}
        txs={expenses}
        members={members}
        currency={currency}
        locale={locale}
        windowLabel={windowLabel}
        onSelectTransaction={setDrillTx}
      />

      <DayDetailDialog
        open={!!drillDay}
        onOpenChange={(v) => !v && setDrillDay(null)}
        date={drillDay}
        txs={expenses}
        categories={categories}
        members={members}
        currency={currency}
        locale={locale}
        type="expense"
        onSelectTransaction={setDrillTx}
      />

      <TransactionDetailDialog
        open={!!drillTxFresh}
        onOpenChange={(v) => !v && setDrillTx(null)}
        tx={drillTxFresh}
        category={drillTxFresh ? catById.get(drillTxFresh.category_id) : null}
        members={members}
        currency={currency}
        locale={locale}
        onDelete={() => drillTxFresh && askDeleteTx(drillTxFresh)}
      />

      {confirmDialog.element}
    </PageMotion>
  );
}
