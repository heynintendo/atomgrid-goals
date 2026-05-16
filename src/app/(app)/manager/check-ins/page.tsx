import { format } from "date-fns";
import { redirect } from "next/navigation";
import {
  CheckInPeriod,
  Prisma,
  Role,
  type Goal,
  type CheckIn,
} from "@prisma/client";
import {
  ManagerCheckInsTable,
  type CheckInRow,
} from "@/components/manager-check-ins-table";
import { PeriodTabs } from "@/components/period-tabs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";

function parsePeriod(raw: string | undefined | string[]): CheckInPeriod {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "Q1" || v === "Q2" || v === "Q3" || v === "ANNUAL") return v;
  return "Q1"; // sensible default — that's when check-ins first open
}

function targetDisplay(goal: Goal): string {
  switch (goal.uomType) {
    case "MIN":
    case "MAX":
      return goal.target
        ? `${Number(goal.target).toLocaleString("en-IN")} ${goal.uomLabel}`
        : "—";
    case "TIMELINE":
      return goal.targetDate ? format(goal.targetDate, "d MMM yyyy") : "—";
    case "ZERO":
      return `0 ${goal.uomLabel}`;
  }
}

function actualDisplay(goal: Goal, ci: CheckIn): string {
  switch (goal.uomType) {
    case "MIN":
    case "MAX":
      return ci.actual
        ? `${Number(ci.actual).toLocaleString("en-IN")} ${goal.uomLabel}`
        : "—";
    case "TIMELINE":
      return ci.actualDate
        ? format(ci.actualDate, "d MMM yyyy")
        : "Not delivered";
    case "ZERO":
      return ci.zeroAchieved === true
        ? `0 ${goal.uomLabel}`
        : ci.zeroAchieved === false
          ? `> 0 ${goal.uomLabel}`
          : "—";
  }
}

function scoreFor(goal: Goal, ci: CheckIn) {
  switch (goal.uomType) {
    case "MIN":
    case "MAX":
      if (goal.target == null || ci.actual == null) return null;
      return computeScore({
        uomType: goal.uomType,
        target: Number(goal.target),
        actual: Number(ci.actual),
      });
    case "TIMELINE":
      if (goal.targetDate == null || ci.actualDate == null) return null;
      return computeScore({
        uomType: "TIMELINE",
        targetDate: goal.targetDate,
        actualDate: ci.actualDate,
      });
    case "ZERO":
      if (ci.zeroAchieved == null) return null;
      return computeScore({
        uomType: "ZERO",
        achieved: ci.zeroAchieved,
      });
  }
}

export default async function ManagerCheckInsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <h1 className="text-xl font-semibold text-text">Manager-only screen</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Switch to a manager identity (Karthik, Vikram, or Anita) to review
          team check-ins.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const period = parsePeriod(sp.period);

  // Managers see their direct reports only; admin sees the whole org.
  const ownerWhere: Prisma.UserWhereInput =
    user.role === Role.ADMIN ? {} : { managerId: user.id };

  const checkIns = await prisma.checkIn.findMany({
    where: {
      period,
      goal: { sheet: { owner: ownerWhere } },
    },
    include: {
      goal: {
        include: {
          sheet: {
            include: {
              owner: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { goal: { sheet: { owner: { name: "asc" } } } },
      { goal: { createdAt: "asc" } },
    ],
  });

  const rows: CheckInRow[] = checkIns.map((ci) => {
    const score = scoreFor(ci.goal, ci);
    return {
      id: ci.id,
      employeeName: ci.goal.sheet.owner.name,
      employeeEmail: ci.goal.sheet.owner.email,
      goalTitle: ci.goal.title,
      uomType: ci.goal.uomType,
      targetDisplay: targetDisplay(ci.goal),
      actualDisplay: actualDisplay(ci.goal, ci),
      scoreDisplay: score?.display ?? null,
      scoreBand: score?.banded ?? null,
      employeeStatus: ci.employeeStatus,
      existingComment: ci.managerComment,
      commentBy: ci.managerCommentBy,
      commentAtISO: ci.managerCommentAt
        ? ci.managerCommentAt.toISOString()
        : null,
    };
  });

  const periodLabel =
    period === "ANNUAL" ? "Annual" : period;

  return (
    <div className={cn("mx-auto max-w-6xl space-y-6 p-8")}>
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Manager · Check-ins
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Team check-ins
          </h1>
          <span className="font-mono text-xs text-text-muted tabular-nums">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Review each direct report&apos;s reported actuals + computed score
          for the selected quarter. Click a row to leave a structured comment.
        </p>
      </header>

      <PeriodTabs basePath="/manager/check-ins" current={period} />

      <ManagerCheckInsTable rows={rows} periodLabel={periodLabel} />
    </div>
  );
}
