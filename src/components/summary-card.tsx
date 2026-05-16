import { cn } from "@/lib/utils";

interface SummaryCardProps {
  label: string;
  value: string | number;
  sub?: string;
  // "danger" renders the value in danger red — used by the Overdue card
  // when count > 0.  Default "neutral" keeps the value in text-text.
  tone?: "neutral" | "danger";
}

// Compact stat card.  Sits in a grid of 2-4 above a data table; reads
// label → value → sub from top to bottom in the warm-light token system.
// No icon, no trend arrow — the data tells the story.
export function SummaryCard({
  label,
  value,
  sub,
  tone = "neutral",
}: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-5">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight",
          tone === "danger" ? "text-danger" : "text-text",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-text-muted">{sub}</p>
      )}
    </div>
  );
}
