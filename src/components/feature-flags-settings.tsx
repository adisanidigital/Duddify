"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFeatureFlags, type FeatureFlags } from "@/lib/feature-flags";
import {
  Sparkles,
  Target,
  TrendingUp,
  Sliders,
  ShieldCheck,
} from "lucide-react";

const ITEMS: {
  key: keyof FeatureFlags;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "ai",
    label: "AI coach",
    description:
      "Adds an AI-powered advisor on the Goals page. Sends only aggregated numbers (no raw transactions or names) to a free public AI service.",
    icon: <Sparkles className="h-4 w-4 text-primary" />,
  },
  {
    key: "goals",
    label: "Goals tab",
    description:
      "Plan short-, medium-, and long-term financial goals. Tracks progress against your average monthly savings.",
    icon: <Target className="h-4 w-4 text-primary" />,
  },
  {
    key: "investments",
    label: "Investments tab",
    description:
      "Shows the Investments dashboard and portfolio holdings tracker. Hide if you don't track investments.",
    icon: <TrendingUp className="h-4 w-4 text-primary" />,
  },
];

export function FeatureFlagsSettings() {
  const { flags, ready, setFlag } = useFeatureFlags();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" /> Tabs &amp; features
        </CardTitle>
        <CardDescription>
          Turn features on or off. Disabled tabs disappear from navigation
          immediately on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {ITEMS.map((item) => {
          const enabled = ready ? flags[item.key] : true;
          return (
            <div
              key={item.key}
              className="flex items-start gap-3 p-3 rounded-lg bg-accent/40"
            >
              <div className="h-9 w-9 rounded-lg bg-background grid place-items-center shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  {item.label}
                  {item.key === "ai" && enabled && (
                    <span className="text-[10px] uppercase tracking-wider bg-primary/15 text-primary rounded-full px-1.5 py-0.5">
                      On
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  {item.description}
                </div>
              </div>
              <Toggle
                checked={enabled}
                disabled={!ready}
                onChange={(v) => setFlag(item.key, v)}
                aria-label={`Toggle ${item.label}`}
              />
            </div>
          );
        })}
        {flags.ai && (
          <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed flex items-start gap-1.5">
            <ShieldCheck className="h-3 w-3 mt-0.5 text-success shrink-0" />
            <span>
              AI uses Pollinations.ai (free, no account). We send only
              aggregated numbers — never raw transactions, names, or notes.
              You can turn it off anytime.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Pretty animated toggle (avoids needing a new radix dep). */
function Toggle({
  checked,
  disabled,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-primary" : "bg-input",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <motion.span
        layout
        className="block h-5 w-5 rounded-full bg-background shadow-md absolute top-0.5"
        animate={{ left: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 480, damping: 30 }}
      />
    </button>
  );
}
