import type { Category, Transaction, TxType } from "@/lib/types";
import { isoDate, monthKey, startOfMonth, endOfMonth } from "@/lib/utils";

export function sumByType(txs: Transaction[]): Record<TxType, number> {
  const out: Record<TxType, number> = { expense: 0, income: 0, investment: 0, transfer: 0 };
  for (const t of txs) out[t.type] += Number(t.amount);
  return out;
}

export function inRange(txs: Transaction[], from: Date, to: Date) {
  const fromS = isoDate(from);
  const toS = isoDate(to);
  return txs.filter((t) => t.occurred_on >= fromS && t.occurred_on <= toS);
}

export function thisMonth(txs: Transaction[], ref: Date = new Date()) {
  return inRange(txs, startOfMonth(ref), endOfMonth(ref));
}

export function lastMonth(txs: Transaction[], ref: Date = new Date()) {
  const prev = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  return inRange(txs, startOfMonth(prev), endOfMonth(prev));
}

export function groupByCategory(txs: Transaction[], categories: Category[]) {
  const map = new Map<string, { category: Category; total: number; count: number }>();
  const catById = new Map(categories.map((c) => [c.id, c] as const));
  for (const t of txs) {
    const c = catById.get(t.category_id);
    if (!c) continue;
    const cur = map.get(c.id) ?? { category: c, total: 0, count: 0 };
    cur.total += Number(t.amount);
    cur.count += 1;
    map.set(c.id, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function groupByDay(txs: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of txs) map.set(t.occurred_on, (map.get(t.occurred_on) ?? 0) + Number(t.amount));
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total }));
}

/**
 * Pivot transactions into a per-day-per-category table suitable for a
 * stacked bar chart. Returns:
 *   - rows: array of { date: "YYYY-MM-DD", [categoryId]: amount, ... }
 *           one row per day in the input txs (only days with activity)
 *   - series: { key: categoryId, name, color } sorted so the BIGGEST
 *             contributors stack at the bottom (visually most stable),
 *             everything else collapsed into an "Other" stack if it
 *             gets too crowded (>maxSeries categories).
 */
