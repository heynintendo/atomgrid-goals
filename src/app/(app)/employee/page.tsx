import { redirect } from "next/navigation";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import {
  CheckInPeriod,
  CyclePhase,
  GoalSheetStatus,
  Role,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ScorePill } from "@/components/score-pill";
import { ActivityFeed, type ActivityRow } from "@/components/overview/activity-feed";
import { KpiCard } from "@/components/overview/kpi-card";
import { PerGoalProgress } from "@/components/overview/per-goal-progress";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemDate, phaseForDate } from "@/lib/system-date";

const PERIOD_LABEL: Record<CheckInPeriod, string> = {
  Q1: "Q1", Q2: "Q2", Q3: "Q3", ANNUAL: "Annual",
};
const PHASE_TO_PERIOD: Partial<Record<CyclePhase, CheckInPeriod>> = {
  Q1: "Q1", Q2: "Q2", Q3: "Q3", ANNUAL: "ANNUAL",
};

const SHEET_STATUS_LABEL: Record<GoalSheetStatus, string> = {
  DRAFT:     "Draft",
  SUBMITTED: "Submitted",
  APPROVED:  "Approved",
  RETURNED:  "Returned for rework",
  LOCKED:    "Locked",
};

export default async function EmployeeOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== Role.EMPLOYEE) redirect("/");

  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) {
    return <NoActiveCycle firstName={user.name.split(" ")[0]} />;
  }

  const systemDate = await getSystemDate();
  const phase      = phaseForDate(systemDate, cycle);
  const currentPeriod: CheckInPeriod = PHASE_TO_PERIOD[phase] ?? "Q1";
  const periodLabel = PERIOD_LABEL[currentPeriod];

  // Pull the sheet + every goal + this-period check-ins in one query.
  const sheet = await prisma.goalSheet.findUnique({
    where: { ownerId_cycleId: { ownerId: user.id, cycleId: cycle.id } },
    include: {
      goals: { include: { checkIns: { where: { period: currentPeriod } } } },
    },
  });

  // Window-close date: when the NEXT period opens.  ANNUAL closes at
  // cycle.endDate.
  const closeMap: Record<CheckInPeriod, Date> = {
    Q1: cycle.q2OpensAt, Q2: cycle.q3OpensAt, Q3: cycle.annualOpensAt, ANNUAL: cycle.endDate,
  };
  const closeDate    = closeMap[currentPeriod];
  const daysToClose  = differenceInCalendarDays(closeDate, systemDate);
  const daysOverdue  = daysToClose < 0;
  const goalsTotal   = sheet?.goals.length ?? 0;
  const goalsLogged  = sheet?.goals.filter((g) => g.checkIns.length > 0 && g.checkIns[0].computedScore != null).length ?? 0;
  const completionPct = goalsTotal > 0 ? Math.round((goalsLogged / goalsTotal) * 100) : 0;
  const sheetStatus  = sheet?.status ?? GoalSheetStatus.DRAFT;

  // CTA logic per H20 spec.
  const cta = nextActionFor(sheetStatus, goalsTotal, goalsLogged, currentPeriod, daysToClose);

  // Per-goal progress bars for the chart.
  const progressBars = (sheet?.goals ?? []).map((g) => ({
    goalId:   g.id,
    title:    g.title,
    done:     g.checkIns.length > 0 && g.checkIns[0].computedScore != null,
    progress: g.checkIns.length > 0 && g.checkIns[0].computedScore != null ? 1 : 0,
  }));

  // Activity feed — audit events on this employee's sheet/goals + any
  // they themselves authored.
  // AuditLog.sheetId is a bare column without a relation, so pre-fetch
  // this employee's sheet ids and filter via `in`.
  const mySheetIds = sheet ? [sheet.id] : [];
  const auditRows = await prisma.auditLog.findMany({
    where: {
      OR: [
        { actorId: user.id },
        ...(mySheetIds.length > 0 ? [{ sheetId: { in: mySheetIds } }] : []),
        { goal: { sheet: { ownerId: user.id } } },
      ],
    },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const activity: ActivityRow[] = auditRows.map((r) => ({
    id:        r.id,
    actorName: r.actor.name,
    action:    r.action,
    reason:    r.reason,
    createdAt: r.createdAt,
  }));

  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      {/* Hero */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            Personal · Overview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="text-sm text-text-secondary">
            {periodLabel} {cycle.name} · {SHEET_STATUS_LABEL[sheetStatus]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScorePill
            display={SHEET_STATUS_LABEL[sheetStatus]}
            band={sheetBand(sheetStatus)}
          />
          <div className="rounded-md border border-border bg-surface-1 px-3 py-2 text-right">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
              Window {daysOverdue ? "closed" : "closes"}
            </p>
            <p className="font-mono text-sm tabular-nums text-brand-navy" suppressHydrationWarning>
              {format(closeDate, "d MMM yyyy")}
            </p>
            <p className={daysOverdue ? "mt-0.5 text-[11px] font-medium text-status-danger" : daysToClose <= 7 ? "mt-0.5 text-[11px] font-medium text-status-warning" : "mt-0.5 text-[11px] font-medium text-text-tertiary"}>
              {daysOverdue ? `${Math.abs(daysToClose)} d overdue` : `${daysToClose} d remaining`}
            </p>
          </div>
        </div>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Goals defined"
          value={goalsTotal}
          sublabel={goalsTotal === 0 ? "Start your sheet to populate" : undefined}
        />
        <KpiCard
          label={`${periodLabel} check-ins`}
          value={
            <>
              <span>{goalsLogged}</span>
              <span className="text-base text-text-tertiary"> / {goalsTotal}</span>
            </>
          }
          sublabel={goalsTotal === 0 ? undefined : (goalsLogged === goalsTotal ? "All logged" : `${goalsTotal - goalsLogged} pending`)}
        />
        <KpiCard
          label="Completion"
          value={
            <>
              <span>{completionPct}</span>
              <span className="text-base text-text-tertiary">%</span>
            </>
          }
          accent
          sublabel={goalsTotal === 0 ? "No goals yet" : "For this period"}
        />
        <KpiCard
          label="Days to window close"
          value={Math.max(0, daysToClose)}
          urgent={!daysOverdue && daysToClose <= 7 && goalsLogged < goalsTotal}
          sublabel={daysOverdue ? "Window has closed" : daysToClose <= 7 ? "Closing soon" : undefined}
        />
      </div>

      {/* Two-column: chart + activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PerGoalProgress
          bars={progressBars}
          periodLabel={periodLabel}
          className="lg:col-span-2"
        />
        <ActivityFeed
          title="Recent activity"
          rows={activity}
          emptyHint="No activity yet — submit your sheet to start the audit trail."
        />
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <Button asChild size="lg">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      </div>
    </div>
  );
}

function sheetBand(status: GoalSheetStatus): "EXCEEDS" | "MEETS" | "BELOW" | "NA" {
  if (status === GoalSheetStatus.APPROVED || status === GoalSheetStatus.LOCKED) return "EXCEEDS";
  if (status === GoalSheetStatus.SUBMITTED) return "MEETS";
  if (status === GoalSheetStatus.RETURNED)  return "BELOW";
  return "NA";
}

function nextActionFor(
  status:       GoalSheetStatus,
  goalsTotal:   number,
  goalsLogged:  number,
  period:       CheckInPeriod,
  daysToClose:  number,
): { href: string; label: string } {
  if (status === GoalSheetStatus.RETURNED) {
    return { href: "/employee/goal-sheet", label: "Review manager feedback" };
  }
  if (status === GoalSheetStatus.DRAFT) {
    return { href: "/employee/goal-sheet", label: "Continue your goal sheet" };
  }
  if (status === GoalSheetStatus.SUBMITTED) {
    return { href: "/employee/goal-sheet", label: "View submitted sheet" };
  }
  // Approved or locked.
  if (goalsLogged < goalsTotal) {
    return {
      href: `/employee/check-in/${period}`,
      label: daysToClose <= 7 && daysToClose >= 0 ? `Log your ${period} check-in — ${daysToClose}d left` : `Log your ${period} check-in`,
    };
  }
  return { href: "/employee/check-ins", label: "Review your check-ins" };
}

function NoActiveCycle({ firstName }: { firstName: string }) {
  return (
    <div className="mx-auto max-w-2xl p-12">
      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
        Personal · Overview
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Welcome back, {firstName}.
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        No active cycle yet — your overview lands here as soon as an admin
        configures one.
      </p>
    </div>
  );
}
