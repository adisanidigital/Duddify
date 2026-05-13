"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { PageMotion } from "@/components/motion";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Send,
  Loader2,
  ShieldCheck,
  Trash2,
  RotateCw,
  Bot,
  User as UserIcon,
} from "lucide-react";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold, useHouseholdMembers } from "@/lib/hooks/use-household";
import { useFeatureFlags } from "@/lib/feature-flags";
import { streamAI, type AIMessage } from "@/lib/ai";
import {
  buildChatContext,
  chatSystemPrompt,
} from "@/lib/chat-context";
import { isoDate, cn } from "@/lib/utils";
import { toast } from "sonner";

type ChatTurn = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "duddify.chat.history";
const SUGGESTED = [
  "How much did I spend this month?",
  "Which category is eating most of my budget?",
  "How am I doing compared to last month?",
  "Am I on track to save more this year?",
  "What's my biggest expense category in the last 6 months?",
];

export default function ChatPage() {
  const { flags } = useFeatureFlags();
  const { data: hh } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();
  const { data: categories = [] } = useCategories();
  // Year-of-data window — enough context for trend questions, fast to fetch
  // because Overview already warms this cache key.
  const yearStart = React.useMemo(
    () => isoDate(new Date(new Date().getFullYear() - 1, 0, 1)),
    []
  );
  const { data: txs = [] } = useTransactions({ from: yearStart });

  const currency = hh?.currency ?? "INR";

  const [turns, setTurns] = React.useState<ChatTurn[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  // Persist conversation so users don't lose context across navigations.
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-30)));
    } catch {}
  }, [turns]);

  // Auto-scroll to bottom when new content arrives.
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length, streaming]);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || streaming) return;
    if (!flags.ai) {
      toast.error("AI is turned off in Settings");
      return;
    }
    setInput("");
    const newTurns: ChatTurn[] = [
      ...turns,
      { role: "user", content: prompt },
      { role: "assistant", content: "" },
    ];
    setTurns(newTurns);
    setStreaming(true);

    const ctx = buildChatContext({
      txs,
      categories,
      members,
      currency,
      householdName: hh?.name,
      includeNotes: flags.aiIncludeNotes,
    });
    // Send the system prompt + recent turns. Cap history at 12 turns so
    // long conversations don't blow the context window.
    const recent = newTurns.slice(-12);
    const messages: AIMessage[] = [
      { role: "system", content: chatSystemPrompt(ctx) },
      ...recent
        .filter((t) => t.content.length > 0 || t.role === "user")
        .map((t) => ({ role: t.role, content: t.content })),
    ];

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let acc = "";
      for await (const chunk of streamAI(messages, { signal: controller.signal })) {
        acc += chunk;
        setTurns((cur) => {
          const next = cur.slice();
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
      if (!acc) throw new Error("Empty response");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setTurns((cur) => {
          const next = cur.slice();
          if (!next[next.length - 1].content) next.pop();
          return next;
        });
      } else {
        setTurns((cur) => {
          const next = cur.slice();
          next[next.length - 1] = {
            role: "assistant",
            content: "Sorry — I couldn't reach the AI service. Try again in a moment.",
          };
          return next;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const clearChat = () => {
    setTurns([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  if (!flags.ai) {
    return (
      <PageMotion className="container max-w-2xl py-4 md:py-8">
        <PageHeader title="AI coach" description="Ask anything about your finances" />
        <Card className="p-8 text-center">
          <Bot className="h-10 w-10 mx-auto text-muted-foreground" />
          <div className="mt-3 font-semibold">AI is turned off</div>
          <div className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Enable the AI feature in Settings to chat with the coach about your spending.
          </div>
          <Button asChild className="mt-4">
            <Link href="/settings">Open Settings</Link>
          </Button>
        </Card>
      </PageMotion>
    );
  }

  return (
    <PageMotion className="container max-w-2xl py-4 md:py-8 flex flex-col h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3rem)] gap-3">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            AI coach
            <span className="text-[10px] uppercase tracking-wider bg-primary/15 text-primary rounded-full px-1.5 py-0.5">
              Beta
            </span>
          </span>
        }
        description="Ask about your spending, budgets, goals, or trends."
        actions={
          turns.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          )
        }
      />

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border bg-card/40 p-3 md:p-4 space-y-3"
      >
        {turns.length === 0 ? (
          <EmptyChatState onPick={(q) => send(q)} />
        ) : (
          <>
            {turns.map((t, i) => (
              <MessageBubble
                key={i}
                role={t.role}
                content={t.content}
                isStreaming={streaming && i === turns.length - 1 && t.role === "assistant"}
              />
            ))}
            {streaming && turns[turns.length - 1]?.role === "user" && (
              <MessageBubble role="assistant" content="" isStreaming />
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="rounded-xl border bg-card p-2 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask anything about your finances…"
          rows={1}
          className="resize-none border-0 focus-visible:ring-0 shadow-none min-h-[40px] max-h-[140px] bg-transparent"
          disabled={streaming}
        />
        {streaming ? (
          <Button type="button" variant="outline" size="icon" onClick={stop} aria-label="Stop">
            <RotateCw className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={() => send(input)}
            disabled={!input.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="text-[10px] text-muted-foreground inline-flex items-center justify-center gap-1.5 flex-wrap text-center px-2">
        <ShieldCheck className="h-3 w-3 text-success shrink-0" />
        Sends the last 90 days of transactions (date, amount, category) +
        aggregated totals.{" "}
        {flags.aiIncludeNotes ? (
          <>
            Notes <strong className="text-foreground">are</strong> being sent
            too —{" "}
            <Link href="/settings" className="underline">
              change
            </Link>
            .
          </>
        ) : (
          <>
            Notes are NOT sent — enable in{" "}
            <Link href="/settings" className="underline">
              Settings
            </Link>{" "}
            for richer answers.
          </>
        )}
      </div>
    </PageMotion>
  );
}

function MessageBubble({
  role,
  content,
  isStreaming,
}: {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "h-7 w-7 rounded-lg grid place-items-center shrink-0",
          isUser ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
        )}
      >
        {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border rounded-tl-sm"
        )}
      >
        {content || (isStreaming && <TypingDots />)}
        {isStreaming && content && (
          <motion.span
            aria-hidden
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-block h-3 w-[2px] bg-current ml-0.5 align-middle"
          />
        )}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

function EmptyChatState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full grid place-items-center text-center"
      >
        <div className="max-w-md">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="font-semibold text-base">Ask anything about your money</div>
          <div className="text-sm text-muted-foreground mt-1">
            I see your aggregated totals, category breakdowns, and trends —
            but never your individual transactions or notes.
          </div>
          <div className="mt-5 grid gap-2">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onPick(q)}
                className="text-left text-sm rounded-lg border bg-card hover:bg-accent transition-colors px-3 py-2.5"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
