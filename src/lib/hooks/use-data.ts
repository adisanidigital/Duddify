"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Category, InvestmentHolding, Transaction } from "@/lib/types";
import { useHousehold } from "./use-household";

export function useCategories() {
  const supabase = createClient();
  const { data: hh } = useHousehold();
  return useQuery({
    queryKey: ["categories", hh?.id],
    enabled: !!hh?.id,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("household_id", hh!.id)
        .eq("archived", false)
        .order("type")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

export function useTransactions(opts?: { from?: string; to?: string; limit?: number }) {
  const supabase = createClient();
  const { data: hh } = useHousehold();
  return useQuery({
    queryKey: ["transactions", hh?.id, opts?.from, opts?.to, opts?.limit],
    enabled: !!hh?.id,
    queryFn: async (): Promise<Transaction[]> => {
      let q = supabase
        .from("transactions")
        .select("*")
        .eq("household_id", hh!.id)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (opts?.from) q = q.gte("occurred_on", opts.from);
      if (opts?.to) q = q.lte("occurred_on", opts.to);
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}

export function useHoldings() {
  const supabase = createClient();
  const { data: hh } = useHousehold();
  return useQuery({
    queryKey: ["holdings", hh?.id],
    enabled: !!hh?.id,
    queryFn: async (): Promise<InvestmentHolding[]> => {
      const { data, error } = await supabase
        .from("investment_holdings")
        .select("*")
        .eq("household_id", hh!.id)
        .order("type")
        .order("name");
      if (error) throw error;
      return (data ?? []) as InvestmentHolding[];
    },
  });
}
