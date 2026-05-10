"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Home, Users } from "lucide-react";

const CURRENCIES = [
  { code: "INR", label: "INR (₹) — India", locale: "en-IN" },
  { code: "USD", label: "USD ($) — United States", locale: "en-US" },
  { code: "EUR", label: "EUR (€) — Europe", locale: "en-IE" },
  { code: "GBP", label: "GBP (£) — UK", locale: "en-GB" },
  { code: "AED", label: "AED (د.إ) — UAE", locale: "en-AE" },
  { code: "SGD", label: "SGD (S$) — Singapore", locale: "en-SG" },
  { code: "AUD", label: "AUD (A$) — Australia", locale: "en-AU" },
  { code: "CAD", label: "CAD (C$) — Canada", locale: "en-CA" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const qc = useQueryClient();
  const [name, setName] = React.useState("Our Household");
  const [currency, setCurrency] = React.useState("INR");
  const [joinId, setJoinId] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? "en-US";
    const { error } = await supabase.rpc("create_household_with_defaults", {
      p_name: name,
      p_currency: currency,
      p_locale: locale,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries();
    toast.success("Household created");
    router.replace("/");
  };

  const join = async () => {
    if (!joinId.trim()) return;
    setLoading(true);
    const { error } = await supabase.rpc("join_household", { p_id: joinId.trim() });
    setLoading(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries();
    toast.success("Joined household");
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 safe-top safe-bottom">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Set up your household</CardTitle>
          <CardDescription>
            One household = one shared budget. Invite your partner later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="create">
                <Home className="mr-2 h-4 w-4" /> Create new
              </TabsTrigger>
              <TabsTrigger value="join">
                <Users className="mr-2 h-4 w-4" /> Join existing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="name">Household name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The Sharmas"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="lg" className="w-full" onClick={create} disabled={loading}>
                Create household
              </Button>
              <p className="text-xs text-muted-foreground">
                We&apos;ll seed sensible default categories — you can edit them anytime.
              </p>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="hid">Household ID</Label>
                <Input
                  id="hid"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  placeholder="Paste the ID your partner shared"
                />
                <p className="text-xs text-muted-foreground">
                  Your partner can find this in Settings → Household.
                </p>
              </div>
              <Button size="lg" className="w-full" onClick={join} disabled={loading}>
                Join household
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
