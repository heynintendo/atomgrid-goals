"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bandColorTokens } from "@/lib/score-colors";
import type { ManagerEffectivenessBar } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface AnalyticsEffectivenessProps {
  bars:                 ManagerEffectivenessBar[];
  orgMedianPct:         number | null;
  unscoredManagerCount: number;
  totalManagerCount:    number;
  currentPeriodLabel:   string;
  scope:                "admin" | "manager";
}

const Y_TICKS = [0, 25, 50, 75, 100];

export function AnalyticsEffectiveness({
  bars,
  orgMedianPct,
  unscoredManagerCount,
  totalManagerCount,
  currentPeriodLabel,
  scope,
}: AnalyticsEffectivenessProps) {
  if (totalManagerCount === 0) {
    return <EmptyState reason="no-teams" />;
  }
  if (bars.length === 0) {
    return <EmptyState reason="no-scores" period={currentPeriodLabel} />;
  }

  const rows = bars.map((b) => ({
    ...b,
    fill:  bandColorTokens(b.band).baseHex,
    label: truncate(b.managerName, 20),
  }));

  // y-axis upper bound respects the spec (120% ceiling) but extends to
  // accommodate exceptional rows (e.g. an outlier team at 135%).
  const maxPct = Math.max(...rows.map((r) => r.avgScorePct), orgMedianPct ?? 0);
  const yMax = maxPct > 120 ? niceCeil(maxPct) : 120;

  const subtitle =
    scope === "manager"
      ? `Your team's ${currentPeriodLabel} average vs. the org median`
      : buildAdminSubtitle({
          currentPeriodLabel,
          orgMedianPct,
          unscoredManagerCount,
        });

  return (
    <div className="space-y-5 rounded-lg border border-border bg-surface-1 p-6">
      <header className="space-y-1 border-b border-border pb-4">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {currentPeriodLabel} · manager effectiveness
        </p>
        <p className="text-sm text-text-secondary">{subtitle}</p>
      </header>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 28, right: 96, bottom: 8, left: 0 }}
            barCategoryGap={scope === "manager" ? "40%" : "30%"}
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
              interval={0}
              // Angle labels when the chart hosts 3+ bars so manager names
              // don't collide at narrow viewports (375px mobile).  Single-bar
              // manager view keeps the label upright.
              angle={rows.length >= 3 ? -20 : 0}
              textAnchor={rows.length >= 3 ? "end" : "middle"}
              height={rows.length >= 3 ? 56 : 28}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={yMax <= 120 ? Y_TICKS : undefined}
              tickFormatter={(v) => `${v}%`}
              stroke="var(--color-text-muted)"
              tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={<EffectivenessTooltip orgMedianPct={orgMedianPct} />}
              cursor={false}
            />
            {orgMedianPct != null ? (
              <ReferenceLine
                y={orgMedianPct}
                stroke="var(--color-text-muted)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
                label={{
                  value:    `Org median ${orgMedianPct.toFixed(1)}%`,
                  position: "right",
                  fill:     "var(--color-text-muted)",
                  fontSize: 11,
                }}
              />
            ) : null}
            <Bar
              dataKey="avgScorePct"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              maxBarSize={88}
            >
              {rows.map((r) => (
                <Cell key={r.managerId} fill={r.fill} />
              ))}
              <LabelList dataKey="avgScorePct" content={<BarLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function buildAdminSubtitle({
  currentPeriodLabel,
  orgMedianPct,
  unscoredManagerCount,
}: {
  currentPeriodLabel:   string;
  orgMedianPct:         number | null;
  unscoredManagerCount: number;
}): string {
  const parts: string[] = [`Team averages for ${currentPeriodLabel}`];
  if (orgMedianPct != null) {
    parts.push(`org median ${orgMedianPct.toFixed(1)}%`);
  }
  if (unscoredManagerCount > 0) {
    parts.push(
      `${unscoredManagerCount} ${unscoredManagerCount === 1 ? "manager" : "managers"} with no scored team this period`,
    );
  }
  return parts.join(" · ");
}

interface BarLabelGeometry {
  x?:     number;
  y?:     number;
  width?: number;
  value?: number;
}

function BarLabel(props: BarLabelGeometry) {
  const { x = 0, y = 0, width = 0, value } = props;
  if (value == null) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-text font-mono"
      style={{ fontSize: 12, fontWeight: 500 }}
    >
      {value.toFixed(1)}%
    </text>
  );
}

interface TooltipProps {
  active?:  boolean;
  payload?: Array<{ payload?: ManagerEffectivenessBar & { fill: string; label: string } }>;
  orgMedianPct: number | null;
}

function EffectivenessTooltip({
  active,
  payload,
  orgMedianPct,
}: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;

  const delta = orgMedianPct == null ? null : row.avgScorePct - orgMedianPct;
  const deltaLabel = delta == null
    ? null
    : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs. median`;

  return (
    <div className={cn(
      "rounded-sm border border-brand bg-surface-1 px-3 py-2 shadow-popover",
    )}>
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {row.managerName}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: row.fill }}
        />
        <span className="font-mono text-sm font-medium tabular-nums text-text">
          {row.avgScorePct.toFixed(1)}%
        </span>
        <span className="text-xs text-text-secondary">
          · {row.employeeCount} {row.employeeCount === 1 ? "employee" : "employees"}
        </span>
      </div>
      {deltaLabel ? (
        <p className="mt-1 font-mono text-xs tabular-nums text-text-secondary">
          {deltaLabel}
        </p>
      ) : null}
    </div>
  );
}

function EmptyState({
  reason,
  period,
}: {
  reason: "no-teams" | "no-scores";
  period?: string;
}) {
  const headline = reason === "no-teams"
    ? "No teams in scope"
    : `No ${period ?? ""} team averages yet`.trim();
  const body = reason === "no-teams"
    ? "Once employees are assigned a manager, team averages will land here."
    : "Manager effectiveness will populate as employees submit quarterly check-ins. Try the time-travel admin to walk forward through the cycle.";
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {headline}
      </p>
      <p className="mt-2 text-sm text-text-secondary">{body}</p>
    </div>
  );
}

function niceCeil(n: number): number {
  if (n <= 120) return 120;
  return Math.ceil(n / 10) * 10;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
