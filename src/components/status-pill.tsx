import { cn } from "@/lib/utils";

interface StatusPillProps {
  label: string;
  dotClass: string; // tailwind bg-* utility (e.g., bg-status-on-track)
  className?: string;
}

// One chip primitive shared by every "status as a dot + label" rendering:
// sheet status pill (goal-sheet-editor), employee status (manager check-ins),
// approved status (admin unlock), and the completion dashboard's two
// independent status columns.  Stays out of components/ui/ because it's
// composed of design tokens rather than a Radix wrapper.
export function StatusPill({ label, dotClass, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5",
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      <span className="text-xs font-medium text-text-secondary">{label}</span>
    </span>
  );
}
