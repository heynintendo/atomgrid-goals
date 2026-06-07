"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const BRAND_PRIMARY = "#FCB40C";
const SLATE         = "#475569";
const BORDER        = "#E5E5E5";
const NAVY          = "#1A1A1A";
const DANGER_SUBTLE = "#FEE2E2";

export interface DonutSlice {
  label: string;
  value: number;
  // Optional explicit colour override.  When unset the slice rotates
  // through the brand-aligned default palette.
  color?: string;
}

interface CompletionDonutProps {
  title:    string;
  // Centre text — pre-computed so the chart stays presentation-only.
  centerValue: string;
  centerLabel: string;
  slices:   DonutSlice[];
  className?: string;
}

// Donut chart used by both the manager and admin overviews.  Caller
// passes pre-aggregated slices + centre text; this component owns
// only the visual treatment (palette, ring thickness, label styling).
export function CompletionDonut({
  title,
  centerValue,
  centerLabel,
  slices,
  className,
}: CompletionDonutProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border bg-surface-1 p-8 text-center", className)}>
        <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">{title}</p>
        <p className="mt-2 text-sm text-text-secondary">No data yet — slices appear once sheets are submitted.</p>
      </div>
    );
  }

  const palette = [BRAND_PRIMARY, SLATE, NAVY, DANGER_SUBTLE, BORDER];
  const data = slices.map((s, i) => ({ ...s, fill: s.color ?? palette[i % palette.length] }));

  return (
    <div className={cn("rounded-lg border border-border bg-surface-1 p-6", className)}>
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
        <p className="font-mono text-xs text-text-tertiary tabular-nums">{total} total</p>
      </header>
      <div className="relative h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.label} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-brand-navy tabular-nums">{centerValue}</span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">{centerLabel}</span>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2">
        {data.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-text-secondary">
              <span aria-hidden className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.fill }} />
              {s.label}
            </span>
            <span className="font-mono text-text-secondary tabular-nums">
              {s.value} ({Math.round((s.value / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
