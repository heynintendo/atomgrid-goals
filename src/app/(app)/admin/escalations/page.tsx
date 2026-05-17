import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { EscalationsTable } from "@/components/escalations-table";
import { getCurrentUser } from "@/lib/auth";
import { loadEscalations } from "@/lib/escalations";

export default async function AdminEscalationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== Role.ADMIN) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Restricted
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
          Not authorised
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          The org-wide escalation register is admin-only. Managers can see
          their team&rsquo;s escalations under Team &rsaquo; Escalations.
        </p>
      </div>
    );
  }

  const rows = await loadEscalations(user);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Admin &middot; Escalations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Escalation register
        </h1>
        <p className="text-sm text-text-secondary">
          Every active escalation across the org. The daily 02:00 UTC cron
          refreshes this list; resolving here writes an audit log entry
          and clears the row from the active view.
        </p>
      </header>

      <EscalationsTable rows={rows} showLevelFilter={true} />
    </div>
  );
}
