import "server-only";

import {
  CheckInPeriod,
  GoalSheetStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSystemDate } from "@/lib/system-date";
import type {
  CheckInState,
  CompletionRow,
  SheetState,
} from "@/components/completion-table";
import { averageScore, computeScore, type ScoreBand } from "@/lib/scoring";

export function bandFor(score: number): ScoreBand {
  if (score >= 1) return "EXCEEDS";
  if (score >= 0.7) return "MEETS";
  return "BELOW";
}

// Rebuilds the un-capped raw score for one (goal, check-in) pair.  Only
// MIN / MAX UoMs can produce raw > 1 (over-achievement); TIMELINE caps
// at 1.0 by formula and ZERO is binary 0/1.  Returns null if the
// check-in is missing required fields for the goal's UoM.
function scoreFromGoalAndCheckIn(
  goal: {
    uomType: string;
    target: Prisma.Decimal | null;
    targetDate: Date | null;
  },
  checkIn: {
    actual: Prisma.Decimal | null;
    actualDate: Date | null;
    zeroAchieved: boolean | null;
  },
): number | null {
  switch (goal.uomType) {
    case "MIN":
    case "MAX":
      if (goal.target == null || checkIn.actual == null) return null;
      return computeScore({
        uomType: goal.uomType,
        target: Number(goal.target),
        actual: Number(checkIn.actual),
      }).raw;
    case "TIMELINE":
      if (goal.targetDate == null || checkIn.actualDate == null) return null;
      return computeScore({
        uomType: "TIMELINE",
        targetDate: goal.targetDate,
        actualDate: checkIn.actualDate,
      }).raw;
    case "ZERO":
      if (checkIn.zeroAchieved == null) return null;
      return computeScore({
        uomType: "ZERO",
        achieved: checkIn.zeroAchieved,
      }).raw;
  }
  return null;
}

export function deriveSheetState(
  status: GoalSheetStatus | null,
): SheetState {
  if (status == null) return "MISSING";
  return status;
}

// Check-ins only apply once a sheet is APPROVED/LOCKED.  Anything earlier
// is NOT_APPLICABLE — the dashboard table shows an em-dash and chip counts
// skip those rows.
export function deriveCheckInState(
  sheetState: SheetState,
  goalsLogged: number,
  goalsTotal: number,
  windowState: "pre" | "active" | "past",
): CheckInState {
  if (sheetState !== "APPROVED" && sheetState !== "LOCKED") {
    return "NOT_APPLICABLE";
  }
  if (goalsTotal === 0) return "NOT_STARTED";
  if (goalsLogged >= goalsTotal) return "SUBMITTED";
  if (goalsLogged > 0) return "IN_PROGRESS";
  if (windowState === "past") return "OVERDUE";
  return "NOT_STARTED";
}

export interface CompletionScopeOutput {
  rows: CompletionRow[];
  cycle: { name: string };
  windowState: "pre" | "active" | "past";
}

// Loads every employee in the caller's scope (admin = whole org, manager =
// own direct reports) with derived sheet + check-in states for the given
// period.  Returns null if no active cycle is configured.  This is the
// single source of truth — both the page and the /api/...export route
// call it so they can't drift.
export async function loadCompletionScope(
  user: { id: string; role: Role },
  period: CheckInPeriod,
): Promise<CompletionScopeOutput | null> {
  const isAdmin = user.role === Role.ADMIN;

  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) return null;

  const systemDate = await getSystemDate();
  const windows: Record<CheckInPeriod, { opens: Date; closes: Date }> = {
    Q1:     { opens: cycle.q1OpensAt,     closes: cycle.q2OpensAt     },
    Q2:     { opens: cycle.q2OpensAt,     closes: cycle.q3OpensAt     },
    Q3:     { opens: cycle.q3OpensAt,     closes: cycle.annualOpensAt },
    ANNUAL: { opens: cycle.annualOpensAt, closes: cycle.endDate       },
  };
  const w = windows[period];
  const windowState: "pre" | "active" | "past" =
    systemDate >= w.closes ? "past" : systemDate >= w.opens ? "active" : "pre";

  const where: Prisma.UserWhereInput = {
    role: Role.EMPLOYEE,
    ...(isAdmin ? {} : { managerId: user.id }),
  };

  const employees = await prisma.user.findMany({
    where,
    orderBy: [{ name: "asc" }],
    include: {
      manager: { select: { id: true, name: true } },
      department: { select: { name: true } },
      goalSheets: {
        where: { cycleId: cycle.id },
        include: {
          goals: {
            include: { checkIns: { where: { period } } },
          },
        },
      },
    },
  });

  const rows: CompletionRow[] = employees.map((e) => {
    const sheet = e.goalSheets[0] ?? null;
    const goalsTotal = sheet?.goals.length ?? 0;
    const goalsLogged =
      sheet?.goals.filter((g) => g.checkIns[0]?.computedScore != null)
        .length ?? 0;
    // Recompute the raw (un-capped) score per goal from the goal + check-in
    // so the dashboard average reflects over-performance.  The stored
    // computedScore is clamped to 1.0 for banding purposes and would
    // bury rows like Riya's CSAT 102%.
    const rawScores: number[] = [];
    for (const g of sheet?.goals ?? []) {
      const ci = g.checkIns[0];
      if (!ci || ci.computedScore == null) continue;
      const score = scoreFromGoalAndCheckIn(g, ci);
      if (score != null) rawScores.push(score);
    }
    const avgScore = averageScore(rawScores);
    const sheetState = deriveSheetState(sheet?.status ?? null);
    return {
      employeeId: e.id,
      employeeName: e.name,
      employeeEmail: e.email,
      departmentName: e.department?.name ?? null,
      managerId: e.manager?.id ?? null,
      managerName: e.manager?.name ?? null,
      sheetState,
      checkInState: deriveCheckInState(
        sheetState,
        goalsLogged,
        goalsTotal,
        windowState,
      ),
      goalsLogged,
      goalsTotal,
      avgScore,
      avgScoreBand: avgScore != null ? bandFor(avgScore) : null,
    };
  });

  return { rows, cycle: { name: cycle.name }, windowState };
}

export interface CompletionFilters {
  manager?: string;
  sheet?: string;
  check?: string;
}

// Applies the URL filter params to a row set.  Filters can only NARROW —
// never expand — the scope (the scope itself was already enforced inside
// loadCompletionScope by the user.role gate).
export function applyCompletionFilters(
  rows: CompletionRow[],
  filters: CompletionFilters,
): CompletionRow[] {
  return rows.filter((r) => {
    if (filters.manager && r.managerId !== filters.manager) return false;
    if (filters.sheet && r.sheetState !== filters.sheet) return false;
    if (filters.check && r.checkInState !== filters.check) return false;
    return true;
  });
}

export function parsePeriod(
  raw: string | undefined | string[],
): CheckInPeriod {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "Q1" || v === "Q2" || v === "Q3" || v === "ANNUAL") return v;
  return "Q1";
}
