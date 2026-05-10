"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CategoryPie, TrendArea } from "@/components/charts";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import { groupByCategory, groupByMonth } from "@/lib/analytics";
import { formatCurrency, isoDate, pct } from "@/lib/utils";

export default function IncomePage() {
  const { data: hh } = useHousehold();
  const { data: categories = [] } = useCategories();
  const yearStart = isoDate(new Date(new Date().getFullYear() - 1, 0, 1));
  const { data: txs = [] } = useTransactions({ from: yearStart });

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  const income = txs.filter((t) => t.type === "income");
  const monthly = groupByMonth(income);
  const byCat = groupByCategory(income, categories);
  const total = income.reduce((s, t) => s + Number(t.amount), 0);

  const ytd = income
    .filter((t) => t.occurred_on >= isoDate(new Date(new Date().getFullYear(), 0, 1)))
    .reduce((s, t) => s + Number(t.amount), 0);

  const avgMonth = monthly.length ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length : 0;

  return (
    <div className="container max-w-6xl py-4 md:py-8 space-y-5">
      <PageHeader title="Income" description="What's coming in" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">YTD income</div>
          <div className="text-2xl font-semibold tabular-nums mt-1 text-success">
            {formatCurrency(ytd, currency, locale)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Avg / month</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">
            {formatCurrency(avgMonth, currency, locale)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Top source</div>
          <div className="text-2xl font-semibold mt-1 truncate">
            {byCat[0]?.category.name ?? "—"}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income trend</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={monthly}
              dataKey="income"
              name="Income"
              color="hsl(var(--success))"
              currency={currency}
              locale={locale}
              height={240}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By source</CardTitle>
            <CardDescription>Where it comes from</CardDescription>
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
              height={240}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sources</CardTitle>
          <CardDescription>{income.length} income entries</CardDescription>
        </CardHeader>
        <CardContent>
          {byCat.length === 0 ? (
            <p className="text-sm text-muted-foreground">No income logged yet.</p>
          ) : (
            <div className="space-y-3">
              {byCat.map(({ category, total: t, count }) => {
                const p = pct(t, total);
                return (
                  <div key={category.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
                        <span className="font-medium">{category.name}</span>
                        <span className="text-xs text-muted-foreground">· {count}</span>
                      </div>
                      <div className="tabular-nums">
                        {formatCurrency(t, currency, locale)}{" "}
                        <span className="text-xs text-muted-foreground">({p}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p}%`, background: category.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
