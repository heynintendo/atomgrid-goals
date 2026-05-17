import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { EscalationsTable } from "@/components/escalations-table";
import { getCurrentUser } from "@/lib/auth";
import { loadEscalations } from "@/lib/escalations";

export default async function ManagerEscalationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== Role.MANAGER) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Restricted
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
          Not authorised
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          This view is scoped to a manager&rsquo;s own team. Admins should
          use Admin &rsaquo; Escalations for the org-wide register.
        </p>
      </div>
    );
  }

  const rows = await loadEscalations(user);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Team &middot; Escalations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Your team&rsquo;s escalations
        </h1>
        <p className="text-sm text-text-secondary">
          Level&nbsp;1 escalations on your direct reports &mdash; surfaced when
          a check-in window closes without a submission. Skip-level (Level&nbsp;2)
          rows go to admin once a Level&nbsp;1 sits unresolved past 7 days.
        </p>
      </header>

      <EscalationsTable rows={rows} showLevelFilter={false} />
    </div>
  );
}
