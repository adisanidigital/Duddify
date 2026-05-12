"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "destructive" | "warning" | "default";

const toneStyles: Record<Tone, { ring: string; iconBg: string; icon: string }> = {
  destructive: {
    ring: "ring-destructive/30",
    iconBg: "bg-destructive/10",
    icon: "text-destructive",
  },
  warning: {
    ring: "ring-warning/30",
    iconBg: "bg-warning/15",
    icon: "text-warning",
  },
  default: {
    ring: "ring-primary/20",
    iconBg: "bg-primary/10",
    icon: "text-primary",
  },
};

/**
 * Stylish, animated replacement for `window.confirm()`. Used everywhere we
 * have a destructive action — never silently destroy the user's data.
 *
 * The confirm button auto-receives focus so keyboard users can press Enter
 * to confirm or Esc to cancel. While `loading` is true, both buttons are
 * disabled and the confirm button shows a spinner.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "destructive",
  loading = false,
  onConfirm,
  icon,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  loading?: boolean;
  onConfirm: () => unknown | Promise<unknown>;
  icon?: React.ReactNode;
}) {
  const styles = toneStyles[tone];
  const [internalLoading, setInternalLoading] = React.useState(false);
  const isLoading = loading || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isLoading && onOpenChange(v)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className={cn(
              "h-12 w-12 rounded-2xl grid place-items-center mx-auto mb-2 ring-1",
              styles.iconBg,
              styles.ring,
              styles.icon
            )}
          >
            {icon ?? <AlertTriangle className="h-6 w-6" />}
          </motion.div>
          <DialogTitle className="text-center text-base">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-center text-xs leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="!flex-row !justify-center gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 max-w-[160px]"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
            autoFocus
            className="flex-1 max-w-[160px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Convenience hook so call sites don't need to manage the open state +
 * an "action to run on confirm" tuple. Usage:
 *
 *   const confirmDelete = useConfirmDialog();
 *   ...
 *   confirmDelete({
 *     title: "Delete this transaction?",
 *     description: "...",
 *     onConfirm: async () => { await api.delete(); },
 *   });
 *   ...
 *   {confirmDelete.element}
 */
export function useConfirmDialog() {
  const [config, setConfig] = React.useState<{
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: Tone;
    onConfirm: () => unknown | Promise<unknown>;
    icon?: React.ReactNode;
  } | null>(null);

  const open = React.useCallback(
    (cfg: NonNullable<typeof config>) => setConfig(cfg),
    []
  );
  const close = React.useCallback(() => setConfig(null), []);

  const element = (
    <ConfirmDialog
      open={!!config}
      onOpenChange={(v) => !v && close()}
      title={config?.title ?? ""}
      description={config?.description}
      confirmLabel={config?.confirmLabel}
      cancelLabel={config?.cancelLabel}
      tone={config?.tone ?? "destructive"}
      icon={config?.icon}
      onConfirm={async () => {
        if (!config) return;
        await config.onConfirm();
        close();
      }}
    />
  );

  // Allow `confirm({...})` shorthand by binding `open` to the returned object
  return Object.assign(open, { element, close });
}
