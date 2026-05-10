/**
 * Local-only insights / smart computations. No LLM, no server — just stats.
 * Pure functions so they're easy to memoize from React.
 */

import type { Category, Transaction } from "@/lib/types";
import { isoDate, monthKey, startOfMonth } from "@/lib/utils";

/* --------------------------------------------------------------------------
 * Anomaly detection
 *
 * For each expense category, compute the mean monthly *per-transaction* amount
 * over the trailing 6 months. Flag any single transaction in the current month
 * that is more than 2σ above that category's history (and at least 1.5× the
 * mean — to avoid flagging tiny categories where σ is noise).
 * -------------------------------------------------------------------------- */
export type Anomaly = {
  txId: string;
  categoryId: string;
  amount: number;
  expectedMax: number;
  multiple: number; // amount / mean
  reason: string;
};

export function detectAnomalies(
  txs: Transaction[],
  ref: Date = new Date()
): Anomaly[] {
  const sixMonthsAgo = new Date(ref.getFullYear(), ref.getMonth() - 6, 1);
  const start = startOfMonth(ref);
  const startKey = isoDate(start);
  const histKey = isoDate(sixMonthsAgo);

  // Bucket expense amounts by category (last 6 months, excluding current month)
  const hist = new Map<string, number[]>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    if (t.occurred_on < histKey) continue;
    if (t.occurred_on >= startKey) continue;
    const arr = hist.get(t.category_id) ?? [];
    arr.push(Number(t.amount));
    hist.set(t.category_id, arr);
  }

  const anomalies: Anomaly[] = [];
  const current = txs.filter(
    (t) => t.type === "expense" && t.occurred_on >= startKey
  );
  for (const t of current) {
    const arr = hist.get(t.category_id);
    if (!arr || arr.length < 4) continue; // need decent history
    const n = arr.length;
    const mean = arr.reduce((s, v) => s + v, 0) / n;
    const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);
    const expectedMax = mean + 2 * sd;
    const amount = Number(t.amount);
    if (amount > expectedMax && amount > mean * 1.5) {
      anomalies.push({
        txId: t.id,
        categoryId: t.category_id,
        amount,
        expectedMax,
        multiple: mean > 0 ? amount / mean : 0,
        reason: `${(amount / Math.max(mean, 1)).toFixed(1)}× your usual`,
      });
    }
  }
  return anomalies.sort((a, b) => b.multiple - a.multiple);
}

/* --------------------------------------------------------------------------
 * Spend forecast — straight-line projection for the current month
 * -------------------------------------------------------------------------- */
export function spendForecast(
  txs: Transaction[],
  ref: Date = new Date()
): {
  spentSoFar: number;
  projected: number;
  daysElapsed: number;
  daysInMonth: number;
  perDayPace: number;
  perDayLastMonth: number;
  paceVsLastMonth: number; // -100..+inf
} {
  const start = startOfMonth(ref);
  const startKey = isoDate(start);
  const today = isoDate(ref);
  const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.max(1, ref.getDate());

  const spentSoFar = txs
    .filter((t) => t.type === "expense" && t.occurred_on >= startKey && t.occurred_on <= today)
    .reduce((s, t) => s + Number(t.amount), 0);

  const perDayPace = spentSoFar / daysElapsed;
  const projected = perDayPace * daysInMonth;

  // Same-window last month for fair comparison
  const lastMonthStart = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const lastMonthSameDay = new Date(
    lastMonthStart.getFullYear(),
    lastMonthStart.getMonth(),
    Math.min(daysElapsed, new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth() + 1, 0).getDate())
  );
  const lmStartKey = isoDate(lastMonthStart);
  const lmEndKey = isoDate(lastMonthSameDay);
  const lmSpent = txs
    .filter((t) => t.type === "expense" && t.occurred_on >= lmStartKey && t.occurred_on <= lmEndKey)
    .reduce((s, t) => s + Number(t.amount), 0);
  const perDayLastMonth = lmSpent / daysElapsed;
  const paceVsLastMonth =
    perDayLastMonth > 0
      ? Math.round(((perDayPace - perDayLastMonth) / perDayLastMonth) * 100)
      : 0;

  return {
    spentSoFar,
    projected,
    daysElapsed,
    daysInMonth,
    perDayPace,
    perDayLastMonth,
    paceVsLastMonth,
  };
}

/* --------------------------------------------------------------------------
 * Weekly summary — last 7 days vs the 7 days before that
 * -------------------------------------------------------------------------- */
