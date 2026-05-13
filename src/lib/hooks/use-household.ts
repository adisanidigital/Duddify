"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Household, Profile } from "@/lib/types";

/**
 * Race a promise against a timeout. If the timeout wins we throw so React
 * Query can surface a real error state instead of an indefinite spinner.
 *
 * Mobile networks (and PWAs after the OS suspends them) are notorious for
 * letting fetches hang for 30–60 seconds. The auth/profile/household queries
 * gate the entire app shell, so a single hang = a frozen splash. Capping
 * each at a few seconds means worst-case the user sees the app render
 * (possibly with empty data) instead of a stuck grid screen.
 */
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * Returns the current Supabase user.
 *
 * Implementation notes:
 *  - Uses `getSession()` (reads JWT from localStorage, instant) instead of
 *    `getUser()` (network round-trip). The middleware already validates the
 *    token server-side on every request, so we don't need to re-verify it
 *    on the client.
 *  - Subscribes once to `onAuthStateChange` so the cached user updates
 *    immediately on sign-in / sign-out / token refresh, without a refetch.
 *  - `staleTime: Infinity` because the listener is the source of truth.
 */
export function useSession() {
  const supabase = createClient();
  const qc = useQueryClient();

  // One-time subscription — push auth changes into the React Query cache so
  // every consumer of useSession reacts instantly without a refetch.
  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      qc.setQueryData(["session"], session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
    // supabase + qc are stable singletons — no need to react to them changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useQuery({
    queryKey: ["session"],
    staleTime: Infinity,
    retry: 0, // local read — failure is a real error, not a transient one
    queryFn: async () => {
      const { data } = await withTimeout(
        supabase.auth.getSession(),
        4000,
        "auth.getSession"
      );
      return data.session?.user ?? null;
    },
  });
}

export function useProfile() {
  const supabase = createClient();
  const { data: user } = useSession();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    retry: 1,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        8000,
        "profiles.select"
      );
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
    retry: 1,
    queryFn: async (): Promise<Household | null> => {
      const { data, error } = await withTimeout(
        supabase
          .from("households")
          .select("*")
          .eq("id", profile!.household_id!)
          .maybeSingle(),
        8000,
        "households.select"
      );
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
    retry: 1,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("household_id", profile!.household_id!),
        8000,
        "profiles.list"
      );
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}
