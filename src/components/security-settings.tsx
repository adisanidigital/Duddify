"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanFace, ShieldCheck, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  disableBiometric,
  getBiometricLabel,
  isBiometricAvailable,
  isBiometricEnabled,
  registerBiometric,
} from "@/lib/biometric";
import { usePrivacy } from "@/lib/privacy";

export function SecuritySettings({ userLabel }: { userLabel?: string | null }) {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [enabled, setEnabled] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [label, setLabel] = React.useState<string | null>(null);
  const { hidden, toggle, setHidden, ready: privacyReady } = usePrivacy();

  React.useEffect(() => {
    isBiometricAvailable().then(setSupported);
    setEnabled(isBiometricEnabled());
    setLabel(getBiometricLabel());
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      await registerBiometric(userLabel?.trim() || "Duddify user");
      setEnabled(true);
      setLabel(getBiometricLabel());
      toast.success("App lock enabled — Face ID / Touch ID required on next launch");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't enable biometric lock");
    } finally {
      setBusy(false);
    }
  };

  const disable = () => {
    if (!confirm("Disable biometric app lock? Anyone with this device will be able to open the app.")) return;
    disableBiometric();
    setEnabled(false);
    toast.success("App lock disabled");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Privacy &amp; Security
        </CardTitle>
        <CardDescription>
          Hide amounts at a glance, and lock the app behind your face or fingerprint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hide amounts */}
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-accent/40">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-background grid place-items-center shrink-0">
              {hidden ? (
                <EyeOff className="h-4 w-4 text-primary" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">Hide amounts by default</div>
              <div className="text-xs text-muted-foreground">
                Your KPIs and breakdowns launch hidden until you tap the eye icon.
                Useful when sharing your screen.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant={hidden ? "default" : "outline"}
            onClick={toggle}
            disabled={!privacyReady}
          >
            {hidden ? "Hidden" : "Showing"}
          </Button>
        </div>

        {/* Reset privacy default */}
        {!hidden && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 -mt-2"
            onClick={() => {
              setHidden(true);
              toast.success("Amounts hidden");
            }}
          >
            <EyeOff className="h-3 w-3" /> Hide now
          </button>
        )}

        {/* Biometric lock */}
        <div className="border-t pt-4">
          <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-accent/40">
            <div className="flex items-start gap-3 min-w-0">
              <motion.div
                initial={false}
                animate={enabled ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                className="h-9 w-9 rounded-lg bg-background grid place-items-center shrink-0"
              >
                <ScanFace className="h-4 w-4 text-primary" />
              </motion.div>
              <div className="min-w-0">
                <div className="text-sm font-medium flex items-center gap-2">
                  Biometric app lock
                  {enabled && (
                    <span className="text-[10px] uppercase tracking-wider bg-success/15 text-success rounded-full px-1.5 py-0.5">
                      On
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {supported === false
                    ? "Not supported on this device / browser. Add the app to your Home Screen on iOS 16+ or use Chrome on Android."
                    : enabled
                    ? `Locked with ${label ? `"${label}"` : "your passkey"} on this device. Re-locks 60s after the app is backgrounded.`
                    : "Use Face ID, Touch ID, or fingerprint to unlock the app. Credential is stored on this device only."}
                </div>
              </div>
            </div>
            {enabled ? (
              <Button size="sm" variant="outline" onClick={disable}>
                <Trash2 className="h-3.5 w-3.5" /> Disable
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={enable}
                disabled={busy || supported === false || supported === null}
              >
                <ScanFace className="h-3.5 w-3.5" />
                {busy ? "Setting up…" : "Enable"}
              </Button>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed px-1">
            <strong>How it works:</strong> we register a passkey for this device using
            WebAuthn — the same standard your browser uses for password-less sign-in.
            The OS prompts for Face ID / Touch ID; we never see your biometric data.
            Clearing site data on this browser disables the lock.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
