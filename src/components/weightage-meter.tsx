import { cn } from "@/lib/utils";

interface WeightageMeterProps {
  sum: number;
  goalCount: number;
}

// Compact one-line status bar at the top of the editor.  Color follows
// the BRD's hard constraint: sum=100 is the only acceptable value.
// Distance from 100 maps to the status band.
export function WeightageMeter({ sum, goalCount }: WeightageMeterProps) {
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
      ? "Sum is 100% — eligible to submit"
      : state === "under"
        ? `${100 - sum}% short — add or reweight goals`
        : `${sum - 100}% over — reduce some weightages`;

  // Bar fill: capped at 100% width visually; over-100 shows a danger band
  // overlay on top so the user gets an immediate sense of overshoot.
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
        <span className="font-mono text-xs text-text-muted tabular-nums">
          {goalCount}/8 goals
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
