"use client";

import { CategoryIcon } from "@/components/category-icon";
import { cn, formatCurrency } from "@/lib/utils";
import type { Category, Transaction } from "@/lib/types";

export function TransactionRow({
  tx,
  category,
  currency = "INR",
  locale = "en-IN",
  onClick,
}: {
  tx: Transaction;
  category?: Category;
  currency?: string;
  locale?: string;
  onClick?: () => void;
}) {
  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "";
  const color = tx.type === "income" ? "text-success" : tx.type === "expense" ? "text-destructive" : "text-foreground";
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent text-left transition-colors",
        onClick ? "cursor-pointer" : "cursor-default"
      )}
    >
      <CategoryIcon name={category?.icon ?? "circle"} color={category?.color ?? "#64748b"} size={18} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{category?.name ?? "Uncategorised"}</div>
        <div className="text-xs text-muted-foreground truncate">
          {tx.note ? tx.note : new Date(tx.occurred_on).toLocaleDateString(locale, { month: "short", day: "numeric" })}
        </div>
      </div>
      <div className={cn("font-semibold tabular-nums text-sm", color)}>
        {sign}
        {formatCurrency(Number(tx.amount), currency, locale)}
      </div>
    </button>
  );
}
