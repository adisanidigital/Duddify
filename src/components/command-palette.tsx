"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/category-icon";
import { useCategories, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import { usePrivacy } from "@/lib/privacy";
import { useTheme } from "next-themes";
import { formatCurrency } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  TrendingUp,
  Wallet,
  Plus,
  Tag,
  Settings,
  Moon,
  Sun,
  CalendarDays,
  Repeat,
  ListOrdered,
  FileBarChart,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";

const NAV: { href: string; label: string; keywords: string[]; icon: any }[] = [
  { href: "/", label: "Overview", keywords: ["home", "dashboard"], icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", keywords: ["spend", "spending"], icon: Receipt },
  { href: "/income", label: "Income", keywords: ["earn", "salary"], icon: Wallet },
  { href: "/investments", label: "Investments", keywords: ["portfolio", "stocks", "mf"], icon: TrendingUp },
  { href: "/budgets", label: "Budgets", keywords: ["limit", "monthly"], icon: PieChart },
  { href: "/yearly", label: "Yearly", keywords: ["year"], icon: CalendarDays },
  { href: "/reports", label: "Reports", keywords: ["report", "analytics"], icon: FileBarChart },
  { href: "/transactions", label: "All transactions", keywords: ["list"], icon: ListOrdered },
  { href: "/categories", label: "Categories", keywords: ["tag"], icon: Tag },
  { href: "/recurring", label: "Recurring", keywords: ["subscription", "auto"], icon: Repeat },
  { href: "/settings", label: "Settings", keywords: ["preferences"], icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const router = useRouter();
  const { data: hh } = useHousehold();
  const { data: txs = [] } = useTransactions({ limit: 100 });
  const { data: categories = [] } = useCategories();
  const { hidden, toggle: togglePrivacy } = usePrivacy();
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";
  const catById = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories]
  );

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-xl overflow-hidden gap-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search transactions, jump to dashboards, run quick actions
        </DialogDescription>
        <Command className="bg-transparent" shouldFilter loop>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command, search transactions, or jump to a page…"
              className="flex-1 h-12 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results — press Esc to close.
            </Command.Empty>

            <Command.Group
              heading="Quick actions"
              className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5"
            >
              <Item onSelect={() => go("/add")} icon={<Plus className="h-4 w-4" />}>
                Add transaction
              </Item>
              <Item
                onSelect={() => run(togglePrivacy)}
                icon={hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                shortcut={hidden ? "Show amounts" : "Hide amounts"}
              >
                {hidden ? "Show amounts" : "Hide amounts"}
              </Item>
              <Item
                onSelect={() => run(() => setTheme(theme === "dark" ? "light" : "dark"))}
                icon={theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              >
                Switch to {theme === "dark" ? "light" : "dark"} mode
              </Item>
            </Command.Group>

            <Command.Group
              heading="Jump to"
              className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5"
            >
              {NAV.map((n) => (
                <Item
                  key={n.href}
                  onSelect={() => go(n.href)}
                  icon={<n.icon className="h-4 w-4" />}
                  keywords={n.keywords}
                >
                  {n.label}
                </Item>
              ))}
            </Command.Group>

            {txs.length > 0 && (
              <Command.Group
                heading="Recent transactions"
                className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5"
              >
                {txs.slice(0, 30).map((t) => {
                  const c = catById.get(t.category_id);
                  const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
                  return (
                    <Command.Item
                      key={t.id}
                      value={`${c?.name ?? ""} ${t.note ?? ""} ${t.amount}`}
                      onSelect={() => go("/transactions")}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent"
                    >
                      <CategoryIcon
                        name={c?.icon ?? "circle"}
                        color={c?.color ?? "#64748b"}
                        size={14}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{c?.name ?? "—"}</div>
                        {t.note && (
                          <div className="text-xs text-muted-foreground truncate">{t.note}</div>
                        )}
                      </div>
                      <div
                        className={
                          "tabular-nums text-sm font-medium " +
                          (t.type === "income"
                            ? "text-success"
                            : t.type === "expense"
                            ? "text-destructive"
                            : "")
                        }
                      >
                        {sign}
                        {formatCurrency(Number(t.amount), currency, locale)}
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}
          </Command.List>
          <div className="border-t px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>
              <kbd className="bg-muted rounded px-1 py-0.5 text-[9px] font-mono">↑</kbd>{" "}
              <kbd className="bg-muted rounded px-1 py-0.5 text-[9px] font-mono">↓</kbd> to navigate ·{" "}
              <kbd className="bg-muted rounded px-1 py-0.5 text-[9px] font-mono">↵</kbd> to select
            </span>
            <span>
              Open with{" "}
              <kbd className="bg-muted rounded px-1 py-0.5 text-[9px] font-mono">⌘K</kbd>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Item({
  onSelect,
  children,
  icon,
  shortcut,
  keywords,
}: {
  onSelect: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      keywords={keywords}
      className="flex items-center gap-2.5 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent"
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[10px] text-muted-foreground">{shortcut}</span>}
    </Command.Item>
  );
}
