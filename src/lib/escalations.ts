import "server-only";

import {
  CheckInPeriod,
  EscalationLevel,
  EscalationStatus,
  GoalSheetStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { getSystemDate } from "@/lib/system-date";

// L3 (HR) and L4 (EXECUTIVE) levels are scaffolded in the EscalationLevel
// enum for future extension.  This engine currently only writes L1
// (MANAGER) — when a check-in window closes and the employee hasn't
// submitted — and L2 (SKIP_LEVEL) — when an L1 sits unresolved for 7+
// real-time days.

const PERIODS_IN_ORDER: CheckInPeriod[] = ["Q1", "Q2", "Q3", "ANNUAL"];
const L2_AGE_THRESHOLD_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface EscalationSummary {
  newLevel1:  number;
  newLevel2:  number;
  executedAt: string; // wall-clock ISO, what the cron actually fired at
  systemDate: string; // simulated ISO, what the engine evaluated against
}

// Maps each period to the date its window closes.  Q1 closes when Q2
// opens, Q2 when Q3 opens, Q3 when ANNUAL opens, ANNUAL when the cycle
// ends.  Returned dates are exclusive — window is "closed" when
// systemDate >= the value.
function periodCloseDates(cycle: {
  q2OpensAt:     Date;
  q3OpensAt:     Date;
  annualOpensAt: Date;
  endDate:       Date;
}): Record<CheckInPeriod, Date> {
  return {
    Q1:     cycle.q2OpensAt,
    Q2:     cycle.q3OpensAt,
    Q3:     cycle.annualOpensAt,
    ANNUAL: cycle.endDate,
  };
}

// Engine entry point.  Idempotent: the unique constraint on
// (targetUserId, period, currentLevel) combined with
// `createMany({ skipDuplicates: true })` means re-runs add zero rows
// when state hasn't changed.  Two `createMany` calls inside one
// `$transaction` so an L1 + L2 wave commits atomically — either both
// land or neither does.
export async function checkAndCreateEscalations(): Promise<EscalationSummary> {
  const systemDate = await getSystemDate();
  const realNow    = new Date();

  // ── Phase 1: L1 candidates ────────────────────────────────────────
  // Pull every APPROVED/LOCKED sheet in an active cycle along with its
  // goals + that cycle's existing check-ins.  Goals with no check-in
  // for a closed period are the trigger condition.
  const sheets = await prisma.goalSheet.findMany({
    where: {
      status: { in: [GoalSheetStatus.APPROVED, GoalSheetStatus.LOCKED] },
      cycle:  { isActive: true },
    },
    include: {
      cycle: true,
      goals: { include: { checkIns: true } },
    },
  });

  const l1Inserts: Prisma.EscalationEventCreateManyInput[] = [];
  for (const sheet of sheets) {
    const closes = periodCloseDates(sheet.cycle);
    if (sheet.goals.length === 0) continue;

    for (const period of PERIODS_IN_ORDER) {
      if (systemDate < closes[period]) continue;  // window still open

      const fullyCheckedIn = sheet.goals.every((g) =>
        g.checkIns.some(
          (c) => c.period === period && c.computedScore != null,
        ),
      );
      if (fullyCheckedIn) continue;

      l1Inserts.push({
        targetUserId: sheet.ownerId,
        period,
        currentLevel: EscalationLevel.MANAGER,
        status:       EscalationStatus.ACTIVE,
        triggeredAt:  realNow,
        reason:       `${period} check-in not submitted by deadline (window closed ${format(closes[period], "yyyy-MM-dd")})`,
        notifiedLog:  [],
        contextRef:   sheet.id,
      });
    }
  }

  // ── Phase 2: L2 candidates ────────────────────────────────────────
  // Any L1 that's been ACTIVE for more than 7 real-time days promotes
  // to L2.  Real-time, not systemDate — escalations follow wall-clock
  // intent so demo time-travel doesn't fast-forward through L1.
  const stalledThreshold = new Date(
    realNow.getTime() - L2_AGE_THRESHOLD_DAYS * MS_PER_DAY,
  );
  const stalledL1s = await prisma.escalationEvent.findMany({
    where: {
      currentLevel: EscalationLevel.MANAGER,
      status:       EscalationStatus.ACTIVE,
      triggeredAt:  { lt: stalledThreshold },
      period:       { not: null },
    },
    select: { targetUserId: true, period: true, contextRef: true },
  });

  const l2Inserts: Prisma.EscalationEventCreateManyInput[] = stalledL1s
    .filter((l1): l1 is typeof l1 & { period: CheckInPeriod } => l1.period != null)
    .map((l1) => ({
      targetUserId: l1.targetUserId,
      period:       l1.period,
      currentLevel: EscalationLevel.SKIP_LEVEL,
      status:       EscalationStatus.ACTIVE,
      triggeredAt:  realNow,
      reason:       `Manager has not acted on ${l1.period} escalation for ${L2_AGE_THRESHOLD_DAYS}+ days`,
      notifiedLog:  [],
      contextRef:   l1.contextRef,
    }));

  // ── Write phase ───────────────────────────────────────────────────
  // skipDuplicates short-circuits on the unique constraint
  // (targetUserId, period, currentLevel) so a second run with no
  // state change inserts zero rows.  The returned count is the actual
  // inserted count, which is what we surface to the cron caller.
  const [l1Result, l2Result] = await prisma.$transaction([
    prisma.escalationEvent.createMany({
      data:           l1Inserts,
      skipDuplicates: true,
    }),
    prisma.escalationEvent.createMany({
      data:           l2Inserts,
      skipDuplicates: true,
    }),
  ]);

  return {
    newLevel1:  l1Result.count,
    newLevel2:  l2Result.count,
    executedAt: realNow.toISOString(),
    systemDate: systemDate.toISOString(),
  };
}

// ─────────────────────────────  READ LAYER  ────────────────────────────────

import type { EscalationRow } from "@/lib/escalations-types";

// Loads escalations into the shape the UI table renders.  Admin gets
// every row org-wide.  Managers get only L1 (MANAGER) rows for their
// direct reports — L2 (SKIP_LEVEL) is intentionally hidden because the
// manager already missed the L1; visibility at that level is the
// admin's responsibility.
export async function loadEscalations(user: {
  id:   string;
  role: Role;
}): Promise<EscalationRow[]> {
  const isAdmin = user.role === Role.ADMIN;
  const events = await prisma.escalationEvent.findMany({
    where: {
      ...(isAdmin
        ? {}
        : {
            currentLevel: EscalationLevel.MANAGER,
            targetUser:   { managerId: user.id },
          }),
    },
    include: {
      targetUser: {
        select: {
          id:    true,
          name:  true,
          email: true,
          manager: { select: { name: true } },
        },
      },
    },
    orderBy: { triggeredAt: "desc" },
  });

  const realNow = new Date();
  return events.map((e) => ({
    id:             e.id,
    employeeId:     e.targetUser.id,
    employeeName:   e.targetUser.name,
    employeeEmail:  e.targetUser.email,
    managerName:    e.targetUser.manager?.name ?? null,
    period:         e.period,
    currentLevel:   e.currentLevel,
    status:         e.status,
    reason:         e.reason,
    triggeredAt:    e.triggeredAt,
    resolvedAt:     e.resolvedAt,
    daysOutstanding: Math.max(
      0,
      Math.round((realNow.getTime() - e.triggeredAt.getTime()) / (24 * 60 * 60 * 1000)),
    ),
  }));
}

// Re-export the shared label maps from the types module so existing
// server-only callers can keep importing from "@/lib/escalations".
export {
  ESCALATION_LEVEL_LABEL,
  ESCALATION_STATUS_LABEL,
  type EscalationRow,
} from "@/lib/escalations-types";
