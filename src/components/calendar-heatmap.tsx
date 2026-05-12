"use client";

import { cn, formatCurrency } from "@/lib/utils";

/**
 * Heat scale for expense days:
 *  0    → neutral grey
 *  0–0.25 → green (light spend)
 *  0.25–0.5 → yellow
 *  0.5–0.75 → orange
 *  0.75+ → red (high spend)
 */
function bucket(intensity: number): { bg: string; text: string } {
  if (intensity === 0) {
    return { bg: "bg-muted/40 dark:bg-muted/30", text: "text-muted-foreground" };
  }
  if (intensity <= 0.25) {
    return { bg: "bg-emerald-400/35 dark:bg-emerald-400/30", text: "text-emerald-900 dark:text-emerald-100" };
  }
  if (intensity <= 0.5) {
    return { bg: "bg-amber-400/55 dark:bg-amber-400/40", text: "text-amber-900 dark:text-amber-50" };
  }
  if (intensity <= 0.75) {
    return { bg: "bg-orange-500/70 dark:bg-orange-500/65", text: "text-white" };
  }
  return { bg: "bg-red-600/90 dark:bg-red-500/85", text: "text-white" };
}

export function CalendarHeatmap({
  data,
  monthRef,
  currency = "INR",
  locale = "en-IN",
  onDayClick,
}: {
  data: { date: string; total: number; day: number }[];
  monthRef: Date;
  currency?: string;
  locale?: string;
  /** Optional — when supplied, each day cell becomes a button. */
  onDayClick?: (date: string) => void;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const firstWeekday = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1).getDay();
  const blanks = Array.from({ length: firstWeekday });
  const labels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-[10px] text-muted-foreground mb-1.5">
        {labels.map((l, i) => (
          <div key={i} className="text-center font-medium">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {blanks.map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {data.map((d) => {
          const intensity = d.total / max;
          const { bg, text } = bucket(intensity);
          const className = cn(
            "aspect-square rounded-md grid place-items-center text-xs font-semibold tabular-nums transition-all",
            bg,
            text,
            onDayClick && d.total > 0 && "cursor-pointer hover:scale-110 active:scale-95",
            onDayClick && d.total === 0 && "cursor-default opacity-60"
          );
          const title = `${d.date}: ${formatCurrency(d.total, currency, locale)}`;
          if (onDayClick) {
            return (
              <button
                key={d.date}
                type="button"
                title={title}
                disabled={d.total === 0}
                onClick={() => onDayClick(d.date)}
                className={className}
                aria-label={title}
              >
                {d.day}
              </button>
            );
          }
          return (
            <div key={d.date} title={title} className={className}>
              {d.day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted/40 dark:bg-muted/30" />
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/35 dark:bg-emerald-400/30" />
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/55 dark:bg-amber-400/40" />
          <span className="h-2.5 w-2.5 rounded-sm bg-orange-500/70 dark:bg-orange-500/65" />
          <span className="h-2.5 w-2.5 rounded-sm bg-red-600/90 dark:bg-red-500/85" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
