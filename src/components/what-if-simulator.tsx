"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/category-icon";
import { PrivateValue } from "@/components/private-value";
import { cn, formatCurrency } from "@/lib/utils";
import { TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { Category } from "@/lib/types";

/**
 * A live simulator: drag a slider on each category that has a budget to imagine
 * the savings if you spent X% of your current monthly amount, and see the
 * cumulative annual impact.
 */
export function WhatIfSimulator({
  rows,
  currency = "INR",
  locale = "en-IN",
}: {
  rows: { category: Category; spent: number }[];
  currency?: string;
  locale?: string;
}) {
  const eligible = React.useMemo(
    () => rows.filter((r) => r.spent > 0).slice(0, 6),
    [rows]
  );
  const [factors, setFactors] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    setFactors((prev) => {
      const next = { ...prev };
      for (const r of eligible) if (next[r.category.id] === undefined) next[r.category.id] = 100;
      return next;
    });
  }, [eligible]);

  const totals = React.useMemo(() => {
    let actual = 0;
    let simulated = 0;
    for (const r of eligible) {
      const f = (factors[r.category.id] ?? 100) / 100;
      actual += r.spent;
      simulated += r.spent * f;
    }
    const monthlySaved = actual - simulated;
    const yearlySaved = monthlySaved * 12;
    return { actual, simulated, monthlySaved, yearlySaved };
  }, [eligible, factors]);

  if (eligible.length === 0) return null;
  const positive = totals.monthlySaved > 0;
  const Icon = positive ? TrendingDown : TrendingUp;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Zap className="h-3.5 w-3.5" />
          </div>
          What-if simulator
        </CardTitle>
        <CardDescription className="text-xs">
          Slide to see how cutting (or growing) any category compounds across the year
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {/* Summary */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-accent/50 p-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              New monthly total
            </div>
            <div className="text-lg font-semibold tabular-nums">
              <PrivateValue mask="••••">
                {formatCurrency(totals.simulated, currency, locale)}
              </PrivateValue>
              <span className="text-xs text-muted-foreground font-normal">
                {" "}/ <PrivateValue mask="•••">{formatCurrency(totals.actual, currency, locale)}</PrivateValue> today
              </span>
            </div>
          </div>
          <motion.div
            key={Math.round(totals.yearlySaved)}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
              "text-right",
              positive ? "text-success" : "text-destructive"
            )}
          >
            <div className="text-[10px] uppercase tracking-wider font-medium opacity-80">
              {positive ? "Yearly savings" : "Yearly extra spend"}
            </div>
            <div className="text-lg font-semibold tabular-nums inline-flex items-center gap-1">
              <Icon className="h-4 w-4" />
              <PrivateValue mask="••••">
                {formatCurrency(Math.abs(totals.yearlySaved), currency, locale)}
              </PrivateValue>
            </div>
          </motion.div>
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          {eligible.map((r) => {
            const f = factors[r.category.id] ?? 100;
            const sim = r.spent * (f / 100);
            const diff = r.spent - sim;
            return (
              <div key={r.category.id}>
                <div className="flex items-center gap-2 mb-1">
                  <CategoryIcon name={r.category.icon} color={r.category.color} size={14} />
                  <span className="text-sm font-medium flex-1 truncate">{r.category.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    <PrivateValue mask="•••">{formatCurrency(sim, currency, locale)}</PrivateValue>
                    {" "}({f}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={150}
                  step={5}
                  value={f}
                  onChange={(e) =>
                    setFactors((p) => ({ ...p, [r.category.id]: Number(e.target.value) }))
                  }
                  className="w-full accent-primary"
                  aria-label={`${r.category.name} simulator`}
                  style={{
                    background: `linear-gradient(to right, ${r.category.color} 0%, ${r.category.color} ${(f / 150) * 100}%, hsl(var(--secondary)) ${(f / 150) * 100}%, hsl(var(--secondary)) 100%)`,
                    height: 6,
                    borderRadius: 9999,
                    appearance: "none",
                    WebkitAppearance: "none",
                  }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>0%</span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : ""
                    )}
                  >
                    {diff > 0 ? "−" : diff < 0 ? "+" : ""}
                    <PrivateValue mask="•••">
                      {formatCurrency(Math.abs(diff), currency, locale)}
                    </PrivateValue>
                    /mo
                  </span>
                  <span>150%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
