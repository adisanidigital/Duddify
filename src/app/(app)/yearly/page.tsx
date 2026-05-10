"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { MonthBars, SavingsRateLine } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import { groupByMonth, sumByType } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageMotion } from "@/components/motion";

export default function YearlyPage() {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const { data: hh } = useHousehold();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const { data: txs = [] } = useTransactions({ from, to });

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  const monthly = React.useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const k = `${year}-${String(i + 1).padStart(2, "0")}`;
      return { month: k.slice(5), key: k, expense: 0, income: 0, investment: 0, transfer: 0, net: 0 };
    });
    const grouped = groupByMonth(txs);
    for (const g of grouped) {
      const idx = parseInt(g.month.slice(5), 10) - 1;
      if (idx >= 0 && idx < 12) {
        months[idx] = { ...months[idx], ...g, month: g.month.slice(5) };
      }
    }
    return months;
  }, [txs, year]);

  const totals = sumByType(txs);
  const savingsRateData = monthly.map((m) => ({
    month: m.month,
    rate: m.income ? Math.max(0, Math.round(((m.income - m.expense) / m.income) * 100)) : 0,
  }));
  const yearSavingsRate = totals.income
    ? Math.max(0, Math.round(((totals.income - totals.expense) / totals.income) * 100))
    : 0;

  return (
    <PageMotion className="container max-w-6xl py-4 md:py-8 space-y-5">
      <PageHeader
        title="Yearly overview"
        description="Compare months, see the big picture"
        actions={
          <div className="inline-flex items-center gap-1 rounded-lg border bg-card px-1 py-0.5">
            <Button variant="ghost" size="icon" onClick={() => setYear(year - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium px-2 min-w-[4rem] text-center">{year}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setYear(year + 1)}
              disabled={year >= new Date().getFullYear()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Spent" value={totals.expense} currency={currency} locale={locale} accent="destructive" />
        <Stat label="Income" value={totals.income} currency={currency} locale={locale} accent="success" />
        <Stat label="Invested" value={totals.investment} currency={currency} locale={locale} accent="primary" />
        <Stat
          label="Savings rate"
          value={yearSavingsRate}
          isPercent
          accent={yearSavingsRate >= 20 ? "success" : "warning"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Month by month</CardTitle>
          <CardDescription>Income vs expense vs investments</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthBars
            data={monthly}
            series={[
              { key: "income", name: "Income", color: "hsl(var(--success))" },
              { key: "expense", name: "Expense", color: "hsl(var(--destructive))" },
              { key: "investment", name: "Invested", color: "hsl(var(--primary))" },
            ]}
            currency={currency}
            locale={locale}
            height={280}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Savings rate trend</CardTitle>
          <CardDescription>(Income − Expense) ÷ Income, by month</CardDescription>
        </CardHeader>
        <CardContent>
          <SavingsRateLine data={savingsRateData} height={220} />
        </CardContent>
      </Card>
    </PageMotion>
  );
}

function Stat({
  label,
  value,
  currency,
  locale,
  accent,
  isPercent,
}: {
  label: string;
  value: number;
  currency?: string;
  locale?: string;
  accent: "primary" | "destructive" | "success" | "warning";
  isPercent?: boolean;
}) {
  const cls = {
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-success",
    warning: "text-warning",
  }[accent];
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={"text-2xl font-semibold tabular-nums mt-1 " + cls}>
        {isPercent ? `${value}%` : formatCurrency(value, currency, locale)}
      </div>
    </Card>
  );
}
