import "server-only";

import { Prisma, type AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";

interface RecordAuditInput {
  actorId: string;
  action: AuditAction;
  goalId?: string | null;
  sheetId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  reason?: string | null;
}

// Single entry-point for writing AuditLog rows.  Accepts either the global
// prisma client or a transaction client so the audit row commits atomically
// with the mutation that triggered it — there's no scenario where the
// underlying change lands but the audit record doesn't.
export async function recordAudit(
  client: Prisma.TransactionClient | typeof prisma,
  input: RecordAuditInput,
) {
  return client.auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId,
      goalId: input.goalId ?? null,
      sheetId: input.sheetId ?? null,
      before: input.before ?? Prisma.JsonNull,
      after: input.after ?? Prisma.JsonNull,
      reason: input.reason ?? null,
    },
  });
}
