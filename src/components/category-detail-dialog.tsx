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
import { Calendar, FileText, User } from "lucide-react";
import type { Category, Profile, Transaction } from "@/lib/types";

/**
 * Shows the full transaction list for a single category in a given window,
 * with date, who added it, the note (or NA), and the amount.
 *
 * Pass `txs` already filtered to your visible date window (e.g. current
 * month). The dialog will further filter by category and sort by date desc.
 */
export function CategoryDetailDialog({
  open,
  onOpenChange,
  category,
  txs,
  members,
  currency = "INR",
  locale = "en-IN",
  windowLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category | null;
  txs: Transaction[];
  members: Profile[];
  currency?: string;
  locale?: string;
  /** Optional human label of the time window e.g. "May 2026" */
  windowLabel?: string;
}) {
  const inCategory = React.useMemo(() => {
    if (!category) return [] as Transaction[];
    return txs
      .filter((t) => t.category_id === category.id)
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  }, [txs, category]);

  const total = inCategory.reduce((s, t) => s + Number(t.amount), 0);

  const memberById = React.useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of members) m.set(p.id, p);
    return m;
  }, [members]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of inCategory) {
      const arr = map.get(t.occurred_on) ?? [];
      arr.push(t);
      map.set(t.occurred_on, arr);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [inCategory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b">
          <div className="flex items-center gap-3">
            {category && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                style={{ background: `${category.color}1a`, color: category.color }}
              >
                <CategoryIcon name={category.icon} color={category.color} size={18} />
              </motion.div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle className="text-base truncate">
                {category?.name ?? "Category"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {windowLabel ? `${windowLabel} · ` : ""}
                {inCategory.length} transaction{inCategory.length === 1 ? "" : "s"}
              </DialogDescription>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Total
              </div>
              <div className="text-lg font-semibold tabular-nums">
                <PrivateValue mask="••••">
                  {formatCurrency(total, currency, locale)}
                </PrivateValue>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-3 py-2 flex-1">
          {inCategory.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nothing logged in this category yet.
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([date, items]) => {
                const dayTotal = items.reduce((s, t) => s + Number(t.amount), 0);
                return (
                  <div key={date}>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-2 pb-1 sticky top-0 bg-background/95 backdrop-blur z-[1] border-b border-border/40">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(date).toLocaleDateString(locale, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="tabular-nums">
                        <PrivateValue mask="•••">
                          {formatCurrency(dayTotal, currency, locale)}
                        </PrivateValue>
                      </span>
                    </div>
                    <div className="divide-y divide-border/40">
                      {items.map((t) => {
                        const adder = memberById.get(t.user_id);
                        const payer = t.paid_by ? memberById.get(t.paid_by) : null;
                        const note = t.note?.trim();
                        return (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18 }}
                            className="px-2 py-2.5"
                          >
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
                                  <span className="break-words">
                                    {note ? note : "NA"}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm font-semibold tabular-nums shrink-0">
                                <PrivateValue mask="••••">
                                  {formatCurrency(Number(t.amount), currency, locale)}
                                </PrivateValue>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
