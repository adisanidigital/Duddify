"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { TransactionRow } from "@/components/transaction-row";
import { CategoryPie } from "@/components/charts";
import { useTransactions } from "@/lib/hooks/use-data";
import { useCategories } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import {
  deltaPct,
  groupByCategory,
  lastMonth,
  sumByType,
  thisMonth,
  topCategories,
} from "@/lib/analytics";
import { formatCurrency, isoDate, pct, startOfMonth } from "@/lib/utils";
import { ArrowRight, AlertTriangle, Plus, Users, Sparkles, Tag } from "lucide-react";
import { useHouseholdMembers } from "@/lib/hooks/use-household";
import { toast } from "sonner";

export default function OverviewPage() {
  const { data: hh } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();
  const { data: categories = [] } = useCategories();
  const yearStart = isoDate(new Date(new Date().getFullYear(), 0, 1));
  const { data: txs = [], isLoading } = useTransactions({ from: yearStart });

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  const cur = thisMonth(txs);
  const prev = lastMonth(txs);
  const curSums = sumByType(cur);
  const prevSums = sumByType(prev);

  const net = curSums.income - curSums.expense;
  const savingsRate = curSums.income ? Math.max(0, Math.round((net / curSums.income) * 100)) : 0;

  const topExpenses = topCategories(
    cur.filter((t) => t.type === "expense"),
    categories,
    5
  );

  const overBudget = React.useMemo(() => {
    const map = groupByCategory(
      cur.filter((t) => t.type === "expense"),
      categories
    );
    return map
      .filter(({ category, total }) => category.monthly_budget && total > Number(category.monthly_budget))
      .slice(0, 3);
  }, [cur, categories]);

  const recent = txs.slice(0, 6);
  const catById = new Map(categories.map((c) => [c.id, c] as const));

  const monthLabel = startOfMonth().toLocaleString(locale, { month: "long", year: "numeric" });

  const isFirstRun = txs.length === 0;
  const isAlone = members.length < 2;

  const copyHouseholdId = () => {
    if (!hh) return;
    navigator.clipboard.writeText(hh.id);
    toast.success("Household ID copied — share with your partner");
  };

  return (
    <div className="container max-w-6xl py-4 md:py-8 space-y-5">
      <PageHeader
        title={`${greeting()},`}
        description={`Here's your ${monthLabel} so far.`}
        actions={
          <Button asChild className="hidden md:inline-flex">
            <Link href="/add">
              <Plus /> Add transaction
            </Link>
          </Button>
        }
      />

      {isFirstRun && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Welcome to Duddify</div>
                <div className="text-sm text-muted-foreground">
                  3 quick steps to get the dashboards alive
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              <Step
                num={1}
                done={false}
                title="Log your first transaction"
                description="Tap the big + button at the bottom (or below). Try a recent expense."
                action={
                  <Button asChild size="sm">
                    <Link href="/add">
                      <Plus /> Add now
                    </Link>
                  </Button>
                }
              />
              <Step
                num={2}
                done={false}
                title="Set monthly budgets"
                description="Optional — gives you progress bars and over-budget alerts."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/categories">
                      <Tag className="h-4 w-4" /> Categories
                    </Link>
                  </Button>
                }
              />
              <Step
                num={3}
                done={!isAlone}
                title="Invite your partner"
                description={
                  isAlone
                    ? "Tap to copy your household ID, send it to them. They sign in → Join existing → paste."
                    : `${members.length} member${members.length > 1 ? "s" : ""} in this household.`
                }
                action={
                  isAlone ? (
                    <Button size="sm" variant="outline" onClick={copyHouseholdId}>
                      <Users className="h-4 w-4" /> Copy ID
                    </Button>
                  ) : null
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Spent"
          value={curSums.expense}
          delta={deltaPct(curSums.expense, prevSums.expense)}
          invertColors
          accent="destructive"
          currency={currency}
          locale={locale}
          hint="vs last month"
        />
        <KpiCard
          label="Income"
          value={curSums.income}
          delta={deltaPct(curSums.income, prevSums.income)}
          accent="success"
          currency={currency}
          locale={locale}
          hint="vs last month"
        />
        <KpiCard
          label="Invested"
          value={curSums.investment}
          delta={deltaPct(curSums.investment, prevSums.investment)}
          accent="primary"
          currency={currency}
          locale={locale}
          hint="vs last month"
        />
        <KpiCard
          label="Net saved"
          value={Math.max(0, net)}
          accent={net >= 0 ? "success" : "destructive"}
          currency={currency}
          locale={locale}
          hint={`${savingsRate}% rate`}
        />
      </div>

      {overBudget.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-sm">Over budget this month</div>
              <div className="text-xs text-muted-foreground mb-2">
                {overBudget.length} {overBudget.length === 1 ? "category is" : "categories are"} past their budget.
              </div>
              <div className="space-y-2">
                {overBudget.map(({ category, total }) => {
                  const budget = Number(category.monthly_budget);
                  return (
                    <div key={category.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{category.name}</span>
                        <span className="font-medium">
                          {formatCurrency(total, currency, locale)} /{" "}
                          {formatCurrency(budget, currency, locale)}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, pct(total, budget))}
                        indicatorClassName="bg-warning"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top expenses</CardTitle>
                <CardDescription>Where your money went this month</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/expenses">
                  Details <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses yet this month.</p>
            ) : (
              <div className="space-y-2.5">
                {topExpenses.map(({ category, total }) => {
                  const pctOfTotal = pct(total, curSums.expense);
                  return (
                    <div key={category.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{category.name}</span>
                        <span className="tabular-nums">
                          {formatCurrency(total, currency, locale)}{" "}
                          <span className="text-muted-foreground text-xs">({pctOfTotal}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pctOfTotal}%`, background: category.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
            <CardDescription>This month by category</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie
              data={topExpenses.map(({ category, total }) => ({
                name: category.name,
                value: total,
                color: category.color,
              }))}
              currency={currency}
              locale={locale}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest transactions across the household</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/transactions">
                See all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No transactions yet — tap <Link href="/add" className="text-primary underline">Add</Link> to get started.
            </div>
          ) : (
            <div className="space-y-0.5">
              {recent.map((t) => (
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
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Step({
  num,
  done,
  title,
  description,
  action,
}: {
  num: number;
  done: boolean;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border">
      <div
        className={
          "h-6 w-6 rounded-full grid place-items-center text-xs font-semibold shrink-0 " +
          (done ? "bg-success/20 text-success" : "bg-primary/20 text-primary")
        }
      >
        {done ? "✓" : num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      {action}
    </div>
  );
}
