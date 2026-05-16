import { redirect } from "next/navigation";
import {
  CheckInPeriod,
  GoalSheetStatus,
  Prisma,
  Role,
} from "@prisma/client";
import {
  CompletionTable,
  type CheckInState,
  type CompletionRow,
  type SheetState,
} from "@/components/completion-table";
import {
  CompletionFilters,
  type FilterGroup,
} from "@/components/completion-filters";
import { PeriodTabs } from "@/components/period-tabs";
import { SummaryCard } from "@/components/summary-card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemDate } from "@/lib/system-date";
import type { ScoreBand } from "@/lib/scoring";

function parsePeriod(raw: string | undefined | string[]): CheckInPeriod {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "Q1" || v === "Q2" || v === "Q3" || v === "ANNUAL") return v;
  return "Q1";
}

function bandFor(score: number): ScoreBand {
  if (score >= 1) return "EXCEEDS";
  if (score >= 0.7) return "MEETS";
  return "BELOW";
}

function deriveCheckInState(
  sheetState: SheetState,
  goalsLogged: number,
  goalsTotal: number,
  windowState: "pre" | "active" | "past",
): CheckInState {
  // Check-ins only apply once a sheet is APPROVED/LOCKED.  Anything earlier
  // (MISSING/DRAFT/SUBMITTED/RETURNED) is NOT_APPLICABLE — table renders an
  // em-dash and chip counts skip these rows so the four state buckets sum
  // to the eligible-employees subset.
  if (sheetState !== "APPROVED" && sheetState !== "LOCKED") {
    return "NOT_APPLICABLE";
  }
  if (goalsTotal === 0) return "NOT_STARTED";
  if (goalsLogged >= goalsTotal) return "SUBMITTED";
  if (goalsLogged > 0) return "IN_PROGRESS";
  if (windowState === "past") return "OVERDUE";
  return "NOT_STARTED";
}

function deriveSheetState(status: GoalSheetStatus | null): SheetState {
  if (status == null) return "MISSING";
  return status;
}

const SHEET_STATES: { value: SheetState; label: string }[] = [
  { value: "MISSING",   label: "No sheet" },
  { value: "DRAFT",     label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED",  label: "Approved" },
  { value: "LOCKED",    label: "Locked" },
  { value: "RETURNED",  label: "Returned" },
];

// NOT_APPLICABLE intentionally absent — it's not something a manager
// filters by; rows in that state surface as em-dashes in the column.
const CHECKIN_STATES: { value: CheckInState; label: string }[] = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "SUBMITTED",   label: "Submitted" },
  { value: "OVERDUE",     label: "Overdue" },
];

