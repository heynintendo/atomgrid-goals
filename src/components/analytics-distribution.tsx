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
import type { CheckInPeriod } from "@prisma/client";
import { bandColorTokens } from "@/lib/score-colors";
import type {
  DistributionBand,
  DistributionBucket,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface AnalyticsDistributionProps {
  buckets:           DistributionBucket[];
  scoredCount:       number;
  totalInScope:      number;
  currentPeriodLabel: string;
}

const BAND_LABEL: Record<DistributionBand, string> = {
  BELOW:   "Below",
  MEETS:   "Meets",
  EXCEEDS: "Exceeds",
};

export function AnalyticsDistribution({
  buckets,
  scoredCount,
  totalInScope,
  currentPeriodLabel,
}: AnalyticsDistributionProps) {
  if (totalInScope === 0) {
    return <EmptyState reason="no-employees" />;
  }
  if (scoredCount === 0) {
    return <EmptyState reason="no-scores" period={currentPeriodLabel} />;
  }

  // Decorate buckets with display label + bar fill so Recharts can
  // pull everything it needs straight off the row.
  const rows = buckets.map((b) => ({
    ...b,
    label: BAND_LABEL[b.band],
    fill:  bandColorTokens(b.band).baseHex,
  }));

  // y-axis upper bound: round scoredCount up to a friendly tick so the
  // tallest bar doesn't kiss the chart top.
  const maxCount = Math.max(...rows.map((r) => r.count), 1);
  const yMax = niceCeil(maxCount);

  return (
    <div className="space-y-5 rounded-lg border border-border bg-surface-1 p-6">
      <header className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            {currentPeriodLabel} · score distribution
          </p>
          <p className="text-sm text-text-secondary">
            {scoredCount} of {totalInScope} {totalInScope === 1 ? "employee" : "employees"} scored
            {scoredCount < totalInScope
              ? ` · ${totalInScope - scoredCount} without a check-in this period`
              : null}
          </p>
        </div>
      </header>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 24, right: 16, bottom: 0, left: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="var(--color-text-muted)"
              tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
            />
            <YAxis
              domain={[0, yMax]}
              allowDecimals={false}
              stroke="var(--color-text-muted)"
              tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<DistributionTooltip />} cursor={false} />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              maxBarSize={88}
            >
              {rows.map((r) => (
                <Cell key={r.band} fill={r.fill} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                content={<BarLabel />}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4">
        {rows.map((r) => (
          <LegendItem key={r.band} row={r} />
        ))}
      </div>
    </div>
  );
}

function LegendItem({
  row,
}: {
  row: DistributionBucket & { label: string; fill: string };
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: row.fill }}
      />
      <span className="text-sm font-medium text-text">{row.label}</span>
      <span className="font-mono text-xs tabular-nums text-text-muted">
        {row.count} · {row.pctOfScored.toFixed(0)}%
      </span>
    </div>
  );
}

// Custom label rendered above each bar: "N · X%".
// Recharts passes geometry via numeric props; the JSX below positions
// a centred text node at the top edge of the bar.
interface BarLabelGeometry {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
  index?: number;
}

function BarLabel(props: BarLabelGeometry & { rows?: never }) {
  const { x = 0, y = 0, width = 0, value, index } = props;
  // `index` is passed by LabelList — used to recover the row for its %.
  // Reach back into the dataset via a sibling render: Recharts doesn't
  // give us the row directly, so we render only the count here and the
  // legend below the chart carries the percentage.  Keeping the in-bar
  // label terse also avoids label collisions on narrow viewports.
  void index;
  if (value == null) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-text font-mono"
      style={{ fontSize: 12, fontWeight: 500 }}
    >
      {value}
    </text>
  );
}

interface TooltipProps {
  active?:  boolean;
  payload?: Array<{ payload?: DistributionBucket & { label: string; fill: string } }>;
}

function DistributionTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className={cn(
      "rounded-sm border border-brand bg-surface-1 px-3 py-2 shadow-popover",
    )}>
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {row.label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: row.fill }}
        />
        <span className="font-mono text-sm font-medium tabular-nums text-text">
          {row.count}
        </span>
        <span className="text-xs text-text-secondary">
          · {row.pctOfScored.toFixed(1)}% of scored
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  reason,
  period,
}: {
  reason: "no-employees" | "no-scores";
  period?: string;
}) {
  const headline = reason === "no-employees"
    ? "No employees in scope"
    : `No ${period ?? ""} check-ins scored yet`.trim();
  const body = reason === "no-employees"
    ? "Once employees are assigned a manager, their distribution lands here."
    : "Distribution will populate as employees submit quarterly check-ins.";
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {headline}
      </p>
      <p className="mt-2 text-sm text-text-secondary">{body}</p>
    </div>
  );
}

// Rounds up to a friendly y-axis ceiling so a max value of 7 lands on
// 8, of 12 lands on 15, of 33 lands on 40, etc.  Keeps tick spacing
// readable without crowding the top bar against the chart edge.
function niceCeil(n: number): number {
  if (n <= 1) return 2;
  if (n <= 5) return n + 1;
  if (n <= 10) return Math.ceil(n / 2) * 2;
  if (n <= 50) return Math.ceil(n / 5) * 5;
  return Math.ceil(n / 10) * 10;
}
