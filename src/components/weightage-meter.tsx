import { GoalSheetStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface WeightageMeterProps {
  sum: number;
  goalCount: number;
  status: GoalSheetStatus;
}

// Copy strings for the sum=100 case, keyed by sheet status.  Out-of-range
// sums (>100 or <100) get their own messages handled inline.
const READY_COPY: Record<GoalSheetStatus, string> = {
  DRAFT:     "Sum is 100% — eligible to submit",
  RETURNED:  "Sum is 100% — address manager feedback before resubmitting",
  SUBMITTED: "Sum is 100% — pending manager review",
  APPROVED:  "Sum is 100% — sheet approved",
  LOCKED:    "Sum is 100% — sheet approved and locked",
};

export function WeightageMeter({ sum, goalCount, status }: WeightageMeterProps) {
  const state = sum === 100 ? "ok" : sum < 100 ? "under" : "over";
  const dotColor =
    state === "ok"
      ? "bg-status-on-track"
      : state === "under"
        ? "bg-warning"
        : "bg-danger";
  const textColor =
    state === "ok"
      ? "text-text"
      : state === "under"
        ? "text-warning"
        : "text-danger";
  const message =
    state === "ok"
      ? READY_COPY[status]
      : state === "under"
        ? `${100 - sum}% short — add or reweight goals`
        : `${sum - 100}% over — reduce some weightages`;

  const fillPct = Math.min(100, sum);
  const overshootPct = Math.max(0, Math.min(100, sum - 100));

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
          <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Weightage
          </span>
          <span
            className={cn(
              "font-mono text-sm font-medium tabular-nums",
              textColor,
            )}
          >
            {sum}%
          </span>
        </div>
        {/* Just the raw count — dropping the "/8" denominator that
            wasn't explained anywhere on the page and read as ambiguous.
            The 8-goal sheet ceiling is enforced at the add-goal button
            (disabled at goalCount === 8) where the context is clear. */}
        <span className="font-mono text-xs text-text-muted tabular-nums">
          {goalCount} {goalCount === 1 ? "goal" : "goals"}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 transition-[width] duration-[220ms] ease-[var(--ease-brand)]",
            state === "ok"
              ? "bg-brand"
              : state === "under"
                ? "bg-warning"
                : "bg-brand",
          )}
          style={{ width: `${fillPct}%` }}
        />
        {overshootPct > 0 && (
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 bg-danger transition-[width] duration-[220ms] ease-[var(--ease-brand)]"
            style={{ width: `${overshootPct}%` }}
          />
        )}
      </div>
      <p className={cn("mt-2 text-xs", textColor)}>{message}</p>
    </div>
  );
}
