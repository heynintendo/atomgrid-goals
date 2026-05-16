import Link from "next/link";
import { CheckInPeriod } from "@prisma/client";
import { cn } from "@/lib/utils";

const PERIODS: { value: CheckInPeriod; label: string }[] = [
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "ANNUAL", label: "Annual" },
];

interface PeriodTabsProps {
  basePath: string; // e.g. "/manager/check-ins"
  current: CheckInPeriod;
}

// Underline-style tabs.  Active tab gets a 2px brand bar; inactive items
// are muted text with a hover lift.  Plain anchors keep this server-only
// and let the URL hold the period as the source of truth.
export function PeriodTabs({ basePath, current }: PeriodTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {PERIODS.map((p) => {
        const active = p.value === current;
        return (
          <Link
            key={p.value}
            href={`${basePath}?period=${p.value}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center px-3 text-sm font-medium transition-colors duration-[120ms] ease-[var(--ease-brand)]",
              active
                ? "text-text"
                : "text-text-muted hover:text-text",
            )}
          >
            {p.label}
            {active && (
              <span
                aria-hidden
                className="absolute -bottom-px left-0 right-0 h-0.5 bg-brand"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
