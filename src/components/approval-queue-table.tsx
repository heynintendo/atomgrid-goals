import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Inbox } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableCellNumeric,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ApprovalQueueRow {
  id: string;
  submittedAt: Date | null;
  goalCount: number;
  weightageSum: number;
  owner: {
    name: string;
    email: string;
    department: { name: string } | null;
  };
}

interface ApprovalQueueTableProps {
  rows: ApprovalQueueRow[];
}

export function ApprovalQueueTable({ rows }: ApprovalQueueTableProps) {
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
          Queue empty
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-text">
          Nothing waiting for review
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
          When a direct report submits their goal sheet, it lands here. You can
          edit targets and weightages inline, then approve or return with
          feedback.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="text-right">Goals</TableHead>
          <TableHead className="text-right">Weightage</TableHead>
          <TableHead className="w-12 text-right">
            <span className="sr-only">Open sheet</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const sumOk = row.weightageSum === 100;
          return (
            <TableRow key={row.id} className="cursor-pointer">
              <TableCell>
                <Link
                  href={`/manager/approvals/${row.id}`}
                  className="flex flex-col gap-0.5"
                >
                  <span className="font-medium text-text">{row.owner.name}</span>
                  <span className="text-xs text-text-muted">
                    {row.owner.email}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-text-secondary">
                {row.owner.department?.name ?? "—"}
              </TableCell>
              <TableCell className="text-text-secondary">
                {row.submittedAt
                  ? format(row.submittedAt, "d MMM yyyy")
                  : "—"}
              </TableCell>
              <TableCellNumeric>{row.goalCount}</TableCellNumeric>
              <TableCellNumeric
                className={sumOk ? "text-text" : "text-danger"}
              >
                {row.weightageSum}%
              </TableCellNumeric>
              <TableCell className="text-right">
                <Link
                  href={`/manager/approvals/${row.id}`}
                  aria-label={`Review ${row.owner.name}'s sheet`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors duration-[120ms] hover:bg-surface-hover hover:text-text"
                >
                  <ArrowRight size={14} strokeWidth={1.75} />
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
