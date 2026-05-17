"use server";

import { revalidatePath } from "next/cache";
import {
  GoalSheetStatus,
  Prisma,
  UomType,
  type Goal,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { SheetSubmittedEmail } from "@/emails/sheet-submitted";
import {
  saveSheetInputSchema,
  submitSheetInputSchema,
  type GoalInput,
} from "@/lib/validators/goals";

const EDITABLE_STATUSES: GoalSheetStatus[] = [
  GoalSheetStatus.DRAFT,
  GoalSheetStatus.RETURNED,
];

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// ──────────────────────────── helpers ────────────────────────────

async function findActiveCycle() {
  return prisma.cycle.findFirst({
    where: { isActive: true },
    orderBy: { startDate: "desc" },
  });
}

function goalInputToDbData(input: GoalInput) {
  // The discriminated union guarantees only the right fields per UoM are
  // populated; Decimal() conversion is left to Prisma at write time.
  const common = {
    title: input.title,
    description: input.description?.length ? input.description : null,
    thrustAreaId: input.thrustAreaId,
    uomType: input.uomType,
    uomLabel: input.uomLabel,
    weightage: input.weightage,
  };
  if (input.uomType === UomType.MIN || input.uomType === UomType.MAX) {
    return {
      ...common,
      target: new Prisma.Decimal(input.target),
      targetDate: null,
    };
  }
  if (input.uomType === UomType.TIMELINE) {
    return {
      ...common,
      target: null,
      targetDate: input.targetDate,
    };
  }
  return { ...common, target: null, targetDate: null };
}

// ──────────────────────────── ensureActiveSheet ────────────────────────────

export async function ensureActiveSheet(): Promise<
  ActionResult<{ sheetId: string; cycleId: string; cycleName: string }>
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const cycle = await findActiveCycle();
  if (!cycle) {
    return {
      ok: false,
      error:
        "No active cycle. Ask an admin to activate a cycle in /admin/cycles.",
    };
  }

  const existing = await prisma.goalSheet.findUnique({
    where: { ownerId_cycleId: { ownerId: user.id, cycleId: cycle.id } },
  });
  if (existing) {
    return {
      ok: true,
      data: { sheetId: existing.id, cycleId: cycle.id, cycleName: cycle.name },
    };
  }

  const created = await prisma.goalSheet.create({
    data: {
      ownerId: user.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.DRAFT,
    },
  });
  return {
    ok: true,
    data: { sheetId: created.id, cycleId: cycle.id, cycleName: cycle.name },
  };
}

// ──────────────────────────── saveSheet ────────────────────────────

async function applyGoalDiff(
  tx: Prisma.TransactionClient,
  sheetId: string,
  inputs: GoalInput[],
  existing: Goal[],
) {
  const existingById = new Map(existing.map((g) => [g.id, g]));
  const incomingIds = new Set(inputs.filter((i) => i.id).map((i) => i.id!));

  // Deletions: existing goals not in input.  Shared copies cannot be
  // deleted — they're driven by the source owner's push action.
  for (const g of existing) {
    if (incomingIds.has(g.id)) continue;
    if (g.sharedFromId) {
      throw new Error("Shared goal copies cannot be removed by the recipient");
    }
    await tx.goal.delete({ where: { id: g.id } });
  }

  for (const input of inputs) {
    if (input.id && existingById.has(input.id)) {
      const existing = existingById.get(input.id)!;
      if (existing.sharedFromId) {
        // Recipients of a shared goal can only edit weightage.
        await tx.goal.update({
          where: { id: input.id },
          data: { weightage: input.weightage },
        });
      } else {
        await tx.goal.update({
          where: { id: input.id },
          data: goalInputToDbData(input),
        });
      }
    } else {
      await tx.goal.create({
        data: { sheetId, ...goalInputToDbData(input) },
      });
    }
  }
}

export async function saveSheet(raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const parsed = saveSheetInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const cycle = await findActiveCycle();
  if (!cycle) return { ok: false, error: "No active cycle" };

  const sheet = await prisma.goalSheet.findUnique({
    where: { ownerId_cycleId: { ownerId: user.id, cycleId: cycle.id } },
    include: { goals: true },
  });
  if (!sheet) return { ok: false, error: "Goal sheet not found" };
  if (!EDITABLE_STATUSES.includes(sheet.status)) {
    return {
      ok: false,
      error: `Sheet status is ${sheet.status} — edits not allowed`,
    };
  }

  await prisma.$transaction((tx) =>
    applyGoalDiff(tx, sheet.id, parsed.data.goals, sheet.goals),
  );

  revalidatePath("/employee/goal-sheet");
  return { ok: true, data: undefined };
}

