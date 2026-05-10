"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Card } from "@/components/ui/card";
import { AnimatedCurrency, AnimatedNumber } from "@/components/motion";
import { PrivateValue } from "@/components/private-value";
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

  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <Card className="relative overflow-hidden surface group h-full">
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent opacity-70 pointer-events-none transition-opacity duration-300 group-hover:opacity-100",
            bgGlow
          )}
        />
        {/* shimmer sweep on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] ease-out"
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, hsl(var(--foreground) / 0.06) 50%, transparent 70%)",
          }}
        />
        <div className="relative p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            <motion.span
              aria-hidden
              className={cn("h-1.5 w-1.5 rounded-full", `bg-current`, accentClass)}
              animate={
                reduce
                  ? undefined
                  : { opacity: [0.5, 1, 0.5], scale: [0.85, 1, 0.85] }
              }
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            {label}
          </div>
          <div
            className={cn(
              "text-2xl md:text-3xl font-semibold tabular-nums mt-1.5 transition-transform duration-300 group-hover:scale-[1.02] origin-left",
              accentClass
            )}
          >
            <PrivateValue mask="••••••">
              {isPercent ? (
                <AnimatedNumber value={value} suffix="%" />
              ) : (
                <AnimatedCurrency value={value} currency={currency} locale={locale} />
              )}
            </PrivateValue>
          </div>
          <div className="flex items-center gap-2 mt-1.5 min-h-[20px]">
            {delta !== undefined && (
              <motion.span
                key={delta}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 480, damping: 22 }}
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
              </motion.span>
            )}
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
