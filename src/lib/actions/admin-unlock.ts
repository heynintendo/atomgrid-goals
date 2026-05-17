"use server";

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  GoalSheetStatus,
  Role,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { SheetUnlockedEmail } from "@/emails/sheet-unlocked";
import { recordAudit } from "@/lib/audit";
import { unlockSheetSchema } from "@/lib/validators/admin-unlock";
import type { ActionResult } from "@/lib/actions/goals";

// Flips an APPROVED or LOCKED sheet back to DRAFT so its owner can edit
// again.  Captures the before/after status + the admin's stated reason in
// AuditLog in the same transaction — there's no path where the unlock
// happens without a paired audit row.
export async function unlockSheet(raw: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.role !== Role.ADMIN) {
    return { ok: false, error: "Admin-only — switch to Priya" };
  }

  const parsed = unlockSheetSchema.safeParse(raw);
  if (!parsed.success) {
    const first =
      parsed.error.flatten().fieldErrors.reason?.[0] ?? "Validation failed";
    return { ok: false, error: first };
  }

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: parsed.data.sheetId },
    include: {
      owner: { select: { name: true, email: true } },
      cycle: { select: { name: true } },
    },
  });
  if (!sheet) return { ok: false, error: "Sheet not found" };
  if (
    sheet.status !== GoalSheetStatus.APPROVED &&
    sheet.status !== GoalSheetStatus.LOCKED
  ) {
    return {
      ok: false,
      error: `Sheet is ${sheet.status} — only APPROVED/LOCKED sheets can be unlocked`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.goalSheet.update({
        where: { id: sheet.id },
        data: {
          status: GoalSheetStatus.DRAFT,
          approvedAt: null,
          approvedById: null,
        },
      });
      await recordAudit(tx, {
        actorId: user.id,
        action: AuditAction.SHEET_UNLOCKED,
        sheetId: sheet.id,
        before: {
          status: sheet.status,
          approvedAt: sheet.approvedAt?.toISOString() ?? null,
          approvedById: sheet.approvedById ?? null,
        },
        after: { status: "DRAFT", approvedAt: null, approvedById: null },
        reason: parsed.data.reason,
      });
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? `Unlock failed: ${e.message}` : "Unlock failed",
    };
  }

  // Post-commit email — sheet UNLOCKED notice with the audited reason.
  await sendEmail({
    kind:    "sheet-unlocked",
    subject: `${user.name} unlocked your ${sheet.cycle.name} goal sheet`,
    react:   SheetUnlockedEmail({
      employeeName: sheet.owner.name,
      adminName:    user.name,
      cycleName:    sheet.cycle.name,
      reason:       parsed.data.reason,
    }),
  });

  revalidatePath("/admin/unlock");
  revalidatePath("/admin/audit-log");
  revalidatePath("/employee/goal-sheet");
  revalidatePath("/manager/approvals");
  return { ok: true, data: undefined };
}
