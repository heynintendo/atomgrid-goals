import { cn } from "@/lib/utils";
import type { ScoreBand } from "@/lib/scoring";

interface ScorePillProps {
  display: string;
  band: ScoreBand;
  className?: string;
}

// BELOW   → danger dot   (red — pulls the eye where action is needed)
// MEETS   → muted dot    (neutral — the unremarkable middle band)
// EXCEEDS → brand dot    (emerald — the "doing great" highlight)
// NA      → faint dot    (couldn't compute — e.g. target=0)
const BAND_DOT: Record<ScoreBand, string> = {
  BELOW:   "bg-danger",
  MEETS:   "bg-text-muted",
  EXCEEDS: "bg-brand",
  NA:      "bg-text-placeholder",
};

// Reusable score chip — used by the check-in form's live preview,
// the manager check-in view, and the completion dashboard.  Keeps
// the band → color mapping in one place so a future tuning of the
// palette doesn't drift across surfaces.
export function ScorePill({ display, band, className }: ScorePillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-2 py-0.5",
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", BAND_DOT[band])} />
      <span className="font-mono text-xs font-medium tabular-nums text-text">
        {display}
      </span>
    </span>
  );
}
