import { notFound, redirect } from "next/navigation";
import { GoalSheetStatus, Role } from "@prisma/client";
import {
  ManagerSheetReviewer,
  type ReviewerGoal,
} from "@/components/manager-sheet-reviewer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ApprovalReviewPage({
  params,
}: {
  params: Promise<{ sheetId: string }>;
}) {
  const { sheetId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return <NotAllowed />;
  }

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: {
      owner: {
        select: {
          name: true,
          email: true,
          managerId: true,
          department: { select: { name: true } },
        },
      },
      goals: {
        include: { thrustArea: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!sheet) notFound();

  // Managers can only see their direct reports; admin can review any.
  if (user.role === Role.MANAGER && sheet.owner.managerId !== user.id) {
    return <WrongTeam />;
  }

  // Already-resolved sheets land on a read-only summary rather than the
  // editable reviewer.  For hackathon the simplest cut is to redirect back
  // to the queue with a toast-friendly message in the URL.
  if (sheet.status !== GoalSheetStatus.SUBMITTED) {
    redirect("/manager/approvals");
  }

  const goals: ReviewerGoal[] = sheet.goals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    thrustAreaName: g.thrustArea.name,
    uomType: g.uomType,
    uomLabel: g.uomLabel,
    target: g.target ? Number(g.target) : null,
    targetDate: g.targetDate
      ? g.targetDate.toISOString().slice(0, 10)
      : null,
    weightage: g.weightage,
    sharedFromId: g.sharedFromId,
  }));

  return (
    <ManagerSheetReviewer
      sheetId={sheet.id}
      employee={{
        name: sheet.owner.name,
        email: sheet.owner.email,
        department: sheet.owner.department?.name ?? null,
      }}
      submittedAt={sheet.submittedAt}
      goals={goals}
    />
  );
}

function NotAllowed() {
  return (
    <div className="mx-auto max-w-2xl p-12">
      <h1 className="text-xl font-semibold text-text">Manager-only screen</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Switch to a manager identity to review submitted sheets.
      </p>
    </div>
  );
}

function WrongTeam() {
  return (
    <div className="mx-auto max-w-2xl p-12">
      <h1 className="text-xl font-semibold text-text">Not your direct report</h1>
      <p className="mt-2 text-sm text-text-secondary">
        You can only approve sheets from people who report to you. Admin can
        review any sheet.
      </p>
    </div>
  );
}
