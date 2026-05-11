"use client";

import * as React from "react";

/** Per-device feature flags. Persisted in localStorage. */
export type FeatureFlags = {
  /** Enables AI-powered insights & goal advisor (uses Pollinations.ai, free). */
  ai: boolean;
  /** Show the Goals tab in nav. */
  goals: boolean;
  /** Show the Investments tab + holdings table. */
  investments: boolean;
};

const DEFAULTS: FeatureFlags = {
  ai: true,
  goals: true,
  investments: true,
};

const STORAGE_KEY = "duddify.feature-flags";

type Ctx = {
  flags: FeatureFlags;
  ready: boolean;
  setFlag: (k: keyof FeatureFlags, v: boolean) => void;
};

const FeatureFlagsContext = React.createContext<Ctx | null>(null);

function readFlags(): FeatureFlags {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe: defaults on first render, then hydrate from localStorage.
  const [flags, setFlags] = React.useState<FeatureFlags>(DEFAULTS);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setFlags(readFlags());
    setReady(true);
  }, []);

  const setFlag = React.useCallback((k: keyof FeatureFlags, v: boolean) => {
    setFlags((cur) => {
      const next = { ...cur, [k]: v };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const value = React.useMemo<Ctx>(
    () => ({ flags, ready, setFlag }),
    [flags, ready, setFlag]
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): Ctx {
  const ctx = React.useContext(FeatureFlagsContext);
  if (!ctx) {
    // Safe fallback for consumers outside the provider (e.g. login screen).
    return {
      flags: DEFAULTS,
      ready: true,
      setFlag: () => {},
    };
  }
  return ctx;
}
