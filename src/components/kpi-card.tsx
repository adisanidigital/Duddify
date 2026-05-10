"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  invertColors,
  currency = "INR",
  locale = "en-IN",
  hint,
  accent = "primary",
}: {
  label: string;
  value: number;
  delta?: number; // percent change
  invertColors?: boolean; // for expense, lower-is-better
  currency?: string;
  locale?: string;
  hint?: string;
  accent?: "primary" | "destructive" | "warning" | "success" | "muted";
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
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-2xl md:text-3xl font-semibold tabular-nums mt-1", accentClass)}>
        {formatCurrency(value, currency, locale)}
      </div>
      <div className="flex items-center gap-2 mt-1 min-h-[20px]">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center text-xs font-medium",
              goodDirection ? "text-success" : "text-destructive"
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </Card>
  );
}
