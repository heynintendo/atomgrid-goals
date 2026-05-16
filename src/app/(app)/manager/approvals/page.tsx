import { redirect } from "next/navigation";
import {
  ApprovalQueueTable,
  type ApprovalQueueRow,
} from "@/components/approval-queue-table";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GoalSheetStatus, Role } from "@prisma/client";

export default async function ApprovalQueuePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return <NotAllowed />;
  }

  // Admin sees everyone's queue; managers only their direct reports.
  const where =
    user.role === Role.ADMIN
      ? { status: GoalSheetStatus.SUBMITTED }
      : { status: GoalSheetStatus.SUBMITTED, owner: { managerId: user.id } };

  const sheets = await prisma.goalSheet.findMany({
    where,
    orderBy: { submittedAt: "asc" },
    include: {
      owner: {
        select: {
          name: true,
          email: true,
          department: { select: { name: true } },
        },
      },
      goals: { select: { weightage: true } },
    },
  });

  const rows: ApprovalQueueRow[] = sheets.map((s) => ({
    id: s.id,
    submittedAt: s.submittedAt,
    goalCount: s.goals.length,
    weightageSum: s.goals.reduce((sum, g) => sum + g.weightage, 0),
    owner: s.owner,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Manager · Approval queue
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Sheets awaiting your review
          </h1>
          <span className="font-mono text-xs text-text-muted tabular-nums">
            {rows.length} pending
          </span>
        </div>
      </header>
      <ApprovalQueueTable rows={rows} />
    </div>
  );
}

function NotAllowed() {
  return (
    <div className="mx-auto max-w-2xl p-12">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        Restricted
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
        Manager-only screen
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Switch to a manager identity (Karthik, Vikram, or Anita) to see the
        approval queue for that team.
      </p>
    </div>
  );
}
