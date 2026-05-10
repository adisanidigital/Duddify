"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { useHousehold, useHouseholdMembers, useProfile } from "@/lib/hooks/use-household";
import { useTransactions } from "@/lib/hooks/use-data";
import { useHoldings } from "@/lib/hooks/use-data";
import { whoOwesWhom } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Download, LogOut } from "lucide-react";
import { formatCurrency, isoDate } from "@/lib/utils";

const CURRENCIES = [
  { code: "INR", locale: "en-IN" },
  { code: "USD", locale: "en-US" },
  { code: "EUR", locale: "en-IE" },
  { code: "GBP", locale: "en-GB" },
  { code: "AED", locale: "en-AE" },
  { code: "SGD", locale: "en-SG" },
  { code: "AUD", locale: "en-AU" },
  { code: "CAD", locale: "en-CA" },
];

export default function SettingsPage() {
  const supabase = createClient();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: hh } = useHousehold();
  const { data: members = [] } = useHouseholdMembers();
  const monthStart = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const { data: monthTxs = [] } = useTransactions({ from: monthStart });
  const { data: allTxs = [] } = useTransactions({ limit: 5000 });
  const { data: holdings = [] } = useHoldings();

  const currency = hh?.currency ?? "INR";
  const locale = hh?.locale ?? "en-IN";

  const [name, setName] = React.useState(hh?.name ?? "");
  const [curr, setCurr] = React.useState(hh?.currency ?? "INR");

  React.useEffect(() => {
    if (hh) {
      setName(hh.name);
      setCurr(hh.currency);
    }
  }, [hh]);

  const updateHousehold = async () => {
    if (!hh) return;
    const localeMatch = CURRENCIES.find((c) => c.code === curr)?.locale ?? "en-US";
    const { error } = await supabase
      .from("households")
      .update({ name, currency: curr, locale: localeMatch })
      .eq("id", hh.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries();
    toast.success("Saved");
  };

  const copyId = () => {
    if (!hh) return;
    navigator.clipboard.writeText(hh.id);
    toast.success("Household ID copied — share with your partner");
  };

  const settle = whoOwesWhom(monthTxs, members);
  const memberById = new Map(members.map((m) => [m.id, m] as const));

  const exportCsv = () => {
    const rows = [
      ["date", "type", "amount", "currency", "category_id", "user_id", "paid_by", "note"].join(","),
      ...allTxs.map((t) =>
        [
          t.occurred_on,
          t.type,
          t.amount,
          currency,
          t.category_id,
          t.user_id,
          t.paid_by ?? "",
          (t.note ?? "").replace(/[",\n]/g, " "),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-3xl py-4 md:py-8 space-y-4">
      <PageHeader title="Settings" description="Household, members, export" />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This is you</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted overflow-hidden grid place-items-center">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm">{profile?.display_name?.[0] ?? "U"}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium">{profile?.display_name}</div>
            <div className="text-xs text-muted-foreground">{profile?.email}</div>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Household</CardTitle>
          <CardDescription>Shared with your partner</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={curr} onValueChange={setCurr}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} ({c.locale})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={updateHousehold}>Save</Button>

          <Separator />

          <div>
            <Label>Household ID (share to invite)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={hh?.id ?? ""} readOnly className="font-mono text-xs" />
              <Button variant="outline" onClick={copyId}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Send this ID to your partner. They sign in, then choose &quot;Join existing&quot; on onboarding.
            </p>
          </div>

          <div>
            <Label>Members ({members.length})</Label>
            <div className="space-y-1 mt-1.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-1.5">
                  <div className="h-8 w-8 rounded-full bg-muted overflow-hidden grid place-items-center">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs">{(m.display_name ?? "U")[0]}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.display_name}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {members.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Who owes whom (this month)</CardTitle>
            <CardDescription>Assumes expenses are split equally</CardDescription>
          </CardHeader>
          <CardContent>
            {settle.settle.length === 0 ? (
              <p className="text-sm text-muted-foreground">All settled up.</p>
            ) : (
              <div className="space-y-2">
                {settle.settle.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5">
                    <span>
                      <span className="font-medium">{memberById.get(s.from)?.display_name}</span>
                      {" → "}
                      <span className="font-medium">{memberById.get(s.to)?.display_name}</span>
                    </span>
                    <span className="tabular-nums font-semibold">
                      {formatCurrency(s.amount, currency, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Export your transactions</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV ({allTxs.length})
          </Button>
          <div className="text-xs text-muted-foreground self-center">
            {holdings.length} holdings tracked
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
