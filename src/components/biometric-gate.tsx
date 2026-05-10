"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, ScanFace, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isBiometricEnabled, verifyBiometric } from "@/lib/biometric";

const SESSION_UNLOCKED = "duddify.biometric.session-unlocked";

/**
 * Wrap the app — if the lock is enabled and the current tab is not yet
 * unlocked, show a lock screen and require biometric verification.
 *
 * Unlock state is stored in `sessionStorage`, so a single unlock covers all
 * navigations in this tab but the app re-locks on every app launch / reload.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState(false);
  const [unlocked, setUnlocked] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const lockOn = isBiometricEnabled();
    setEnabled(lockOn);
    if (!lockOn) {
      setUnlocked(true);
      setReady(true);
      return;
    }
    try {
      const sessionUnlocked = sessionStorage.getItem(SESSION_UNLOCKED) === "true";
      setUnlocked(sessionUnlocked);
    } catch {
      setUnlocked(false);
    }
    setReady(true);
  }, []);

  // Re-lock when the tab is hidden for more than 60s (foreground unlock UX).
  React.useEffect(() => {
    if (!enabled) return;
    let hiddenAt: number | null = null;
    const RELOCK_AFTER = 60_000;
    function onVis() {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > RELOCK_AFTER) {
        try {
          sessionStorage.removeItem(SESSION_UNLOCKED);
        } catch {}
        setUnlocked(false);
        hiddenAt = null;
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [enabled]);

  const tryUnlock = React.useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await verifyBiometric();
      try {
        sessionStorage.setItem(SESSION_UNLOCKED, "true");
      } catch {}
      setUnlocked(true);
    } catch (e: any) {
      setError(e?.message ?? "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  // Auto-prompt as soon as we mount in locked state — feels native.
  React.useEffect(() => {
    if (ready && enabled && !unlocked) {
      const t = setTimeout(() => {
        void tryUnlock();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [ready, enabled, unlocked, tryUnlock]);

  if (!ready) return null;
  if (!enabled || unlocked) return <>{children}</>;

  return (
    <AnimatePresence>
      <motion.div
        key="lock-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] grid place-items-center bg-background"
      >
        {/* Decorative glow */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
          />
          <motion.div
            animate={{ opacity: [0.3, 0.55, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 left-1/3 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl"
          />
        </div>

        <div className="text-center px-6 max-w-sm">
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="mx-auto mb-5 relative"
          >
            <div className="h-24 w-24 rounded-3xl bg-primary/10 ring-1 ring-primary/20 grid place-items-center mx-auto">
              <motion.div
                animate={
                  busy
                    ? { scale: [1, 1.08, 1], opacity: [1, 0.7, 1] }
                    : { scale: 1, opacity: 1 }
                }
                transition={
                  busy
                    ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                    : undefined
                }
                className="text-primary"
              >
                <ScanFace className="h-11 w-11" strokeWidth={1.6} />
              </motion.div>
            </div>
            {busy && (
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-3xl ring-2 ring-primary/40"
                animate={{ scale: [1, 1.15], opacity: [0.6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
            )}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-xl font-semibold tracking-tight"
          >
            Duddify is locked
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
            className="text-sm text-muted-foreground mt-1.5"
          >
            Verify with Face ID / Touch ID to continue
          </motion.p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-xs text-destructive flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 flex flex-col items-center gap-2">
            <Button size="lg" onClick={tryUnlock} disabled={busy} className="min-w-[200px]">
              <Fingerprint className="h-5 w-5" />
              {busy ? "Verifying…" : "Unlock"}
            </Button>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                <Lock className="h-3.5 w-3.5" /> Sign out instead
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
