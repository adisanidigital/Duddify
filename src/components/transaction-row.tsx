"use client";

import { motion, useReducedMotion } from "motion/react";
import { CategoryIcon } from "@/components/category-icon";
import { PrivateValue } from "@/components/private-value";
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
  const color =
    tx.type === "income"
      ? "text-success"
      : tx.type === "expense"
      ? "text-destructive"
      : "text-foreground";
  const reduce = useReducedMotion();
  return (
    <motion.button
      onClick={onClick}
      whileHover={reduce ? undefined : { x: 2 }}
      whileTap={reduce || !onClick ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left",
        "transition-colors hover:bg-accent",
        "relative group",
        onClick ? "cursor-pointer" : "cursor-default"
      )}
    >
      {/* subtle accent rail that grows on hover */}
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: category?.color ?? "transparent" }}
      />
      <CategoryIcon
        name={category?.icon ?? "circle"}
        color={category?.color ?? "#64748b"}
        size={18}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {category?.name ?? "Uncategorised"}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {tx.note
            ? tx.note
            : new Date(tx.occurred_on).toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
              })}
        </div>
      </div>
      <div className={cn("font-semibold tabular-nums text-sm", color)}>
        <PrivateValue mask="••••">
          {sign}
          {formatCurrency(Number(tx.amount), currency, locale)}
        </PrivateValue>
      </div>
    </motion.button>
  );
}
