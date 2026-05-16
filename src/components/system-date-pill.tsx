import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

// H6 stage: read-only display.  H9 will:
//   - replace the helper with getSystemDate() that ALL window logic reads
//   - wire the pill to /admin/time-travel for the click-through
export async function SystemDatePill() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  const traveled = settings?.systemDate ?? null;
  const isLive = traveled === null;
  const date = traveled ?? new Date();

  return (
    <div
      className="flex h-8 items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5"
      title={isLive ? "System clock is live" : "Time-travel: system date is set"}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isLive ? "bg-status-on-track" : "bg-warning",
        )}
      />
      <span className="text-xs font-medium text-text-secondary">
        {isLive ? "Live" : "Time-travel"}
      </span>
      <span className="font-mono text-xs text-text-muted">
        {format(date, "d MMM yyyy")}
      </span>
    </div>
  );
}
