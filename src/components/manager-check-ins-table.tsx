"use client";

import { useState } from "react";
import { Inbox, MessageSquarePlus, MessageSquareText } from "lucide-react";
import type { GoalStatus } from "@prisma/client";
import { ManagerCommentDialog } from "@/components/manager-comment-dialog";
import { ScorePill } from "@/components/score-pill";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export interface CheckInRow {
  id: string;
  employeeName: string;
  employeeEmail: string;
  goalTitle: string;
  uomType: string;
  targetDisplay: string;
  actualDisplay: string;
  scoreDisplay: string | null;
  scoreBand: ScoreBand | null;
  employeeStatus: GoalStatus;
  existingComment: string | null;
  commentBy: string | null;
  commentAtISO: string | null;
}

interface ManagerCheckInsTableProps {
  rows: CheckInRow[];
  periodLabel: string;
}

const STATUS_LABEL: Record<GoalStatus, { label: string; dot: string }> = {
  NOT_STARTED: { label: "Not started", dot: "bg-text-muted" },
  ON_TRACK:    { label: "On track",    dot: "bg-info" },
  COMPLETED:   { label: "Completed",   dot: "bg-success" },
};

export function ManagerCheckInsTable({
  rows,
  periodLabel,
}: ManagerCheckInsTableProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? rows.find((r) => r.id === openId) ?? null : null;

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
          Nothing to review
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-text">
          No {periodLabel} check-ins from your team yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
          Once your direct reports log their actuals for {periodLabel}, their
          rows appear here. You can leave a structured comment on any row by
          clicking it.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Goal</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Open check-in</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const status = STATUS_LABEL[row.employeeStatus];
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => setOpenId(row.id)}
              >
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
                <TableCell className="max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-text">{row.goalTitle}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                      {row.uomType}
                    </span>
                  </div>
                </TableCell>
                <TableCellNumeric className="text-text-secondary">
                  {row.targetDisplay}
                </TableCellNumeric>
                <TableCellNumeric>{row.actualDisplay}</TableCellNumeric>
                <TableCell>
                  {row.scoreDisplay && row.scoreBand ? (
                    <ScorePill display={row.scoreDisplay} band={row.scoreBand} />
                  ) : (
                    <span className="font-mono text-xs text-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
                    <span
                      aria-hidden
                      className={cn("h-1.5 w-1.5 rounded-full", status.dot)}
                    />
                    <span className="text-xs font-medium text-text-secondary">
                      {status.label}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="max-w-[18rem]">
                  {row.existingComment ? (
                    <span className="flex items-center gap-2 text-text-secondary">
                      <MessageSquareText
                        size={12}
                        strokeWidth={1.75}
                        className="shrink-0 text-text-muted"
                      />
                      <span className="truncate text-xs">
                        {row.existingComment}
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-text-muted">
                      <MessageSquarePlus size={12} strokeWidth={1.75} />
                      Add a comment
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenId(row.id);
                    }}
                  >
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {open && (
        <ManagerCommentDialog
          open={!!openId}
          onOpenChange={(v) => {
            if (!v) setOpenId(null);
          }}
          checkIn={{
            id: open.id,
            employeeName: open.employeeName,
            goalTitle: open.goalTitle,
            actualDisplay: open.actualDisplay,
            scoreDisplay: open.scoreDisplay,
            scoreBand: open.scoreBand,
            existingComment: open.existingComment,
            commentBy: open.commentBy,
            commentAt: open.commentAtISO ? new Date(open.commentAtISO) : null,
          }}
        />
      )}
    </>
  );
}
