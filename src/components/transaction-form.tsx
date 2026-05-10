"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryIcon } from "@/components/category-icon";
import { ReceiptUpload } from "@/components/receipt-upload";
import { cn, isoDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Mic, Sparkles, X } from "lucide-react";
import type { Category, Transaction, TxType } from "@/lib/types";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold, useHouseholdMembers, useSession } from "@/lib/hooks/use-household";
import { suggestCategory } from "@/lib/insights";

const TYPES: { id: TxType; label: string }[] = [
  { id: "expense", label: "Expense" },
  { id: "income", label: "Income" },
  { id: "investment", label: "Investment" },
];

export function TransactionForm({
  initial,
  onSaved,
  compact = false,
}: {
  initial?: Partial<Transaction>;
  onSaved?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: session } = useSession();
  const { data: household } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();
  const { data: categories = [] } = useCategories();
  // Recent history for smart-category suggestion (last ~6 months is enough)
  const recentFrom = React.useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return isoDate(d);
  }, []);
  const { data: historyTxs = [] } = useTransactions({ from: recentFrom });

  const [type, setType] = React.useState<TxType>((initial?.type as TxType) ?? "expense");
  const [amount, setAmount] = React.useState<string>(
    initial?.amount ? String(initial.amount) : ""
  );
  const [categoryId, setCategoryId] = React.useState<string>(initial?.category_id ?? "");
  const [date, setDate] = React.useState<string>(initial?.occurred_on ?? isoDate(new Date()));
  const [note, setNote] = React.useState<string>(initial?.note ?? "");
  const [paidBy, setPaidBy] = React.useState<string>(initial?.paid_by ?? session?.id ?? "");
  const [receiptUrl, setReceiptUrl] = React.useState<string | null>(initial?.receipt_url ?? null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!paidBy && session?.id) setPaidBy(session.id);
  }, [session, paidBy]);

  const filteredCats = React.useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  React.useEffect(() => {
    if (categoryId && filteredCats.find((c) => c.id === categoryId)) return;
    setCategoryId(filteredCats[0]?.id ?? "");
  }, [type, filteredCats, categoryId]);

  // Smart category suggestion driven by note text + history
  const [suggested, setSuggested] = React.useState<Category | null>(null);
  const [acceptedSuggestion, setAcceptedSuggestion] = React.useState(false);
  React.useEffect(() => {
    if (!note || note.trim().length < 3) {
      setSuggested(null);
      return;
    }
    const id = suggestCategory(note, type, historyTxs, categories);
    if (!id || id === categoryId) {
      setSuggested(null);
      return;
    }
    const c = categories.find((x) => x.id === id) ?? null;
    setSuggested(c);
  }, [note, type, historyTxs, categories, categoryId]);

  const acceptSuggestion = () => {
    if (!suggested) return;
    setCategoryId(suggested.id);
    setAcceptedSuggestion(true);
    setSuggested(null);
    setTimeout(() => setAcceptedSuggestion(false), 1400);
  };

  // Voice add — Web Speech API
  // Reliability rules:
  //   - Single call site for stopping (Stop button, ESC, end event, silence timeout).
  //   - Auto-stop after 5s of no speech (some browsers don't fire onend).
  //   - Hard timeout at 12s as a last-resort guard.
  //   - Always clear timers + ref + state on stop.
  //   - On result: parse amount, category keyword, paid_by name, "yesterday"/"today";
  //     fall back to defaults; prompt user about any unresolved required fields.
  const [listening, setListening] = React.useState(false);
  const [voiceSupported, setVoiceSupported] = React.useState(false);
  const [voiceTranscript, setVoiceTranscript] = React.useState("");
  const recognitionRef = React.useRef<any>(null);
  const silenceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const w = window as any;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (Rec) setVoiceSupported(true);
  }, []);

  const clearTimers = React.useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (hardTimerRef.current) {
      clearTimeout(hardTimerRef.current);
      hardTimerRef.current = null;
    }
  }, []);

  const stopListening = React.useCallback(() => {
    clearTimers();
    const r = recognitionRef.current;
    if (r) {
      try {
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        r.onspeechend = null;
        r.stop();
        r.abort?.();
      } catch {}
    }
    recognitionRef.current = null;
    setListening(false);
    setVoiceTranscript("");
  }, [clearTimers]);

  const startListening = () => {
    const w = window as any;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) return toast.error("Voice input isn't supported in this browser");
    if (recognitionRef.current) return; // already running

    const r = new Rec();
    r.lang = navigator.language || "en-IN";
    r.continuous = false;
    r.interimResults = true; // so we can show what the user is saying
    r.maxAlternatives = 1;

    let finalText = "";

    const armSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // 5s of no speech → stop and process whatever we got
        try {
          r.stop();
        } catch {}
      }, 5000);
    };

    r.onstart = () => {
      armSilenceTimer();
      hardTimerRef.current = setTimeout(() => {
        try {
          r.stop();
        } catch {}
      }, 12000);
    };
    r.onspeechstart = () => armSilenceTimer();
    r.onresult = (event: any) => {
      armSilenceTimer();
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      setVoiceTranscript((finalText + " " + interim).trim());
    };
    r.onerror = (event: any) => {
      const code = event?.error;
      if (code === "no-speech") {
        toast.message("I didn't hear anything — try again closer to the mic");
      } else if (code === "not-allowed" || code === "service-not-allowed") {
        toast.error("Mic permission was denied. Enable microphone for this site.");
      } else if (code === "aborted") {
        // user cancelled — stay silent
      } else {
        toast.error(`Voice error: ${code ?? "unknown"}`);
      }
      stopListening();
    };
    r.onend = () => {
      // Use whatever we captured (final + interim)
      const combined = (finalText.trim() ||
        // fall back to any transient interim text from state
        voiceTranscript ||
        "").trim();
      stopListening();
      if (combined) handleVoiceTranscript(combined);
    };

    recognitionRef.current = r;
    setListening(true);
    setVoiceTranscript("");
    try {
      r.start();
    } catch (e) {
      // Some browsers throw if you call start() too quickly after a previous run
      console.error(e);
      stopListening();
      toast.error("Couldn't start the mic — please try again");
    }
  };

  // ESC closes the mic
  React.useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopListening();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, stopListening]);

  // Always tear down on unmount
  React.useEffect(() => () => stopListening(), [stopListening]);

  const [voiceMissing, setVoiceMissing] = React.useState<string[]>([]);

  const handleVoiceTranscript = (raw: string) => {
    if (!raw) return;
    const cleaned = raw.replace(/[,]/g, "").trim();
    const lower = cleaned.toLowerCase();

    // 1. Amount — first numeric (with optional currency token)
    const amtMatch = cleaned.match(/(?:rs\.?|inr|₹|usd|\$|€|eur|£|gbp)?\s*(\d+(?:\.\d{1,2})?)/i);
    const parsedAmount = amtMatch ? parseFloat(amtMatch[1]) : null;

    // 2. Date — "today" / "yesterday" / "tomorrow" / "on <weekday>"
    let parsedDate: string | null = null;
    if (/\byesterday\b/.test(lower)) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      parsedDate = isoDate(d);
    } else if (/\btoday\b/.test(lower)) {
      parsedDate = isoDate(new Date());
    } else if (/\btomorrow\b/.test(lower)) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      parsedDate = isoDate(d);
    }

    // 3. Type — keywords overriding the active tab
    let parsedType: TxType = type;
    if (/\b(income|earned|salary|received|got paid)\b/.test(lower)) parsedType = "income";
    else if (/\b(invest(ed|ment)?|bought (mf|stock|gold|bitcoin|crypto))\b/.test(lower))
      parsedType = "investment";
    else if (/\b(spent|paid|bought|expense|cost)\b/.test(lower)) parsedType = "expense";

    // 4. Category — best match against names/icons of the (parsedType) categories
    const eligible = categories.filter((c) => c.type === parsedType);
    let parsedCategoryId: string | null = null;
    let bestScore = 0;
    for (const c of eligible) {
      const tokens = c.name.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
      let score = 0;
      for (const tok of tokens) {
        if (lower.includes(tok)) score += tok.length;
      }
      if (score > bestScore) {
        bestScore = score;
        parsedCategoryId = c.id;
      }
    }
    // Fallback: keyword-based suggestion against history
    if (!parsedCategoryId && eligible.length > 0) {
      parsedCategoryId = suggestCategory(cleaned, parsedType, historyTxs, categories);
    }

    // 5. Paid_by — "by <name>" or "<name> paid"
    let parsedPaidBy: string | null = null;
    for (const m of members) {
      const nm = (m.display_name ?? "").toLowerCase().trim();
      if (!nm || nm.length < 2) continue;
      if (lower.includes(nm)) {
        parsedPaidBy = m.id;
        break;
      }
    }

    // 6. Note — strip recognised tokens
    let noteRest = cleaned;
    if (amtMatch) noteRest = noteRest.replace(amtMatch[0], "");
    noteRest = noteRest
      .replace(/\b(yesterday|today|tomorrow)\b/gi, "")
      .replace(/\b(income|earned|salary|received|got paid|spent|paid|bought|invest(ed|ment)?|expense|cost)\b/gi, "")
      .replace(/^(for|on|at|to)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();

    // Apply
    if (parsedType !== type) setType(parsedType);
    if (parsedAmount !== null && parsedAmount > 0) setAmount(String(parsedAmount));
    if (parsedDate) setDate(parsedDate);
    if (parsedCategoryId) setCategoryId(parsedCategoryId);
    if (parsedPaidBy) setPaidBy(parsedPaidBy);
    if (noteRest) setNote(noteRest);

    // Compute what's missing & nudge user
    const missing: string[] = [];
    const finalAmount = parsedAmount ?? (amount ? parseFloat(amount) : null);
    if (!finalAmount || finalAmount <= 0) missing.push("amount");
    if (!parsedCategoryId && !categoryId) missing.push("category");
    setVoiceMissing(missing);

    const heardBits = [
      parsedAmount ? `${parsedAmount}` : null,
      noteRest ? `"${noteRest}"` : null,
      parsedDate
        ? parsedDate === isoDate(new Date())
          ? "today"
          : parsedDate
        : null,
    ].filter(Boolean);
    if (heardBits.length) {
      toast.success(`Heard: ${heardBits.join(" · ")}`, { duration: 2400 });
    } else {
      toast.message("Couldn't parse anything — try again with the amount first");
    }
    if (missing.length > 0) {
      toast.message(
        `Please add the ${missing.join(" and ")} below to save`,
        { duration: 5000 }
      );
    }
  };

  // Sanitize free-typed amount: only digits + optional single decimal up to 2 places.
  const onAmountChange = (raw: string) => {
    const cleaned = raw
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1");
    const [int, dec] = cleaned.split(".");
    let next = int.slice(0, 12);
    if (dec !== undefined) next += "." + dec.slice(0, 2);
    setAmount(next);
  };

  // Auto-focus the amount input on mount so the native numeric keyboard opens
  // immediately on iOS/Android when this screen is shown.
  const amountRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (initial?.id) return; // editing — don't steal focus from edit dialog
    const t = setTimeout(() => {
      amountRef.current?.focus();
      // iOS doesn't always pop the keyboard on programmatic focus alone;
      // a click after focus tends to work better, but most modern Safari does.
    }, 350); // small delay so the page transition finishes
    return () => clearTimeout(t);
  }, [initial?.id]);

  const submit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) return toast.error("Enter an amount");
    if (!categoryId) return toast.error("Pick a category");
    if (!household) return toast.error("No household");
    if (!session) return toast.error("Not signed in");

    setSaving(true);
    const payload = {
      household_id: household.id,
      user_id: session.id,
      category_id: categoryId,
      type,
      amount: value,
      occurred_on: date,
      note: note || null,
      paid_by: paidBy || session.id,
      receipt_url: receiptUrl,
    };

    const { error } = initial?.id
      ? await supabase.from("transactions").update(payload).eq("id", initial.id)
      : await supabase.from("transactions").insert(payload);
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success(initial?.id ? "Updated" : "Saved");
    setAmount("");
    setNote("");
    setReceiptUrl(null);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    if (onSaved) onSaved();
    else if (!compact) router.push("/transactions");
  };

  const currency = household?.currency ?? "INR";

  return (
    <div className="space-y-5">
      {/* Type tabs */}
      <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
        <TabsList className="grid grid-cols-3 w-full">
          {TYPES.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Amount input — taps open the native numeric keyboard on iOS/Android */}
      <div className="text-center py-3 relative">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2 flex items-center justify-center gap-2">
          {currency} amount
          {voiceSupported && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                listening
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/10 text-primary hover:bg-primary/15"
              )}
              aria-label={listening ? "Stop listening" : "Speak to add"}
            >
              {listening ? (
                <>
                  <motion.span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-destructive"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                  Stop listening
                </>
              ) : (
                <>
                  <Mic className="h-3 w-3" /> Speak to add
                </>
              )}
            </button>
          )}
        </div>
        <AnimatePresence>
          {listening && (
            <motion.div
              key="voice-overlay"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-2 mx-auto max-w-md rounded-lg border bg-card/80 backdrop-blur px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 text-destructive">
                <motion.span
                  aria-hidden
                  className="h-2 w-2 rounded-full bg-destructive"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
                <span className="font-medium">Listening…</span>
                <span className="text-muted-foreground ml-auto">Auto-stops in 5s of silence</span>
              </div>
              {voiceTranscript && (
                <div className="mt-1 text-foreground italic line-clamp-2">
                  &ldquo;{voiceTranscript}&rdquo;
                </div>
              )}
              <div className="mt-1.5 text-[10px] text-muted-foreground leading-relaxed">
                Try: &ldquo;500 for groceries today&rdquo; · &ldquo;1200 dinner paid by Aditi&rdquo; · &ldquo;invested 10000 in mutual funds&rdquo;
              </div>
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="outline" onClick={stopListening} type="button" className="h-7">
                  Stop
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {!listening && voiceMissing.length > 0 && (
            <motion.div
              key="voice-missing"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-2 mx-auto max-w-md rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-left flex items-start gap-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="font-medium">Almost there.</span>{" "}
                Please pick a {voiceMissing.join(" and ")} below before saving.
              </div>
              <button
                type="button"
                onClick={() => setVoiceMissing([])}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <label htmlFor="amount" className="block cursor-text">
          <input
            id="amount"
            ref={amountRef}
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0"
            aria-label="Amount"
            className={cn(
              "w-full bg-transparent outline-none border-0 focus:ring-0",
              "text-center text-5xl md:text-6xl font-bold tabular-nums tracking-tight",
              "placeholder:text-muted-foreground/40",
              "caret-primary"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </label>
        <div className="h-0.5 w-24 mx-auto mt-2 rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      {/* Category chips */}
      <div>
        <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
          Category
        </Label>
        <div className="flex flex-wrap gap-2">
          {filteredCats.map((c) => (
            <CategoryChip
              key={c.id}
              c={c}
              active={c.id === categoryId}
              onClick={() => setCategoryId(c.id)}
            />
          ))}
          {filteredCats.length === 0 && (
            <p className="text-sm text-muted-foreground">No categories yet for this type.</p>
          )}
        </div>
        <AnimatePresence>
          {suggested && (
            <motion.div
              key={suggested.id}
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className="mt-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="flex-1 text-xs">
                Based on similar notes, try{" "}
                <span className="font-medium">{suggested.name}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={acceptSuggestion}>
                Use it
              </Button>
              <button
                type="button"
                onClick={() => setSuggested(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss suggestion"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
          {acceptedSuggestion && (
            <motion.div
              key="accepted"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 text-[11px] text-success flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" /> Smart-picked for you
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Paid by</Label>
          <Select value={paidBy} onValueChange={setPaidBy}>
            <SelectTrigger>
              <SelectValue placeholder="Who paid?" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.display_name ?? m.email ?? "Member"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was this for?"
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Receipt / bill (optional)</Label>
        <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} />
      </div>

      <Button size="lg" className="w-full" onClick={submit} disabled={saving}>
        {saving ? "Saving…" : initial?.id ? "Update" : "Save"}
      </Button>
    </div>
  );
}

function CategoryChip({
  c,
  active,
  onClick,
}: {
  c: Category;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border text-sm transition-all",
        active
          ? "border-primary bg-primary/10 text-foreground shadow-sm"
          : "border-border hover:bg-accent"
      )}
    >
      <CategoryIcon name={c.icon} color={c.color} size={14} />
      {c.name}
    </button>
  );
}
