"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

interface GoalProgressBar {
  goalId:   string;
  title:    string;
  // 0..1 — fraction complete (e.g. checked-in goals / total).
  // For binary check-in state, 1 if logged, 0 otherwise.
  progress: number;
  // True when this goal has a check-in submitted for the current
  // period.  Drives the bar fill colour.
  done:     boolean;
}

interface PerGoalProgressProps {
  bars:        GoalProgressBar[];
  periodLabel: string;
  className?:  string;
}

const BRAND_PRIMARY = "#A4D845";
const BRAND_NAVY    = "#23416F";
const SLATE         = "#475569";

// Horizontal-bar variant of the analytics distribution chart, scoped
// to a single employee's per-goal check-in completion for the current
// period.  Done goals fill in brand-primary; pending goals fill in
// slate so the visual asymmetry instantly tells the employee what's
// outstanding.
export function PerGoalProgress({ bars, periodLabel, className }: PerGoalProgressProps) {
  if (bars.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border bg-surface-1 p-8 text-center",
          className,
        )}
      >
        <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          No goals yet
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Once your goal sheet is submitted and approved, each goal will appear here with its {periodLabel} check-in progress.
        </p>
      </div>
    );
  }

  // 12-char limit inside the chart context — at 375px viewport the
  // YAxis label column collapses 28-char labels to "..." ellipses.
  // 12 keeps mobile readable; full title still shows in the hover
  // tooltip card so the meaning isn't lost on desktop either.
  const rows = bars.map((b) => ({
    ...b,
    label: truncate(b.title, 12),
    valuePct: Math.round(b.progress * 100),
  }));

  return (
    <div className={cn("rounded-lg border border-border bg-surface-1 p-6", className)}>
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-brand-navy">{periodLabel} progress</h2>
        <p className="font-mono text-xs text-text-tertiary">{bars.length} {bars.length === 1 ? "goal" : "goals"}</p>
      </header>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 32, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              stroke="var(--color-text-muted)"
              tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="var(--color-text-muted)"
              tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={false}
              // Narrowed from 170px → 110px to match the 12-char label
              // limit above.  At 11px font ~7px per char + ellipsis +
              // breathing room ≈ 100px; 110 gives a clean ~10px gutter.
              // Hands the freed pixels to the bar tracks, which now
              // read clearly on 375px mobile.
              width={110}
            />
            <Tooltip content={<TooltipCard />} cursor={false} />
            <Bar dataKey="valuePct" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={20}>
              {rows.map((r) => (
                <Cell key={r.goalId} fill={r.done ? BRAND_PRIMARY : SLATE} fillOpacity={r.done ? 1 : 0.35} />
              ))}
              <LabelList dataKey="valuePct" position="right" formatter={(v: unknown) => `${v}%`} style={{ fontSize: 11, fill: BRAND_NAVY, fontFamily: "var(--font-mono)" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: { title: string; valuePct: number; done: boolean } }>;
}
function TooltipCard({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className="rounded-sm border border-brand-primary bg-surface-1 px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-text">{row.title}</p>
      <p className="mt-1 font-mono text-xs text-text-secondary tabular-nums">
        {row.valuePct}% · {row.done ? "logged" : "pending"}
      </p>
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
