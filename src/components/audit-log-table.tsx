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
  rows: AuditRow[];
}

const ACTION_DOT: Record<AuditAction, string> = {
  GOAL_UNLOCKED:        "bg-warning",
  GOAL_TARGET_EDITED:   "bg-info",
  GOAL_WEIGHTAGE_EDITED:"bg-info",
  GOAL_DELETED:         "bg-danger",
  GOAL_RESTORED:        "bg-status-on-track",
  ADMIN_FORCE_APPROVE:  "bg-warning",
  SHEET_UNLOCKED:       "bg-warning",
};

export function AuditLogTable({ rows }: AuditLogTableProps) {
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
          Audit log empty
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-text">
          No admin overrides recorded yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
          Every post-approval edit is captured here with its before/after diff
          and the admin&apos;s reason. Rows show up the moment an admin
          unlocks a sheet or edits a locked goal.
        </p>
      </div>
    );
  }

  return (
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
