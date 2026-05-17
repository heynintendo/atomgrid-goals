import { redirect } from "next/navigation";
import Link from "next/link";
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
import { ManagerEffectivenessMini } from "@/components/overview/manager-effectiveness-mini";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { averageScore } from "@/lib/scoring";
import { getSystemDate, getSystemDateState, phaseForDate } from "@/lib/system-date";
import { bandFor } from "@/lib/completion";

const PERIOD_LABEL: Record<CheckInPeriod, string> = {
  Q1: "Q1", Q2: "Q2", Q3: "Q3", ANNUAL: "Annual",
};
const PHASE_TO_PERIOD: Partial<Record<CyclePhase, CheckInPeriod>> = {
  Q1: "Q1", Q2: "Q2", Q3: "Q3", ANNUAL: "ANNUAL",
};

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== Role.ADMIN) redirect("/");

  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) {
    return <NoActiveCycle />;
  }

  const systemDate    = await getSystemDate();
  const dateState     = await getSystemDateState();
  const phase         = phaseForDate(systemDate, cycle);
  const currentPeriod = PHASE_TO_PERIOD[phase] ?? "Q1";
  const periodLabel   = PERIOD_LABEL[currentPeriod];

  // Org KPIs.
  const [totalUsers, sheetsApproved, openL2, allSheets] = await Promise.all([
    prisma.user.count(),
    prisma.goalSheet.count({
      where: {
        cycleId: cycle.id,
        status:  { in: [GoalSheetStatus.APPROVED, GoalSheetStatus.LOCKED] },
      },
    }),
    prisma.escalationEvent.count({
      where: {
        status:       EscalationStatus.ACTIVE,
        currentLevel: EscalationLevel.SKIP_LEVEL,
      },
    }),
    // Employee-only filter on the owner — managers (e.g. Karthik) can
    // have their own goal sheets but those shouldn't count toward
    // org completion or manager-effectiveness aggregations.  Without
    // the filter, Karthik's personal sheet would land under his own
    // manager (Priya, an admin) and surface as "Unknown" on the
    // effectiveness mini-chart since the name lookup only knows
    // role=MANAGER users.
    prisma.goalSheet.findMany({
      where: { cycleId: cycle.id, owner: { role: Role.EMPLOYEE } },
      include: {
        owner: { select: { managerId: true } },
        goals: { include: { checkIns: { where: { period: currentPeriod } } } },
      },
    }),
  ]);

  // Slice the org into completion buckets.  approvedComplete +
  // approvedPartial are subsets of approved/locked sheets, separated
  // by whether every goal has a scored check-in for the current
  // period.  draft and submitted are the remainders; we treat
  // RETURNED as "draft" since the employee owes a resubmission.
  const slices = (() => {
    let approvedComplete = 0, approvedPartial = 0, pendingReview = 0, draftOrReturned = 0;
    for (const s of allSheets) {
      const isApproved = s.status === GoalSheetStatus.APPROVED || s.status === GoalSheetStatus.LOCKED;
      if (isApproved) {
        const allLogged = s.goals.length > 0 && s.goals.every(
          (g) => g.checkIns.length > 0 && g.checkIns[0].computedScore != null,
        );
        if (allLogged) approvedComplete += 1;
        else           approvedPartial  += 1;
      } else if (s.status === GoalSheetStatus.SUBMITTED) {
        pendingReview += 1;
      } else {
        draftOrReturned += 1;
      }
    }
    return [
      { label: "Approved · complete", value: approvedComplete, color: "#A4D845" },
      { label: "Approved · partial",  value: approvedPartial,  color: "#475569" },
      { label: "Pending review",      value: pendingReview,    color: "#23416F" },
      { label: "Draft / returned",    value: draftOrReturned,  color: "#E5E5E5" },
    ].filter((s) => s.value > 0);
  })();

  // Average completion % across approved sheets.
  const avgCompletionPct = (() => {
    const approved = allSheets.filter((s) => s.status === GoalSheetStatus.APPROVED || s.status === GoalSheetStatus.LOCKED);
    if (approved.length === 0) return 0;
    let totalGoals = 0, loggedGoals = 0;
    for (const s of approved) {
      totalGoals += s.goals.length;
      loggedGoals += s.goals.filter((g) => g.checkIns.length > 0 && g.checkIns[0].computedScore != null).length;
    }
    return totalGoals === 0 ? 0 : Math.round((loggedGoals / totalGoals) * 100);
  })();

  // Manager-effectiveness aggregation — group approved sheets by
  // manager, compute team average of raw scores.  Lifts a slice of
  // the H16 manager-effectiveness analytics into the overview.
  const byManager = new Map<string, { name: string; rawScores: number[]; reportCount: number }>();
  const managerNames = await prisma.user.findMany({
    where: { role: Role.MANAGER },
    select: { id: true, name: true },
  });
  const nameMap = new Map(managerNames.map((m) => [m.id, m.name]));
  for (const s of allSheets) {
    const mgrId = s.owner.managerId;
    if (!mgrId) continue;
    const slot = byManager.get(mgrId) ?? { name: nameMap.get(mgrId) ?? "Unknown", rawScores: [], reportCount: 0 };
    slot.reportCount += 1;
    // Treat fully-logged approved sheets as 1.0, partial as fraction.
    const isApproved = s.status === GoalSheetStatus.APPROVED || s.status === GoalSheetStatus.LOCKED;
    if (isApproved) {
      const total  = s.goals.length;
      const logged = s.goals.filter((g) => g.checkIns.length > 0 && g.checkIns[0].computedScore != null).length;
      if (total > 0) slot.rawScores.push(logged / total);
    }
    byManager.set(mgrId, slot);
  }
  const effectiveness = [...byManager.values()]
    .map((m) => ({
      managerName:   m.name,
      completionPct: (averageScore(m.rawScores) ?? 0) * 100,
    }))
    .sort((a, b) => b.completionPct - a.completionPct);
  void bandFor; // kept exposed for downstream extensions; not used here

  // Recent audit (org-wide).
  const auditRows = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const activity: ActivityRow[] = auditRows.map((r) => ({
    id: r.id, actorName: r.actor.name, action: r.action,
    reason: r.reason, createdAt: r.createdAt,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            Org · Overview
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            AtomGrid Goal Setting · {cycle.name}
          </h1>
          <p className="text-sm text-text-secondary">
            {periodLabel} {cycle.name} · {dateState.isTraveled ? "Time-travel active" : "Live clock"} · {totalUsers} users
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active users" value={totalUsers} sublabel="Across all roles" />
        <KpiCard
          label="Sheets approved"
          value={sheetsApproved}
          sublabel={`${cycle.name} cycle`}
        />
        <KpiCard
          label={`${periodLabel} completion`}
          value={
            <>
              <span>{avgCompletionPct}</span>
              <span className="text-base text-text-tertiary">%</span>
            </>
          }
          accent
          sublabel="Goals logged / goals approved"
        />
        <KpiCard
          label="Open L2 escalations"
          value={openL2}
          urgent={openL2 > 0}
          sublabel={openL2 === 0 ? "Skip-level chain quiet" : "Past 7-day threshold"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CompletionDonut
          title="Org sheet completion"
          centerValue={`${avgCompletionPct}%`}
          centerLabel={periodLabel}
          slices={slices}
        />
        <ManagerEffectivenessMini rows={effectiveness} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ActivityFeed
          title="Recent audit events"
          rows={activity}
          emptyHint="No audited mutations yet — entries land here on every post-approval edit."
        />
        <div className="rounded-lg border border-dashed border-border bg-surface-1 p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-brand-navy">Where to next</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Drop into the audit log for the full trail, or open the analytics
            dashboard to compare period-on-period performance across teams.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="md">
              <Link href="/admin/audit-log">View full audit log</Link>
            </Button>
            <Button asChild variant="secondary" size="md">
              <Link href="/reports/analytics?period=Q1&tab=qoq">Run analytics</Link>
            </Button>
            <Button asChild size="md">
              <Link href="/reports/completion?period=Q1">Completion dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoActiveCycle() {
  return (
    <div className="mx-auto max-w-2xl p-12">
      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
        Org · Overview
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        AtomGrid Goal Setting
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        No active cycle configured yet. Use the Cycles admin page to start a
        new FY cycle; this overview activates once it goes live.
      </p>
    </div>
  );
}
