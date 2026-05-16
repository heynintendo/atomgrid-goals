import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { TimeTravelEditor } from "@/components/time-travel-editor";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemDateState } from "@/lib/system-date";

export default async function TimeTravelPage() {
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
          Switch to Priya (admin@demo) to shift the system clock and demo
          quarterly check-in windows live.
        </p>
      </div>
    );
  }

  const [state, cycle] = await Promise.all([
    getSystemDateState(),
    prisma.cycle.findFirst({ where: { isActive: true } }),
  ]);

  if (!cycle) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <h1 className="text-xl font-semibold text-text">No active cycle</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Activate a cycle in /admin/cycles before time-travelling — there
          are no windows to anchor against otherwise.
        </p>
      </div>
    );
  }

  return (
    <TimeTravelEditor
      systemDateISO={state.isTraveled ? state.date.toISOString() : null}
      realNowISO={state.realNow.toISOString()}
      cycle={{
        name: cycle.name,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        goalSettingOpensAt: cycle.goalSettingOpensAt.toISOString(),
        q1OpensAt: cycle.q1OpensAt.toISOString(),
        q2OpensAt: cycle.q2OpensAt.toISOString(),
        q3OpensAt: cycle.q3OpensAt.toISOString(),
        annualOpensAt: cycle.annualOpensAt.toISOString(),
      }}
    />
  );
}
