"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { DateRangePicker, makePresets, type DateRange } from "@/components/date-range-picker";
import { CategoryPie, DailyBar, MonthBars } from "@/components/charts";
import { TransactionRow } from "@/components/transaction-row";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold, useHouseholdMembers } from "@/lib/hooks/use-household";
import {
  biggestTransactions,
  groupByCategory,
  groupByDay,
  groupByMonth,
  sumByType,
} from "@/lib/analytics";
import { groupByDayOfWeek, groupByMember, rangeDays } from "@/lib/analytics-extra";
import { cn, formatCurrency, pct } from "@/lib/utils";
import { PageMotion } from "@/components/motion";
import { Download, FileText, Printer } from "lucide-react";

export default function ReportsPage() {
  const presets = makePresets();
  const [range, setRange] = React.useState<DateRange>(presets[0].range);
  const { data: hh } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();
  const { data: categories = [] } = useCategories();
  const { data: txs = [] } = useTransactions({ from: range.from, to: range.to, limit: 5000 });

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  const totals = sumByType(txs);
  const days = rangeDays(range.from, range.to);
  const expenses = txs.filter((t) => t.type === "expense");
  const income = txs.filter((t) => t.type === "income");
  const investments = txs.filter((t) => t.type === "investment");

  const expenseByCat = groupByCategory(expenses, categories);
  const incomeByCat = groupByCategory(income, categories);
  const investmentByCat = groupByCategory(investments, categories);
  const byDay = groupByDay(expenses);
  const byMonth = groupByMonth(txs);
  const byDow = groupByDayOfWeek(expenses);
  const byMember = groupByMember(txs, members);
  const biggest = biggestTransactions(expenses, 10);
  const catById = new Map(categories.map((c) => [c.id, c] as const));

  const net = totals.income - totals.expense;
  const savingsRate = totals.income ? Math.max(0, Math.round((net / totals.income) * 100)) : 0;
  const avgPerDay = totals.expense / days;

  const showMonthly = byMonth.length > 1;

  // Export current range as CSV
  const exportCsv = () => {
    const rows = [
      ["date", "type", "amount", "currency", "category", "user_id", "paid_by", "note"].join(","),
      ...txs.map((t) =>
        [
          t.occurred_on,
          t.type,
          t.amount,
          currency,
          (catById.get(t.category_id)?.name ?? "").replace(/[",\n]/g, " "),
          t.user_id,
          t.paid_by ?? "",
          (t.note ?? "").replace(/[",\n]/g, " "),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `duddify-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    if (typeof window !== "undefined") window.print();
  };

  const rangeLabel =
    range.label ||
    `${new Date(range.from).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })} – ${new Date(range.to).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;

  return (
    <PageMotion className="container max-w-6xl py-4 md:py-8 space-y-5 print:space-y-3">
      <PageHeader
        title="Reports"
        description={rangeLabel}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button size="sm" onClick={print}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
          </div>
        }
      />

      <Card className="print:hidden">
        <CardContent className="p-4">
          <DateRangePicker value={range} onChange={setRange} />
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:grid-cols-5">
        <Stat label="Income" value={totals.income} currency={currency} locale={locale} accent="success" />
        <Stat label="Spent" value={totals.expense} currency={currency} locale={locale} accent="destructive" />
        <Stat label="Invested" value={totals.investment} currency={currency} locale={locale} accent="primary" />
        <Stat label="Net saved" value={Math.max(0, net)} currency={currency} locale={locale} accent={net >= 0 ? "success" : "destructive"} />
        <Stat label="Savings rate" value={savingsRate} isPercent accent={savingsRate >= 20 ? "success" : "warning"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
        <SmallStat label="Transactions" value={txs.length.toString()} />
        <SmallStat label="Avg / day" value={formatCurrency(avgPerDay, currency, locale)} />
        <SmallStat label="Biggest expense" value={formatCurrency(biggest[0] ? Number(biggest[0].amount) : 0, currency, locale)} />
        <SmallStat label="Period" value={`${days} day${days !== 1 ? "s" : ""}`} />
      </div>

      {/* Period chart */}
      {showMonthly ? (
        <Card>
          <CardHeader>
            <CardTitle>Month by month</CardTitle>
            <CardDescription>Income, expense and investments per month</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthBars
              data={byMonth.map((m) => ({ ...m, month: m.month.slice(2) }))}
              series={[
                { key: "income", name: "Income", color: "hsl(var(--success))" },
                { key: "expense", name: "Expense", color: "hsl(var(--destructive))" },
                { key: "investment", name: "Invested", color: "hsl(var(--primary))" },
              ]}
              currency={currency}
              locale={locale}
              height={260}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Daily expenses</CardTitle>
            <CardDescription>Each bar is one day in this range</CardDescription>
          </CardHeader>
          <CardContent>
            <DailyBar data={byDay} currency={currency} locale={locale} height={220} />
          </CardContent>
        </Card>
      )}

      {/* Category breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by category</CardTitle>
            <CardDescription>{expenses.length} transactions, {formatCurrency(totals.expense, currency, locale)}</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie
              data={expenseByCat.map(({ category, total }) => ({
                name: category.name,
                value: total,
                color: category.color,
              }))}
              currency={currency}
              locale={locale}
              height={240}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investments by type</CardTitle>
            <CardDescription>{investments.length} transactions, {formatCurrency(totals.investment, currency, locale)}</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie
              data={investmentByCat.map(({ category, total }) => ({
                name: category.name,
                value: total,
                color: category.color,
              }))}
              currency={currency}
              locale={locale}
              height={240}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed category table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed expense breakdown</CardTitle>
          <CardDescription>Sorted by amount, with % of total and avg per transaction</CardDescription>
        </CardHeader>
        <CardContent>
          {expenseByCat.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses in this range.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground text-left">
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium text-right">Total</th>
                    <th className="px-2 py-2 font-medium text-right">%</th>
                    <th className="px-2 py-2 font-medium text-right">Count</th>
                    <th className="px-2 py-2 font-medium text-right">Avg</th>
                    <th className="px-2 py-2 font-medium text-right">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseByCat.map(({ category, total, count }) => {
                    const p = pct(total, totals.expense);
                    const avg = total / Math.max(1, count);
                    const budget = category.monthly_budget ? Number(category.monthly_budget) : null;
                    return (
                      <tr key={category.id} className="border-t">
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ background: category.color }}
                            />
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">
                          {formatCurrency(total, currency, locale)}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                          {p}%
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                          {count}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(avg, currency, locale)}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                          {budget ? formatCurrency(budget, currency, locale) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t font-semibold">
                    <td className="px-2 py-2.5">Total</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatCurrency(totals.expense, currency, locale)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">100%</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{expenses.length}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income breakdown if relevant */}
      {income.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Income sources</CardTitle>
            <CardDescription>{formatCurrency(totals.income, currency, locale)} from {income.length} entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {incomeByCat.map(({ category, total, count }) => {
                const p = pct(total, totals.income);
                return (
                  <div key={category.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
                        <span className="font-medium">{category.name}</span>
                        <span className="text-xs text-muted-foreground">· {count}</span>
                      </div>
                      <span className="tabular-nums">
                        {formatCurrency(total, currency, locale)}{" "}
                        <span className="text-xs text-muted-foreground">({p}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p}%`, background: category.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day of week & per-member */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend by day of week</CardTitle>
            <CardDescription>When your money tends to go out</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const max = Math.max(1, ...byDow.map((d) => d.total));
                return byDow.map((d) => (
                  <div key={d.day}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium w-10">{d.day}</span>
                      <span className="tabular-nums">
                        {formatCurrency(d.total, currency, locale)}{" "}
                        <span className="text-xs text-muted-foreground">· {d.count}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(d.total / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>

        {members.length >= 2 ? (
          <Card>
            <CardHeader>
              <CardTitle>By household member</CardTitle>
              <CardDescription>Who paid for what (based on &ldquo;paid by&rdquo;)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {byMember.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-medium text-sm">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.count} entries</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Spent</div>
                        <div className="font-semibold tabular-nums text-destructive">
                          {formatCurrency(m.expense, currency, locale)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Income</div>
                        <div className="font-semibold tabular-nums text-success">
                          {formatCurrency(m.income, currency, locale)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Invested</div>
                        <div className="font-semibold tabular-nums text-primary">
                          {formatCurrency(m.investment, currency, locale)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Period summary</CardTitle>
              <CardDescription>{rangeLabel}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <Row label="Total income" value={formatCurrency(totals.income, currency, locale)} />
              <Row label="Total spent" value={formatCurrency(totals.expense, currency, locale)} />
              <Row label="Total invested" value={formatCurrency(totals.investment, currency, locale)} />
              <Row label="Net saved" value={formatCurrency(net, currency, locale)} bold />
              <Row label="Savings rate" value={`${savingsRate}%`} bold />
              <Row label="Average daily spend" value={formatCurrency(avgPerDay, currency, locale)} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Biggest expenses</CardTitle>
          <CardDescription>Top 10 single transactions in this range</CardDescription>
        </CardHeader>
        <CardContent>
          {biggest.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses.</p>
          ) : (
            <div className="space-y-0.5">
              {biggest.map((t) => (
                <TransactionRow
                  key={t.id}
                  tx={t}
                  category={catById.get(t.category_id)}
                  currency={currency}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground py-4 print:block">
        <FileText className="h-3 w-3 inline-block mr-1" />
        Generated by Duddify · {new Date().toLocaleString(locale)}
      </div>
    </PageMotion>
  );
}

function Stat({
  label,
  value,
  currency,
  locale,
  accent,
  isPercent,
}: {
  label: string;
  value: number;
  currency?: string;
  locale?: string;
  accent: "primary" | "destructive" | "success" | "warning";
  isPercent?: boolean;
}) {
  const cls = {
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-success",
    warning: "text-warning",
  }[accent];
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-xl md:text-2xl font-semibold tabular-nums mt-0.5", cls)}>
        {isPercent ? `${value}%` : formatCurrency(value, currency, locale)}
      </div>
    </Card>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums mt-0.5 truncate">{value}</div>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between py-1.5 border-b last:border-0", bold && "font-semibold")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
