import { Inbox } from "lucide-react";
import { ScorePill } from "@/components/score-pill";
import { StatusPill } from "@/components/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableCellNumeric,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoreBand } from "@/lib/scoring";

export type SheetState =
  | "MISSING"
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "LOCKED"
  | "RETURNED";

// Five states.  NOT_APPLICABLE captures employees whose sheet isn't
// APPROVED/LOCKED yet — for them, check-in tracking hasn't started.
// They render as "—" in the table and aren't counted in filter chip
// totals, so the four state buckets sum to the eligible-employees subset.
export type CheckInState =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "OVERDUE"
  | "NOT_APPLICABLE";

export interface CompletionRow {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  departmentName: string | null;
  managerId: string | null;
  managerName: string | null;
  sheetState: SheetState;
  checkInState: CheckInState;
  goalsLogged: number;
  goalsTotal: number;
  avgScore: number | null;        // 0..1 or null when nothing logged yet
  avgScoreBand: ScoreBand | null;
}

interface CompletionTableProps {
  rows: CompletionRow[];
  showManagerColumn: boolean;
  emptyHint: string;
}

const SHEET_PILL: Record<SheetState, { label: string; dot: string }> = {
  MISSING:   { label: "No sheet",   dot: "bg-text-placeholder" },
  DRAFT:     { label: "Draft",      dot: "bg-text-muted" },
  SUBMITTED: { label: "Submitted",  dot: "bg-info" },
  APPROVED:  { label: "Approved",   dot: "bg-success" },
  LOCKED:    { label: "Locked",     dot: "bg-success" },
  RETURNED:  { label: "Returned",   dot: "bg-warning" },
};

const CHECKIN_PILL: Record<
  Exclude<CheckInState, "NOT_APPLICABLE">,
  { label: string; dot: string }
> = {
  NOT_STARTED: { label: "Not started", dot: "bg-text-muted" },
  IN_PROGRESS: { label: "In progress", dot: "bg-info" },
  SUBMITTED:   { label: "Submitted",   dot: "bg-success" },
  OVERDUE:     { label: "Overdue",     dot: "bg-danger" },
};

export function CompletionTable({
  rows,
  showManagerColumn,
  emptyHint,
}: CompletionTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
        <Inbox
          size={28}
          strokeWidth={1.5}
          aria-hidden
          className="mx-auto text-text-muted"
        />
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-text-muted">
          Nothing to show
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-text">
          No employees match this view
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
          {emptyHint}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          {showManagerColumn && <TableHead>Manager</TableHead>}
          <TableHead>Sheet</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead className="text-right">Logged</TableHead>
          <TableHead>Avg score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const sheet = SHEET_PILL[row.sheetState];
          const ci =
            row.checkInState === "NOT_APPLICABLE"
              ? null
              : CHECKIN_PILL[row.checkInState];
          return (
            <TableRow key={row.employeeId}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-text">
                    {row.employeeName}
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {row.employeeEmail}
                  </span>
                </div>
              </TableCell>
              {showManagerColumn && (
                <TableCell className="text-text-secondary">
                  {row.managerName ?? "—"}
                </TableCell>
              )}
              <TableCell>
                <StatusPill label={sheet.label} dotClass={sheet.dot} />
              </TableCell>
              <TableCell>
                {ci ? (
                  <StatusPill label={ci.label} dotClass={ci.dot} />
                ) : (
                  <span className="font-mono text-xs text-text-muted">—</span>
                )}
              </TableCell>
              <TableCellNumeric>
                <span
                  className={
                    row.goalsTotal === 0
                      ? "text-text-muted"
                      : row.goalsLogged === row.goalsTotal
                        ? "text-text"
                        : "text-text-secondary"
                  }
                >
                  {row.goalsTotal === 0
                    ? "—"
                    : `${row.goalsLogged}/${row.goalsTotal}`}
                </span>
              </TableCellNumeric>
              <TableCell>
                {row.avgScore != null && row.avgScoreBand ? (
                  <ScorePill
                    display={`${(row.avgScore * 100).toFixed(1)}%`}
                    band={row.avgScoreBand}
                  />
                ) : (
                  <span className="font-mono text-xs text-text-muted">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
