"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const BRAND_PRIMARY = "#A4D845";
const SLATE         = "#475569";
const NAVY          = "#23416F";

export interface ManagerEffectivenessRow {
  managerName: string;
  // 0..100 — team-completion percentage for the current period.
  completionPct: number;
}

interface ManagerEffectivenessMiniProps {
  rows:       ManagerEffectivenessRow[];
  className?: string;
}

// Compact horizontal-bar chart for the admin overview.  Top-5 managers
// by team completion %, sorted descending; brand-primary fills with a
// thin slate base track at the row's right edge for context.
export function ManagerEffectivenessMini({ rows, className }: ManagerEffectivenessMiniProps) {
  if (rows.length === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border bg-surface-1 p-8 text-center", className)}>
        <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">No team data</p>
        <p className="mt-2 text-sm text-text-secondary">Bars appear once managers approve sheets and team check-ins land.</p>
      </div>
    );
  }

  const data = rows
    .map((r) => ({ label: truncate(r.managerName, 22), value: Math.round(r.completionPct) }))
    .slice(0, 5);
  const height = 60 + data.length * 28;

  return (
    <div className={cn("rounded-lg border border-border bg-surface-1 p-6", className)}>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-brand-navy">Manager effectiveness</h2>
        <p className="font-mono text-xs text-text-tertiary">Top {data.length}, by team completion %</p>
      </header>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="label"
              stroke="var(--color-text-muted)"
              tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={false}
              width={150}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={18}>
              {data.map((r, i) => (
                <Cell key={r.label} fill={i === 0 ? BRAND_PRIMARY : SLATE} fillOpacity={i === 0 ? 1 : 0.5} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v: unknown) => `${v}%`}
                style={{ fontSize: 11, fill: NAVY, fontFamily: "var(--font-mono)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
