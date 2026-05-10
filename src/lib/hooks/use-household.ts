"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Household, Profile } from "@/lib/types";

export function useSession() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
}

export function useProfile() {
  const supabase = createClient();
  const { data: user } = useSession();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useHousehold() {
  const supabase = createClient();
  const { data: profile } = useProfile();
  return useQuery({
    queryKey: ["household", profile?.household_id],
    enabled: !!profile?.household_id,
    queryFn: async (): Promise<Household | null> => {
      const { data, error } = await supabase
        .from("households")
        .select("*")
        .eq("id", profile!.household_id!)
        .maybeSingle();
      if (error) throw error;
      return data as Household | null;
    },
  });
}

export function useHouseholdMembers() {
  const supabase = createClient();
  const { data: profile } = useProfile();
  return useQuery({
    queryKey: ["members", profile?.household_id],
    enabled: !!profile?.household_id,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("household_id", profile!.household_id!);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}