export default async function CompletionPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    manager?: string;
    sheet?: string;
    check?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Restricted
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
          Not authorised
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Completion reporting is available to managers and admins only.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const managerFilter = sp.manager?.trim() ?? "";
  const sheetFilter = sp.sheet?.trim() ?? "";
  const checkFilter = sp.check?.trim() ?? "";
  const isAdmin = user.role === Role.ADMIN;
  const scopeLabel = isAdmin ? "the org" : "your team";

  // Param map used by CompletionFilters to build chip links that preserve
  // every other current ?key=value while flipping the one being clicked.
  const currentParams: Record<string, string> = {
    period,
    ...(managerFilter ? { manager: managerFilter } : {}),
    ...(sheetFilter ? { sheet: sheetFilter } : {}),
    ...(checkFilter ? { check: checkFilter } : {}),
  };

  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <h1 className="text-xl font-semibold text-text">No active cycle</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Activate a cycle in /admin/cycles to populate the completion
          dashboard.
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
  const windowState: "pre" | "active" | "past" =
    systemDate >= w.closes ? "past" : systemDate >= w.opens ? "active" : "pre";

  const where: Prisma.UserWhereInput = {
    role: Role.EMPLOYEE,
    ...(isAdmin ? {} : { managerId: user.id }),
  };

  const employees = await prisma.user.findMany({
    where,
    orderBy: [{ name: "asc" }],
    include: {
      manager: { select: { id: true, name: true } },
      department: { select: { name: true } },
      goalSheets: {
        where: { cycleId: cycle.id },
        include: {
          goals: {
            include: {
              checkIns: { where: { period } },
            },
          },
        },
      },
    },
  });

  const allRows: CompletionRow[] = employees.map((e) => {
    const sheet = e.goalSheets[0] ?? null;
    const goalsTotal = sheet?.goals.length ?? 0;
    const goalsLogged =
      sheet?.goals.filter((g) => g.checkIns[0]?.computedScore != null)
        .length ?? 0;
    const scores = (sheet?.goals ?? [])
      .map((g) => g.checkIns[0]?.computedScore)
      .filter((s): s is Prisma.Decimal => s != null)
      .map((s) => Number(s));
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;

    const sheetState = deriveSheetState(sheet?.status ?? null);
    return {
      employeeId: e.id,
      employeeName: e.name,
      employeeEmail: e.email,
      departmentName: e.department?.name ?? null,
      managerId: e.manager?.id ?? null,
      managerName: e.manager?.name ?? null,
      sheetState,
      checkInState: deriveCheckInState(
        sheetState,
        goalsLogged,
        goalsTotal,
        windowState,
      ),
      goalsLogged,
      goalsTotal,
      avgScore,
      avgScoreBand: avgScore != null ? bandFor(avgScore) : null,
    };
  });

  const filteredRows = allRows.filter((r) => {
    if (managerFilter && r.managerId !== managerFilter) return false;
    if (sheetFilter && r.sheetState !== sheetFilter) return false;
    if (checkFilter && r.checkInState !== checkFilter) return false;
    return true;
  });

  // Derive the manager filter options from the unfiltered roster so the
  // Manager filter never disappears its own active option after a click.
  const managerOptions = uniqueManagers(allRows);

  const filterGroups: FilterGroup[] = [];
  if (isAdmin && managerOptions.length > 0) {
    filterGroups.push({
      label: "Manager",
      param: "manager",
      chips: [
        { label: "All", value: null, active: !managerFilter },
        ...managerOptions.map((m) => ({
          label: m.name,
          value: m.id,
          active: managerFilter === m.id,
          count: allRows.filter((r) => r.managerId === m.id).length,
        })),
      ],
    });
  }
  filterGroups.push({
    label: "Sheet status",
    param: "sheet",
    chips: [
      { label: "All", value: null, active: !sheetFilter },
      ...SHEET_STATES.map((s) => ({
        label: s.label,
        value: s.value,
        active: sheetFilter === s.value,
        count: allRows.filter((r) => r.sheetState === s.value).length,
      })),
    ],
  });
  filterGroups.push({
    label: "Check-in status",
    param: "check",
    chips: [
      { label: "All", value: null, active: !checkFilter },
      ...CHECKIN_STATES.map((c) => ({
        label: c.label,
        value: c.value,
        active: checkFilter === c.value,
        count: allRows.filter((r) => r.checkInState === c.value).length,
      })),
    ],
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Reports · Completion
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Completion dashboard
          </h1>
          <span className="font-mono text-xs text-text-muted tabular-nums">
            {filteredRows.length} of {allRows.length}{" "}
            {allRows.length === 1 ? "employee" : "employees"}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Track goal-sheet approvals and quarterly check-in completion across{" "}
          {scopeLabel}.
        </p>
      </header>

      <PeriodTabs basePath="/reports/completion" current={period} />

      <SummaryCards rows={filteredRows} scopeLabel={scopeLabel} />

      <CompletionFilters
        groups={filterGroups}
        basePath="/reports/completion"
        currentParams={currentParams}
      />

      <CompletionTable
        rows={filteredRows}
        showManagerColumn={isAdmin}
        emptyHint={
          managerFilter || sheetFilter || checkFilter
            ? "No employees match the current filters. Try clearing one or more."
            : isAdmin
              ? "Once employees are seeded into a department, they appear here."
              : "Your direct reports will appear once they're assigned to you in /admin/users."
        }
      />
    </div>
  );
}

function uniqueManagers(
  rows: CompletionRow[],
): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const r of rows) {
    if (r.managerId && r.managerName && !seen.has(r.managerId)) {
      seen.set(r.managerId, r.managerName);
    }
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function SummaryCards({
  rows,
  scopeLabel,
}: {
  rows: CompletionRow[];
  scopeLabel: string;
}) {
  const total = rows.length;
  const approved = rows.filter(
    (r) => r.sheetState === "APPROVED" || r.sheetState === "LOCKED",
  ).length;
  const submitted = rows.filter((r) => r.checkInState === "SUBMITTED").length;
  const overdue = rows.filter((r) => r.checkInState === "OVERDUE").length;

  const approvedPct = total > 0 ? Math.round((approved / total) * 100) : null;
  const submittedPct =
    approved > 0 ? Math.round((submitted / approved) * 100) : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Employees in scope"
        value={total}
        sub={`Across ${scopeLabel}`}
      />
      <SummaryCard
        label="Sheets approved"
        value={total === 0 ? "—" : approved}
        sub={
          approvedPct == null
            ? "No sheets yet"
            : `${approvedPct}% of ${total}`
        }
      />
      <SummaryCard
        label="Check-ins submitted"
        value={approved === 0 ? "—" : submitted}
        sub={
          submittedPct == null
            ? "No approved sheets yet"
            : `${submittedPct}% of ${approved} approved`
        }
      />
      <SummaryCard
        label="Overdue check-ins"
        value={overdue}
        sub={
          overdue === 0
            ? "None past the close date"
            : "Past the close date"
        }
        tone={overdue > 0 ? "danger" : "neutral"}
      />
    </div>
  );
}