// ──────────────────────────── submitSheet ────────────────────────────

export async function submitSheet(raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const parsed = submitSheetInputSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFormErr = flat.formErrors[0];
    return {
      ok: false,
      error: firstFormErr ?? "Validation failed",
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  const cycle = await findActiveCycle();
  if (!cycle) return { ok: false, error: "No active cycle" };

  const sheet = await prisma.goalSheet.findUnique({
    where: { ownerId_cycleId: { ownerId: user.id, cycleId: cycle.id } },
    include: { goals: true },
  });
  if (!sheet) return { ok: false, error: "Goal sheet not found" };
  if (!EDITABLE_STATUSES.includes(sheet.status)) {
    return {
      ok: false,
      error: `Sheet status is ${sheet.status} — cannot submit`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await applyGoalDiff(tx, sheet.id, parsed.data.goals, sheet.goals);

    // Re-verify the sum inside the transaction so concurrent writes can't
    // sneak in a non-100 sum between validation and status flip.
    const sumRow = await tx.goal.aggregate({
      where: { sheetId: sheet.id },
      _sum: { weightage: true },
    });
    if ((sumRow._sum.weightage ?? 0) !== 100) {
      throw new Error("Weightage sum changed during submit — please retry");
    }

    await tx.goalSheet.update({
      where: { id: sheet.id },
      data: {
        status: GoalSheetStatus.SUBMITTED,
        submittedAt: new Date(),
        returnReason: null,
      },
    });
  });

  // Post-commit: notify the manager.  Wrapped sendEmail() swallows
  // failures so a Resend outage doesn't roll back the user's submit.
  const owner = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { name: true, manager: { select: { name: true } } },
  });
  if (owner?.manager) {
    await sendEmail({
      kind:    "sheet-submitted",
      subject: `${owner.name} submitted their ${cycle.name} goal sheet`,
      react:   SheetSubmittedEmail({
        employeeName: owner.name,
        managerName:  owner.manager.name,
        cycleName:    cycle.name,
      }),
    });
  }

  revalidatePath("/employee/goal-sheet");
  revalidatePath("/manager/approvals");
  return { ok: true, data: undefined };
}

// ──────────────────────────── acknowledgeReturn ────────────────────────────

export async function acknowledgeReturn(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const cycle = await findActiveCycle();
  if (!cycle) return { ok: false, error: "No active cycle" };

  const sheet = await prisma.goalSheet.findUnique({
    where: { ownerId_cycleId: { ownerId: user.id, cycleId: cycle.id } },
  });
  if (!sheet) return { ok: false, error: "Goal sheet not found" };
  if (sheet.status !== GoalSheetStatus.RETURNED) {
    return {
      ok: false,
      error: "Only a returned sheet can be acknowledged",
    };
  }

  await prisma.goalSheet.update({
    where: { id: sheet.id },
    data: {
      status: GoalSheetStatus.DRAFT,
      returnReason: null,
    },
  });
  revalidatePath("/employee/goal-sheet");
  return { ok: true, data: undefined };
}

// ──────────────────────────── removeGoal ────────────────────────────
// Optional per-row delete server action; the main saveSheet flow handles
// deletions implicitly via the diff, but this is useful when the editor
// wants to commit a single removal without saving every other in-progress edit.

export async function removeGoal(goalId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { sheet: true },
  });
  if (!goal) return { ok: false, error: "Goal not found" };
  if (goal.sheet.ownerId !== user.id) {
    return { ok: false, error: "Not your goal" };
  }
  if (!EDITABLE_STATUSES.includes(goal.sheet.status)) {
    return {
      ok: false,
      error: `Sheet status is ${goal.sheet.status} — cannot remove goals`,
    };
  }
  if (goal.sharedFromId) {
    return { ok: false, error: "Shared goals can't be removed by the recipient" };
  }

  await prisma.goal.delete({ where: { id: goalId } });
  revalidatePath("/employee/goal-sheet");
  return { ok: true, data: undefined };
}
