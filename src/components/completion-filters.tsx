import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FilterChip {
  label: string;
  value: string | null; // null = "All" (clears the filter)
  active: boolean;
  count?: number;       // optional count rendered as a faint sublabel
}

export interface FilterGroup {
  label: string;
  param: string;        // the URL ?param=...
  chips: FilterChip[];
}

interface CompletionFiltersProps {
  groups: FilterGroup[];
  basePath: string;
  currentParams: Record<string, string>;
}

// Sidebar-style filter block stacked above the table.  Each group is a
// label + chip row; chips are real <a> links so server-side filtering
// stays the source of truth (no client state).  Clicking a chip toggles
// just its own param while preserving every other ?key=value (e.g. period).
export function CompletionFilters({
  groups,
  basePath,
  currentParams,
}: CompletionFiltersProps) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-1 p-4">
      {groups.map((group, idx) => (
        <div
          key={group.label}
          className={cn(
            "flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4",
            idx > 0 && "border-t border-border pt-3",
          )}
        >
          <span className="w-32 shrink-0 pt-1 font-mono text-xs uppercase tracking-wider text-text-muted">
            {group.label}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {group.chips.map((chip) => (
              <FilterChipLink
                key={chip.label}
                chip={chip}
                href={buildUrl(basePath, currentParams, group.param, chip.value)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterChipLink({ chip, href }: { chip: FilterChip; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors duration-[120ms]",
        chip.active
          ? "border-border-hover bg-surface-hover text-text"
          : "border-border bg-surface-1 text-text-secondary hover:bg-surface-hover hover:text-text",
      )}
    >
      <span>{chip.label}</span>
      {chip.count != null && (
        <span className="font-mono text-[10px] tabular-nums text-text-muted">
          {chip.count}
        </span>
      )}
    </Link>
  );
}

// Builds a URL that flips one param to `value` (or removes it when value is
// null), while preserving every other current param.  Empty string for
// no-query base path.
export function buildUrl(
  basePath: string,
  current: Record<string, string>,
  paramName: string,
  value: string | null,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (k === paramName) continue;
    if (v) params.set(k, v);
  }
  if (value != null && value !== "") {
    params.set(paramName, value);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
