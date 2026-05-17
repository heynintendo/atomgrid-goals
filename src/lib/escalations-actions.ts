"use server";

import { AuditAction, EscalationStatus, Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

// Marks an escalation as resolved.  Only ADMIN and MANAGER can call
// this — managers may only resolve escalations on their own direct
// reports (server-side enforced; can't bypass via URL).  The mutation
// + audit row commit atomically inside a single $transaction so we
// never lose the provenance of who acted.
export async function markEscalationResolved(
  escalationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }
  if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
    return { ok: false, error: "Only managers and admins can resolve escalations" };
  }

  const event = await prisma.escalationEvent.findUnique({
    where:  { id: escalationId },
    include: { targetUser: { select: { id: true, name: true, managerId: true } } },
  });
  if (!event) {
    return { ok: false, error: "Escalation not found" };
  }
  if (user.role === Role.MANAGER && event.targetUser.managerId !== user.id) {
    return { ok: false, error: "You can only resolve escalations on your own team" };
  }
  if (event.status !== EscalationStatus.ACTIVE) {
    return { ok: false, error: "Escalation is not active" };
  }

  const before = {
    status:      event.status,
    resolvedAt:  event.resolvedAt,
  } satisfies Prisma.InputJsonValue;
  const resolvedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.escalationEvent.update({
      where: { id: escalationId },
      data:  { status: EscalationStatus.RESOLVED, resolvedAt },
    });
    await recordAudit(tx, {
      actorId: user.id,
      action:  AuditAction.ESCALATION_RESOLVED,
      before,
      after:   { status: EscalationStatus.RESOLVED, resolvedAt: resolvedAt.toISOString() },
      reason:  `Resolved ${event.currentLevel.toLowerCase()} escalation on ${event.targetUser.name}${event.period ? ` (${event.period})` : ""}`,
    });
  });

  revalidatePath("/admin/escalations");
  revalidatePath("/manager/escalations");
  return { ok: true };
}
