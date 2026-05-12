"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { TransactionRow } from "@/components/transaction-row";
import { CategoryPie } from "@/components/charts";
import { CategoryDetailDialog } from "@/components/category-detail-dialog";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Transaction } from "@/lib/types";
import {
  PageMotion,
  FadeIn,
  StaggerChildren,
  StaggerItem,
  AnimatedCurrency,
} from "@/components/motion";
import { PrivateValue } from "@/components/private-value";
import { InsightsCarousel } from "@/components/insights-carousel";
import { MemberContributions, StreakChip } from "@/components/gamification";
import { motion } from "motion/react";
import { useTransactions, useCategories } from "@/lib/hooks/use-data";
import { useHousehold, useHouseholdMembers } from "@/lib/hooks/use-household";
import {
  deltaPct,
  groupByCategory,
  lastMonth,
  sumByType,
  thisMonth,
  topCategories,
} from "@/lib/analytics";
import { formatCurrency, isoDate, pct, startOfMonth } from "@/lib/utils";
import {
  ArrowRight,
  AlertTriangle,
  Plus,
  Users,
  Sparkles,
  PieChart,
  Wallet,
  Receipt,
  TrendingUp,
  Camera,
  BellRing,
  X as XIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function OverviewPage() {
  const { data: hh } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();
  const { data: categories = [] } = useCategories();
  const yearStart = isoDate(new Date(new Date().getFullYear(), 0, 1));
  const { data: txs = [], isLoading } = useTransactions({ from: yearStart });

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  const cur = thisMonth(txs);
  const prev = lastMonth(txs);
  const curSums = sumByType(cur);
  const prevSums = sumByType(prev);

  const net = curSums.income - curSums.expense;
  const savingsRate = curSums.income ? Math.max(0, Math.round((net / curSums.income) * 100)) : 0;

  const topExpenses = topCategories(
    cur.filter((t) => t.type === "expense"),
    categories,
    5
  );

  const overBudget = React.useMemo(() => {
    const map = groupByCategory(
      cur.filter((t) => t.type === "expense"),
      categories
    );
    return map
      .filter(({ category, total }) => category.monthly_budget && total > Number(category.monthly_budget))
      .slice(0, 3);
  }, [cur, categories]);

  const monthlyBudgetTotal = React.useMemo(
    () =>
      categories
        .filter((c) => c.type === "expense" && c.monthly_budget)
        .reduce((s, c) => s + Number(c.monthly_budget), 0),
    [categories]
  );

  const catById = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories]
  );

  // Category drill-down: click any row in Top expenses / wedge to see its txs
  const [drillCategory, setDrillCategory] = React.useState<typeof categories[number] | null>(null);
  const [drillTx, setDrillTx] = React.useState<Transaction | null>(null);
  const monthLabelLong = startOfMonth().toLocaleString(locale, {
    month: "long",
    year: "numeric",
  });

  // Delete-with-confirm-and-undo for the transaction detail card
  const supabase = createClient();
  const qc = useQueryClient();
  const confirmDialog = useConfirmDialog();
  const drillTxFresh = React.useMemo(
    () => (drillTx ? txs.find((t) => t.id === drillTx.id) ?? null : null),
    [drillTx, txs]
  );

  const askDeleteTx = React.useCallback(
    (tx: Transaction) => {
      const c = catById.get(tx.category_id);
      const amountStr = formatCurrency(Number(tx.amount), currency, locale);
      confirmDialog({
        title: "Delete this transaction?",
        description: (
          <>
            <span className="font-medium text-foreground">
              {c?.name ?? "Uncategorised"}
            </span>{" "}
            · {amountStr}
            <br />
            <span className="text-muted-foreground">
              You&apos;ll have 8 seconds to undo right after.
            </span>
          </>
        ),
        confirmLabel: "Delete",
        onConfirm: async () => {
          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", tx.id);
          if (error) return toast.error(error.message);
          qc.invalidateQueries({ queryKey: ["transactions"] });
          toast.success(`Deleted${c ? ` "${c.name}"` : ""}`, {
            duration: 8000,
            action: {
              label: "Undo",
              onClick: async () => {
                const { id: _id, created_at: _ca, ...payload } = tx;
                const { error: e2 } = await supabase
                  .from("transactions")
                  .insert(payload);
                if (e2) toast.error(e2.message);
                else {
                  toast.success("Restored");
                  qc.invalidateQueries({ queryKey: ["transactions"] });
                }
              },
            },
          });
          setDrillTx(null);
        },
      });
    },
    [confirmDialog, catById, currency, locale, supabase, qc]
  );

  const recent = txs.slice(0, 6);
  const monthLabel = startOfMonth().toLocaleString(locale, { month: "long", year: "numeric" });

  const isFirstRun = !isLoading && txs.length === 0;
  const isAlone = members.length < 2;

  // "Haven't logged today" smart nudge
  const todayKey = isoDate(new Date());
  const loggedToday = txs.some((t) => t.occurred_on === todayKey);
  const [dismissedNudge, setDismissedNudge] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      setDismissedNudge(sessionStorage.getItem("duddify-nudge-dismissed-on"));
    } catch {}
  }, []);
  const dismissNudge = () => {
    setDismissedNudge(todayKey);
    try {
      sessionStorage.setItem("duddify-nudge-dismissed-on", todayKey);
    } catch {}
  };
  const showNudge =
    !isFirstRun && !loggedToday && txs.length >= 3 && dismissedNudge !== todayKey;

  const copyHouseholdId = () => {
    if (!hh) return;
    navigator.clipboard.writeText(hh.id);
    toast.success("Household ID copied — share with your partner");
  };

  if (isFirstRun) {
    return (
      <FirstRunOverview
        members={members}
        isAlone={isAlone}
        onCopyId={copyHouseholdId}
      />
    );
  }

  return (
    <PageMotion className="container max-w-6xl py-4 md:py-8 space-y-5">
      {/* Hero: greeting + giant animated net number with floating orbs */}
      <div className="relative -mx-4 md:-mx-6 px-4 md:px-6 pt-2 pb-2 mb-1 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 -z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.7, x: -40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute -top-24 left-[10%] h-72 w-72 rounded-full bg-primary/25 blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.7, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
            className="absolute -top-12 right-[5%] h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
          />
          <motion.div
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 right-1/3 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl"
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
            }}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-end">
          <div>
            <PageHeader
              className="mb-2"
              title={
                <>
                  {greeting()},
                  <br className="md:hidden" />
                  <span className="gradient-text-primary"> welcome back.</span>
                </>
              }
              description={`Your ${monthLabel} so far`}
              actions={
                <Button asChild className="hidden md:inline-flex" size="lg">
                  <Link href="/add">
                    <Plus /> Add transaction
                  </Link>
                </Button>
              }
            />
          </div>
          <FadeIn delay={0.2} className="md:text-right">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium mb-0.5">
              Net saved this month
            </div>
            <div
              className={
                "text-4xl md:text-6xl font-bold tabular-nums tracking-tight " +
                (net >= 0 ? "gradient-text-primary" : "text-destructive")
              }
            >
              <PrivateValue mask="••••••••">
                <AnimatedCurrency value={Math.max(0, net)} currency={currency} locale={locale} />
              </PrivateValue>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {savingsRate}% savings rate ·{" "}
              <PrivateValue mask="••••">
                {formatCurrency(curSums.income, currency, locale)}
              </PrivateValue>{" "}
              earned
            </div>
            <div className="mt-2 flex md:justify-end">
              <StreakChip txs={txs} />
            </div>
          </FadeIn>
        </div>
      </div>

      {/* KPIs */}
      <StaggerChildren className="grid grid-cols-2 md:grid-cols-4 gap-3" delay={0.06}>
        <StaggerItem>
          <KpiCard
            label="Spent"
            value={curSums.expense}
            delta={prevSums.expense ? deltaPct(curSums.expense, prevSums.expense) : undefined}
            invertColors
            accent="destructive"
            currency={currency}
            locale={locale}
            hint="vs last month"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Income"
            value={curSums.income}
            delta={prevSums.income ? deltaPct(curSums.income, prevSums.income) : undefined}
            accent="success"
            currency={currency}
            locale={locale}
            hint="vs last month"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Invested"
            value={curSums.investment}
            delta={prevSums.investment ? deltaPct(curSums.investment, prevSums.investment) : undefined}
            accent="primary"
            currency={currency}
            locale={locale}
            hint="vs last month"
          />
        </StaggerItem>
        <StaggerItem>
          <KpiCard
            label="Net saved"
            value={Math.max(0, net)}
            accent={net >= 0 ? "success" : "destructive"}
            currency={currency}
            locale={locale}
            hint={`${savingsRate}% rate`}
          />
        </StaggerItem>
      </StaggerChildren>

      {showNudge && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">Nothing logged today yet</div>
              <div className="text-xs text-muted-foreground">
                Spent something? Just a few seconds to keep your dashboards accurate.
              </div>
            </div>
            <Button asChild size="sm">
              <Link href="/add">
                <Plus className="h-4 w-4" /> Log
              </Link>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              onClick={dismissNudge}
              aria-label="Dismiss"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {overBudget.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-sm">Over budget this month</div>
              <div className="text-xs text-muted-foreground mb-2">
                {overBudget.length} {overBudget.length === 1 ? "category is" : "categories are"} past their budget.
              </div>
              <div className="space-y-2">
                {overBudget.map(({ category, total }) => {
                  const budget = Number(category.monthly_budget);
                  return (
                    <div key={category.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{category.name}</span>
                        <span className="font-medium">
                          <PrivateValue mask="•••">
                            {formatCurrency(total, currency, locale)}
                          </PrivateValue>{" "}
                          /{" "}
                          <PrivateValue mask="•••">
                            {formatCurrency(budget, currency, locale)}
                          </PrivateValue>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-warning"
                          style={{ width: `${Math.min(100, pct(total, budget))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top expenses</CardTitle>
                <CardDescription>Where your money went this month</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/expenses">
                  Details <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No expenses yet this month.</p>
            ) : (
              <div className="space-y-2.5">
                {topExpenses.map(({ category, total }) => {
                  const pctOfTotal = pct(total, curSums.expense);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setDrillCategory(category)}
                      className="w-full text-left rounded-lg p-2 -m-2 hover:bg-accent/60 active:bg-accent transition-colors group"
                      aria-label={`See transactions in ${category.name}`}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium inline-flex items-center gap-1.5">
                          {category.name}
                          <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </span>
                        <span className="tabular-nums">
                          <PrivateValue mask="••••">
                            {formatCurrency(total, currency, locale)}
                          </PrivateValue>{" "}
                          <span className="text-muted-foreground text-xs">({pctOfTotal}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pctOfTotal}%`, background: category.color }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
            <CardDescription>This month by category · hover or tap to inspect</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie
              data={topExpenses.map(({ category, total }) => ({
                name: category.name,
                value: total,
                color: category.color,
              }))}
              currency={currency}
              locale={locale}
              centerLabel="Spent"
              height={240}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest transactions across the household</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/transactions">
                See all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No transactions this month yet.
            </div>
          ) : (
            <StaggerChildren className="space-y-0.5" delay={0.04}>
              {recent.map((t) => (
                <StaggerItem key={t.id}>
                  <TransactionRow
                    tx={t}
                    category={catById.get(t.category_id)}
                    currency={currency}
                    locale={locale}
                  />
                </StaggerItem>
              ))}
            </StaggerChildren>
          )}
        </CardContent>
      </Card>

      {/* Insights + per-member contributions sit at the bottom so the page
          starts with the most actionable info (KPIs / breakdown / recent),
          and ends with deeper analysis. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <InsightsCarousel
            txs={txs}
            categories={categories}
            currency={currency}
            locale={locale}
            monthlyBudgetTotal={monthlyBudgetTotal || null}
          />
        </div>
        <MemberContributions
          txs={cur}
          members={members}
          currency={currency}
          locale={locale}
        />
      </div>

      <CategoryDetailDialog
        open={!!drillCategory}
        onOpenChange={(v) => !v && setDrillCategory(null)}
        category={drillCategory}
        txs={cur}
        members={members}
        currency={currency}
        locale={locale}
        windowLabel={monthLabelLong}
        onSelectTransaction={setDrillTx}
      />

      <TransactionDetailDialog
        open={!!drillTxFresh}
        onOpenChange={(v) => !v && setDrillTx(null)}
        tx={drillTxFresh}
        category={drillTxFresh ? catById.get(drillTxFresh.category_id) : null}
        members={members}
        currency={currency}
        locale={locale}
        onDelete={() => drillTxFresh && askDeleteTx(drillTxFresh)}
      />

      {confirmDialog.element}
    </PageMotion>
  );
}

/* ---------- First-run experience ---------- */

function FirstRunOverview({
  members,
  isAlone,
  onCopyId,
}: {
  members: any[];
  isAlone: boolean;
  onCopyId: () => void;
}) {
  return (
    <PageMotion className="container max-w-3xl py-6 md:py-12 px-4">
      {/* Hero */}
      <div className="relative text-center pb-8 pt-2 mb-6">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
          />
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 left-1/4 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl"
          />
          <motion.div
            animate={{ opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-20 right-1/4 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl"
          />
        </div>

        <motion.div
          initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }}
          className="mx-auto h-20 w-20 rounded-3xl gradient-primary text-primary-foreground grid place-items-center shadow-xl shadow-primary/30 mb-5 animate-pulse-glow"
        >
          <Sparkles className="h-9 w-9" />
        </motion.div>

        <FadeIn delay={0.2}>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            Welcome to <span className="gradient-text-primary">Duddify</span>
          </h1>
          <p className="text-muted-foreground mt-2 md:mt-3 max-w-md mx-auto">
            Your shared household finance dashboard is ready. Log your first transaction to bring it to life.
          </p>
        </FadeIn>

        <FadeIn delay={0.4} className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild size="lg" className="shadow-lg shadow-primary/30">
            <Link href="/add">
              <Plus className="h-5 w-5" /> Add your first transaction
            </Link>
          </Button>
          {isAlone && (
            <Button size="lg" variant="outline" onClick={onCopyId}>
              <Users className="h-5 w-5" /> Copy household ID
            </Button>
          )}
        </FadeIn>
      </div>

      {/* What you'll see preview */}
      <FadeIn delay={0.5}>
        <div className="text-center mb-3">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            What you&apos;ll see here
          </div>
        </div>
        <StaggerChildren
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          delay={0.08}
          initialDelay={0.55}
        >
          <StaggerItem>
            <PreviewCard
              icon={<Wallet className="h-5 w-5" />}
              title="Real-time net saved"
              description="Your income minus expenses, animated, with savings rate"
            />
          </StaggerItem>
          <StaggerItem>
            <PreviewCard
              icon={<PieChart className="h-5 w-5" />}
              title="Where money goes"
              description="Beautiful breakdown by category with budget alerts"
            />
          </StaggerItem>
          <StaggerItem>
            <PreviewCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Investments tracking"
              description="Portfolio P&L, monthly contributions, allocation"
            />
          </StaggerItem>
        </StaggerChildren>
      </FadeIn>

      {/* Quick start checklist */}
      <FadeIn delay={0.7} className="mt-8">
        <Card className="surface">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
              3-step setup
            </div>
            <div className="space-y-2.5">
              <Step
                num={1}
                done={false}
                title="Log a transaction"
                description="Tap the big + button to log an expense, income or investment. Try a recent one."
                action={
                  <Button asChild size="sm">
                    <Link href="/add">
                      <Plus className="h-4 w-4" /> Add now
                    </Link>
                  </Button>
                }
              />
              <Step
                num={2}
                done={false}
                title="Set monthly budgets"
                description="Optional — tap any category to set a limit and get alerts."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/budgets">
                      <PieChart className="h-4 w-4" /> Budgets
                    </Link>
                  </Button>
                }
              />
              <Step
                num={3}
                done={!isAlone}
                title="Invite your partner"
                description={
                  isAlone
                    ? "Tap to copy your household ID. Send it to them — they sign in, pick Join existing, paste."
                    : `${members.length} members in this household — you're set.`
                }
                action={
                  isAlone ? (
                    <Button size="sm" variant="outline" onClick={onCopyId}>
                      <Users className="h-4 w-4" /> Copy ID
                    </Button>
                  ) : null
                }
              />
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Tip */}
      <FadeIn delay={0.85} className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-card/60 backdrop-blur border rounded-full px-3 py-1.5">
          <Camera className="h-3.5 w-3.5 text-primary" />
          Tip: snap a photo of bills directly when logging — they&apos;re saved with the transaction
        </div>
      </FadeIn>
    </PageMotion>
  );
}

function PreviewCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 backdrop-blur p-4 h-full">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center mb-2.5">
        {icon}
      </div>
      <div className="font-medium text-sm leading-tight">{title}</div>
      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Step({
  num,
  done,
  title,
  description,
  action,
}: {
  num: number;
  done: boolean;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/60">
      <div
        className={
          "h-6 w-6 rounded-full grid place-items-center text-xs font-semibold shrink-0 " +
          (done ? "bg-success/20 text-success" : "bg-primary/15 text-primary")
        }
      >
        {done ? "✓" : num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{description}</div>
      </div>
      {action}
    </div>
  );
}
