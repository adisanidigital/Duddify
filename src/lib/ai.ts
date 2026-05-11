/**
 * AI helpers — uses Pollinations.ai's free, key-less text endpoint.
 *
 * Privacy notes:
 *  - This module never sends raw transactions, member names, or any other
 *    identifying data. Callers must pre-aggregate / anonymize before invoking
 *    `askAI`. The Goals advisor pipes only numeric summaries.
 *  - Responses are sessionStorage-cached so flipping back-and-forth on a
 *    goals page doesn't hit the network repeatedly.
 *  - Hard 12s timeout — never blocks the UI indefinitely.
 *  - If the request fails, callers should fall back gracefully (the Goals
 *    page does this with a deterministic feasibility calculation).
 */

const ENDPOINT = "https://text.pollinations.ai/openai";
const CACHE_PREFIX = "duddify.ai-cache.";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export async function askAI(
  messages: AIMessage[],
  opts: { model?: string; cacheKey?: string; signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<string> {
  const { model = "openai", cacheKey, timeoutMs = 12_000 } = opts;

  // SessionStorage cache
  const cKey = cacheKey ? CACHE_PREFIX + cacheKey : null;
  if (cKey && typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(cKey);
      if (cached) return cached;
    } catch {}
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Bridge an external signal into our controller
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 350,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`AI request failed (${res.status})`);
    }
    const data = await res.json();
    const text: string =
      data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("Empty AI response");

    if (cKey && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(cKey, text);
      } catch {}
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------------- */
/*  Domain-specific prompts                                                   */
/* ------------------------------------------------------------------------- */

export type GoalSummaryInput = {
  /** "Trip to Goa" — title only, no PII */
  title: string;
  target: number;
  saved: number;
  monthsLeft: number;
  /** Avg monthly net savings over recent months. */
  avgMonthlySavings: number;
  currency: string;
};

export async function aiGoalAdvice(input: GoalSummaryInput, signal?: AbortSignal) {
  const messages: AIMessage[] = [
    {
      role: "system",
      content:
        "You are a friendly, concise personal-finance coach. Reply with 2-3 short sentences (no bullet lists, no headings). Use the same currency code the user provides. Be honest about feasibility — don't sugarcoat — but stay supportive.",
    },
    {
      role: "user",
      content: `Goal: "${input.title}".
Target: ${input.currency} ${Math.round(input.target).toLocaleString()}.
Already saved: ${input.currency} ${Math.round(input.saved).toLocaleString()}.
Months remaining: ${input.monthsLeft}.
Current avg monthly net savings: ${input.currency} ${Math.round(
        input.avgMonthlySavings
      ).toLocaleString()}.
Tell me whether this goal is realistic at this pace. If not, suggest what monthly amount I'd need, or how many extra months I'd need.`,
    },
  ];

  return askAI(messages, {
    cacheKey: `goal-${input.title}-${Math.round(input.target)}-${Math.round(input.saved)}-${input.monthsLeft}-${Math.round(input.avgMonthlySavings)}`,
    signal,
  });
}

export type SpendNarrativeInput = {
  monthLabel: string;
  income: number;
  expense: number;
  invested: number;
  topCategory: { name: string; total: number } | null;
  biggestLeak: { name: string; pct: number } | null;
  currency: string;
};

export async function aiSpendNarrative(
  input: SpendNarrativeInput,
  signal?: AbortSignal
) {
  const messages: AIMessage[] = [
    {
      role: "system",
      content:
        "You are a friendly personal-finance coach. Reply with 2 short, clear sentences. No bullet lists. Mention one specific number from the data.",
    },
    {
      role: "user",
      content: `For ${input.monthLabel}: income ${input.currency} ${Math.round(
        input.income
      ).toLocaleString()}, expense ${input.currency} ${Math.round(
        input.expense
      ).toLocaleString()}, invested ${input.currency} ${Math.round(
        input.invested
      ).toLocaleString()}.${
        input.topCategory
          ? ` Biggest expense category: ${input.topCategory.name} at ${input.currency} ${Math.round(
              input.topCategory.total
            ).toLocaleString()}.`
          : ""
      }${
        input.biggestLeak
          ? ` Fastest growing category vs last year: ${input.biggestLeak.name} (+${input.biggestLeak.pct}%).`
          : ""
      }
Summarise how I'm doing and what one thing I should focus on.`,
    },
  ];

  return askAI(messages, {
    cacheKey: `narr-${input.monthLabel}-${Math.round(input.income)}-${Math.round(input.expense)}-${Math.round(input.invested)}`,
    signal,
  });
}
