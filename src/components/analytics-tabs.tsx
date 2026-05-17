import Link from "next/link";
import { cn } from "@/lib/utils";

export type AnalyticsTabKey = "qoq" | "heatmap" | "distribution" | "effectiveness";

const TABS: { value: AnalyticsTabKey; label: string }[] = [
  { value: "qoq",           label: "Quarter-on-quarter" },
  { value: "heatmap",       label: "Heatmap" },
  { value: "distribution",  label: "Distribution" },
  { value: "effectiveness", label: "Manager effectiveness" },
];

interface AnalyticsTabsProps {
  basePath: string;          // "/reports/analytics"
  current: AnalyticsTabKey;
  preserveParams: Record<string, string>; // period + filters carried through
}

// View-switching tabs for the analytics surface.  Same underline + brand-bar
// pattern as PeriodTabs but a separate ?tab= param so period selection and
// view selection live on different URL keys (and a Q1 → Q2 click never
// resets the tab).
export function AnalyticsTabs({
  basePath,
  current,
  preserveParams,
}: AnalyticsTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = t.value === current;
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(preserveParams)) {
          if (k === "tab") continue;
          if (v) params.set(k, v);
        }
        params.set("tab", t.value);
        return (
          <Link
            key={t.value}
            href={`${basePath}?${params.toString()}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center px-3 text-sm font-medium transition-colors duration-[120ms] ease-[var(--ease-brand)]",
              active ? "text-text" : "text-text-muted hover:text-text",
            )}
          >
            {t.label}
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

export function parseAnalyticsTab(raw: string | undefined): AnalyticsTabKey {
  if (
    raw === "qoq" ||
    raw === "heatmap" ||
    raw === "distribution" ||
    raw === "effectiveness"
  ) {
    return raw;
  }
  return "qoq";
}
