import { redirect } from "next/navigation";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import {
  CheckInPeriod,
  CyclePhase,
  EscalationLevel,
  EscalationStatus,
  GoalSheetStatus,
  Role,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ActivityFeed, type ActivityRow } from "@/components/overview/activity-feed";
import { CompletionDonut } from "@/components/overview/completion-donut";
import { KpiCard } from "@/components/overview/kpi-card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemDate, phaseForDate } from "@/lib/system-date";

const PERIOD_LABEL: Record<CheckInPeriod, string> = {
  Q1: "Q1", Q2: "Q2", Q3: "Q3", ANNUAL: "Annual",
};
const PHASE_TO_PERIOD: Partial<Record<CyclePhase, CheckInPeriod>> = {
  Q1: "Q1", Q2: "Q2", Q3: "Q3", ANNUAL: "ANNUAL",
};

const SHEET_STATUS_DOT: Record<GoalSheetStatus, string> = {
  DRAFT:     "bg-text-tertiary",
  SUBMITTED: "bg-status-warning",
  APPROVED:  "bg-brand-primary",
  LOCKED:    "bg-brand-primary",
  RETURNED:  "bg-status-danger",
};
const SHEET_STATUS_LABEL: Record<GoalSheetStatus, string> = {
  DRAFT:     "Draft",
  SUBMITTED: "Pending review",
  APPROVED:  "Approved",
  LOCKED:    "Locked",
  RETURNED:  "Returned",
};

