import { format } from "date-fns";
import { getSystemDateState } from "@/lib/system-date";
import { cn } from "@/lib/utils";

// Header pill — reads the same getSystemDateState() helper every other
// cycle-window check uses, so the displayed date is always coherent with
// the rest of the app.
export async function SystemDatePill() {
  const state = await getSystemDateState();

  return (
    <div
      className="flex h-8 items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5"
      title={
        state.isTraveled
          ? "Time-travel: system date is overridden"
          : "System clock is live"
      }
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          state.isTraveled ? "bg-warning" : "bg-status-on-track",
        )}
      />
      <span className="text-xs font-medium text-text-secondary">
        {state.isTraveled ? "Time-travel" : "Live"}
      </span>
      <span
        suppressHydrationWarning
        className="font-mono text-xs text-text-muted"
      >
        {format(state.date, "d MMM yyyy")}
      </span>
    </div>
  );
}
