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
import { CategoryIcon } from "@/components/category-icon";
import { PrivateValue } from "@/components/private-value";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Sparkles,
  Repeat,
  AlertTriangle,
  TrendingDown,
  Lightbulb,
} from "lucide-react";
import {
  detectAnomalies,
  detectSubscriptions,
  spendForecast,
  weeklySummary,
  biggestLeaks,
  type Anomaly,
} from "@/lib/insights";
import type { Category, Transaction } from "@/lib/types";

type Insight =
  | { kind: "forecast"; data: ReturnType<typeof spendForecast>; budget: number | null }
  | { kind: "weekly"; data: ReturnType<typeof weeklySummary> }
  | { kind: "anomalies"; data: Anomaly[]; catById: Map<string, Category>; txById: Map<string, Transaction> }
  | { kind: "leaks"; data: ReturnType<typeof biggestLeaks> }
  | { kind: "subs"; data: ReturnType<typeof detectSubscriptions>; catById: Map<string, Category> };

export function InsightsCarousel({
  txs,
  categories,
  currency = "INR",
  locale = "en-IN",
  monthlyBudgetTotal,
}: {
  txs: Transaction[];
  categories: Category[];
  currency?: string;
  locale?: string;
  /** Sum of all per-category monthly budgets (optional). */
  monthlyBudgetTotal?: number | null;
}) {
  const insights = React.useMemo<Insight[]>(() => {
    const catById = new Map(categories.map((c) => [c.id, c] as const));
    const txById = new Map(txs.map((t) => [t.id, t] as const));
    const arr: Insight[] = [];
    const forecast = spendForecast(txs);
    if (forecast.spentSoFar > 0) arr.push({ kind: "forecast", data: forecast, budget: monthlyBudgetTotal ?? null });
    const weekly = weeklySummary(txs, categories);
    if (weekly.txCount > 0) arr.push({ kind: "weekly", data: weekly });
    const anomalies = detectAnomalies(txs);
    if (anomalies.length > 0) arr.push({ kind: "anomalies", data: anomalies, catById, txById });
    const leaks = biggestLeaks(txs, categories);
    if (leaks.length > 0) arr.push({ kind: "leaks", data: leaks });
    const subs = detectSubscriptions(txs);
    if (subs.length > 0) arr.push({ kind: "subs", data: subs, catById });
    return arr;
  }, [txs, categories, monthlyBudgetTotal]);

  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    if (idx >= insights.length) setIdx(0);
  }, [insights.length, idx]);

  if (insights.length === 0) return null;
  const cur = insights[idx];

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <CardTitle className="text-sm">Insights</CardTitle>
              <CardDescription className="text-xs">
                Personalised, calculated from your activity
              </CardDescription>
            </div>
          </div>
          {insights.length > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIdx((i) => (i - 1 + insights.length) % insights.length)}
                aria-label="Previous insight"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-center">
                {idx + 1}/{insights.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIdx((i) => (i + 1) % insights.length)}
                aria-label="Next insight"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative min-h-[100px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={cur.kind + idx}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {cur.kind === "forecast" && (
                <ForecastInsight insight={cur.data} budget={cur.budget} currency={currency} locale={locale} />
              )}
              {cur.kind === "weekly" && (
                <WeeklyInsight insight={cur.data} currency={currency} locale={locale} />
              )}
              {cur.kind === "anomalies" && (
                <AnomaliesInsight
                  data={cur.data}
                  catById={cur.catById}
                  txById={cur.txById}
                  currency={currency}
                  locale={locale}
                />
              )}
              {cur.kind === "leaks" && (
                <LeaksInsight data={cur.data} currency={currency} locale={locale} />
              )}
              {cur.kind === "subs" && (
                <SubsInsight data={cur.data} catById={cur.catById} currency={currency} locale={locale} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {insights.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {insights.map((_, i) => (
              <button
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                )}
                onClick={() => setIdx(i)}
                aria-label={`Insight ${i + 1}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ForecastInsight({
  insight,
  budget,
  currency,
  locale,
}: {
  insight: ReturnType<typeof spendForecast>;
  budget: number | null;
  currency: string;
  locale: string;
}) {
  const overBudget = budget && insight.projected > budget;
  const arrow = insight.paceVsLastMonth >= 0 ? ArrowUpRight : ArrowDownRight;
  const Arrow = arrow;
  const paceBad = insight.paceVsLastMonth > 0;
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
        <CalendarClock className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Spend forecast
        </div>
        <div className="mt-0.5 text-sm">
          At this pace you&apos;ll spend{" "}
          <span className={cn("font-semibold", overBudget ? "text-destructive" : "text-foreground")}>
            <PrivateValue mask="••••">
              {formatCurrency(insight.projected, currency, locale)}
            </PrivateValue>
          </span>{" "}
          by month-end
          {budget ? (
            <>
              {" — "}
              {overBudget
                ? <>that&apos;s <span className="text-destructive font-medium">{formatCurrency(insight.projected - budget, currency, locale)} over</span> your <PrivateValue mask="•••">{formatCurrency(budget, currency, locale)}</PrivateValue> budget.</>
                : <>well within your <PrivateValue mask="•••">{formatCurrency(budget, currency, locale)}</PrivateValue> budget.</>}
            </>
          ) : "."}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="tabular-nums">
            <PrivateValue mask="•••">{formatCurrency(insight.spentSoFar, currency, locale)}</PrivateValue>
            {" "}so far · day {insight.daysElapsed}/{insight.daysInMonth}
          </span>
          {insight.perDayLastMonth > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                paceBad ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
              )}
            >
              <Arrow className="h-3 w-3" />
              {Math.abs(insight.paceVsLastMonth)}% vs last month
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function WeeklyInsight({
  insight,
  currency,
  locale,
}: {
  insight: ReturnType<typeof weeklySummary>;
  currency: string;
  locale: string;
}) {
  const goodDir = insight.delta < 0;
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Last 7 days
        </div>
        <div className="mt-0.5 text-sm">
          You spent{" "}
          <span className="font-semibold">
            <PrivateValue mask="••••">{formatCurrency(insight.lastSpent, currency, locale)}</PrivateValue>
          </span>
          {insight.prevSpent > 0 && (
            <>
              {" — "}
              <span className={cn("font-medium", goodDir ? "text-success" : "text-destructive")}>
                {insight.delta >= 0 ? "+" : ""}
                {insight.delta}%
              </span>{" "}
              vs the week before.
            </>
          )}
        </div>
        {insight.movers.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Biggest movers
            </div>
            {insight.movers.map((m) => {
              const up = m.delta > 0;
              return (
                <div key={m.category!.id} className="flex items-center gap-2 text-xs">
                  <CategoryIcon name={m.category!.icon} color={m.category!.color} size={12} />
                  <span className="flex-1 truncate">{m.category!.name}</span>
                  <span className={cn("tabular-nums font-medium", up ? "text-destructive" : "text-success")}>
                    {up ? "+" : ""}
                    <PrivateValue mask="•••">
                      {formatCurrency(m.delta, currency, locale)}
                    </PrivateValue>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AnomaliesInsight({
  data,
  catById,
  txById,
  currency,
  locale,
}: {
  data: Anomaly[];
  catById: Map<string, Category>;
  txById: Map<string, Transaction>;
  currency: string;
  locale: string;
}) {
  const top = data.slice(0, 3);
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-warning/15 text-warning grid place-items-center shrink-0">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Unusual transactions
        </div>
        <div className="mt-0.5 text-sm">
          {data.length} {data.length === 1 ? "transaction looks" : "transactions look"} bigger than your usual.
        </div>
        <div className="mt-2 space-y-1.5">
          {top.map((a) => {
            const c = catById.get(a.categoryId);
            const t = txById.get(a.txId);
            return (
              <div key={a.txId} className="flex items-center gap-2 text-xs">
                {c && <CategoryIcon name={c.icon} color={c.color} size={12} />}
                <span className="flex-1 truncate">
                  <span className="font-medium">{c?.name ?? "—"}</span>
                  {t?.note ? <span className="text-muted-foreground"> · {t.note}</span> : null}
                </span>
                <span className="tabular-nums font-medium">
                  <PrivateValue mask="•••">{formatCurrency(a.amount, currency, locale)}</PrivateValue>
                </span>
                <span className="text-[10px] bg-warning/15 text-warning rounded-full px-1.5 py-0.5 font-medium">
                  {a.reason}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LeaksInsight({
  data,
  currency,
  locale,
}: {
  data: ReturnType<typeof biggestLeaks>;
  currency: string;
  locale: string;
}) {
  const top = data.slice(0, 3);
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive grid place-items-center shrink-0">
        <TrendingDown className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Biggest leaks vs last year
        </div>
        <div className="mt-0.5 text-sm">
          These categories grew the most compared to the same month last year.
        </div>
        <div className="mt-2 space-y-1.5">
          {top.map((m) => (
            <div key={m.category.id} className="flex items-center gap-2 text-xs">
              <CategoryIcon name={m.category.icon} color={m.category.color} size={12} />
              <span className="flex-1 truncate font-medium">{m.category.name}</span>
              <span className="tabular-nums">
                <PrivateValue mask="•••">{formatCurrency(m.thisYear, currency, locale)}</PrivateValue>
              </span>
              <span className="text-[10px] bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 font-medium tabular-nums">
                +{m.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubsInsight({
  data,
  catById,
  currency,
  locale,
}: {
  data: ReturnType<typeof detectSubscriptions>;
  catById: Map<string, Category>;
  currency: string;
  locale: string;
}) {
  const total = data.reduce((s, x) => s + x.monthlyEstimate, 0);
  const top = data.slice(0, 4);
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
        <Repeat className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Subscriptions detected
        </div>
        <div className="mt-0.5 text-sm">
          About{" "}
          <span className="font-semibold">
            <PrivateValue mask="••••">{formatCurrency(total, currency, locale)}/mo</PrivateValue>
          </span>{" "}
          across {data.length} recurring charge{data.length === 1 ? "" : "s"}.
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1 ml-1">
            <Lightbulb className="h-3 w-3" /> Cancel one you don&apos;t use to save{" "}
            {data[0] && (
              <PrivateValue mask="•••">{formatCurrency(data[0].amount * 12, currency, locale)}</PrivateValue>
            )}/yr
          </span>
        </div>
        <div className="mt-2 space-y-1">
          {top.map((s) => {
            const c = catById.get(s.categoryId);
            return (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                {c && <CategoryIcon name={c.icon} color={c.color} size={12} />}
                <span className="flex-1 truncate">
                  <span className="font-medium">{c?.name ?? "—"}</span>
                  {s.exampleNote ? <span className="text-muted-foreground"> · {s.exampleNote}</span> : null}
                </span>
                <span className="tabular-nums font-medium">
                  <PrivateValue mask="•••">{formatCurrency(s.amount, currency, locale)}</PrivateValue>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {s.monthsSeen.length}m
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
