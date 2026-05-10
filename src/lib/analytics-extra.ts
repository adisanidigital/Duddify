import type { Transaction } from "@/lib/types";

export function groupByDayOfWeek(txs: Transaction[]) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (const t of txs) {
    const d = new Date(t.occurred_on).getDay();
    totals[d] += Number(t.amount);
    counts[d] += 1;
  }
  return labels.map((label, i) => ({
    day: label,
    total: totals[i],
    count: counts[i],
    avg: counts[i] ? totals[i] / counts[i] : 0,
  }));
}

export function groupByMember(
  txs: Transaction[],
  members: { id: string; display_name: string | null }[]
) {
  const map = new Map<string, { id: string; name: string; expense: number; income: number; investment: number; count: number }>();
  for (const m of members) {
    map.set(m.id, {
      id: m.id,
      name: m.display_name ?? "Member",
      expense: 0,
      income: 0,
      investment: 0,
      count: 0,
    });
  }
  for (const t of txs) {
    const key = t.paid_by ?? t.user_id;
    let row = map.get(key);
    if (!row) {
      row = { id: key, name: "Unknown", expense: 0, income: 0, investment: 0, count: 0 };
      map.set(key, row);
    }
    if (t.type === "expense") row.expense += Number(t.amount);
    if (t.type === "income") row.income += Number(t.amount);
    if (t.type === "investment") row.investment += Number(t.amount);
    row.count += 1;
  }
  return [...map.values()].sort((a, b) => b.expense - a.expense);
}

export function rangeDays(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}
