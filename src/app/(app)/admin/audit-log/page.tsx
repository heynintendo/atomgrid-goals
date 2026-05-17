import Link from "next/link";
import { redirect } from "next/navigation";
import { AuditAction, Role } from "@prisma/client";
import {
  AuditLogTable,
  type AuditRow,
} from "@/components/audit-log-table";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

const ACTIONS: { value: AuditAction; label: string }[] = [
  { value: "SHEET_UNLOCKED",       label: "Sheet unlocked" },
  { value: "GOAL_UNLOCKED",        label: "Goal unlocked" },
  { value: "GOAL_TARGET_EDITED",   label: "Target edited" },
  { value: "GOAL_WEIGHTAGE_EDITED",label: "Weightage edited" },
  { value: "GOAL_DELETED",         label: "Goal deleted" },
  { value: "GOAL_RESTORED",        label: "Goal restored" },
  { value: "ADMIN_FORCE_APPROVE",  label: "Force approve" },
  { value: "ESCALATION_RESOLVED",  label: "Escalation resolved" },
];

function parseAction(raw: string | undefined): AuditAction | null {
  if (!raw) return null;
  if (ACTIONS.some((a) => a.value === raw)) return raw as AuditAction;
  return null;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== Role.ADMIN) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <h1 className="text-xl font-semibold text-text">Admin-only screen</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Switch to Priya to read the audit log.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const action = parseAction(sp.action);

  const entries = await prisma.auditLog.findMany({
    where: action ? { action } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { name: true, email: true } },
      goal: {
        select: {
          title: true,
          sheet: {
            select: { owner: { select: { name: true } } },
          },
        },
      },
    },
  });

  // Resolve sheetId → owner name for entries that reference a sheet
  // (not a goal).  One follow-up query, batched by id set.
  const sheetIds = entries
    .filter((e) => e.sheetId && !e.goal)
    .map((e) => e.sheetId!)
    .filter((v, i, a) => a.indexOf(v) === i);
  const sheets = sheetIds.length
    ? await prisma.goalSheet.findMany({
        where: { id: { in: sheetIds } },
        select: {
          id: true,
          cycle: { select: { name: true } },
          owner: { select: { name: true } },
        },
      })
    : [];
  const sheetById = new Map(sheets.map((s) => [s.id, s]));

  const rows: AuditRow[] = entries.map((e) => {
    let label: string;
    let sublabel: string | null = null;
    if (e.goal) {
      label = `Goal: ${e.goal.title}`;
      sublabel = `${e.goal.sheet.owner.name}'s sheet`;
    } else if (e.sheetId && sheetById.has(e.sheetId)) {
      const s = sheetById.get(e.sheetId)!;
      label = `${s.owner.name}'s sheet`;
      sublabel = s.cycle.name;
    } else {
      label = "—";
    }
    return {
      id: e.id,
      createdAtISO: e.createdAt.toISOString(),
      action: e.action,
      reason: e.reason,
      actor: { name: e.actor.name, email: e.actor.email },
      target: { label, sublabel },
      before: e.before,
      after: e.after,
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Admin · Governance
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Audit log
          </h1>
          <span className="font-mono text-xs text-text-muted tabular-nums">
            Recent {rows.length}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Every post-approval mutation lands here — paired transactionally
          with the change itself, so there&apos;s no path to edit without
          a row.
        </p>
      </header>

      {/* Action filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/audit-log"
          className={cn(
            "rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors duration-[120ms]",
            !action
              ? "border-border-hover bg-surface-hover text-text"
              : "border-border bg-surface-1 text-text-secondary hover:bg-surface-hover hover:text-text",
          )}
        >
          All actions
        </Link>
        {ACTIONS.map((a) => {
          const active = a.value === action;
          return (
            <Link
              key={a.value}
              href={`/admin/audit-log?action=${a.value}`}
              className={cn(
                "rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors duration-[120ms]",
                active
                  ? "border-border-hover bg-surface-hover text-text"
                  : "border-border bg-surface-1 text-text-secondary hover:bg-surface-hover hover:text-text",
              )}
            >
              <span className="font-mono">{a.label}</span>
            </Link>
          );
        })}
      </div>

      <AuditLogTable rows={rows} filterActive={action != null} />
    </div>
  );
}
