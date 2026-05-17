"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CheckInPeriod } from "@prisma/client";
import { CHART_HEX, type ChartSlot } from "@/lib/analytics-colors";
import { cn } from "@/lib/utils";

// QoQ chart input shape — one row per period; the four team columns are
// keyed by managerId so the same key resolves to the same colour every
// render.  Missing data points are explicit nulls so Recharts breaks
// the line rather than interpolating across gaps.
export interface QoQChartRow {
  period: string;        // "Q1" / "Q2" / "Q3" / "Annual"
  rawPeriod: CheckInPeriod;
  values: Record<string, number | null>; // managerId → percentage (0..120+)
}

export interface QoQChartTeam {
  managerId: string;
  managerName: string;
  slot: ChartSlot;
  currentValue: number | null;        // % for the period currently selected
  currentEmployeeCount: number;       // scored employees feeding the value
}

interface AnalyticsQoQProps {
  rows: QoQChartRow[];
  teams: QoQChartTeam[];
  currentPeriodLabel: string;
}

const Y_TICKS = [0, 25, 50, 75, 100];

export function AnalyticsQoQ({
  rows,
  teams,
  currentPeriodLabel,
}: AnalyticsQoQProps) {
  // Empty state — no managers in scope (manager view with no team, or
  // some misconfigured setup).  Genuinely empty data is handled by
  // Recharts breaking lines at null.
  if (teams.length === 0) {
    return <EmptyState />;
  }

  const hasAnyData = rows.some((r) =>
    teams.some((t) => r.values[t.managerId] != null),
  );

  return (
    <div className="space-y-5 rounded-lg border border-border bg-surface-1 p-6">
      <div className="h-72 w-full">
        {hasAnyData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rows.map((r) => ({ period: r.period, ...r.values }))}
              margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="period"
                stroke="var(--color-text-muted)"
                tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                domain={[0, 120]}
                ticks={Y_TICKS}
                tickFormatter={(v) => `${v}%`}
                stroke="var(--color-text-muted)"
                tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<QoQTooltip teams={teams} />} cursor={false} />
              {teams.map((team) => (
                <Line
                  key={team.managerId}
                  type="monotone"
                  dataKey={team.managerId}
                  name={team.managerName}
                  stroke={CHART_HEX[team.slot]}
                  strokeWidth={2}
                  dot={{
                    r: 3.5,
                    fill: CHART_HEX[team.slot],
                    stroke: "var(--color-surface-1)",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 5,
                    fill: CHART_HEX[team.slot],
                    stroke: "var(--color-surface-1)",
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                No data yet
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                No team has logged a scorable check-in for any quarter.
                As check-ins land, this trend fills in.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend — manager name + colour swatch + current-period average. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4">
        <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {currentPeriodLabel} averages
        </span>
        {teams.map((team) => (
          <LegendItem key={team.managerId} team={team} />
        ))}
      </div>
    </div>
  );
}

function LegendItem({ team }: { team: QoQChartTeam }) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: CHART_HEX[team.slot] }}
      />
      <span className="text-sm font-medium text-text">{team.managerName}</span>
      <span className="font-mono text-xs tabular-nums text-text-muted">
        {team.currentValue == null
          ? "—"
          : `${team.currentValue.toFixed(1)}%`}
      </span>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string }>;
  label?: string | number;
}

function QoQTooltip({
  active,
  payload,
  label,
  teams,
}: TooltipProps & { teams: QoQChartTeam[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const visible = payload.filter((p) => p.value != null);
  if (visible.length === 0) return null;
  return (
    <div className={cn(
      "rounded-sm border border-brand bg-surface-1 px-3 py-2 shadow-popover",
    )}>
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {String(label)}
      </p>
      <div className="mt-1.5 space-y-1">
        {visible.map((p) => {
          const team = teams.find((t) => t.managerId === p.dataKey);
          const color = p.color ?? "var(--color-text-muted)";
          return (
            <div
              key={String(p.dataKey)}
              className="flex items-center gap-2"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-text-secondary">
                {team?.managerName ?? String(p.dataKey)}
              </span>
              <span className="ml-auto font-mono text-xs font-medium tabular-nums text-text">
                {p.value!.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        No teams in scope
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        Once an employee is assigned a manager and a goal sheet, this chart
        starts tracking their team across the four quarters.
      </p>
    </div>
  );
}
