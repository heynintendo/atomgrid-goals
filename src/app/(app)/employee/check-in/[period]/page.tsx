import { notFound, redirect } from "next/navigation";
import {
  CheckInPeriod,
  GoalSheetStatus,
  Role,
} from "@prisma/client";
import {
  CheckInForm,
  type CheckInGoal,
  type WindowState,
} from "@/components/check-in-form";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemDate } from "@/lib/system-date";

const PERIOD_LABELS: Record<CheckInPeriod, string> = {
  Q1:     "Q1",
  Q2:     "Q2",
  Q3:     "Q3",
  ANNUAL: "Annual / Q4",
};

function parsePeriod(raw: string): CheckInPeriod | null {
  const upper = raw.toUpperCase();
  if (upper in PERIOD_LABELS) return upper as CheckInPeriod;
  return null;
}

export default async function CheckInPeriodPage({
  params,
}: {
  params: Promise<{ period: string }>;
}) {
  const { period: rawPeriod } = await params;
  const period = parsePeriod(rawPeriod);
  if (!period) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/");

  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <h1 className="text-xl font-semibold text-text">No active cycle</h1>
      </div>
    );
  }

  const sheet = await prisma.goalSheet.findUnique({
    where: { ownerId_cycleId: { ownerId: user.id, cycleId: cycle.id } },
    include: {
      goals: {
        orderBy: { createdAt: "asc" },
        include: {
          checkIns: { where: { period } },
        },
      },
    },
  });

  if (
    !sheet ||
    (sheet.status !== GoalSheetStatus.APPROVED &&
      sheet.status !== GoalSheetStatus.LOCKED)
  ) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Not unlocked
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
          Approve your goal sheet first
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Check-ins open once your manager approves your goal sheet for the
          cycle. Until then, head to{" "}
          <a
            href="/employee/goal-sheet"
            className="font-medium text-text underline-offset-2 hover:underline"
          >
            /employee/goal-sheet
          </a>{" "}
          to finalise.
        </p>
      </div>
    );
  }

  const systemDate = await getSystemDate();
  const windows: Record<CheckInPeriod, { opens: Date; closes: Date }> = {
    Q1:     { opens: cycle.q1OpensAt,     closes: cycle.q2OpensAt     },
    Q2:     { opens: cycle.q2OpensAt,     closes: cycle.q3OpensAt     },
    Q3:     { opens: cycle.q3OpensAt,     closes: cycle.annualOpensAt },
    ANNUAL: { opens: cycle.annualOpensAt, closes: cycle.endDate       },
  };
  const w = windows[period];
  const windowState: WindowState =
    systemDate >= w.closes ? "past" : systemDate >= w.opens ? "active" : "pre";

  const goals: CheckInGoal[] = sheet.goals.map((g) => {
    const existing = g.checkIns[0];
    return {
      id: g.id,
      title: g.title,
      description: g.description,
      uomType: g.uomType,
      uomLabel: g.uomLabel,
      target: g.target ? Number(g.target) : null,
      targetDate: g.targetDate ? g.targetDate.toISOString().slice(0, 10) : null,
      weightage: g.weightage,
      sharedFromId: g.sharedFromId,
      existing: {
        actual: existing?.actual ? Number(existing.actual) : null,
        actualDate: existing?.actualDate
          ? existing.actualDate.toISOString().slice(0, 10)
          : null,
        zeroAchieved: existing?.zeroAchieved ?? null,
        employeeStatus: existing?.employeeStatus ?? "NOT_STARTED",
        managerComment: existing?.managerComment ?? null,
      },
    };
  });

  return (
    <CheckInForm
      period={period}
      periodLabel={PERIOD_LABELS[period]}
      windowOpensAt={w.opens.toISOString()}
      windowClosesAt={w.closes.toISOString()}
      windowState={windowState}
      isAdmin={user.role === Role.ADMIN}
      goals={goals}
    />
  );
}