export default async function ManagerOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== Role.MANAGER) redirect("/");

  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) {
    return <NoActiveCycle firstName={user.name.split(" ")[0]} />;
  }

  const systemDate    = await getSystemDate();
  const phase         = phaseForDate(systemDate, cycle);
  const currentPeriod = PHASE_TO_PERIOD[phase] ?? "Q1";
  const periodLabel   = PERIOD_LABEL[currentPeriod];

  const reports = await prisma.user.findMany({
    where: { managerId: user.id, role: Role.EMPLOYEE },
    orderBy: { name: "asc" },
    include: {
      goalSheets: {
        where: { cycleId: cycle.id },
        include: {
          goals: { include: { checkIns: { where: { period: currentPeriod } } } },
        },
      },
    },
  });

  // Aggregate the per-report state for the team table + donut.
  const rows = reports.map((r) => {
    const sheet      = r.goalSheets[0];
    const status     = sheet?.status ?? GoalSheetStatus.DRAFT;
    const goalsTotal = sheet?.goals.length ?? 0;
    const goalsLogged = sheet?.goals.filter(
      (g) => g.checkIns.length > 0 && g.checkIns[0].computedScore != null,
    ).length ?? 0;
    const lastActivity = sheet?.updatedAt ?? r.createdAt;
    return {
      id: r.id, name: r.name, email: r.email, status, goalsTotal,
      goalsLogged, lastActivity,
    };
  });

  // KPIs
  const sheetsToApprove = rows.filter((r) => r.status === GoalSheetStatus.SUBMITTED).length;
  const sheetsApproved  = rows.filter((r) => r.status === GoalSheetStatus.APPROVED || r.status === GoalSheetStatus.LOCKED).length;
  const teamCheckInPct = (() => {
    let total = 0, logged = 0;
    for (const r of rows) {
      if (r.status !== GoalSheetStatus.APPROVED && r.status !== GoalSheetStatus.LOCKED) continue;
      total += r.goalsTotal;
      logged += r.goalsLogged;
    }
    return total > 0 ? Math.round((logged / total) * 100) : 0;
  })();
  const openEscalations = await prisma.escalationEvent.count({
    where: {
      status:       EscalationStatus.ACTIVE,
      currentLevel: { in: [EscalationLevel.MANAGER, EscalationLevel.SKIP_LEVEL] },
      targetUser:   { managerId: user.id },
    },
  });

  // Donut slices — categorise each report row.
  const slices = (() => {
    let approvedComplete = 0;
    let approvedPartial  = 0;
    let pendingApproval  = 0;
    let notStarted       = 0;
    for (const r of rows) {
      if (r.status === GoalSheetStatus.APPROVED || r.status === GoalSheetStatus.LOCKED) {
        if (r.goalsTotal > 0 && r.goalsLogged === r.goalsTotal) approvedComplete += 1;
        else                                                     approvedPartial  += 1;
      } else if (r.status === GoalSheetStatus.SUBMITTED || r.status === GoalSheetStatus.RETURNED) {
        pendingApproval += 1;
      } else {
        notStarted += 1;
      }
    }
    return [
      { label: "Approved · complete", value: approvedComplete, color: "#A4D845" },
      { label: "Approved · partial",  value: approvedPartial,  color: "#475569" },
      { label: "Pending review",      value: pendingApproval,  color: "#23416F" },
      { label: "Not started",         value: notStarted,       color: "#E5E5E5" },
    ].filter((s) => s.value > 0);
  })();
  const donutPct = teamCheckInPct;

  // L1 escalations on this manager's reports (for the side card).
  const myEscalations = await prisma.escalationEvent.findMany({
    where: {
      status:       EscalationStatus.ACTIVE,
      currentLevel: EscalationLevel.MANAGER,
      targetUser:   { managerId: user.id },
    },
    include: { targetUser: { select: { name: true } } },
    orderBy: { triggeredAt: "desc" },
    take: 5,
  });

  // Recent activity — audit events involving any of this manager's
  // reports.  AuditLog.sheetId is a bare column without a relation;
  // pre-fetch the relevant sheet ids upfront and filter via `in`.
  const reportIds = rows.map((r) => r.id);
  const reportSheetIds = reports
    .flatMap((r) => r.goalSheets.map((s) => s.id));
  const auditRows = reportIds.length === 0 ? [] : await prisma.auditLog.findMany({
    where: {
      OR: [
        { actorId: { in: reportIds } },
        ...(reportSheetIds.length > 0 ? [{ sheetId: { in: reportSheetIds } }] : []),
        { goal: { sheet: { ownerId: { in: reportIds } } } },
      ],
    },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const activity: ActivityRow[] = auditRows.map((r) => ({
    id: r.id, actorName: r.actor.name, action: r.action,
    reason: r.reason, createdAt: r.createdAt,
  }));

  const firstName  = user.name.split(" ")[0];
  const windowClose = cycle.q2OpensAt; // simplistic: show Q1 close on manager's overview
  const daysToClose = differenceInCalendarDays(windowClose, systemDate);

  const ctaHref  = sheetsToApprove > 0 ? "/manager/approvals" : "/reports/analytics";
  const ctaLabel = sheetsToApprove > 0 ? `Review pending approvals (${sheetsToApprove})` : "View team analytics";

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            Team · Overview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="text-sm text-text-secondary">
            Managing {reports.length} direct {reports.length === 1 ? "report" : "reports"} · {periodLabel} {cycle.name}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface-1 px-3 py-2 text-right">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
            {periodLabel} window
          </p>
          <p className="font-mono text-sm tabular-nums text-brand-navy" suppressHydrationWarning>
            closes {format(windowClose, "d MMM yyyy")}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-text-tertiary">
            {daysToClose >= 0 ? `${daysToClose} d remaining` : `${Math.abs(daysToClose)} d past`}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Sheets to approve"
          value={sheetsToApprove}
          urgent={sheetsToApprove > 0}
          sublabel={sheetsToApprove === 0 ? "Queue is clear" : "Awaiting your review"}
        />
        <KpiCard
          label="Sheets approved"
          value={sheetsApproved}
          sublabel={`Out of ${reports.length} reports`}
        />
        <KpiCard
          label={`${periodLabel} completion`}
          value={
            <>
              <span>{teamCheckInPct}</span>
              <span className="text-base text-text-tertiary">%</span>
            </>
          }
          accent
          sublabel="Team-wide check-in coverage"
        />
        <KpiCard
          label="Open escalations"
          value={openEscalations}
          urgent={openEscalations > 0}
          sublabel={openEscalations === 0 ? "Everything's on track" : "L1 + L2 on your reports"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TeamTable rows={rows} className="lg:col-span-2" />
        <CompletionDonut
          title="Team completion"
          centerValue={`${donutPct}%`}
          centerLabel={periodLabel}
          slices={slices}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <EscalationsSummary rows={myEscalations} />
        <ActivityFeed
          title="Team activity"
          rows={activity}
          emptyHint="No team activity yet — events land here as reports submit and act on feedback."
        />
        <div className="rounded-lg border border-dashed border-border bg-surface-1 p-6">
          <h2 className="text-base font-semibold text-brand-navy">Where to next</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Use the quick action below to jump back into the workflow most likely
            to need your attention right now.
          </p>
          <div className="mt-4">
            <Button asChild size="md" className="w-full">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TeamRow {
  id: string; name: string; email: string;
  status: GoalSheetStatus; goalsTotal: number; goalsLogged: number;
  lastActivity: Date;
}
function TeamTable({ rows, className }: { rows: TeamRow[]; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface-1 p-6 ${className ?? ""}`}>
      <h2 className="text-base font-semibold text-brand-navy">Direct reports</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">No direct reports assigned yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border-subtle">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{r.name}</p>
                <p className="truncate font-mono text-xs text-text-tertiary">{r.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${SHEET_STATUS_DOT[r.status]}`} />
                  <span className="text-xs font-medium text-text">{SHEET_STATUS_LABEL[r.status]}</span>
                </span>
                <span className="w-20 text-right font-mono text-xs tabular-nums text-text-secondary">
                  {r.goalsTotal > 0 ? `${r.goalsLogged} / ${r.goalsTotal}` : "—"}
                </span>
                <span className="w-24 text-right font-mono text-xs text-text-tertiary tabular-nums" suppressHydrationWarning>
                  {format(r.lastActivity, "d MMM")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface EscRow {
  id: string;
  targetUser: { name: string };
  period: CheckInPeriod | null;
  triggeredAt: Date;
}
function EscalationsSummary({ rows }: { rows: EscRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-6">
      <h2 className="text-base font-semibold text-brand-navy">Escalations on your team</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">No open Level 1 escalations.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const days = Math.max(0, Math.round((Date.now() - r.triggeredAt.getTime()) / 86_400_000));
            return (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">
                    <span className="font-medium">{r.targetUser.name}</span>
                    <span className="text-text-secondary"> · {r.period ?? "—"}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-text-tertiary">
                    {days} d outstanding
                  </p>
                </div>
                <Link
                  href="/manager/escalations"
                  className="shrink-0 text-xs font-medium text-brand-navy underline-offset-2 hover:underline"
                >
                  Resolve
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 border-t border-border-subtle pt-3">
        <Link
          href="/manager/escalations"
          className="text-xs font-medium text-brand-navy underline-offset-2 hover:underline"
        >
          Open the full escalation register →
        </Link>
      </div>
    </div>
  );
}

function NoActiveCycle({ firstName }: { firstName: string }) {
  return (
    <div className="mx-auto max-w-2xl p-12">
      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
        Team · Overview
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Welcome back, {firstName}.
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        No active cycle yet — your team overview activates once an admin
        configures one.
      </p>
    </div>
  );
}
