"use client";

/**
 * Financial context summariser for the AI chat.
 *
 * The chat sends a single SYSTEM message with this summary on every turn,
 * so the LLM has enough information to answer detailed questions about
 * the user's spending. We balance usefulness against privacy by tiering:
 *
 * Always sent:
 *   - currency code (e.g. INR)
 *   - aggregated totals per month (income / expense / investment)
 *   - this month / last month / YTD totals
 *   - category names + rolled-up amounts (last 6 months)
 *   - household member display names (so the AI knows "I" vs. "we")
 *   - the user's logging streak + savings rate
 *   - DETAIL: per-transaction (amount, date, category, type) for the
 *     last 90 days, capped at ~250 most recent transactions. This is
 *     what powers "tell me about my Cabs spending this month" type
 *     questions.
 *
 * Sent only when `includeNotes` is true:
 *   - the user-entered note for each transaction in the 90-day window.
 *     Off by default because notes commonly contain names of people /
 *     places that the user may not want sent to a third-party AI.
 *
 * Never sent:
 *   - Supabase IDs / receipt URLs / email addresses
 *   - paid-by / who-logged identifiers (only display names are passed
 *     via the household members list)
 */

import type { Category, Profile, Transaction } from "@/lib/types";
import {
  groupByCategory,
  groupByMonth,
  lastMonth,
  sumByType,
  thisMonth,
} from "@/lib/analytics";
import { loggingStreak } from "@/lib/insights";
import { isoDate } from "@/lib/utils";

export type ChatContext = {
  currency: string;
  text: string;
  /** True if individual notes were included in `text`. The UI uses this to
   *  surface the right privacy disclosure to the user. */
  notesIncluded: boolean;
};