export function groupByDayAndCategory(
  txs: Transaction[],
  categories: Category[],
  opts: { maxSeries?: number } = {}
) {
  const { maxSeries = 8 } = opts;
  const catById = new Map(categories.map((c) => [c.id, c] as const));

  // First pass: total per category to pick the top N
  const catTotals = new Map<string, number>();
  for (const t of txs) {
    if (!catById.has(t.category_id)) continue;
    catTotals.set(t.category_id, (catTotals.get(t.category_id) ?? 0) + Number(t.amount));
  }
  const sorted = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
  const top = new Set(sorted.slice(0, maxSeries).map(([id]) => id));
  const hasOther = sorted.length > maxSeries;

  // Second pass: pivot
  const dayMap = new Map<string, Record<string, number | string>>();
  for (const t of txs) {
    const day = t.occurred_on;
    const row = dayMap.get(day) ?? { date: day };
    const key = top.has(t.category_id) ? t.category_id : "__other";
    row[key] = (Number(row[key]) || 0) + Number(t.amount);
    dayMap.set(day, row);
  }
  const rows = [...dayMap.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  // Build series in stacking order: biggest at the bottom looks best.
  const series: { key: string; name: string; color: string }[] = [];
  for (const [id] of sorted) {
    if (!top.has(id)) continue;
    const c = catById.get(id)!;
    series.push({ key: id, name: c.name, color: c.color });
  }
  if (hasOther) {
    series.push({ key: "__other", name: "Other", color: "hsl(var(--muted-foreground))" });
  }
  return { rows, series };
}

/**
 * Pivot transactions into per-MONTH-per-category for a stacked monthly
 * bar chart (used on the Income and Expense pages).
 */
export function groupByMonthAndCategory(
  txs: Transaction[],
  categories: Category[],
  opts: { maxSeries?: number } = {}
) {
  const { maxSeries = 8 } = opts;
  const catById = new Map(categories.map((c) => [c.id, c] as const));

  const catTotals = new Map<string, number>();
  for (const t of txs) {
    if (!catById.has(t.category_id)) continue;
    catTotals.set(t.category_id, (catTotals.get(t.category_id) ?? 0) + Number(t.amount));
  }
  const sorted = [...catTotals.entries()].sort((a, b) => b[1] - a[1]);
  const top = new Set(sorted.slice(0, maxSeries).map(([id]) => id));
  const hasOther = sorted.length > maxSeries;

  const monthMap = new Map<string, Record<string, number | string>>();
  for (const t of txs) {
    const key = monthKey(new Date(t.occurred_on));
    const row = monthMap.get(key) ?? { month: key };
    const k = top.has(t.category_id) ? t.category_id : "__other";
    row[k] = (Number(row[k]) || 0) + Number(t.amount);
    monthMap.set(key, row);
  }
  const rows = [...monthMap.values()].sort((a, b) =>
    String(a.month).localeCompare(String(b.month))
  );

  const series: { key: string; name: string; color: string }[] = [];
  for (const [id] of sorted) {
    if (!top.has(id)) continue;
    const c = catById.get(id)!;
    series.push({ key: id, name: c.name, color: c.color });
  }
  if (hasOther) {
    series.push({ key: "__other", name: "Other", color: "hsl(var(--muted-foreground))" });
  }
  return { rows, series };
}

export function groupByMonth(txs: Transaction[]) {
  const map = new Map<string, Record<TxType, number>>();
  for (const t of txs) {
    const key = monthKey(new Date(t.occurred_on));
    const cur = map.get(key) ?? { expense: 0, income: 0, investment: 0, transfer: 0 };
    cur[t.type] += Number(t.amount);
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => ({ month, ...totals, net: totals.income - totals.expense }));
}

export function topCategories(txs: Transaction[], categories: Category[], n: number = 5) {
  return groupByCategory(txs, categories).slice(0, n);
}

export function biggestTransactions(txs: Transaction[], n: number = 5) {
  return [...txs].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, n);
}

export function dailyHeatmap(txs: Transaction[], ref: Date = new Date()) {
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  const days: { date: string; total: number; day: number }[] = [];
  const map = new Map<string, number>();
  for (const t of txs) map.set(t.occurred_on, (map.get(t.occurred_on) ?? 0) + Number(t.amount));
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = isoDate(d);
    days.push({ date: k, total: map.get(k) ?? 0, day: d.getDate() });
  }
  return days;
}

export function deltaPct(curr: number, prev: number) {
  if (!prev) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

export function whoOwesWhom(
  txs: Transaction[],
  members: { id: string; display_name: string | null }[]
) {
  // Treat expenses as shared 50/50; sum what each paid minus their share.
  const balances = new Map<string, number>();
  for (const m of members) balances.set(m.id, 0);
  const expenses = txs.filter((t) => t.type === "expense" && t.paid_by);
  if (members.length < 2) return { balances, settle: [] as { from: string; to: string; amount: number }[] };
  const share = 1 / members.length;
  for (const t of expenses) {
    const amt = Number(t.amount);
    balances.set(t.paid_by!, (balances.get(t.paid_by!) ?? 0) + amt);
    for (const m of members) balances.set(m.id, (balances.get(m.id) ?? 0) - amt * share);
  }
  // Compute settlements
  const arr = [...balances.entries()].map(([id, v]) => ({ id, v: Math.round(v) }));
  const debtors = arr.filter((a) => a.v < 0).sort((a, b) => a.v - b.v);
  const creditors = arr.filter((a) => a.v > 0).sort((a, b) => b.v - a.v);
  const settle: { from: string; to: string; amount: number }[] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amount = Math.min(-d.v, c.v);
    if (amount > 0) settle.push({ from: d.id, to: c.id, amount });
    d.v += amount;
    c.v -= amount;
    if (d.v === 0) i++;
    if (c.v === 0) j++;
  }
  return { balances, settle };
}
