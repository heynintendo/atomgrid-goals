"use server";

import { revalidatePath } from "next/cache";
import {
  CheckInPeriod,
  CyclePhase,
  GoalSheetStatus,
  GoalStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { CheckInSubmittedEmail } from "@/emails/checkin-submitted";
import { getSystemDate, phaseForDate } from "@/lib/system-date";
import { computeScore, type UomType } from "@/lib/scoring";
import {
  saveCheckInSchema,
  type CheckInEntryInput,
} from "@/lib/validators/check-ins";
import type { ActionResult } from "@/lib/actions/goals";

const PERIOD_LABEL_FOR_EMAIL: Record<CheckInPeriod, string> = {
  Q1:     "Q1",
  Q2:     "Q2",
  Q3:     "Q3",
  ANNUAL: "Annual",
};

// Period → CyclePhase mapping for window-state checks.  ANNUAL covers the
// final Q4/Annual phase.
const PERIOD_TO_PHASE: Record<CheckInPeriod, CyclePhase> = {
  Q1: CyclePhase.Q1,
  Q2: CyclePhase.Q2,
  Q3: CyclePhase.Q3,
  ANNUAL: CyclePhase.ANNUAL,
};

// Builds the score input object the scoring lib expects, picking only the
// fields that matter for each UoM type.  Goal-side fields (target/targetDate)
// come from the goal row; check-in-side fields come from the entry.
function makeScoreInput(
  goal: { uomType: UomType; target: Prisma.Decimal | null; targetDate: Date | null },
  entry: CheckInEntryInput,
):
  | { uomType: "MIN"; target: number; actual: number }
  | { uomType: "MAX"; target: number; actual: number }
  | { uomType: "TIMELINE"; targetDate: Date; actualDate: Date }
  | { uomType: "ZERO"; achieved: boolean }
  | null {
  switch (goal.uomType) {
    case "MIN":
    case "MAX":
      if (goal.target == null || entry.actual == null) return null;
      return {
        uomType: goal.uomType,
        target: Number(goal.target),
        actual: entry.actual,
      };
    case "TIMELINE":
      if (goal.targetDate == null || !entry.actualDate) return null;
      return {
        uomType: "TIMELINE",
        targetDate: goal.targetDate,
        actualDate: new Date(entry.actualDate),
      };
    case "ZERO":
      if (entry.zeroAchieved == null) return null;
      return { uomType: "ZERO", achieved: entry.zeroAchieved };
  }
}

export async function saveCheckIn(raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const parsed = saveCheckInSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { period, entries } = parsed.data;

  // Find active cycle + user's approved sheet.  Locked is also acceptable —
  // post-approval the BRD says only admins can edit goals, but check-ins
  // happen against locked sheets by design.
  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) return { ok: false, error: "No active cycle" };

  const sheet = await prisma.goalSheet.findUnique({
    where: { ownerId_cycleId: { ownerId: user.id, cycleId: cycle.id } },
    include: {
      goals: {
        include: { sharedCopies: { select: { id: true } } },
      },
    },
  });
  if (!sheet) return { ok: false, error: "No goal sheet found for this cycle" };
  if (
    sheet.status !== GoalSheetStatus.APPROVED &&
    sheet.status !== GoalSheetStatus.LOCKED
  ) {
    return {
      ok: false,
      error: `Sheet is ${sheet.status} — only APPROVED sheets can record check-ins`,
    };
  }

  // Window guard: the effective system date must fall inside the requested
  // period's window.  Admins can time-travel anywhere; this honours that
  // override automatically since getSystemDate() returns the time-traveled
  // value when set.
  const systemDate = await getSystemDate();
  const effectivePhase = phaseForDate(systemDate, cycle);
  const targetPhase = PERIOD_TO_PHASE[period];
  // Allowing later phases lets users still enter actuals after the strict
  // window closes (a "review-and-still-edit" stance).  Pre-window remains
  // blocked.
  const phaseOrder: CyclePhase[] = [
    CyclePhase.GOAL_SETTING,
    CyclePhase.Q1,
    CyclePhase.Q2,
    CyclePhase.Q3,
    CyclePhase.ANNUAL,
    CyclePhase.CLOSED,
  ];
  if (phaseOrder.indexOf(effectivePhase) < phaseOrder.indexOf(targetPhase)) {
    return {
      ok: false,
      error: `${period} window hasn't opened yet — use /admin/time-travel to demo it`,
    };
  }

  const goalsById = new Map(sheet.goals.map((g) => [g.id, g]));

  // Snapshot how many goals are already fully checked-in for this
  // period before the transaction runs.  Used post-tx to detect the
  // single transition that flips the period from "in progress" to
  // "submitted" — that's the email trigger.  Quick count, no full row
  // fetch needed.
  const fullyCheckedBefore = await prisma.checkIn.count({
    where: {
      period,
      computedScore: { not: null },
      goal: { sheetId: sheet.id },
    },
  });

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const entry of entries) {
          const goal = goalsById.get(entry.goalId);
          if (!goal) continue;

          // Recipients of a shared goal don't enter their own actual —
          // the source owner drives that value.  Their employeeStatus
          // and ZERO selection are still theirs to toggle.
          const isRecipient = goal.sharedFromId !== null;

          const scoreInput = isRecipient
            ? null
            : makeScoreInput(
                {
                  uomType: goal.uomType as UomType,
                  target: goal.target,
                  targetDate: goal.targetDate,
                },
                entry,
              );
          const scoreResult = scoreInput ? computeScore(scoreInput) : null;

          const data = {
            actual:
              isRecipient
                ? undefined
                : entry.actual != null
                  ? new Prisma.Decimal(entry.actual)
                  : null,
            actualDate:
              isRecipient
                ? undefined
                : entry.actualDate
                  ? new Date(entry.actualDate)
                  : null,
            zeroAchieved: isRecipient ? undefined : entry.zeroAchieved ?? null,
            employeeStatus: entry.employeeStatus,
            computedScore:
              scoreResult
                ? new Prisma.Decimal(scoreResult.score.toFixed(4))
                : null,
          };

          await tx.checkIn.upsert({
            where: { goalId_period: { goalId: goal.id, period } },
            update: data,
            create: {
              goalId: goal.id,
              period,
              ...data,
            },
          });

          // Shared-goal fan-out: if this is a SOURCE goal (has
          // sharedCopies), propagate the actual + computed score to each
          // recipient's CheckIn for the same period.  Recipients' rows
          // keep their own employeeStatus if one already exists.
          if (!isRecipient && goal.sharedCopies.length > 0 && scoreResult) {
            for (const copy of goal.sharedCopies) {
              const existing = await tx.checkIn.findUnique({
                where: { goalId_period: { goalId: copy.id, period } },
              });
              await tx.checkIn.upsert({
                where: { goalId_period: { goalId: copy.id, period } },
                update: {
                  actual: data.actual ?? null,
                  actualDate: data.actualDate ?? null,
                  zeroAchieved: data.zeroAchieved ?? null,
                  computedScore: data.computedScore,
                },
                create: {
                  goalId: copy.id,
                  period,
                  actual: data.actual ?? null,
                  actualDate: data.actualDate ?? null,
                  zeroAchieved: data.zeroAchieved ?? null,
                  employeeStatus: existing?.employeeStatus ?? GoalStatus.ON_TRACK,
                  computedScore: data.computedScore,
                },
              });
            }
          }
        }
      },
      {
        // Per H10 brief: serialise to prevent two concurrent saves from
        // interleaving the source/recipient writes.
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Save failed: ${e.message}`
          : "Save failed — please retry",
    };
  }

  // Post-commit: notify the manager if THIS save was the one that
  // flipped the period to fully-submitted.  The before/after
  // comparison prevents re-sending on repeated saves once already
  // complete.
  const totalGoals = sheet.goals.length;
  if (totalGoals > 0 && fullyCheckedBefore < totalGoals) {
    const fullyCheckedAfter = await prisma.checkIn.count({
      where: {
        period,
        computedScore: { not: null },
        goal: { sheetId: sheet.id },
      },
    });
    if (fullyCheckedAfter === totalGoals) {
      const ctx = await prisma.user.findUnique({
        where:  { id: user.id },
        select: { name: true, manager: { select: { name: true } } },
      });
      if (ctx?.manager) {
        await sendEmail({
          kind:    "checkin-submitted",
          subject: `${ctx.name} submitted their ${PERIOD_LABEL_FOR_EMAIL[period]} check-in`,
          react:   CheckInSubmittedEmail({
            employeeName: ctx.name,
            managerName:  ctx.manager.name,
            period:       PERIOD_LABEL_FOR_EMAIL[period],
          }),
        });
      }
    }
  }

  revalidatePath(`/employee/check-in/${period}`);
  revalidatePath("/employee/check-ins");
  // Manager dashboards read check-ins for completion %.
  revalidatePath("/manager/check-ins");
  revalidatePath("/reports/completion");
  return { ok: true, data: undefined };
}
