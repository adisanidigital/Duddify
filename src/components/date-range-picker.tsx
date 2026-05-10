"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoDate, startOfMonth, endOfMonth } from "@/lib/utils";

export interface DateRange {
  from: string;
  to: string;
  label?: string;
}

const today = () => new Date();
const start = (d: Date) => isoDate(startOfMonth(d));
const end = (d: Date) => isoDate(endOfMonth(d));
const monthsAgo = (n: number) => new Date(today().getFullYear(), today().getMonth() - n, 1);
const yearStart = (yr: number) => isoDate(new Date(yr, 0, 1));
const yearEnd = (yr: number) => isoDate(new Date(yr, 11, 31));

export function makePresets(): { id: string; label: string; range: DateRange }[] {
  const t = today();
  const lm = monthsAgo(1);
  return [
    { id: "this-month", label: "This month", range: { from: start(t), to: end(t), label: "This month" } },
    { id: "last-month", label: "Last month", range: { from: start(lm), to: end(lm), label: "Last month" } },
    {
      id: "last-3",
      label: "Last 3 months",
      range: { from: start(monthsAgo(2)), to: end(t), label: "Last 3 months" },
    },
    {
      id: "last-6",
      label: "Last 6 months",
      range: { from: start(monthsAgo(5)), to: end(t), label: "Last 6 months" },
    },
    {
      id: "ytd",
      label: "This year",
      range: { from: yearStart(t.getFullYear()), to: isoDate(t), label: "Year to date" },
    },
    {
      id: "last-year",
      label: "Last year",
      range: { from: yearStart(t.getFullYear() - 1), to: yearEnd(t.getFullYear() - 1), label: "Last year" },
    },
  ];
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const presets = makePresets();
  const activePresetId = presets.find(
    (p) => p.range.from === value.from && p.range.to === value.to
  )?.id;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant={activePresetId === p.id ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(p.range)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value, label: "Custom range" })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value, label: "Custom range" })}
          />
        </div>
      </div>
    </div>
  );
}
