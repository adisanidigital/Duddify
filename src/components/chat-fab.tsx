"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { useFeatureFlags } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

/**
 * Floating chat launcher. Visible on every dashboard route when the AI
 * feature flag is on. Hides itself on the chat route (no point) and on
 * the add-transaction screen (would overlap the keyboard area).
 *
 * Positioning:
 *   - Bottom-right.
 *   - Lifted above the mobile bottom nav (safe-bottom + 5rem).
 *   - Lower z-index than the bottom nav so it doesn't cover the + button.
 */
export function ChatFab() {
  const { flags } = useFeatureFlags();
  const pathname = usePathname();
  const [showHint, setShowHint] = React.useState(false);

  // First-time hint: pop a little "Ask me anything" tooltip on initial
  // appearance, then auto-dismiss after 4 seconds. Stored in localStorage
  // so it shows only once per device.
  React.useEffect(() => {
    if (!flags.ai) return;
    try {
      if (localStorage.getItem("duddify.chat-fab-hint") === "true") return;
      const t = setTimeout(() => {
        setShowHint(true);
        try {
          localStorage.setItem("duddify.chat-fab-hint", "true");
        } catch {}
        setTimeout(() => setShowHint(false), 4000);
      }, 1500);
      return () => clearTimeout(t);
    } catch {}
  }, [flags.ai]);

  if (!flags.ai) return null;
  // Don't show on the chat page itself or on auth / onboarding screens.
  const hide =
    pathname?.startsWith("/chat") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/add");
  if (hide) return null;

  return (
    <>
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className={cn(
              "fixed z-30 right-4 md:right-6 rounded-xl bg-card border shadow-lg px-3 py-2 text-xs flex items-center gap-2",
              // Sit above the FAB on mobile (above bottom nav too).
              "bottom-[calc(env(safe-area-inset-bottom)+9rem)] md:bottom-24"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Ask me anything about your spend
            <button
              type="button"
              onClick={() => setShowHint(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 24, delay: 0.4 }}
        className={cn(
          "fixed z-30 right-4 md:right-6",
          // Above mobile bottom nav, normal position on desktop.
          "bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6"
        )}
      >
        <Link
          href="/chat"
          aria-label="Open AI chat"
          className={cn(
            "group flex items-center gap-2 h-12 px-3.5 rounded-full",
            "gradient-primary text-primary-foreground shadow-lg shadow-primary/30",
            "hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
          )}
        >
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="grid place-items-center"
          >
            <Sparkles className="h-4 w-4" />
          </motion.span>
          <span className="text-sm font-medium hidden sm:inline">Ask AI</span>
        </Link>
      </motion.div>
    </>
  );
}
