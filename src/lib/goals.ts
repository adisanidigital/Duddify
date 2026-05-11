"use client";

/**
 * Local goals storage (per household, in this browser).
 *
 * Goals live in localStorage keyed by household_id so the same browser keeps
 * separate lists if the user joins multiple households later. Cross-device
 * sync would require a Supabase table — kept local for now to avoid schema
 * migrations.
 */

import type { Transaction } from "@/lib/types";

export type GoalHorizon = "short" | "medium" | "long";
export type Goal = {
  id: string;
  title: string;
  /** Target amount (positive number) */
  target: number;
  /** Optional starting balance already saved towards this goal */
  saved: number;
  /** ISO date (YYYY-MM-DD) — when the user wants to hit the target */
  deadline: string;
  horizon: GoalHorizon;
  notes?: string;
  createdAt: string;
  archived?: boolean;
};

const KEY = (householdId: string) => `duddify.goals.${householdId}`;

export function loadGoals(householdId: string | undefined | null): Goal[] {
  if (!householdId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY(householdId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Goal[];
    return Array.isArray(parsed) ? parsed.filter((g) => !g.archived) : [];
  } catch {
    return [];
  }
}

export function saveGoals(householdId: string, goals: Goal[]) {
  try {
    localStorage.setItem(KEY(householdId), JSON.stringify(goals));
  } catch {}
}

export function upsertGoal(householdId: string, goal: Goal): Goal[] {
  const cur = loadGoals(householdId);
  const idx = cur.findIndex((g) => g.id === goal.id);
  const next = idx >= 0 ? cur.map((g) => (g.id === goal.id ? goal : g)) : [goal, ...cur];
  saveGoals(householdId, next);
  return next;
}

export function deleteGoal(householdId: string, id: string): Goal[] {
  const next = loadGoals(householdId).filter((g) => g.id !== id);
  saveGoals(householdId, next);
  return next;
}

/* Helpers ----------------------------------------------------------------- */

export function monthsBetween(today: Date, deadline: Date): number {
  const ms = deadline.getTime() - today.getTime();
  return Math.max(0, ms / (30.44 * 86400000));
}

export function horizonOf(deadline: string): GoalHorizon {
  const months = monthsBetween(new Date(), new Date(deadline));
  if (months <= 12) return "short";
  if (months <= 36) return "medium";
  return "long";
}

export function avgMonthlyNetSavings(txs: Transaction[], lookbackMonths = 6): number {
  if (!txs.length) return 0;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - lookbackMonths + 1, 1);
  const startKey =
    start.getFullYear().toString() +
    "-" +
    String(start.getMonth() + 1).padStart(2, "0") +
    "-01";
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.occurred_on < startKey) continue;
    if (t.type === "income") income += Number(t.amount);
    else if (t.type === "expense") expense += Number(t.amount);
  }
  const months = Math.max(1, lookbackMonths);
  return (income - expense) / months;
}

export type GoalFeasibility = {
  monthsLeft: number;
  remaining: number;
  requiredPerMonth: number;
  feasibilityRatio: number; // 1 = exactly meets goal, <1 = falls short
  status: "on-track" | "tight" | "off-track" | "done";
};

export function computeFeasibility(
  goal: Goal,
  avgMonthlySavings: number,
  ref: Date = new Date()
): GoalFeasibility {
  const months = monthsBetween(ref, new Date(goal.deadline));
  const remaining = Math.max(0, goal.target - goal.saved);
  const requiredPerMonth = months > 0 ? remaining / months : remaining;
  const feasibility =
    requiredPerMonth === 0
      ? 1
      : avgMonthlySavings > 0
      ? avgMonthlySavings / requiredPerMonth
      : 0;
  const status: GoalFeasibility["status"] =
    remaining <= 0 ? "done" : feasibility >= 1 ? "on-track" : feasibility >= 0.6 ? "tight" : "off-track";
  return {
    monthsLeft: months,
    remaining,
    requiredPerMonth,
    feasibilityRatio: feasibility,
    status,
  };
}
