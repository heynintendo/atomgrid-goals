import { redirect } from "next/navigation";
import {
  GoalSheetEditor,
  type GoalFormValue,
} from "@/components/goal-sheet-editor";
import { ensureActiveSheet } from "@/lib/actions/goals";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// /employee/goal-sheet renders the current user's sheet for the active cycle.
// Non-EMPLOYEE roles can still own a sheet (e.g. Karthik owns the shared
// KPI source goal) — they just don't see the sidebar link, but direct URL
// works.  The sheet is created on first visit via ensureActiveSheet.
export default async function GoalSheetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const ensured = await ensureActiveSheet();
  if (!ensured.ok) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Goal sheet unavailable
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
          {ensured.error}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Once an admin activates a cycle, this page becomes your editor.
        </p>
      </div>
    );
  }

  const [sheet, thrustAreas] = await Promise.all([
    prisma.goalSheet.findUnique({
      where: { id: ensured.data.sheetId },
      include: { goals: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.thrustArea.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!sheet) {
    // Defensive: ensureActiveSheet returned ok but sheet got deleted between
    // the two queries (effectively impossible).  Render a friendly state.
    return (
      <div className="mx-auto max-w-2xl p-12">
        <h1 className="text-xl font-semibold text-text">Sheet unavailable</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Refresh this page — the sheet has gone missing between queries.
        </p>
      </div>
    );
  }

  const initialGoals: GoalFormValue[] = sheet.goals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description ?? "",
    thrustAreaId: g.thrustAreaId,
    uomType: g.uomType,
    uomLabel: g.uomLabel,
    target: g.target ? Number(g.target) : null,
    targetDate: g.targetDate
      ? g.targetDate.toISOString().slice(0, 10)
      : null,
    weightage: g.weightage,
    sharedFromId: g.sharedFromId,
  }));

  return (
    <GoalSheetEditor
      cycleName={ensured.data.cycleName}
      initialStatus={sheet.status}
      initialReturnReason={sheet.returnReason}
      initialGoals={initialGoals}
      thrustAreas={thrustAreas}
    />
  );
}
