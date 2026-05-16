import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import {
  CompletionTable,
  type CompletionRow,
} from "@/components/completion-table";
import {
  CompletionFilters as CompletionFiltersUI,
  type FilterGroup,
} from "@/components/completion-filters";
import { CompletionExportButton } from "@/components/completion-export-button";
import { PeriodTabs } from "@/components/period-tabs";
import { SummaryCard } from "@/components/summary-card";
import { getCurrentUser } from "@/lib/auth";
import {
  applyCompletionFilters,
  loadCompletionScope,
  parsePeriod,
} from "@/lib/completion";

const SHEET_STATES = [
  { value: "MISSING",   label: "No sheet" },
  { value: "DRAFT",     label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED",  label: "Approved" },
  { value: "LOCKED",    label: "Locked" },
  { value: "RETURNED",  label: "Returned" },
] as const;

// NOT_APPLICABLE intentionally absent — rows in that state show em-dash
// in the table and aren't bucketed under any chip.
const CHECKIN_STATES = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "SUBMITTED",   label: "Submitted" },
  { value: "OVERDUE",     label: "Overdue" },
] as const;

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

  const currentParams: Record<string, string> = {
    period,
    ...(managerFilter ? { manager: managerFilter } : {}),
    ...(sheetFilter ? { sheet: sheetFilter } : {}),
    ...(checkFilter ? { check: checkFilter } : {}),
  };

  const scope = await loadCompletionScope(user, period);
  if (!scope) {
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

  const allRows = scope.rows;
  const filteredRows = applyCompletionFilters(allRows, {
    manager: managerFilter || undefined,
    sheet: sheetFilter || undefined,
    check: checkFilter || undefined,
  });

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Completion dashboard
          </h1>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-text-muted tabular-nums">
              {filteredRows.length} of {allRows.length}{" "}
              {allRows.length === 1 ? "employee" : "employees"}
            </span>
            <CompletionExportButton currentParams={currentParams} />
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          Track goal-sheet approvals and quarterly check-in completion across{" "}
          {scopeLabel}.
        </p>
      </header>

      <PeriodTabs basePath="/reports/completion" current={period} />

      <SummaryCards rows={filteredRows} scopeLabel={scopeLabel} />

      <CompletionFiltersUI
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
