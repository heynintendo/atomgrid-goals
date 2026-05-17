"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Inbox, KeyRound, Search } from "lucide-react";
import { AdminUnlockDialog } from "@/components/admin-unlock-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface UnlockableRow {
  id: string;
  status: string;
  cycleName: string;
  approvedAtISO: string | null;
  approverName: string | null;
  owner: {
    name: string;
    email: string;
    departmentName: string | null;
  };
}

interface AdminUnlockTableProps {
  rows: UnlockableRow[];
  initialQuery: string;
}

export function AdminUnlockTable({
  rows,
  initialQuery,
}: AdminUnlockTableProps) {
  const [query, setQuery] = useState(initialQuery);
  const [openSheet, setOpenSheet] = useState<UnlockableRow | null>(null);

  return (
    <>
      {/* Search form — plain ?q= submit, no client-side filtering so the
          server applies it consistently with the Prisma query. */}
      <form className="flex items-center gap-3" action="/admin/unlock">
        <div className="relative flex-1">
          <Search
            size={14}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by employee name or email"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
          <Inbox
            size={28}
            strokeWidth={1.5}
            aria-hidden
            className="mx-auto text-text-muted"
          />
          <p className="mt-4 font-mono text-xs uppercase tracking-wider text-text-muted">
            Nothing to unlock
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-text">
            {initialQuery
              ? `No APPROVED or LOCKED sheets match “${initialQuery}”`
              : "No APPROVED or LOCKED sheets in the system"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            Sheets appear here once a manager approves them. Unlocking flips
            them back to DRAFT so the owner can re-edit; the action and your
            reason go into the audit log.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>Approver</TableHead>
              <TableHead className="w-32 text-right">
                <span className="sr-only">Unlock action</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-text">
                      {row.owner.name}
                    </span>
                    <span className="font-mono text-xs text-text-muted">
                      {row.owner.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">
                  {row.owner.departmentName ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-text-secondary">
                  {row.cycleName}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-status-on-track"
                    />
                    <span className="text-xs font-medium text-text-secondary">
                      {row.status}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-text-secondary">
                  {row.approvedAtISO
                    ? format(new Date(row.approvedAtISO), "d MMM yyyy")
                    : "—"}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {row.approverName ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => setOpenSheet(row)}
                  >
                    <KeyRound size={14} strokeWidth={1.75} />
                    Unlock
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {openSheet && (
        <AdminUnlockDialog
          open={!!openSheet}
          onOpenChange={(v) => {
            if (!v) setOpenSheet(null);
          }}
          sheet={{
            id: openSheet.id,
            employeeName: openSheet.owner.name,
            status: openSheet.status,
            cycleName: openSheet.cycleName,
          }}
        />
      )}
    </>
  );
}
