"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CategoryPie, TrendArea, MonthBars } from "@/components/charts";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import {
  groupByCategory,
  groupByMonth,
  groupByMonthAndCategory,
} from "@/lib/analytics";
import { formatCurrency, isoDate, pct, cn } from "@/lib/utils";
import { PageMotion } from "@/components/motion";

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
  const monthStack = React.useMemo(
    () => groupByMonthAndCategory(income, categories),
    [income, categories]
  );
  const [trendView, setTrendView] = React.useState<"total" | "split">("split");

  const ytd = income
    .filter((t) => t.occurred_on >= isoDate(new Date(new Date().getFullYear(), 0, 1)))
    .reduce((s, t) => s + Number(t.amount), 0);

  const avgMonth = monthly.length ? monthly.reduce((s, m) => s + m.income, 0) / monthly.length : 0;

  return (
    <PageMotion className="container max-w-6xl py-4 md:py-8 space-y-5">
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
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Income trend</CardTitle>
                <CardDescription>Last 12 months</CardDescription>
              </div>
              <div className="inline-flex rounded-lg border bg-card p-0.5">
                <button
                  type="button"
                  onClick={() => setTrendView("split")}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md transition-all",
                    trendView === "split"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={trendView === "split"}
                >
                  By source
                </button>
                <button
                  type="button"
                  onClick={() => setTrendView("total")}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md transition-all",
                    trendView === "total"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={trendView === "total"}
                >
                  Total
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendView === "split" && monthStack.series.length > 0 ? (
              <>
                <MonthBars
                  data={monthStack.rows}
                  series={monthStack.series}
                  currency={currency}
                  locale={locale}
                  height={240}
                  stacked
                  showLegend={false}
                />
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                  {monthStack.series.map((s) => (
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
              <TrendArea
                data={monthly}
                dataKey="income"
                name="Income"
                color="hsl(var(--success))"
                currency={currency}
                locale={locale}
                height={240}
              />
            )}
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
    </PageMotion>
  );
}
