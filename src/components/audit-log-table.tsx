import { format } from "date-fns";
import { Inbox } from "lucide-react";
import type { AuditAction } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface AuditRow {
  id: string;
  createdAtISO: string;
  action: AuditAction;
  reason: string | null;
  actor: { name: string; email: string };
  target: {
    label: string;       // e.g. "Riya Sharma's sheet" or "Goal: Onboard 5 accounts"
    sublabel: string | null; // cycle / sheet id / goal sheet etc
  };
  before: unknown;
  after: unknown;
}

interface AuditLogTableProps {
  rows:           AuditRow[];
  // True when the page-level action filter is set and yielded zero
  // rows.  Drives different empty-state copy ("no matches" vs
  // "audit log empty overall") so the user knows to clear the filter
  // rather than think the system has no history.
  filterActive?:  boolean;
}

const ACTION_DOT: Record<AuditAction, string> = {
  GOAL_UNLOCKED:        "bg-warning",
  GOAL_TARGET_EDITED:   "bg-info",
  GOAL_WEIGHTAGE_EDITED:"bg-info",
  GOAL_DELETED:         "bg-danger",
  GOAL_RESTORED:        "bg-status-on-track",
  ADMIN_FORCE_APPROVE:  "bg-warning",
  SHEET_UNLOCKED:       "bg-warning",
  ESCALATION_RESOLVED:  "bg-brand",
};

export function AuditLogTable({ rows, filterActive = false }: AuditLogTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
        <Inbox
          size={28}
          strokeWidth={1.5}
          aria-hidden
          className="mx-auto text-text-muted"
        />
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-text-muted">
          {filterActive ? "No matches" : "Audit log empty"}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-text">
          {filterActive
            ? "No events match this filter"
            : "No admin overrides recorded yet"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
          {filterActive
            ? "Try clearing the filter to see the rest of the audit history, or pick a different action category."
            : "Every post-approval edit is captured here with its before/after diff and the admin’s reason. Rows show up the moment an admin unlocks a sheet or edits a locked goal."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card list — <md viewport.  6 fields × 200 rows doesn't
          fit horizontally on 375px, so each event becomes a stacked
          card with timestamp + actor at the top, action chip on its
          own row, target/reason/diff stacked below.  Reads like a
          changelog entry rather than a clipped table. */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <article key={r.id} className="rounded-lg border border-border bg-surface-1 p-4">
            <header className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{r.actor.name}</p>
                <p className="truncate font-mono text-xs text-text-muted">{r.actor.email}</p>
              </div>
              <p className="shrink-0 whitespace-nowrap font-mono text-xs text-text-secondary tabular-nums" suppressHydrationWarning>
                {format(new Date(r.createdAtISO), "d MMM · HH:mm")}
              </p>
            </header>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
                <span
                  aria-hidden
                  className={cn("h-1.5 w-1.5 rounded-full", ACTION_DOT[r.action])}
                />
                <span className="font-mono text-xs font-medium text-text-secondary">
                  {r.action}
                </span>
              </span>
            </div>
            <dl className="mt-3 space-y-2 border-t border-border-subtle pt-3 text-sm">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
                  Target
                </dt>
                <dd className="mt-0.5 text-text">{r.target.label}</dd>
                {r.target.sublabel ? (
                  <dd className="mt-0.5 font-mono text-xs text-text-muted">{r.target.sublabel}</dd>
                ) : null}
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
                  Reason
                </dt>
                <dd className="mt-0.5 text-xs text-text-secondary">{r.reason ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
                  Diff
                </dt>
                <dd className="mt-0.5">
                  <DiffCell before={r.before} after={r.after} />
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {/* Desktop table — md+ viewport.  All 6 columns visible, single-line scan. */}
      <div className="hidden md:block">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Diff</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="whitespace-nowrap">
              <span className="font-mono text-xs text-text-secondary">
                {format(new Date(r.createdAtISO), "d MMM yyyy")}
              </span>
              <br />
              <span className="font-mono text-xs text-text-muted">
                {format(new Date(r.createdAtISO), "HH:mm")}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-text">{r.actor.name}</span>
                <span className="font-mono text-xs text-text-muted">
                  {r.actor.email}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    ACTION_DOT[r.action],
                  )}
                />
                <span className="font-mono text-xs font-medium text-text-secondary">
                  {r.action}
                </span>
              </span>
            </TableCell>
            <TableCell className="max-w-xs">
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-text">{r.target.label}</span>
                {r.target.sublabel && (
                  <span className="truncate font-mono text-xs text-text-muted">
                    {r.target.sublabel}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="max-w-[18rem]">
              <span className="line-clamp-2 text-xs text-text-secondary">
                {r.reason ?? "—"}
              </span>
            </TableCell>
            <TableCell className="max-w-[16rem]">
              <DiffCell before={r.before} after={r.after} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
      </div>
    </>
  );
}

function DiffCell({
  before,
  after,
}: {
  before: unknown;
  after: unknown;
}) {
  const hasBefore = before != null && before !== "null";
  const hasAfter = after != null && after !== "null";
  if (!hasBefore && !hasAfter)
    return <span className="font-mono text-xs text-text-muted">—</span>;

  return (
    <div className="space-y-1">
      {hasBefore && (
        <div className="rounded-sm border border-danger/30 bg-danger/5 px-2 py-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-danger">
            −
          </span>{" "}
          <code className="font-mono text-xs text-text-secondary">
            {summarise(before)}
          </code>
        </div>
      )}
      {hasAfter && (
        <div className="rounded-sm border border-status-on-track/30 bg-status-on-track/5 px-2 py-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-status-on-track">
            +
          </span>{" "}
          <code className="font-mono text-xs text-text-secondary">
            {summarise(after)}
          </code>
        </div>
      )}
    </div>
  );
}

function summarise(value: unknown): string {
  if (value == null) return "null";
  if (typeof value !== "object") return String(value);
  const obj = value as Record<string, unknown>;
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v == null ? "null" : v}`)
    .join("  ·  ");
}
