"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { CategoryPie, MonthBars, TrendArea } from "@/components/charts";
import { useCategories, useHoldings, useTransactions } from "@/lib/hooks/use-data";
import { useHousehold } from "@/lib/hooks/use-household";
import { PageMotion } from "@/components/motion";
import { groupByCategory, groupByMonth } from "@/lib/analytics";
import { formatCurrency, isoDate, pct } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const HOLDING_TYPES = ["Mutual Funds", "Stocks", "FD / RD", "Gold", "Crypto", "PF / NPS", "Real Estate", "Other"];

export default function InvestmentsPage() {
  const { data: hh } = useHousehold();
  const { data: categories = [] } = useCategories();
  const yearStart = isoDate(new Date(new Date().getFullYear() - 1, 0, 1));
  const { data: txs = [] } = useTransactions({ from: yearStart });
  const { data: holdings = [] } = useHoldings();

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  const investments = txs.filter((t) => t.type === "investment");
  const monthly = groupByMonth(investments);
  const byCat = groupByCategory(investments, categories);

  const totalContributed = investments.reduce((s, t) => s + Number(t.amount), 0);
  const portfolioValue = holdings.reduce((s, h) => s + Number(h.current_value), 0);
  const investedValue = holdings.reduce((s, h) => s + Number(h.invested_value), 0);
  const gain = portfolioValue - investedValue;
  const gainPct = pct(gain, investedValue);

  const ytdInvestments = investments
    .filter((t) => t.occurred_on >= isoDate(new Date(new Date().getFullYear(), 0, 1)))
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <PageMotion className="container max-w-6xl py-4 md:py-8 space-y-5">
      <PageHeader
        title="Investments"
        description="Your wealth at a glance"
        actions={<HoldingDialog />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Portfolio value</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">
            {formatCurrency(portfolioValue, currency, locale)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total invested</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">
            {formatCurrency(investedValue, currency, locale)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Gain / Loss</div>
          <div
            className={
              "text-2xl font-semibold tabular-nums mt-1 " +
              (gain >= 0 ? "text-success" : "text-destructive")
            }
          >
            {formatCurrency(gain, currency, locale)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {investedValue ? `${gainPct}%` : "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">YTD contributed</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">
            {formatCurrency(ytdInvestments, currency, locale)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly contributions</CardTitle>
            <CardDescription>How much you invested each month</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={monthly}
              dataKey="investment"
              name="Invested"
              currency={currency}
              locale={locale}
              height={240}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By type</CardTitle>
            <CardDescription>Allocation of contributions</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie
              data={byCat.map(({ category, total }) => ({
                name: category.name,
                value: total,
                color: category.color,
              }))}
              currency={currency}
              locale={locale}
              height={240}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio holdings</CardTitle>
          <CardDescription>
            Manually maintained. Update current values periodically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No holdings yet. Add your first one to track portfolio value.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground text-left">
                    <th className="px-2 py-2 font-medium">Holding</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium text-right">Invested</th>
                    <th className="px-2 py-2 font-medium text-right">Current</th>
                    <th className="px-2 py-2 font-medium text-right">P&amp;L</th>
                    <th className="px-2 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const g = Number(h.current_value) - Number(h.invested_value);
                    return (
                      <tr key={h.id} className="border-t">
                        <td className="px-2 py-3 font-medium">{h.name}</td>
                        <td className="px-2 py-3 text-muted-foreground">{h.type}</td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {formatCurrency(Number(h.invested_value), currency, locale)}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {formatCurrency(Number(h.current_value), currency, locale)}
                        </td>
                        <td
                          className={
                            "px-2 py-3 text-right tabular-nums " +
                            (g >= 0 ? "text-success" : "text-destructive")
                          }
                        >
                          {formatCurrency(g, currency, locale)}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <HoldingActions id={h.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-3">
            Logged via transactions: {formatCurrency(totalContributed, currency, locale)} total
          </div>
        </CardContent>
      </Card>
    </PageMotion>
  );
}

function HoldingDialog({ initial }: { initial?: any } = {}) {
  const supabase = createClient();
  const qc = useQueryClient();
  const { data: hh } = useHousehold();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(initial?.name ?? "");
  const [type, setType] = React.useState(initial?.type ?? "Mutual Funds");
  const [invested, setInvested] = React.useState(String(initial?.invested_value ?? ""));
  const [current, setCurrent] = React.useState(String(initial?.current_value ?? ""));
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    if (!hh || !name || !invested) return toast.error("Name and invested value required");
    setBusy(true);
    const payload = {
      household_id: hh.id,
      name,
      type,
      invested_value: parseFloat(invested),
      current_value: parseFloat(current || invested),
      notes: notes || null,
      last_updated: new Date().toISOString(),
    };
    const { error } = initial?.id
      ? await supabase.from("investment_holdings").update(payload).eq("id", initial.id)
      : await supabase.from("investment_holdings").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["holdings"] });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Add holding
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit holding" : "Add holding"}</DialogTitle>
          <DialogDescription>Track an investment manually.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Parag Parikh Flexi Cap" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOLDING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Invested</Label>
              <Input inputMode="decimal" value={invested} onChange={(e) => setInvested(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Current value</Label>
              <Input inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button onClick={save} disabled={busy} className="w-full" size="lg">
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HoldingActions({ id }: { id: string }) {
  const supabase = createClient();
  const qc = useQueryClient();
  const remove = async () => {
    if (!confirm("Delete this holding?")) return;
    const { error } = await supabase.from("investment_holdings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["holdings"] });
    toast.success("Deleted");
  };
  return (
    <Button variant="ghost" size="icon" onClick={remove}>
      <Trash2 className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
