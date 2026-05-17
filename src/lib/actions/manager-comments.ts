"use server";

import { revalidatePath } from "next/cache";
import { CheckInPeriod, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pacedSettled, sendEmail } from "@/lib/email";
import { ManagerCommentEmail } from "@/emails/manager-comment";
import { saveManagerCommentSchema } from "@/lib/validators/manager-comments";
import type { ActionResult } from "@/lib/actions/goals";

const PERIOD_LABEL: Record<CheckInPeriod, string> = {
  Q1:     "Q1",
  Q2:     "Q2",
  Q3:     "Q3",
  ANNUAL: "Annual",
};

export async function saveManagerComment(
  raw: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return { ok: false, error: "Manager-only" };
  }

  const parsed = saveManagerCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: parsed.data.checkInId },
    include: {
      goal: {
        select: {
          title: true,
          sheet: {
            select: {
              owner: {
                select: {
                  name: true,
                  managerId: true,
                  manager: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!checkIn) return { ok: false, error: "Check-in not found" };

  if (
    user.role === Role.MANAGER &&
    checkIn.goal.sheet.owner.managerId !== user.id
  ) {
    return { ok: false, error: "Not your direct report" };
  }

  const trimmed = parsed.data.comment.trim();
  const clearing = trimmed.length === 0;

  await prisma.checkIn.update({
    where: { id: checkIn.id },
    data: {
      managerComment: clearing ? null : trimmed,
      managerCommentBy: clearing ? null : user.id,
      managerCommentAt: clearing ? null : new Date(),
    },
  });

  // Post-commit email — only when a real comment was added (skipped
  // when the manager clears one).  Manager-commenter notifies just the
  // employee.  Admin-commenter fans out: employee directly + their
  // manager for transparency.
  if (!clearing) {
    const periodLabel  = PERIOD_LABEL[checkIn.period];
    const commenterRole = user.role === Role.ADMIN ? "ADMIN" : "MANAGER";
    const employeeName  = checkIn.goal.sheet.owner.name;
    const reportManager = checkIn.goal.sheet.owner.manager?.name ?? null;

    const factories: Array<() => Promise<void>> = [
      () => sendEmail({
        kind:    `manager-comment-employee-${commenterRole.toLowerCase()}`,
        subject: `${commenterRole === "ADMIN" ? "Admin " : ""}${user.name} left feedback on your ${periodLabel} check-in`,
        react:   ManagerCommentEmail({
          audience:      "employee",
          commenterRole,
          commenterName: user.name,
          employeeName,
          managerName:   reportManager,
          period:        periodLabel,
          goalTitle:     checkIn.goal.title,
          comment:       trimmed,
        }),
      }),
    ];

    if (commenterRole === "ADMIN" && reportManager) {
      factories.push(() => sendEmail({
        kind:    "manager-comment-manager-cc",
        subject: `Admin feedback on ${employeeName}'s ${periodLabel} check-in`,
        react:   ManagerCommentEmail({
          audience:      "manager",
          commenterRole,
          commenterName: user.name,
          employeeName,
          managerName:   reportManager,
          period:        periodLabel,
          goalTitle:     checkIn.goal.title,
          comment:       trimmed,
        }),
      }));
    }

    await pacedSettled(factories);
  }

  revalidatePath("/manager/check-ins");
  revalidatePath(`/employee/check-in/${checkIn.period}`);
  return { ok: true, data: undefined };
}
