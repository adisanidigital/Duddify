"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MonthPicker({
  value,
  onChange,
  locale = "en-IN",
}: {
  value: Date;
  onChange: (d: Date) => void;
  locale?: string;
}) {
  const label = value.toLocaleString(locale, { month: "long", year: "numeric" });
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-card px-1 py-0.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(new Date(value.getFullYear(), value.getMonth() - 1, 1))}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-sm font-medium px-2 min-w-[8rem] text-center">{label}</div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(new Date(value.getFullYear(), value.getMonth() + 1, 1))}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
