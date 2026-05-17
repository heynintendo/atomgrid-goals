import { cn } from "@/lib/utils";
import { bandColorTokens } from "@/lib/score-colors";
import type { ScoreBand } from "@/lib/scoring";

interface ScorePillProps {
  display: string;
  band: ScoreBand;
  className?: string;
}

// Reusable score chip — used by the check-in form's live preview,
// the manager check-in view, and the completion dashboard.  The
// band → colour mapping lives in @/lib/score-colors so the analytics
// heatmap can't drift from this pill.
//
// BELOW   → danger dot   (red — pulls the eye where action is needed)
// MEETS   → muted dot    (neutral — the unremarkable middle band)
// EXCEEDS → brand dot    (emerald — the "doing great" highlight)
// NA      → faint dot    (couldn't compute — e.g. target=0)
export function ScorePill({ display, band, className }: ScorePillProps) {
  const tokens = bandColorTokens(band);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-2 py-0.5",
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", tokens.bg)} />
      <span className="font-mono text-xs font-medium tabular-nums text-text">
        {display}
      </span>
    </span>
  );
}
