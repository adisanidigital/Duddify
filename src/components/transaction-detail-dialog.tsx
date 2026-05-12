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
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import { PrivateValue } from "@/components/private-value";
import { cn, formatCurrency } from "@/lib/utils";
import {
  CalendarDays,
  FileText,
  Pencil,
  Trash2,
  User,
  Receipt as ReceiptIcon,
  Hash,
} from "lucide-react";
import type { Category, Profile, Transaction } from "@/lib/types";

const TYPE_STYLES: Record<
  Transaction["type"],
  { label: string; chip: string; sign: string; amountColor: string }
> = {
  expense: {
    label: "Expense",
    chip: "bg-destructive/15 text-destructive",
    sign: "-",
    amountColor: "text-destructive",
  },
  income: {
    label: "Income",
    chip: "bg-success/15 text-success",
    sign: "+",
    amountColor: "text-success",
  },
  investment: {
    label: "Investment",
    chip: "bg-primary/15 text-primary",
    sign: "",
    amountColor: "text-primary",
  },
  transfer: {
    label: "Transfer",
    chip: "bg-muted text-muted-foreground",
    sign: "",
    amountColor: "text-foreground",
  },
};

/**
 * Read-only detail card for a single transaction. Includes Edit and Delete
 * affordances; the host wires them to its own edit dialog and delete-with-
 * undo flow. Delete should always run through ConfirmDialog at the call
 * site — this component just emits the intent.
 */
export function TransactionDetailDialog({
  open,
  onOpenChange,
  tx,
  category,
  members,
  currency = "INR",
  locale = "en-IN",
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx: Transaction | null;
  category?: Category | null;
  members: Profile[];
  currency?: string;
  locale?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const memberById = React.useMemo(
    () => new Map(members.map((m) => [m.id, m] as const)),
    [members]
  );

  if (!tx) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" />
      </Dialog>
    );
  }

  const t = TYPE_STYLES[tx.type];
  const adder = memberById.get(tx.user_id);
  const payer = tx.paid_by ? memberById.get(tx.paid_by) : null;
  const note = tx.note?.trim();
  const color = category?.color ?? "#64748b";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Coloured header with category */}
        <div
          className="relative px-5 pt-6 pb-4"
          style={{
            background: `linear-gradient(180deg, ${color}1f 0%, transparent 100%)`,
          }}
        >
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="h-12 w-12 rounded-2xl grid place-items-center shrink-0 ring-1"
              style={{ background: `${color}26`, color, borderColor: `${color}40` }}
            >
              <CategoryIcon name={category?.icon ?? "circle"} color={color} size={22} />
            </motion.div>
            <div className="min-w-0 flex-1">
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-base flex items-center gap-2">
                  {category?.name ?? "Uncategorised"}
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider rounded-full px-1.5 py-0.5 font-medium",
                      t.chip
                    )}
                  >
                    {t.label}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(tx.occurred_on).toLocaleDateString(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <motion.div
            key={tx.id + "-amount"}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 340, damping: 22, delay: 0.1 }}
            className={cn(
              "mt-4 text-3xl md:text-4xl font-bold tabular-nums tracking-tight",
              t.amountColor
            )}
          >
            {t.sign}
            <PrivateValue mask="••••••">
              {formatCurrency(Number(tx.amount), currency, locale)}
            </PrivateValue>
          </motion.div>
        </div>

        {/* Body */}
        <div className="px-5 pb-3 space-y-3">
          <DetailRow
            icon={<User className="h-3.5 w-3.5" />}
            label="Logged by"
            value={adder?.display_name ?? adder?.email ?? "Unknown"}
          />
          {payer && payer.id !== adder?.id && (
            <DetailRow
              icon={<User className="h-3.5 w-3.5" />}
              label="Paid by"
              value={payer.display_name ?? payer.email ?? "—"}
            />
          )}
          <DetailRow
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Note"
            value={note ?? "NA"}
            valueClassName={note ? "" : "italic text-muted-foreground"}
          />
          {tx.receipt_url && (
            <div className="rounded-lg border overflow-hidden bg-muted">
              <a
                href={tx.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                aria-label="Open receipt in new tab"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tx.receipt_url}
                  alt="Receipt"
                  className="w-full max-h-[40vh] object-contain"
                />
                <div className="px-3 py-1.5 text-[11px] text-muted-foreground inline-flex items-center gap-1.5 border-t bg-background/60">
                  <ReceiptIcon className="h-3 w-3" /> Tap to open receipt
                </div>
              </a>
            </div>
          )}
          <DetailRow
            icon={<Hash className="h-3.5 w-3.5" />}
            label="ID"
            value={tx.id.slice(0, 8)}
            valueClassName="font-mono text-[11px] text-muted-foreground"
          />
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-1 flex items-center gap-2 border-t mt-1 pt-3">
          {onEdit && (
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" className="flex-1" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="h-7 w-7 rounded-md bg-accent grid place-items-center text-muted-foreground shrink-0 mt-0.5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className={cn("break-words", valueClassName)}>{value}</div>
      </div>
    </div>
  );
}
