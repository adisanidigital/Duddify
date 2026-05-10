"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedCurrency, AnimatedNumber } from "@/components/motion";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  invertColors,
  currency = "INR",
  locale = "en-IN",
  hint,
  accent = "primary",
  isPercent = false,
}: {
  label: string;
  value: number;
  delta?: number;
  invertColors?: boolean;
  currency?: string;
  locale?: string;
  hint?: string;
  accent?: "primary" | "destructive" | "warning" | "success" | "muted";
  isPercent?: boolean;
}) {
  const positive = (delta ?? 0) >= 0;
  const goodDirection = invertColors ? !positive : positive;
  const accentClass = {
    primary: "text-primary",
    destructive: "text-destructive",
    warning: "text-warning",
    success: "text-success",
    muted: "text-muted-foreground",
  }[accent];
  const bgGlow = {
    primary: "from-primary/20 via-primary/5",
    destructive: "from-destructive/20 via-destructive/5",
    warning: "from-warning/20 via-warning/5",
    success: "from-success/20 via-success/5",
    muted: "from-muted/40 via-muted/10",
  }[accent];

  return (
    <Card className="relative overflow-hidden surface group">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent opacity-70 pointer-events-none",
          bgGlow
        )}
      />
      <div className="relative p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className={cn("text-2xl md:text-3xl font-semibold tabular-nums mt-1.5", accentClass)}>
          {isPercent ? (
            <AnimatedNumber value={value} suffix="%" />
          ) : (
            <AnimatedCurrency value={value} currency={currency} locale={locale} />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 min-h-[20px]">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center text-xs font-medium gap-0.5 rounded-full px-1.5 py-0.5",
                goodDirection
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive"
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </div>
    </Card>
  );
}
