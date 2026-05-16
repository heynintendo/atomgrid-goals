import { redirect } from "next/navigation";
import { CheckInPeriod, GoalSheetStatus } from "@prisma/client";
import {
  CheckInsIndex,
  type PeriodCard,
} from "@/components/check-ins-index";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemDate } from "@/lib/system-date";

export default async function CheckInsIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <h1 className="text-xl font-semibold text-text">No active cycle</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Ask an admin to activate a cycle before quarterly check-ins can open.
        </p>
      </div>
    );
  }

  const sheet = await prisma.goalSheet.findUnique({
    where: { ownerId_cycleId: { ownerId: user.id, cycleId: cycle.id } },
    include: {
      goals: {
        select: {
          id: true,
          checkIns: { select: { period: true } },
        },
      },
    },
  });

  let sheetState: "missing" | "draft" | "submitted" | "approved" = "missing";
  if (sheet) {
    if (
      sheet.status === GoalSheetStatus.APPROVED ||
      sheet.status === GoalSheetStatus.LOCKED
    ) {
      sheetState = "approved";
    } else if (sheet.status === GoalSheetStatus.SUBMITTED) {
      sheetState = "submitted";
    } else {
      sheetState = "draft";
    }
  }

  const total = sheet?.goals.length ?? 0;
  const completedByPeriod: Record<CheckInPeriod, number> = {
    Q1: 0,
    Q2: 0,
    Q3: 0,
    ANNUAL: 0,
  };
  if (sheet) {
    for (const g of sheet.goals) {
      for (const ci of g.checkIns) {
        completedByPeriod[ci.period]++;
      }
    }
  }

  const systemDate = await getSystemDate();
  const windows: Record<CheckInPeriod, { opens: Date; closes: Date; label: string }> = {
    Q1: { opens: cycle.q1OpensAt, closes: cycle.q2OpensAt, label: "Q1 Check-in" },
    Q2: { opens: cycle.q2OpensAt, closes: cycle.q3OpensAt, label: "Q2 Check-in" },
    Q3: { opens: cycle.q3OpensAt, closes: cycle.annualOpensAt, label: "Q3 Check-in" },
    ANNUAL: {
      opens: cycle.annualOpensAt,
      closes: cycle.endDate,
      label: "Annual / Q4",
    },
  };

  const cards: PeriodCard[] = (
    Object.keys(windows) as CheckInPeriod[]
  ).map((p) => {
    const w = windows[p];
    const state =
      systemDate >= w.closes ? "past" : systemDate >= w.opens ? "active" : "pending";
    return {
      period: p,
      label: w.label,
      opensAt: w.opens,
      closesAt: w.closes,
      state,
      completed: completedByPeriod[p],
      total,
    };
  });

  return (
    <CheckInsIndex
      cards={cards}
      cycleName={cycle.name}
      sheetState={sheetState}
    />
  );
}
