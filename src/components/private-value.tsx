"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/lib/privacy";
import { cn } from "@/lib/utils";

/**
 * Wraps any monetary / sensitive figure. When privacy mode is on the value
 * is replaced with a soft blurred mask. The mask has the same approximate
 * width as the original so layouts don't jump.
 */
export function PrivateValue({
  children,
  mask = "••••••",
  className,
  /** When true, the value is shown briefly even in privacy mode (e.g. while editing). */
  reveal = false,
}: {
  children: React.ReactNode;
  mask?: string;
  className?: string;
  reveal?: boolean;
}) {
  const { hidden, ready } = usePrivacy();
  const isHidden = ready && hidden && !reveal;

  return (
    <span className={cn("relative inline-flex items-baseline", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {isHidden ? (
          <motion.span
            key="masked"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="select-none tracking-[0.18em] text-muted-foreground/70"
            aria-label="Hidden"
          >
            {mask}
          </motion.span>
        ) : (
          <motion.span
            key="value"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** Header eye-toggle button with tooltip-ish label. */
export function PrivacyToggle({
  size = "icon",
  variant = "ghost",
  className,
}: {
  size?: "icon" | "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default";
  className?: string;
}) {
  const { hidden, toggle, ready } = usePrivacy();
  if (!ready) return <div className="h-9 w-9" />;
  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggle}
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      title={hidden ? "Show amounts" : "Hide amounts"}
      className={cn("relative", className)}
    >
      <motion.span
        key={String(hidden)}
        initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 20 }}
        className="grid place-items-center"
      >
        {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </motion.span>
    </Button>
  );
}
