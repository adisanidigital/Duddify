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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatCurrency } from "@/lib/utils";

const AXIS = "hsl(var(--muted-foreground))";
const GRID = "hsl(var(--border))";

function ChartTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <div className="font-medium mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">
            {formatCurrency(Number(p.value), currency, locale)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CategoryPie({
  data,
  currency = "INR",
  locale = "en-IN",
  height = 240,
}: {
  data: { name: string; value: number; color: string }[];
  currency?: string;
  locale?: string;
  height?: number;
}) {
  if (!data.length) return <Empty height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
          stroke="hsl(var(--background))"
          strokeWidth={2}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip currency={currency} locale={locale} />} />
      </PieChart>
    </ResponsiveContainer>
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
