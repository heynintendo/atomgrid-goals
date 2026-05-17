"use server";

import { revalidatePath } from "next/cache";
import { GoalSheetStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { SheetApprovedEmail } from "@/emails/sheet-approved";
import { SheetReturnedEmail } from "@/emails/sheet-returned";
import {
  approveSheetInputSchema,
  returnSheetInputSchema,
  type ManagerGoalEdit,
} from "@/lib/validators/approvals";
import type { ActionResult } from "@/lib/actions/goals";

// Applies the manager's inline edits to each goal — target/targetDate only on
// non-shared goals (shared copies inherit those from the source), weightage
// always.  Runs inside an outer transaction.
async function applyManagerEdits(
  tx: Prisma.TransactionClient,
  sheetId: string,
  edits: ManagerGoalEdit[],
) {
  if (edits.length === 0) return;
  const goals = await tx.goal.findMany({
    where: { id: { in: edits.map((e) => e.id) }, sheetId },
  });
  const goalsById = new Map(goals.map((g) => [g.id, g]));

  for (const edit of edits) {
    const goal = goalsById.get(edit.id);
    if (!goal) continue;
    const isShared = !!goal.sharedFromId;

    const data: Prisma.GoalUpdateInput = { weightage: edit.weightage };
    if (!isShared) {
      if (edit.target !== undefined) {
        data.target = edit.target == null ? null : new Prisma.Decimal(edit.target);
      }
      if (edit.targetDate !== undefined) {
        data.targetDate = edit.targetDate ? new Date(edit.targetDate) : null;
      }
    }
    await tx.goal.update({ where: { id: goal.id }, data });
  }
}

type LoadResult =
  | { ok: false; error: string }
  | {
      ok: true;
      sheet: NonNullable<
        Awaited<ReturnType<typeof prisma.goalSheet.findUnique>>
      >;
    };

async function loadSheetForReview(
  sheetId: string,
  managerId: string,
): Promise<LoadResult> {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: { owner: { select: { id: true, managerId: true } } },
  });
  if (!sheet) return { ok: false, error: "Sheet not found" };
  if (sheet.owner.managerId !== managerId) {
    return { ok: false, error: "Not your direct report's sheet" };
  }
  if (sheet.status !== GoalSheetStatus.SUBMITTED) {
    return {
      ok: false,
      error: `Sheet is ${sheet.status} — only SUBMITTED sheets can be approved or returned`,
    };
  }
  return { ok: true, sheet };
}

export async function approveSheet(raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return { ok: false, error: "Only managers can approve sheets" };
  }

  const parsed = approveSheetInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const loaded = await loadSheetForReview(parsed.data.sheetId, user.id);
  if (!loaded.ok) return { ok: false, error: loaded.error };

  try {
    await prisma.$transaction(async (tx) => {
      await applyManagerEdits(tx, loaded.sheet.id, parsed.data.edits);

      const sumRow = await tx.goal.aggregate({
        where: { sheetId: loaded.sheet.id },
        _sum: { weightage: true },
      });
      const sum = sumRow._sum.weightage ?? 0;
      if (sum !== 100) {
        throw new Error(
          `Weightage sum must remain 100% — currently ${sum}%. Adjust before approving.`,
        );
      }

      await tx.goalSheet.update({
        where: { id: loaded.sheet.id },
        data: {
          status: GoalSheetStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: user.id,
          returnReason: null,
        },
      });
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Approval failed",
    };
  }

  // Post-commit email — sheet APPROVED notice to the employee.
  const ctx = await prisma.goalSheet.findUnique({
    where:  { id: parsed.data.sheetId },
    select: {
      owner: { select: { name: true } },
      cycle: { select: { name: true } },
    },
  });
  if (ctx) {
    await sendEmail({
      kind:    "sheet-approved",
      subject: `${user.name} approved your ${ctx.cycle.name} goal sheet`,
      react:   SheetApprovedEmail({
        employeeName: ctx.owner.name,
        managerName:  user.name,
        cycleName:    ctx.cycle.name,
      }),
    });
  }

  revalidatePath("/manager/approvals");
  revalidatePath(`/manager/approvals/${parsed.data.sheetId}`);
  revalidatePath("/employee/goal-sheet");
  return { ok: true, data: undefined };
}

export async function returnSheet(raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return { ok: false, error: "Only managers can return sheets" };
  }

  const parsed = returnSheetInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const loaded = await loadSheetForReview(parsed.data.sheetId, user.id);
  if (!loaded.ok) return { ok: false, error: loaded.error };

  try {
    await prisma.$transaction(async (tx) => {
      await applyManagerEdits(tx, loaded.sheet.id, parsed.data.edits);
      await tx.goalSheet.update({
        where: { id: loaded.sheet.id },
        data: {
          status: GoalSheetStatus.RETURNED,
          returnReason: parsed.data.reason,
        },
      });
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Return failed",
    };
  }

  // Post-commit email — sheet RETURNED notice with the verbatim reason.
  const ctx = await prisma.goalSheet.findUnique({
    where:  { id: parsed.data.sheetId },
    select: {
      owner: { select: { name: true } },
      cycle: { select: { name: true } },
    },
  });
  if (ctx) {
    await sendEmail({
      kind:    "sheet-returned",
      subject: `${user.name} returned your ${ctx.cycle.name} goal sheet`,
      react:   SheetReturnedEmail({
        employeeName: ctx.owner.name,
        managerName:  user.name,
        cycleName:    ctx.cycle.name,
        reason:       parsed.data.reason,
      }),
    });
  }

  revalidatePath("/manager/approvals");
  revalidatePath(`/manager/approvals/${parsed.data.sheetId}`);
  revalidatePath("/employee/goal-sheet");
  return { ok: true, data: undefined };
}
