"use client";

import { useState } from "react";
import type { CheckInPeriod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { scoreColorTokens } from "@/lib/score-colors";
import type { HeatmapCell, HeatmapEmployee } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface AnalyticsHeatmapProps {
  employees:     HeatmapEmployee[];
  currentPeriod: CheckInPeriod;
  hasAnyData:    boolean;
}

const PAGE_SIZE = 30;
const PERIOD_ORDER: CheckInPeriod[] = ["Q1", "Q2", "Q3", "ANNUAL"];
const PERIOD_LABELS: Record<CheckInPeriod, string> = {
  Q1: "Q1", Q2: "Q2", Q3: "Q3", ANNUAL: "Annual",
};

export function AnalyticsHeatmap({
  employees,
  currentPeriod,
  hasAnyData,
}: AnalyticsHeatmapProps) {
  const [page, setPage] = useState(0);

  if (employees.length === 0) {
    return <EmptyState reason="no-employees" />;
  }
  if (!hasAnyData) {
    return <EmptyState reason="no-checkins" />;
  }

  const totalPages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, employees.length);
  const visible = employees.slice(pageStart, pageEnd);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-1 p-6">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[180px] bg-surface-1 px-3 pb-2 pt-1 text-left font-mono text-xs font-medium uppercase tracking-wider text-text-muted"
              >
                Employee
              </th>
              {PERIOD_ORDER.map((p) => (
                <th
                  key={p}
                  scope="col"
                  className={cn(
                    "px-1 pb-2 pt-1 text-center font-mono text-xs font-medium uppercase tracking-wider text-text-muted",
                    p === currentPeriod && "border-t-2 border-brand",
                  )}
                >
                  {PERIOD_LABELS[p]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((emp) => (
              <tr key={emp.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[200px] truncate bg-surface-1 px-3 py-1 text-left text-sm font-normal text-text"
                  title={emp.name}
                >
                  {truncate(emp.name, 20)}
                </th>
                {PERIOD_ORDER.map((p) => (
                  <td key={p} className="px-1 py-0.5">
                    <HeatmapCellView
                      cell={emp.cells[p]}
                      employeeName={emp.name}
                      periodLabel={PERIOD_LABELS[p]}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <p className="font-mono text-xs text-text-muted">
          Showing {pageStart + 1}–{pageEnd} of {employees.length} employees
        </p>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Single cell.  The whole thing is the hover target; the tooltip is
// absolutely positioned inside and revealed on `group-hover`.
function HeatmapCellView({
  cell,
  employeeName,
  periodLabel,
}: {
  cell: HeatmapCell;
  employeeName: string;
  periodLabel: string;
}) {
  const tokens = scoreColorTokens(cell.score);
  const alpha = heatmapAlpha(cell.score);
  const bg = cell.score == null
    ? tokens.baseHex
    : withAlpha(tokens.baseHex, alpha);

  const pct = cell.score == null ? null : (cell.score * 100);
  const display =
    cell.score == null ? "—" : pct!.toFixed(1);

  const tooltipBucket =
    cell.state === "NO_SHEET"      ? "Sheet not approved"
    : cell.state === "NOT_SUBMITTED" ? "Check-in not submitted"
    : tokens.label;
  const tooltipScore = pct == null ? "—" : `${pct.toFixed(1)}%`;

  return (
    <div className="group/cell relative inline-block">
      <div
        role="img"
        aria-label={`${employeeName} · ${periodLabel} · ${tooltipScore} · ${tooltipBucket}`}
        className="flex h-8 w-9 items-center justify-center rounded-sm border border-border/40"
        style={{ backgroundColor: bg }}
      >
        <span className="font-mono text-[11px] font-medium tabular-nums leading-none text-text">
          {display}
        </span>
      </div>
      {/* Tooltip — CSS hover reveal.  Mirrors the QoQ tooltip:
          1px brand border, surface-1 bg, popover shadow. */}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-sm border border-brand bg-surface-1 px-3 py-2 shadow-popover group-hover/cell:block"
      >
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {periodLabel}
        </p>
        <p className="mt-1 text-sm font-medium text-text">{employeeName}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-xs tabular-nums text-text">
            {tooltipScore}
          </span>
          <span className="text-xs text-text-secondary">·</span>
          <span className="text-xs text-text-secondary">{tooltipBucket}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ reason }: { reason: "no-employees" | "no-checkins" }) {
  const headline = reason === "no-employees"
    ? "No employees in scope"
    : "No check-ins recorded yet";
  const body = reason === "no-employees"
    ? "Once employees are assigned a manager, their period-by-period scores will land here."
    : "Heatmap will populate as employees log quarterly actuals.";
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {headline}
      </p>
      <p className="mt-2 text-sm text-text-secondary">{body}</p>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────

// Maps a raw score (0..1+ or null) to the cell's background alpha.
// Within BELOW (0..0.7), lower scores get *more* alpha (deeper red) —
// 24% should look more urgent than 65%.  Within MEETS (0.7..1.0) and
// EXCEEDS (≥1.0), higher scores get more alpha (deeper colour at the
// top of the bucket).  NOT_APPLICABLE returns full alpha; the caller
// uses the flat NA hex so there's no gradient to compute.
function heatmapAlpha(score: number | null): number {
  if (score == null || !Number.isFinite(score)) return 1;
  if (score >= 1) {
    // 1.0 → 0.3 (just-exceeding), 1.5+ → 1.0 (saturated emerald)
    const cap = 1.5;
    const ratio = Math.min(1, (score - 1.0) / (cap - 1.0));
    return 0.3 + 0.7 * ratio;
  }
  if (score >= 0.7) {
    // 0.7 → 0.3, 1.0 → 1.0
    return 0.3 + 0.7 * ((score - 0.7) / 0.3);
  }
  // 0.7 → 0.3, 0.0 → 1.0  (further from threshold = deeper)
  return 0.3 + 0.7 * (1 - Math.max(0, score) / 0.7);
}

function withAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
