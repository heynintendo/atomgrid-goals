"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { saveManagerCommentSchema } from "@/lib/validators/manager-comments";
import type { ActionResult } from "@/lib/actions/goals";

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
          sheet: { select: { owner: { select: { managerId: true } } } },
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

  revalidatePath("/manager/check-ins");
  revalidatePath(`/employee/check-in/${checkIn.period}`);
  return { ok: true, data: undefined };
}
