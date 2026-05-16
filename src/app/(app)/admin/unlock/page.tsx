import { redirect } from "next/navigation";
import { GoalSheetStatus, Prisma, Role } from "@prisma/client";
import {
  AdminUnlockTable,
  type UnlockableRow,
} from "@/components/admin-unlock-table";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminUnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== Role.ADMIN) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Restricted
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
          Admin-only screen
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Switch to Priya (admin@demo) to unlock approved goal sheets.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const where: Prisma.GoalSheetWhereInput = {
    status: { in: [GoalSheetStatus.APPROVED, GoalSheetStatus.LOCKED] },
    ...(q
      ? {
          owner: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const sheets = await prisma.goalSheet.findMany({
    where,
    orderBy: { approvedAt: "desc" },
    include: {
      owner: {
        select: {
          name: true,
          email: true,
          department: { select: { name: true } },
        },
      },
      approvedBy: { select: { name: true } },
      cycle: { select: { name: true } },
    },
  });

  const rows: UnlockableRow[] = sheets.map((s) => ({
    id: s.id,
    status: s.status,
    cycleName: s.cycle.name,
    approvedAtISO: s.approvedAt?.toISOString() ?? null,
    approverName: s.approvedBy?.name ?? null,
    owner: {
      name: s.owner.name,
      email: s.owner.email,
      departmentName: s.owner.department?.name ?? null,
    },
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Admin · Governance
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Unlock approved sheets
          </h1>
          <span className="font-mono text-xs text-text-muted tabular-nums">
            {rows.length} {rows.length === 1 ? "sheet" : "sheets"}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Approved sheets are locked from edits by design. Unlocking flips a
          sheet back to <span className="font-mono">DRAFT</span> for its
          owner — your reason is recorded in the audit log.
        </p>
      </header>

      <AdminUnlockTable rows={rows} initialQuery={q} />
    </div>
  );
}
