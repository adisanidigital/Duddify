"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CategoryPie, DailyBar } from "@/components/charts";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { MonthPicker } from "@/components/month-picker";
import { TransactionRow } from "@/components/transaction-row";
import { PageMotion, StaggerChildren, StaggerItem } from "@/components/motion";
import { CategoryDetailDialog } from "@/components/category-detail-dialog";
import { DayDetailDialog } from "@/components/day-detail-dialog";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold, useHouseholdMembers } from "@/lib/hooks/use-household";
import type { Category } from "@/lib/types";
import {
  biggestTransactions,
  dailyHeatmap,
  groupByCategory,
  groupByDay,
  inRange,
} from "@/lib/analytics";
import { formatCurrency, isoDate, pct, startOfMonth, endOfMonth } from "@/lib/utils";

export default function ExpensesPage() {
  const [ref, setRef] = React.useState(() => startOfMonth(new Date()));
  const { data: hh } = useHousehold();
  const { data: categories = [] } = useCategories();
  const { data: members = [] } = useHouseholdMembers();
  const from = isoDate(startOfMonth(ref));
  const to = isoDate(endOfMonth(ref));
  const { data: txs = [] } = useTransactions({ from, to });
  const expenses = txs.filter((t) => t.type === "expense");
  const [drillCategory, setDrillCategory] = React.useState<Category | null>(null);
  const [drillDay, setDrillDay] = React.useState<string | null>(null);
  const windowLabel = ref.toLocaleString("default", { month: "long", year: "numeric" });

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  const byCat = groupByCategory(expenses, categories);
  const byDay = groupByDay(expenses);
  const total = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const heat = dailyHeatmap(expenses, ref);
  const biggest = biggestTransactions(expenses, 6);
  const catById = new Map(categories.map((c) => [c.id, c] as const));
  const avgPerDay = total / Math.max(1, new Date().getDate());

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
            <CardTitle>Daily spend</CardTitle>
            <CardDescription>
              Each bar is one day this month · tap a bar to see the details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyBar
              data={byDay}
              currency={currency}
              locale={locale}
              height={240}
              onBarClick={setDrillDay}
            />
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
      />
    </PageMotion>
  );
}
