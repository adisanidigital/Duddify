"use client";

/**
 * Privacy-safe financial context summariser for the AI chat.
 *
 * The chat sends a single SYSTEM message with this summary on every turn,
 * so the LLM has enough information to answer "how much did I spend on
 * groceries last month?" etc. without us ever leaking raw transactions,
 * member names, notes, or any free-form user-entered strings.
 *
 * What we DO send:
 *   - currency code (e.g. INR)
 *   - aggregated totals per month (income / expense / investment)
 *   - this month / last month / YTD totals
 *   - category names + rolled-up amounts (last 6 months)
 *   - the names of household members (so the AI knows "I" vs. "we")
 *   - the user's logging streak + savings rate
 *
 * What we DO NOT send:
 *   - any transaction note
 *   - any per-transaction amount or date
 *   - paid-by / who-logged data
 *   - receipt URLs
 *   - Supabase IDs
 *   - email addresses
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

export type ChatContext = {
  currency: string;
  text: string;
};

export function buildChatContext({
  txs,
  categories,
  members,
  currency,
  householdName,
}: {
  txs: Transaction[];
  categories: Category[];
  members: Profile[];
  currency: string;
  householdName?: string | null;
}): ChatContext {
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

  return { currency, text: lines.join("\n") };
}

/** The system prompt that frames the assistant. */
export function chatSystemPrompt(ctx: ChatContext): string {
  return `You are Duddify's friendly personal-finance coach.

You are answering questions for the user about their own finances using ONLY the aggregated context below. You have NO access to individual transactions, notes, or receipts.

Style:
- Keep answers concise (2-4 short sentences for simple questions).
- Use the exact currency code the user provides (don't convert).
- If the question can't be answered from the context, say so plainly and suggest what data you'd need.
- Be honest about trends. If the user is overspending, say so kindly but clearly.
- Never invent numbers. Only cite figures present in the context below.

USER CONTEXT (auto-generated, refreshed every chat turn):
${ctx.text}`;
}
