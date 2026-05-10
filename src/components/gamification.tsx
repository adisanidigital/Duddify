"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivateValue } from "@/components/private-value";
import { cn, formatCurrency } from "@/lib/utils";
import { Flame, Users } from "lucide-react";
import { loggingStreak, memberLeaderboard } from "@/lib/insights";
import type { Transaction } from "@/lib/types";

export function StreakChip({ txs }: { txs: Transaction[] }) {
  const streak = React.useMemo(() => loggingStreak(txs), [txs]);
  if (streak < 1) return null;
  // Bigger streaks → more glow. Cap at 30 for visual scaling.
  const intensity = Math.min(streak, 30) / 30;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-0.5 text-xs font-medium",
        "bg-orange-500/10 text-orange-500 border border-orange-500/20"
      )}
      style={{
        boxShadow: `0 0 ${4 + intensity * 12}px hsl(24 100% 50% / ${0.15 + intensity * 0.25})`,
      }}
      aria-label={`${streak} day logging streak`}
      title={`${streak}-day logging streak — keep it going!`}
    >
      <motion.span
        animate={{ rotate: [-3, 3, -3], scale: [1, 1.08, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="grid place-items-center"
      >
        <Flame className="h-3.5 w-3.5 fill-orange-500/30" />
      </motion.span>
      <span className="tabular-nums">{streak}-day streak</span>
    </motion.div>
  );
}

export function MemberContributions({
  txs,
  members,
  currency = "INR",
  locale = "en-IN",
}: {
  txs: Transaction[];
  members: { id: string; display_name: string | null; avatar_url?: string | null }[];
  currency?: string;
  locale?: string;
}) {
  const stats = React.useMemo(() => memberLeaderboard(txs, members), [txs, members]);
  if (members.length < 2) return null;
  const max = Math.max(1, ...stats.map((s) => s.spentPaid));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Users className="h-3.5 w-3.5" />
          </div>
          Per-member spending this month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {stats.map((s, idx) => {
          const w = (s.spentPaid / max) * 100;
          const initials = (s.name || "U").trim().slice(0, 1).toUpperCase();
          return (
            <div key={s.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="h-6 w-6 rounded-full grid place-items-center text-[11px] font-medium shrink-0 bg-muted text-muted-foreground">
                  {initials}
                </span>
                <span className="text-sm font-medium flex-1 truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {s.logged} log{s.logged === 1 ? "" : "s"}
                </span>
                <span className="text-sm font-semibold tabular-nums min-w-[80px] text-right">
                  <PrivateValue mask="••••">
                    {formatCurrency(s.spentPaid, currency, locale)}
                  </PrivateValue>
                </span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${w}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: idx * 0.08 }}
                  className={cn("h-full rounded-full bg-primary/60")}
                />
              </div>
            </div>
          );
        })}
        <div className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
          Bar = amount each person paid for shared expenses this month. Logs = transactions they entered.
        </div>
      </CardContent>
    </Card>
  );
}

/** Backwards-compat re-export. */
export const CouplesLeaderboard = MemberContributions;
