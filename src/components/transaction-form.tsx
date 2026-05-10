"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import type { Category, Transaction, TxType } from "@/lib/types";
import { useCategories } from "@/lib/hooks/use-data";
import { useHousehold, useHouseholdMembers, useSession } from "@/lib/hooks/use-household";

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
      <div className="text-center py-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
          {currency} amount
        </div>
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
