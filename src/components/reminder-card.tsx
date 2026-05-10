"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BellRing, CalendarPlus, Sparkles } from "lucide-react";
import { buildDailyReminderIcs, downloadIcs } from "@/lib/ics";
import { toast } from "sonner";

const KEY = "duddify-reminder-time";

function siteUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function ReminderCard() {
  const [time, setTime] = React.useState<string>("21:00");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setTime(saved);
    } catch {}
  }, []);

  const saveAndDownload = () => {
    try {
      localStorage.setItem(KEY, time);
    } catch {}
    try {
      const ics = buildDailyReminderIcs({
        time,
        url: siteUrl(),
        title: "Log today's expenses on Duddify",
        description:
          "Tap to open Duddify and log what you spent today. Future you will thank you.",
      });
      downloadIcs("duddify-daily-reminder.ics", ics);
      toast.success("Reminder downloaded — open the file to add it to your Calendar");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not generate reminder");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-4 w-4" /> Daily reminder
        </CardTitle>
        <CardDescription>
          Get a daily nudge from your phone&apos;s Calendar to log your expenses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="reminder-time" className="text-xs uppercase tracking-wider text-muted-foreground">
              Time
            </Label>
            <Input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <Button onClick={saveAndDownload} size="lg">
            <CalendarPlus className="h-4 w-4" /> Add to Calendar
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> How it works
          </div>
          <ol className="list-decimal pl-4 space-y-0.5 text-muted-foreground">
            <li>Tap <strong>Add to Calendar</strong> — downloads a small file</li>
            <li>Open the file → your Calendar app asks to add the event</li>
            <li>Tap <strong>Add</strong> — done. You&apos;ll get a notification daily at this time, even if Duddify is closed</li>
          </ol>
          <p className="text-[11px] text-muted-foreground pt-1">
            Works on iPhone, Android, and laptops. No app permissions, no servers — your phone handles it natively.
            To change the time later, repeat the steps.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
