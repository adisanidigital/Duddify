"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { MonthPicker } from "@/components/month-picker";
import { CategoryIcon } from "@/components/category-icon";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import { groupByCategory } from "@/lib/analytics";
import { cn, formatCurrency, isoDate, pct, startOfMonth, endOfMonth } from "@/lib/utils";

export default function BudgetsPage() {
  const [ref, setRef] = React.useState(() => startOfMonth(new Date()));
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

  return (
    <div className="container max-w-5xl py-4 md:py-8 space-y-5">
      <PageHeader
        title="Budgets"
        description="Set monthly limits per category"
        actions={<MonthPicker value={ref} onChange={setRef} locale={locale} />}
      />

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total budget</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">
            {formatCurrency(totalBudget, currency, locale)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Spent</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">
            {formatCurrency(totalSpent, currency, locale)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Remaining</div>
          <div
            className={cn(
              "text-2xl font-semibold tabular-nums mt-1",
              remaining >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {formatCurrency(remaining, currency, locale)}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By category</CardTitle>
          <CardDescription>
            Edit budgets in <a href="/categories" className="text-primary underline">Categories</a>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withBudget.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No budgets set yet. Go to Categories to assign monthly limits.
            </p>
          ) : (
            <div className="space-y-4">
              {withBudget.map((c) => {
                const spent = byCat.get(c.id)?.total ?? 0;
                const budget = Number(c.monthly_budget);
                const p = Math.min(120, pct(spent, budget));
                const over = spent > budget;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CategoryIcon name={c.icon} color={c.color} size={16} />
                        <span className="text-sm font-medium">{c.name}</span>
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
                          "h-full rounded-full transition-all",
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {without.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No budget set</CardTitle>
            <CardDescription>Categories without a monthly limit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {without.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs text-muted-foreground"
                >
                  <CategoryIcon name={c.icon} color={c.color} size={12} />
                  {c.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
