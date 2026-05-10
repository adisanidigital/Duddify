"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { CategoryIcon } from "@/components/category-icon";
import { TransactionForm } from "@/components/transaction-form";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn, formatCurrency } from "@/lib/utils";
import type { Transaction, TxType } from "@/lib/types";
import { Paperclip, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageMotion } from "@/components/motion";

export default function TransactionsPage() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { data: hh } = useHousehold();
  const { data: txs = [], isLoading } = useTransactions({ limit: 500 });
  const { data: categories = [] } = useCategories();

  const [type, setType] = React.useState<"all" | TxType>("all");
  const [q, setQ] = React.useState("");
  const [editing, setEditing] = React.useState<Transaction | null>(null);

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";
  const catById = new Map(categories.map((c) => [c.id, c] as const));

  const filtered = React.useMemo(() => {
    return txs.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (q) {
        const c = catById.get(t.category_id);
        const hay = `${c?.name ?? ""} ${t.note ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [txs, type, q, catById]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const arr = map.get(t.occurred_on) ?? [];
      arr.push(t);
      map.set(t.occurred_on, arr);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const remove = async (tx: Transaction) => {
    const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    const c = catById.get(tx.category_id);
    toast.success(`Deleted${c ? ` "${c.name}"` : ""}`, {
      duration: 8000,
      action: {
        label: "Undo",
        onClick: async () => {
          // Re-insert without the original id (Postgres will assign a new one).
          const { id: _id, created_at: _ca, ...payload } = tx;
          const { error: insErr } = await supabase
            .from("transactions")
            .insert(payload);
          if (insErr) {
            toast.error(insErr.message);
          } else {
            toast.success("Restored");
            qc.invalidateQueries({ queryKey: ["transactions"] });
          }
        },
      },
    });
  };

  return (
    <PageMotion className="container max-w-4xl py-4 md:py-8 space-y-4">
      <PageHeader
        title="Transactions"
        description={`${filtered.length} of ${txs.length} entries`}
        actions={
          <Button asChild>
            <Link href="/add">
              <Plus /> Add
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search category or note"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6">Loading…</p>
          ) : grouped.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No transactions match. Try clearing filters or{" "}
              <Link href="/add" className="text-primary underline">
                add one
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(([date, items]) => {
                const dayTotal = items.reduce(
                  (s, t) =>
                    s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
                  0
                );
                return (
                  <div key={date}>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 px-1">
                      <span className="font-medium">
                        {new Date(date).toLocaleDateString(locale, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span
                        className={cn(
                          "tabular-nums",
                          dayTotal >= 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {dayTotal >= 0 ? "+" : ""}
                        {formatCurrency(dayTotal, currency, locale)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {items.map((t) => {
                        const c = catById.get(t.category_id);
                        const sign =
                          t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
                        const colorCls =
                          t.type === "income"
                            ? "text-success"
                            : t.type === "expense"
                            ? "text-destructive"
                            : "text-foreground";
                        return (
                          <div
                            key={t.id}
                            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent group"
                          >
                            <button
                              onClick={() => setEditing(t)}
                              className="flex-1 flex items-center gap-3 text-left"
                            >
                              <CategoryIcon
                                name={c?.icon ?? "circle"}
                                color={c?.color ?? "#64748b"}
                                size={18}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                                  {c?.name ?? "—"}
                                  {t.receipt_url && (
                                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </div>
                                {t.note && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {t.note}
                                  </div>
                                )}
                              </div>
                              <div
                                className={cn("font-semibold tabular-nums text-sm", colorCls)}
                              >
                                {sign}
                                {formatCurrency(Number(t.amount), currency, locale)}
                              </div>
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(t)}
                              className="opacity-0 group-hover:opacity-100"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          {editing && (
            <TransactionForm initial={editing} compact onSaved={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </PageMotion>
  );
}
