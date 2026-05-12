"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/category-icon";
import { PrivateValue } from "@/components/private-value";
import { cn, formatCurrency } from "@/lib/utils";
import { CalendarDays, FileText, User } from "lucide-react";
import type { Category, Profile, Transaction } from "@/lib/types";

/**
 * Drill-down for a single day. Pass the unfiltered transactions for the
 * visible window — the dialog filters to `date` itself, optionally filters
 * by `type` (defaults to expenses), and groups everything by category.
 *
 * Designed to be opened from the Daily-spend bar chart and the calendar
 * heatmap. Each row shows who added the transaction, who paid (if
 * different), the note (or italicised "NA"), and the amount. Layout is
 * privacy-aware via `<PrivateValue>`.
 */
export function DayDetailDialog({
  open,
  onOpenChange,
  date,
  txs,
  categories,
  members,
  currency = "INR",
  locale = "en-IN",
  type = "expense",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** YYYY-MM-DD — the day to inspect. */
  date: string | null;
  txs: Transaction[];
  categories: Category[];
  members: Profile[];
  currency?: string;
  locale?: string;
  /** Restrict to a single transaction type. Defaults to "expense". Pass null for any. */
  type?: Transaction["type"] | null;
}) {
  const dayTxs = React.useMemo(() => {
    if (!date) return [] as Transaction[];
    return txs
      .filter((t) => t.occurred_on === date && (type == null || t.type === type))
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  }, [txs, date, type]);

  const total = dayTxs.reduce((s, t) => s + Number(t.amount), 0);
  const catById = React.useMemo(() => new Map(categories.map((c) => [c.id, c] as const)), [categories]);
  const memberById = React.useMemo(() => new Map(members.map((p) => [p.id, p] as const)), [members]);

  // Group by category (sorted by category total descending)
  const grouped = React.useMemo(() => {
    const m = new Map<string, { category: Category | undefined; items: Transaction[]; total: number }>();
    for (const t of dayTxs) {
      const c = catById.get(t.category_id);
      const cur = m.get(t.category_id) ?? { category: c, items: [] as Transaction[], total: 0 };
      cur.items.push(t);
      cur.total += Number(t.amount);
      m.set(t.category_id, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [dayTxs, catById]);

  const dateLabel = date
    ? new Date(date).toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0"
            >
              <CalendarDays className="h-5 w-5" />
            </motion.div>
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle className="text-base">{dateLabel || "Day"}</DialogTitle>
              <DialogDescription className="text-xs">
                {dayTxs.length} {type === "expense" ? "expense" : "transaction"}
                {dayTxs.length === 1 ? "" : "s"}
                {grouped.length > 0 && ` · ${grouped.length} categor${grouped.length === 1 ? "y" : "ies"}`}
              </DialogDescription>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {type === "expense" ? "Spent" : "Total"}
              </div>
              <div className="text-lg font-semibold tabular-nums text-destructive">
                <PrivateValue mask="••••">
                  {formatCurrency(total, currency, locale)}
                </PrivateValue>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-3 py-2 flex-1">
          {dayTxs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nothing logged on this day.
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map(({ category, items, total: catTotal }) => (
                <CategorySection
                  key={category?.id ?? "uncategorised"}
                  category={category}
                  items={items}
                  total={catTotal}
                  memberById={memberById}
                  currency={currency}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategorySection({
  category,
  items,
  total,
  memberById,
  currency,
  locale,
}: {
  category: Category | undefined;
  items: Transaction[];
  total: number;
  memberById: Map<string, Profile>;
  currency: string;
  locale: string;
}) {
  const color = category?.color ?? "#64748b";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border bg-card/50 overflow-hidden"
    >
      <div
        className="flex items-center gap-2 px-3 py-2 sticky top-0 z-[1] backdrop-blur"
        style={{ background: `${color}10` }}
      >
        <CategoryIcon name={category?.icon ?? "circle"} color={color} size={14} />
        <span className="text-sm font-medium flex-1 truncate">
          {category?.name ?? "Uncategorised"}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length} log{items.length === 1 ? "" : "s"}
        </span>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color }}
        >
          <PrivateValue mask="•••">
            {formatCurrency(total, currency, locale)}
          </PrivateValue>
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {items.map((t) => {
          const adder = memberById.get(t.user_id);
          const payer = t.paid_by ? memberById.get(t.paid_by) : null;
          const note = t.note?.trim();
          return (
            <div key={t.id} className="px-3 py-2.5">
              <div className="flex items-start gap-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">
                      {adder?.display_name ?? adder?.email ?? "Unknown"}
                    </span>
                    {payer && payer.id !== adder?.id && (
                      <span className="text-muted-foreground/70">
                        · paid by {payer.display_name ?? payer.email ?? "—"}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 flex items-start gap-1.5 text-sm",
                      note ? "text-foreground" : "text-muted-foreground italic"
                    )}
                  >
                    <FileText
                      className={cn(
                        "h-3.5 w-3.5 mt-0.5 shrink-0",
                        note ? "text-primary" : "text-muted-foreground/60"
                      )}
                    />
                    <span className="break-words">{note ? note : "NA"}</span>
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums shrink-0">
                  <PrivateValue mask="••••">
                    {formatCurrency(Number(t.amount), currency, locale)}
                  </PrivateValue>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
