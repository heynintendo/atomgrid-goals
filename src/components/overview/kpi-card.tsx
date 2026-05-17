import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  // Eyebrow label rendered uppercase tertiary.
  label:     string;
  // Big numeric or short string in 3xl semibold.  Pass a ReactNode so
  // callers can render percent signs / units with smaller sibling
  // text without the helper having to know about formatting.
  value:     ReactNode;
  // Sub-label rendered below the value (small grey).  Optional.
  sublabel?: ReactNode;
  // Apply danger-tint styling when the metric should pull attention
  // (e.g. open L2 escalations > 0, sheets-to-approve > 0).
  urgent?:   boolean;
  // Apply brand-primary accent border on the left edge for the
  // hero-metric variant (e.g. completion %).
  accent?:   boolean;
  className?: string;
}

// Standardised KPI tile used by the three role-overview dashboards.
// 4-column grid on desktop collapses via parent grid utilities.  The
// component itself only handles its own internal layout.
export function KpiCard({
  label,
  value,
  sublabel,
  urgent,
  accent,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border bg-surface-1 p-6",
        urgent ? "border-status-danger/40" : "border-border",
        className,
      )}
    >
      {accent ? (
        <span
          aria-hidden
          className="absolute left-0 top-3 bottom-3 w-1 rounded-r-sm bg-brand-primary"
        />
      ) : null}
      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 text-3xl font-semibold tabular-nums",
          urgent ? "text-status-danger" : "text-brand-navy",
        )}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="mt-1.5 text-xs text-text-tertiary">{sublabel}</p>
      ) : null}
    </div>
  );
}
