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
import { Copy, Download, LogOut, Pencil, Check, X, UserMinus, DoorOpen, Palette, Sun, Moon, Monitor, Share2, IndianRupee } from "lucide-react";
import { useColorTheme } from "@/components/color-theme";
import { COLOR_THEMES } from "@/lib/color-themes";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { formatCurrency, isoDate } from "@/lib/utils";
import { PageMotion } from "@/components/motion";
import { ReminderCard } from "@/components/reminder-card";
import { SecuritySettings } from "@/components/security-settings";
import { FeatureFlagsSettings } from "@/components/feature-flags-settings";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

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

  // Nickname (display_name) edit state
  const [editingName, setEditingName] = React.useState(false);
  const [nickname, setNickname] = React.useState(profile?.display_name ?? "");
  const [savingNickname, setSavingNickname] = React.useState(false);
  const confirmDialog = useConfirmDialog();

  React.useEffect(() => {
    if (hh) {
      setName(hh.name);
      setCurr(hh.currency);
    }
  }, [hh]);

  React.useEffect(() => {
    if (profile && !editingName) setNickname(profile.display_name ?? "");
  }, [profile, editingName]);

  const saveNickname = async () => {
    if (!profile) return;
    const trimmed = nickname.trim();
    if (!trimmed) return toast.error("Nickname can't be empty");
    setSavingNickname(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", profile.id);
    setSavingNickname(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["members"] });
    toast.success("Nickname updated");
    setEditingName(false);
  };

  const removeMember = (userId: string, displayName: string | null) => {
    confirmDialog({
      title: `Remove ${displayName ?? "this member"}?`,
      description: (
        <>
          Their transactions stay in the household, but they&apos;ll no longer
          have access.
          <br />
          <span className="text-muted-foreground">
            They can rejoin later with the household ID.
          </span>
        </>
      ),
      confirmLabel: "Remove",
      onConfirm: async () => {
        const { error } = await supabase.rpc("remove_household_member", {
          p_user_id: userId,
        });
        if (error) return toast.error(error.message);
        qc.invalidateQueries({ queryKey: ["members"] });
        toast.success("Member removed");
      },
    });
  };

  // Inline edit a household member's nickname (shared across household)
  const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null);
  const [memberNickname, setMemberNickname] = React.useState("");
  const [savingMember, setSavingMember] = React.useState(false);

  const startEditMember = (id: string, current: string | null) => {
    setEditingMemberId(id);
    setMemberNickname(current ?? "");
  };
  const cancelEditMember = () => {
    setEditingMemberId(null);
    setMemberNickname("");
  };
  const saveMemberNickname = async () => {
    if (!editingMemberId) return;
    const trimmed = memberNickname.trim();
    if (!trimmed) return toast.error("Nickname can't be empty");
    setSavingMember(true);
    const { error } = await supabase.rpc("update_member_nickname", {
      p_user_id: editingMemberId,
      p_nickname: trimmed,
    });
    setSavingMember(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Nickname updated");
    cancelEditMember();
  };

  const leaveHousehold = () => {
    confirmDialog({
      title: "Leave this household?",
      description: (
        <>
          You&apos;ll lose access to all the shared transactions and dashboards.
          <br />
          <span className="text-muted-foreground">
            You can rejoin later with the household ID.
          </span>
        </>
      ),
      confirmLabel: "Leave",
      onConfirm: async () => {
        const { error } = await supabase.rpc("leave_household");
        if (error) return toast.error(error.message);
        if (typeof window !== "undefined") window.location.replace("/onboarding");
      },
    });
  };

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
    <PageMotion className="container max-w-3xl py-4 md:py-8 space-y-4">
      <PageHeader title="Settings" description="Household, members, export" />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This is you — pick any nickname you like</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted overflow-hidden grid place-items-center shrink-0">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm">{profile?.display_name?.[0] ?? "U"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your nickname"
                  className="h-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNickname();
                    if (e.key === "Escape") {
                      setNickname(profile?.display_name ?? "");
                      setEditingName(false);
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={saveNickname}
                  disabled={savingNickname}
                  aria-label="Save"
                >
                  <Check className="h-4 w-4 text-success" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setNickname(profile?.display_name ?? "");
                    setEditingName(false);
                  }}
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="font-medium truncate">{profile?.display_name}</div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditingName(true)}
                  aria-label="Edit nickname"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      <SecuritySettings userLabel={profile?.display_name ?? profile?.email} />

      <FeatureFlagsSettings />

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
              {members.map((m) => {
                const isSelf = m.id === profile?.id;
                const isEditing = editingMemberId === m.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-accent/40 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted overflow-hidden grid place-items-center shrink-0">
                      {m.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs">{(m.display_name ?? "U")[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={memberNickname}
                            onChange={(e) => setMemberNickname(e.target.value)}
                            placeholder="Nickname"
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveMemberNickname();
                              if (e.key === "Escape") cancelEditMember();
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={saveMemberNickname}
                            disabled={savingMember}
                            aria-label="Save"
                          >
                            <Check className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={cancelEditMember}
                            aria-label="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-medium truncate flex items-center gap-1.5">
                            {m.display_name}
                            {isSelf && (
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                you
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => startEditMember(m.id, m.display_name)}
                          aria-label="Edit nickname"
                          title="Edit nickname"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isSelf && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMember(m.id, m.display_name)}
                            aria-label="Remove member"
                            title="Remove from household"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Tap the pencil to set a nickname for any member — it&apos;s shared across the household.
              Removing detaches a member but keeps their past transactions.
            </p>
          </div>

          <Separator />

          <div>
            <Button variant="outline" onClick={leaveHousehold} className="text-destructive hover:text-destructive">
              <DoorOpen className="h-4 w-4" /> Leave household
            </Button>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              You&apos;ll be returned to onboarding. Past data stays in the household.
            </p>
          </div>
        </CardContent>
      </Card>

      {members.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Who owes whom (this month)</CardTitle>
            <CardDescription>Assumes expenses are split equally · tap a row to share / pay</CardDescription>
          </CardHeader>
          <CardContent>
            {settle.settle.length === 0 ? (
              <p className="text-sm text-muted-foreground">All settled up.</p>
            ) : (
              <SettleUpList
                rows={settle.settle.map((s) => ({
                  from: memberById.get(s.from)?.display_name ?? "Member",
                  to: memberById.get(s.to)?.display_name ?? "Member",
                  amount: s.amount,
                }))}
                currency={currency}
                locale={locale}
              />
            )}
          </CardContent>
        </Card>
      )}

      <ReminderCard />

      <AppearanceCard />

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

      {confirmDialog.element}
    </PageMotion>
  );
}

function AppearanceCard() {
  const { theme: colorTheme, setTheme: setColorTheme } = useColorTheme();
  const { theme: mode, setTheme: setMode, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-4 w-4" /> Appearance
        </CardTitle>
        <CardDescription>Pick a color theme and light/dark mode</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Mode */}
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Mode
          </Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { id: "light", label: "Light", icon: Sun },
              { id: "system", label: "System", icon: Monitor },
              { id: "dark", label: "Dark", icon: Moon },
            ].map((m) => {
              const active = mounted && mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 h-10 rounded-lg border transition-all text-sm",
                    active
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color theme */}
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Color theme
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {COLOR_THEMES.map((t) => {
              const active = mounted && colorTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setColorTheme(t.id)}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                    active
                      ? "border-primary ring-1 ring-primary/40 bg-primary/5"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <div className="flex -space-x-1.5 shrink-0">
                    {t.swatch.map((c, i) => (
                      <span
                        key={i}
                        className="h-5 w-5 rounded-full border-2 border-background"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight flex items-center gap-1.5">
                      {t.name}
                      {active && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground truncate leading-tight">
                      {t.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Theme is per-device. Reflects throughout the app and in PDF exports.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SettleUpList({
  rows,
  currency,
  locale,
}: {
  rows: { from: string; to: string; amount: number }[];
  currency: string;
  locale: string;
}) {
  const [upiOpenFor, setUpiOpenFor] = React.useState<number | null>(null);
  const [upiId, setUpiId] = React.useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("duddify.last-upi-id") ?? "";
  });

  const buildUpiUrl = (amount: number, payeeName: string, payerName: string) => {
    if (!upiId) return null;
    const params = new URLSearchParams({
      pa: upiId,
      pn: payeeName,
      am: amount.toFixed(2),
      cu: "INR",
      tn: `Settle up from ${payerName} via Duddify`,
    });
    return `upi://pay?${params.toString()}`;
  };

  const shareRow = async (r: { from: string; to: string; amount: number }) => {
    const text = `Settle up: ${r.from} → ${r.to} ${formatCurrency(r.amount, currency, locale)} (via Duddify)`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't share / copy");
    }
  };

  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const upiOpen = upiOpenFor === i;
        return (
          <div key={i} className="rounded-lg border p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm min-w-0 flex-1">
                <span className="font-medium">{r.from}</span>
                <span className="text-muted-foreground"> owes </span>
                <span className="font-medium">{r.to}</span>
              </div>
              <span className="tabular-nums font-semibold text-sm shrink-0">
                {formatCurrency(r.amount, currency, locale)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {currency === "INR" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setUpiOpenFor(upiOpen ? null : i)}
                    aria-label="Pay via UPI"
                    title="Pay via UPI"
                  >
                    <IndianRupee className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => shareRow(r)}
                  aria-label="Share"
                  title="Share or copy"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {upiOpen && (
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <Input
                  placeholder={`${r.to}'s UPI ID e.g. name@bank`}
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  size="sm"
                  disabled={!upiId.trim() || !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())}
                  onClick={() => {
                    try {
                      localStorage.setItem("duddify.last-upi-id", upiId.trim());
                    } catch {}
                    const url = buildUpiUrl(r.amount, r.to, r.from);
                    if (url) {
                      window.location.href = url;
                    }
                  }}
                >
                  Open UPI app
                </Button>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
        UPI link opens GPay / PhonePe / Paytm on phone. Share button uses your
        device&apos;s native share sheet (or copies the message on desktop).
      </p>
    </div>
  );
}
