"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { EscalationLevel, EscalationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { markEscalationResolved } from "@/lib/escalations-actions";
import {
  ESCALATION_LEVEL_LABEL,
  ESCALATION_STATUS_LABEL,
  type EscalationRow,
} from "@/lib/escalations-types";
import { cn } from "@/lib/utils";

interface EscalationsTableProps {
  rows:          EscalationRow[];
  // Manager view hides the level filter (only L1 is in scope anyway).
  showLevelFilter: boolean;
}

type LevelFilter  = "all" | "MANAGER" | "SKIP_LEVEL";
type StatusFilter = "all" | "ACTIVE" | "RESOLVED";

export function EscalationsTable({
  rows,
  showLevelFilter,
}: EscalationsTableProps) {
  const searchParams = useSearchParams();
  const pathname     = usePathname();
  const router       = useRouter();

  const levelFilter:  LevelFilter  = parseLevelFilter(searchParams.get("level"));
  const statusFilter: StatusFilter = parseStatusFilter(searchParams.get("status")) ?? "ACTIVE";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  const filtered = rows.filter((r) => {
    if (levelFilter !== "all" && r.currentLevel !== levelFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Filter
        </span>
        <FilterChipGroup
          label="Status"
          options={[
            { value: "ACTIVE",   label: "Active" },
            { value: "RESOLVED", label: "Resolved" },
            { value: "all",      label: "All" },
          ]}
          current={statusFilter}
          onChange={(v) => setParam("status", v)}
        />
        {showLevelFilter ? (
          <FilterChipGroup
            label="Level"
            options={[
              { value: "all",        label: "All" },
              { value: "MANAGER",    label: "L1 — Manager" },
              { value: "SKIP_LEVEL", label: "L2 — Skip-level" },
            ]}
            current={levelFilter}
            onChange={(v) => setParam("level", v)}
          />
        ) : null}
        <span className="ml-auto font-mono text-xs tabular-nums text-text-muted">
          {filtered.length} {filtered.length === 1 ? "row" : "rows"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState filtered={rows.length > 0} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Days outstanding</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-[140px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Row({ row }: { row: EscalationRow }) {
  const [pending, startTransition] = useTransition();

  function handleResolve() {
    startTransition(async () => {
      const result = await markEscalationResolved(row.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Resolved ${row.employeeName}'s ${row.period ?? ""} escalation`);
    });
  }

  return (
    <TableRow>
      <TableCell>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-text">{row.employeeName}</p>
          <p className="font-mono text-xs text-text-muted">{row.employeeEmail}</p>
        </div>
      </TableCell>
      <TableCell>
        <span className="font-mono text-xs text-text">
          {row.period ?? "—"}
        </span>
      </TableCell>
      <TableCell>
        <LevelChip level={row.currentLevel} status={row.status} />
      </TableCell>
      <TableCell className="text-right">
        <span className="font-mono text-sm tabular-nums text-text">
          {row.daysOutstanding}
        </span>
        <span className="font-mono text-xs text-text-muted"> d</span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-text-secondary">
          {row.reason ?? <span className="text-text-muted">—</span>}
        </span>
      </TableCell>
      <TableCell className="text-right">
        {row.status === EscalationStatus.ACTIVE ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleResolve}
            disabled={pending}
          >
            {pending ? "Resolving…" : "Mark resolved"}
          </Button>
        ) : (
          <span className="font-mono text-xs text-text-muted">
            {ESCALATION_STATUS_LABEL[row.status]}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

function LevelChip({
  level,
  status,
}: {
  level:  EscalationLevel;
  status: EscalationStatus;
}) {
  const danger = level === EscalationLevel.SKIP_LEVEL && status === EscalationStatus.ACTIVE;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border px-2 py-0.5",
        danger
          ? "border-danger/40 bg-danger/[0.06]"
          : "border-border bg-surface-2",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          danger ? "bg-danger" : "bg-text-muted",
        )}
      />
      <span className="text-xs font-medium text-text">
        {ESCALATION_LEVEL_LABEL[level]}
      </span>
    </span>
  );
}

function FilterChipGroup<T extends string>({
  label,
  options,
  current,
  onChange,
}: {
  label:    string;
  options:  Array<{ value: T; label: string }>;
  current:  T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <div className="flex items-center gap-1">
        {options.map((opt) => {
          const active = opt.value === current;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                // h-7 = 28px (audit's smallest allowed control height).
                // Bumped from py-1 which rendered as 26px — Phase E
                // flagged the 2px shortfall as the only real token
                // height defect after audit-script noise was cleared.
                "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-offset-1",
                active
                  ? "border-brand-primary bg-brand-primary-subtle text-text"
                  : "border-border bg-surface-1 text-text-secondary hover:border-border-hover hover:bg-surface-hover",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {filtered ? "No matches" : "No active escalations"}
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        {filtered
          ? "Try widening the filters above — the row count badge shows how many match."
          : "All employees are on track. The daily 02:00 UTC cron will refresh this view if any miss a check-in window."}
      </p>
    </div>
  );
}

function parseLevelFilter(v: string | null): LevelFilter {
  if (v === "MANAGER" || v === "SKIP_LEVEL") return v;
  return "all";
}

function parseStatusFilter(v: string | null): StatusFilter | null {
  if (v === "ACTIVE" || v === "RESOLVED" || v === "all") return v;
  return null;
}