export function weeklySummary(
  txs: Transaction[],
  categories: Category[],
  ref: Date = new Date()
) {
  const today = new Date(ref);
  const dayAgo = (d: number) => isoDate(new Date(today.getTime() - d * 86400000));
  const last7Start = dayAgo(7);
  const last7End = isoDate(today);
  const prev7Start = dayAgo(14);
  const prev7End = dayAgo(8);

  const inWindow = (start: string, end: string) =>
    txs.filter((t) => t.occurred_on >= start && t.occurred_on <= end);

  const last = inWindow(last7Start, last7End);
  const prev = inWindow(prev7Start, prev7End);

  const sumExpense = (arr: Transaction[]) =>
    arr.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const lastSpent = sumExpense(last);
  const prevSpent = sumExpense(prev);
  const delta =
    prevSpent > 0 ? Math.round(((lastSpent - prevSpent) / prevSpent) * 100) : 0;

  // Top movers — categories with biggest delta vs prior week
  const catMap = new Map(categories.map((c) => [c.id, c] as const));
  const buckets = new Map<string, { last: number; prev: number }>();
  for (const t of last) {
    if (t.type !== "expense") continue;
    const b = buckets.get(t.category_id) ?? { last: 0, prev: 0 };
    b.last += Number(t.amount);
    buckets.set(t.category_id, b);
  }
  for (const t of prev) {
    if (t.type !== "expense") continue;
    const b = buckets.get(t.category_id) ?? { last: 0, prev: 0 };
    b.prev += Number(t.amount);
    buckets.set(t.category_id, b);
  }
  const movers = [...buckets.entries()]
    .map(([id, v]) => ({
      category: catMap.get(id),
      last: v.last,
      prev: v.prev,
      delta: v.last - v.prev,
    }))
    .filter((m) => m.category)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  return { lastSpent, prevSpent, delta, movers, txCount: last.length };
}

/* --------------------------------------------------------------------------
 * Subscriptions detector
 *
 * Flag any (categoryId × roundedAmount) pair that has occurred in 3+ of the
 * last 4 calendar months — these are almost certainly recurring charges.
 * -------------------------------------------------------------------------- */
export type Subscription = {
  key: string;
  categoryId: string;
  amount: number;
  monthsSeen: string[];
  exampleNote: string | null;
  monthlyEstimate: number;
};

export function detectSubscriptions(
  txs: Transaction[],
  ref: Date = new Date()
): Subscription[] {
  const fourMonthsAgo = new Date(ref.getFullYear(), ref.getMonth() - 3, 1);
  const cutoff = isoDate(fourMonthsAgo);

  // Round amount to nearest 10 to group "₹499 / ₹501" together; index by category + bucket
  const groups = new Map<
    string,
    { categoryId: string; amount: number; months: Set<string>; note: string | null }
  >();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    if (t.occurred_on < cutoff) continue;
    const amt = Number(t.amount);
    const bucket = Math.round(amt / 10) * 10;
    const k = `${t.category_id}::${bucket}`;
    const cur =
      groups.get(k) ??
      { categoryId: t.category_id, amount: bucket, months: new Set<string>(), note: t.note };
    cur.months.add(monthKey(new Date(t.occurred_on)));
    if (!cur.note && t.note) cur.note = t.note;
    groups.set(k, cur);
  }

  return [...groups.entries()]
    .filter(([, v]) => v.months.size >= 3)
    .map(([k, v]) => ({
      key: k,
      categoryId: v.categoryId,
      amount: v.amount,
      monthsSeen: [...v.months].sort(),
      exampleNote: v.note,
      monthlyEstimate: v.amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/* --------------------------------------------------------------------------
 * Biggest leaks — categories with largest YoY (or vs same month last year) jump
 * -------------------------------------------------------------------------- */
export function biggestLeaks(
  txs: Transaction[],
  categories: Category[],
  ref: Date = new Date()
) {
  const lastYearStart = new Date(ref.getFullYear() - 1, ref.getMonth(), 1);
  const lastYearEnd = new Date(ref.getFullYear() - 1, ref.getMonth() + 1, 0);
  const thisStart = startOfMonth(ref);
  const thisEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);

  const sum = (start: Date, end: Date) => {
    const s = isoDate(start);
    const e = isoDate(end);
    const out = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense") continue;
      if (t.occurred_on < s || t.occurred_on > e) continue;
      out.set(t.category_id, (out.get(t.category_id) ?? 0) + Number(t.amount));
    }
    return out;
  };

  const ly = sum(lastYearStart, lastYearEnd);
  const th = sum(thisStart, thisEnd);
  const catMap = new Map(categories.map((c) => [c.id, c] as const));
  const rows: { category: Category; thisYear: number; lastYear: number; delta: number; pct: number }[] = [];
  for (const [id, val] of th) {
    const c = catMap.get(id);
    if (!c) continue;
    const prev = ly.get(id) ?? 0;
    if (prev === 0) continue; // need a baseline to call it a "leak"
    rows.push({
      category: c,
      thisYear: val,
      lastYear: prev,
      delta: val - prev,
      pct: Math.round(((val - prev) / prev) * 100),
    });
  }
  return rows
    .filter((r) => r.delta > 0 && r.pct >= 25)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
}

/* --------------------------------------------------------------------------
 * Smart category suggestion — pick the most-used category for an expense type
 * whose history contains a token that overlaps with the typed note (case-folded).
 * -------------------------------------------------------------------------- */
export function suggestCategory(
  note: string,
  type: Transaction["type"],
  txs: Transaction[],
  categories: Category[]
): string | null {
  const tokens = note
    .toLowerCase()
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;
  const eligible = categories.filter((c) => c.type === type);
  if (eligible.length === 0) return null;

  const scores = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type) continue;
    if (!t.note) continue;
    const hay = t.note.toLowerCase();
    let hit = 0;
    for (const tok of tokens) if (hay.includes(tok)) hit++;
    if (hit === 0) continue;
    scores.set(t.category_id, (scores.get(t.category_id) ?? 0) + hit);
  }
  if (scores.size === 0) return null;
  const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return eligible.some((c) => c.id === best) ? best : null;
}

