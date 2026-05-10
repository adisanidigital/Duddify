"use client";

import * as React from "react";

type PrivacyContextValue = {
  hidden: boolean;
  ready: boolean;
  toggle: () => void;
  setHidden: (v: boolean) => void;
};

const PrivacyContext = React.createContext<PrivacyContextValue | null>(null);

const STORAGE_KEY = "duddify.privacy-hidden";
const DEFAULT_HIDDEN = true; // hide on every cold launch unless user disabled it

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  // We render with `hidden=true` on first SSR/render so we never flash the
  // real numbers before reading the user's preference.
  const [hidden, setHiddenState] = React.useState<boolean>(true);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Per-session intent: if the user explicitly turned privacy OFF in this
      // browser, respect it across reloads. Otherwise default to hidden.
      if (saved === "false") setHiddenState(false);
      else setHiddenState(DEFAULT_HIDDEN);
    } catch {
      setHiddenState(DEFAULT_HIDDEN);
    } finally {
      setReady(true);
    }
  }, []);

  const setHidden = React.useCallback((v: boolean) => {
    setHiddenState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "true" : "false");
    } catch {}
  }, []);

  const toggle = React.useCallback(() => {
    setHiddenState((h) => {
      const next = !h;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
      } catch {}
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ hidden, ready, toggle, setHidden }),
    [hidden, ready, toggle, setHidden]
  );

  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = React.useContext(PrivacyContext);
  if (!ctx) {
    // Allow consumers outside the provider (e.g. login page) to behave normally.
    return {
      hidden: false,
      ready: true,
      toggle: () => {},
      setHidden: () => {},
    };
  }
  return ctx;
}