export function buildChatContext({
  txs,
  categories,
  members,
  currency,
  householdName,
  includeNotes = false,
}: {
  txs: Transaction[];
  categories: Category[];
  members: Profile[];
  currency: string;
  householdName?: string | null;
  /** If true, also send transaction notes verbatim. Default false. */
  includeNotes?: boolean;
}): ChatContext {
  const catById = new Map(categories.map((c) => [c.id, c] as const));
  const cur = thisMonth(txs);
  const prev = lastMonth(txs);
  const curSum = sumByType(cur);
  const prevSum = sumByType(prev);

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const ytd = txs.filter((t) => t.occurred_on >= yearStart);
  const ytdSum = sumByType(ytd);

  // Trailing 6 months (calendar months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const sixKey = sixMonthsAgo.toISOString().slice(0, 10);
  const recent = txs.filter((t) => t.occurred_on >= sixKey);
  const recentByMonth = groupByMonth(recent);
  const recentByCat = groupByCategory(
    recent.filter((t) => t.type === "expense"),
    categories
  );

  // Use only display names — never emails — so the AI never sees PII.
  const memberNames = members
    .map((m) => m.display_name?.trim())
    .filter((n): n is string => !!n && n.length > 0);

  const streak = loggingStreak(txs);
  const net = curSum.income - curSum.expense;
  const savingsRate = curSum.income
    ? Math.max(0, Math.round((net / curSum.income) * 100))
    : 0;

  const fmt = (n: number) => `${currency} ${Math.round(n).toLocaleString("en-US")}`;

  const lines: string[] = [];
  lines.push(`The user has a shared household finance app called Duddify.`);
  if (householdName) lines.push(`Household: ${householdName}.`);
  if (memberNames.length > 0) {
    lines.push(
      `Household members (${memberNames.length}): ${memberNames.join(", ")}.`
    );
  }
  lines.push(`Currency: ${currency}.`);
  lines.push(`Logging streak: ${streak} consecutive days.`);

  lines.push("");
  lines.push("--- THIS MONTH ---");
  lines.push(`Income: ${fmt(curSum.income)}`);
  lines.push(`Expense: ${fmt(curSum.expense)}`);
  lines.push(`Investment: ${fmt(curSum.investment)}`);
  lines.push(`Net saved: ${fmt(net)} (${savingsRate}% savings rate)`);

  lines.push("");
  lines.push("--- LAST MONTH ---");
  lines.push(`Income: ${fmt(prevSum.income)}`);
  lines.push(`Expense: ${fmt(prevSum.expense)}`);
  lines.push(`Investment: ${fmt(prevSum.investment)}`);

  lines.push("");
  lines.push("--- YEAR TO DATE ---");
  lines.push(`Income: ${fmt(ytdSum.income)}`);
  lines.push(`Expense: ${fmt(ytdSum.expense)}`);
  lines.push(`Investment: ${fmt(ytdSum.investment)}`);

  if (recentByMonth.length > 0) {
    lines.push("");
    lines.push("--- MONTHLY TOTALS (last 6 months) ---");
    for (const m of recentByMonth) {
      lines.push(
        `${m.month}: income ${fmt(m.income)}, expense ${fmt(m.expense)}, invested ${fmt(m.investment)}`
      );
    }
  }

  const topCats = recentByCat.slice(0, 12);
  if (topCats.length > 0) {
    lines.push("");
    lines.push("--- TOP EXPENSE CATEGORIES (last 6 months) ---");
    for (const c of topCats) {
      const budgetNote = c.category.monthly_budget
        ? ` [monthly budget: ${fmt(Number(c.category.monthly_budget))}]`
        : "";
      lines.push(
        `${c.category.name}: ${fmt(c.total)} across ${c.count} transactions${budgetNote}`
      );
    }
  }

  // ---- DETAILED transaction list (last 90 days, capped) -------------------
  // This is what lets the AI answer questions like "how much did I spend on
  // Cabs and when?". We send: date, amount, type, category name, member,
  // and optionally the note (only when includeNotes is true).
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const detailFromKey = isoDate(ninetyDaysAgo);
  const memberById = new Map(members.map((m) => [m.id, m] as const));
  const detail = txs
    .filter((t) => t.occurred_on >= detailFromKey)
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    .slice(0, 250);
  if (detail.length > 0) {
    lines.push("");
    lines.push(`--- TRANSACTIONS (last 90 days, newest first, ${detail.length} shown) ---`);
    lines.push("Format: DATE | TYPE | AMOUNT | CATEGORY | LOGGED_BY[ | NOTE]");
    for (const t of detail) {
      const cat = catById.get(t.category_id);
      const adder = memberById.get(t.user_id);
      const noteStr =
        includeNotes && t.note?.trim()
          ? ` | ${t.note.trim().slice(0, 80)}`
          : "";
      lines.push(
        `${t.occurred_on} | ${t.type} | ${fmt(Number(t.amount))} | ${
          cat?.name ?? "Uncategorised"
        } | ${adder?.display_name ?? "?"}${noteStr}`
      );
    }
  }

  return { currency, text: lines.join("\n"), notesIncluded: includeNotes };
}

/** The system prompt that frames the assistant. */
export function chatSystemPrompt(ctx: ChatContext): string {
  return `You are Duddify's friendly personal-finance coach.

You are answering questions for the user about their own finances using ONLY the context below. The context contains:
  • Aggregated monthly / YTD / this-vs-last-month totals.
  • Top expense categories rolled up over the last 6 months.
  • A detailed list of individual transactions from the last 90 days
    (date, amount, type, category, logged-by, ${ctx.notesIncluded ? "note" : "no note"}).

What you can do:
  • Sum, filter, and compare amounts across any category, date range, or
    payer within the 90-day detail window.
  • Cite specific dates and amounts when asked. For example "you spent
    ₹450 on Cabs on 2026-05-09".
  • For older periods (more than 90 days ago) you only have monthly
    totals — say so when the user asks about specific older transactions.

Style:
  • Keep answers concise (2–4 short sentences for simple questions; use
    short bullet lists for breakdowns).
  • Use the user's currency code as-is — never convert.
  • Never invent numbers; only cite figures present in the context.
  • If a question can't be answered from the context, say so plainly and
    suggest what filter / time window would help.

USER CONTEXT (auto-generated, refreshed every chat turn):
${ctx.text}`;
}