/* --------------------------------------------------------------------------
 * Streak — number of consecutive days (counting back from today) that have at
 * least one transaction logged.
 * -------------------------------------------------------------------------- */
export function loggingStreak(txs: Transaction[], ref: Date = new Date()): number {
  const days = new Set(txs.map((t) => t.occurred_on));
  let streak = 0;
  const cur = new Date(ref);
  while (days.has(isoDate(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

/* --------------------------------------------------------------------------
 * Per-member contribution leaderboard for current month.
 * Counts: expense amount paid, count of transactions logged.
 * -------------------------------------------------------------------------- */
export function memberLeaderboard(
  txs: Transaction[],
  members: { id: string; display_name: string | null }[],
  ref: Date = new Date()
) {
  const start = isoDate(startOfMonth(ref));
  const stats = new Map<
    string,
    { id: string; name: string; spentPaid: number; logged: number; income: number; invested: number }
  >();
  for (const m of members) {
    stats.set(m.id, {
      id: m.id,
      name: m.display_name ?? "Member",
      spentPaid: 0,
      logged: 0,
      income: 0,
      invested: 0,
    });
  }
  for (const t of txs) {
    if (t.occurred_on < start) continue;
    const logger = stats.get(t.user_id);
    if (logger) logger.logged += 1;
    if (t.type === "expense" && t.paid_by) {
      const payer = stats.get(t.paid_by);
      if (payer) payer.spentPaid += Number(t.amount);
    }
    if (t.type === "income" && t.user_id) {
      const u = stats.get(t.user_id);
      if (u) u.income += Number(t.amount);
    }
    if (t.type === "investment" && t.user_id) {
      const u = stats.get(t.user_id);
      if (u) u.invested += Number(t.amount);
    }
  }
  return [...stats.values()].sort((a, b) => b.spentPaid - a.spentPaid);
}

/* --------------------------------------------------------------------------
 * XIRR — annualized return given a list of (date, amount) cash flows where
 * positive = cash in (current value), negative = invested.
 * Uses Newton-Raphson with bisection fallback. Returns 0 on failure.
 * -------------------------------------------------------------------------- */
export function xirr(
  flows: { date: Date; amount: number }[],
  guess: number = 0.1
): number {
  if (flows.length < 2) return 0;
  const t0 = flows[0].date.getTime();
  const ts = flows.map((f) => (f.date.getTime() - t0) / (365 * 86400000));
  const npv = (r: number) =>
    flows.reduce((s, f, i) => s + f.amount / Math.pow(1 + r, ts[i]), 0);
  const dnpv = (r: number) =>
    flows.reduce(
      (s, f, i) => s - (ts[i] * f.amount) / Math.pow(1 + r, ts[i] + 1),
      0
    );
  let r = guess;
  for (let i = 0; i < 60; i++) {
    const f = npv(r);
    const d = dnpv(r);
    if (!isFinite(f) || !isFinite(d) || d === 0) break;
    const next = r - f / d;
    if (Math.abs(next - r) < 1e-7) return next;
    r = next;
    if (r <= -0.999) r = -0.99;
  }
  // Bisection fallback
  let lo = -0.99;
  let hi = 10;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1) return mid;
    if (v > 0) lo = mid;
    else hi = mid;
  }
  return 0;
}
