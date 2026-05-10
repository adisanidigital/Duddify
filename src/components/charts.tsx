"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { formatCompact, formatCurrency, cn } from "@/lib/utils";
import { AnimatedCurrency } from "@/components/motion";
import { PrivateValue } from "@/components/private-value";

const AXIS = "hsl(var(--muted-foreground))";
const GRID = "hsl(var(--border))";

function ChartTooltip({
  active,
  payload,
  label,
  currency,
  locale,
  total,
}: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover/95 backdrop-blur px-3 py-2 text-xs shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
      {label && <div className="font-medium mb-1">{label}</div>}
      {payload.map((p: any, i: number) => {
        const value = Number(p.value);
        const pct = total ? Math.round((value / total) * 100) : null;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(value, currency, locale)}
            </span>
            {pct !== null && (
              <span className="text-muted-foreground tabular-nums">· {pct}%</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Active-shape pie that gently lifts the hovered slice. */
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={4}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 11}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
        cornerRadius={3}
      />
    </g>
  );
}

export function CategoryPie({
  data,
  currency = "INR",
  locale = "en-IN",
  height = 260,
  showLegend = true,
  centerLabel = "Total",
  layout = "vertical",
}: {
  data: { name: string; value: number; color: string }[];
  currency?: string;
  locale?: string;
  height?: number;
  showLegend?: boolean;
  centerLabel?: string;
  /** "vertical" stacks legend below; "horizontal" places legend to the right on >= md */
  layout?: "vertical" | "horizontal";
}) {
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);
  const total = React.useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  if (!data.length) return <Empty height={height} />;

  const active = activeIdx != null ? data[activeIdx] : null;
  const activePct = active && total ? Math.round((active.value / total) * 100) : null;

  return (
    <div
      className={cn(
        "w-full",
        layout === "horizontal" && showLegend && "md:flex md:items-center md:gap-4"
      )}
    >
      {/* Pie + center label */}
      <div className={cn("relative w-full", layout === "horizontal" && "md:flex-1")}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              cornerRadius={6}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              activeIndex={activeIdx ?? undefined}
              activeShape={renderActiveShape}
              onMouseEnter={(_, i) => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              animationBegin={120}
              animationDuration={900}
              animationEasing="ease-out"
              isAnimationActive
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.color}
                  fillOpacity={activeIdx == null || activeIdx === i ? 1 : 0.35}
                  style={{ transition: "fill-opacity 220ms ease, transform 220ms ease" }}
                />
              ))}
            </Pie>
            <Tooltip
              content={<ChartTooltip currency={currency} locale={locale} total={total} />}
              wrapperStyle={{ outline: "none" }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active ? active.name : "__total__"}
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                {active ? active.name : centerLabel}
              </div>
              <div className="text-xl md:text-2xl font-semibold tabular-nums leading-tight mt-0.5">
                <PrivateValue mask="•••••">
                  <AnimatedCurrency
                    value={active ? active.value : total}
                    currency={currency}
                    locale={locale}
                  />
                </PrivateValue>
              </div>
              {active && activePct !== null && (
                <div
                  className="text-[11px] font-medium mt-0.5"
                  style={{ color: active.color }}
                >
                  {activePct}% of total
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <PieLegend
          data={data}
          total={total}
          currency={currency}
          locale={locale}
          activeIdx={activeIdx}
          onHover={setActiveIdx}
          layout={layout}
        />
      )}
    </div>
  );
}

function PieLegend({
  data,
  total,
  currency,
  locale,
  activeIdx,
  onHover,
  layout,
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
  currency: string;
  locale: string;
  activeIdx: number | null;
  onHover: (i: number | null) => void;
  layout: "vertical" | "horizontal";
}) {
  return (
    <ul
      className={cn(
        "mt-3 grid gap-1.5",
        layout === "horizontal"
          ? "md:mt-0 md:flex md:flex-col md:min-w-[180px] md:max-w-[220px]"
          : "grid-cols-1 sm:grid-cols-2"
      )}
      onMouseLeave={() => onHover(null)}
    >
      {data.map((d, i) => {
        const pct = total ? Math.round((d.value / total) * 100) : 0;
        const isActive = activeIdx === i;
        const dimmed = activeIdx != null && !isActive;
        return (
          <li key={d.name + i}>
            <button
              type="button"
              onMouseEnter={() => onHover(i)}
              onFocus={() => onHover(i)}
              onClick={() => onHover(isActive ? null : i)}
              className={cn(
                "group w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5",
                "transition-all duration-200",
                "hover:bg-accent/60 focus-visible:bg-accent/60 outline-none",
                dimmed && "opacity-50"
              )}
            >
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0 transition-transform duration-200",
                  isActive && "scale-125 ring-2 ring-offset-1 ring-offset-background"
                )}
                style={{
                  background: d.color,
                  // @ts-expect-error -- CSS var for tailwind ring color
                  "--tw-ring-color": d.color,
                }}
              />
              <span className="text-xs font-medium truncate flex-1 min-w-0">{d.name}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
              <span className="text-xs font-medium tabular-nums hidden md:inline">
                <PrivateValue mask="•••">
                  {formatCompact(d.value, currency, locale)}
                </PrivateValue>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DailyBar({
  data,
  currency = "INR",
  locale = "en-IN",
  height = 200,
}: {
  data: { date: string; total: number }[];
  currency?: string;
  locale?: string;
  height?: number;
}) {
  if (!data.length) return <Empty height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: AXIS, fontSize: 11 }}
          tickFormatter={(s) => s.slice(8, 10)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          tickFormatter={(v) => formatCompact(v, currency, locale)}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<ChartTooltip currency={currency} locale={locale} />} cursor={{ fill: "hsl(var(--accent))" }} />
        <Bar dataKey="total" name="Spent" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthBars({
  data,
  series,
  currency = "INR",
  locale = "en-IN",
  height = 240,
}: {
  data: any[];
  series: { key: string; name: string; color: string }[];
  currency?: string;
  locale?: string;
  height?: number;
}) {
  if (!data.length) return <Empty height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          tickFormatter={(v) => formatCompact(v, currency, locale)}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<ChartTooltip currency={currency} locale={locale} />} cursor={{ fill: "hsl(var(--accent))" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendArea({
  data,
  dataKey,
  name,
  color = "hsl(var(--primary))",
  currency = "INR",
  locale = "en-IN",
  height = 200,
}: {
  data: any[];
  dataKey: string;
  name: string;
  color?: string;
  currency?: string;
  locale?: string;
  height?: number;
}) {
  if (!data.length) return <Empty height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          tickFormatter={(v) => formatCompact(v, currency, locale)}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<ChartTooltip currency={currency} locale={locale} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2}
          fill={`url(#g-${dataKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SavingsRateLine({
  data,
  height = 200,
}: {
  data: { month: string; rate: number }[];
  height?: number;
}) {
  if (!data.length) return <Empty height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          width={40}
        />
        <Tooltip
          content={({ active, payload, label }: any) =>
            active && payload?.length ? (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="font-medium mb-1">{label}</div>
                <div>Savings rate: <span className="font-medium">{payload[0].value}%</span></div>
              </div>
            ) : null
          }
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Empty({ height }: { height: number }) {
  return (
    <div
      className="grid place-items-center text-sm text-muted-foreground border border-dashed rounded-lg"
      style={{ height }}
    >
      No data yet
    </div>
  );
}
