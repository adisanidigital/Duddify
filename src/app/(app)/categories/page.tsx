"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { CategoryIcon, ICON_NAMES } from "@/components/category-icon";
import { useCategories } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Category, TxType } from "@/lib/types";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageMotion } from "@/components/motion";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn, formatCurrency } from "@/lib/utils";

const COLORS = [
  "#22c55e", "#16a34a", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#f59e0b", "#eab308", "#84cc16", "#64748b",
];

export default function CategoriesPage() {
  const { data: hh } = useHousehold();
  const { data: categories = [] } = useCategories();
  const [type, setType] = React.useState<TxType>("expense");

  const filtered = categories.filter((c) => c.type === type);

  return (
    <PageMotion className="container max-w-4xl py-4 md:py-8 space-y-4">
      <PageHeader
        title="Categories"
        description="Customise categories, colors, icons and budgets"
        actions={<CategoryDialog type={type} />}
      />

      <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
        <TabsList>
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="investment">Investment</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
        </TabsList>
        <TabsContent value={type}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{filtered.length} categories</CardTitle>
              <CardDescription>Tap to edit</CardDescription>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filtered.map((c) => (
                    <CategoryRow key={c.id} c={c} currency={hh?.currency} locale={hh?.locale} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageMotion>
  );
}

function CategoryRow({
  c,
  currency = "INR",
  locale = "en-IN",
}: {
  c: Category;
  currency?: string;
  locale?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
      <CategoryIcon name={c.icon} color={c.color} size={18} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{c.name}</div>
        {c.monthly_budget ? (
          <div className="text-xs text-muted-foreground">
            Budget: {formatCurrency(Number(c.monthly_budget), currency, locale)}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No budget</div>
        )}
      </div>
      <CategoryDialog initial={c} type={c.type} trigger={
        <Button variant="ghost" size="icon" aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      } />
      <DeleteCategoryButton category={c} />
    </div>
  );
}

function DeleteCategoryButton({ category }: { category: Category }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const confirmDialog = useConfirmDialog();

  const performDelete = async () => {
    const { error } = await supabase
      .from("categories")
      .update({ archived: true })
      .eq("id", category.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["categories"] });
    toast.success(`Archived "${category.name}"`, {
      duration: 8000,
      action: {
        label: "Undo",
        onClick: async () => {
          const { error: e2 } = await supabase
            .from("categories")
            .update({ archived: false })
            .eq("id", category.id);
          if (e2) {
            toast.error(e2.message);
          } else {
            toast.success("Restored");
            qc.invalidateQueries({ queryKey: ["categories"] });
          }
        },
      },
    });
  };

  const askDelete = () =>
    confirmDialog({
      title: `Delete "${category.name}"?`,
      description: (
        <>
          The category will be archived. Existing transactions keep their
          reference and stay visible.
          <br />
          <span className="text-muted-foreground">
            You&apos;ll have 8 seconds to undo right after.
          </span>
        </>
      ),
      confirmLabel: "Delete",
      onConfirm: performDelete,
    });

  return (
    <>
      <Button variant="ghost" size="icon" onClick={askDelete} aria-label="Delete">
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
      {confirmDialog.element}
    </>
  );
}

function CategoryDialog({
  initial,
  type,
  trigger,
}: {
  initial?: Category;
  type: TxType;
  trigger?: React.ReactNode;
}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const { data: hh } = useHousehold();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(initial?.name ?? "");
  const [color, setColor] = React.useState(initial?.color ?? COLORS[0]);
  const [icon, setIcon] = React.useState(initial?.icon ?? "circle");
  const [budget, setBudget] = React.useState(
    initial?.monthly_budget ? String(initial.monthly_budget) : ""
  );
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    if (!hh || !name) return toast.error("Name is required");
    setBusy(true);
    const payload = {
      household_id: hh.id,
      name,
      type,
      color,
      icon,
      monthly_budget: budget ? parseFloat(budget) : null,
      archived: false,
    };
    const { error } = initial?.id
      ? await supabase.from("categories").update(payload).eq("id", initial.id)
      : await supabase.from("categories").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["categories"] });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus /> New category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((cl) => (
                <button
                  key={cl}
                  type="button"
                  onClick={() => setColor(cl)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === cl ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ background: cl }}
                  aria-label={cl}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-7 gap-2 max-h-44 overflow-y-auto p-1">
              {ICON_NAMES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setIcon(n)}
                  className={cn(
                    "p-2 rounded-lg border transition-colors grid place-items-center",
                    icon === n ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                  )}
                >
                  <CategoryIcon name={n} color={color} size={16} />
                </button>
              ))}
            </div>
          </div>

          {type === "expense" && (
            <div className="space-y-1.5">
              <Label>Monthly budget (optional)</Label>
              <Input
                inputMode="decimal"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <Button onClick={save} disabled={busy} size="lg" className="w-full">
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
