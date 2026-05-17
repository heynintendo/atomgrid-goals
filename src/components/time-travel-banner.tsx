import Link from "next/link";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { TimeTravelResetButton } from "@/components/time-travel-reset-button";
import { getCurrentUser } from "@/lib/auth";
import { getSystemDateState } from "@/lib/system-date";

// Top-of-content warning bar that surfaces every page when an admin has
// shifted the system clock.  Admins see the reset button inline; everyone
// else gets a link back to the time-travel admin page.
export async function TimeTravelBanner() {
  const [state, user] = await Promise.all([
    getSystemDateState(),
    getCurrentUser(),
  ]);
  if (!state.isTraveled) return null;

  return (
    // <div role="status"> rather than <aside role="status"> — axe-core
    // flags the latter as aria-allowed-role since <aside> already
    // carries the implicit "complementary" landmark and a redundant
    // role conflicts.  The div + role="status" pattern satisfies both
    // the region rule (region landmark provided by role=status) and
    // aria-allowed-role.  aria-live=polite still announces the banner
    // to screen readers when an admin time-travels mid-session.
    <div
      role="status"
      aria-live="polite"
      aria-label="Time-travel notice"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning/5 px-4 py-2.5 md:px-6"
    >
      <div className="flex items-center gap-2">
        <Clock size={14} strokeWidth={1.5} className="shrink-0 text-warning" />
        <span className="text-xs text-text-secondary">
          <span className="font-medium text-text">Time-travel active</span> ·
          cycle windows read as if today is{" "}
          <span
            suppressHydrationWarning
            className="font-mono font-medium text-text"
          >
            {format(state.date, "d MMM yyyy")}
          </span>
        </span>
      </div>
      {user?.role === "ADMIN" ? (
        <TimeTravelResetButton />
      ) : (
        <Link
          href="/admin/time-travel"
          className="text-xs font-medium text-text-secondary underline-offset-2 hover:underline"
        >
          Open admin page
        </Link>
      )}
    </div>
  );
}
