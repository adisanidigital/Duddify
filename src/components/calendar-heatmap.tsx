"use client";

import { cn, formatCurrency } from "@/lib/utils";

export function CalendarHeatmap({
  data,
  monthRef,
  currency = "INR",
  locale = "en-IN",
}: {
  data: { date: string; total: number; day: number }[];
  monthRef: Date;
  currency?: string;
  locale?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const firstWeekday = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1).getDay();
  const blanks = Array.from({ length: firstWeekday });
  const labels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-[10px] text-muted-foreground mb-1">
        {labels.map((l, i) => (
          <div key={i} className="text-center">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {blanks.map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {data.map((d) => {
          const intensity = d.total / max;
          const cls = !d.total
            ? "bg-muted/50 text-muted-foreground"
            : intensity > 0.66
            ? "bg-primary text-primary-foreground"
            : intensity > 0.33
            ? "bg-primary/60 text-primary-foreground"
            : "bg-primary/25 text-foreground";
          return (
            <div
              key={d.date}
              title={`${d.date}: ${formatCurrency(d.total, currency, locale)}`}
              className={cn(
                "aspect-square rounded-md grid place-items-center text-xs font-medium",
                cls
              )}
            >
              {d.day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-muted-foreground">
        Less
        <span className="h-2.5 w-2.5 rounded-sm bg-muted/50" />
        <span className="h-2.5 w-2.5 rounded-sm bg-primary/25" />
        <span className="h-2.5 w-2.5 rounded-sm bg-primary/60" />
        <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
        More
      </div>
    </div>
  );
}
