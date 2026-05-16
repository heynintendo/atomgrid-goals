import * as React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      "overflow-hidden rounded-lg border border-border bg-surface-1",
      className,
    )}
  >
    <table
      ref={ref}
      className="w-full border-collapse text-sm text-text"
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "sticky top-0 z-10 bg-surface-2/95 backdrop-blur-sm",
      "[&>tr]:border-b [&>tr]:border-border",
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-border bg-surface-2/60 font-medium",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border transition-colors duration-[120ms] ease-[var(--ease-brand)] hover:bg-surface-2/50 data-[state=selected]:bg-surface-2",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-4 py-[10px] text-left align-middle text-xs font-medium uppercase tracking-wider text-text-muted [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

type SortDir = "asc" | "desc" | null;

interface TableHeadSortableProps
  extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, "onToggle"> {
  sort?: SortDir;
  onToggle?: () => void;
  numeric?: boolean;
}

const TableHeadSortable = React.forwardRef<
  HTMLTableCellElement,
  TableHeadSortableProps
>(({ className, children, sort = null, onToggle, numeric, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-4 py-[10px] align-middle text-xs font-medium uppercase tracking-wider text-text-muted",
      numeric ? "text-right" : "text-left",
      className,
    )}
    aria-sort={
      sort === "asc"
        ? "ascending"
        : sort === "desc"
          ? "descending"
          : "none"
    }
    {...props}
  >
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 uppercase tracking-wider transition-colors duration-[120ms] ease-[var(--ease-brand)] hover:text-text",
        "focus-visible:outline-none focus-visible:text-text",
      )}
    >
      <ArrowUp
        size={12}
        strokeWidth={1.75}
        aria-hidden
        className={cn(
          "transition-transform duration-[120ms] ease-[var(--ease-brand)]",
          sort === null && "opacity-30",
          sort === "desc" && "rotate-180",
        )}
      />
      {children}
    </button>
  </th>
));
TableHeadSortable.displayName = "TableHeadSortable";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 align-middle text-text [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCellNumeric = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 align-middle text-right font-mono tabular-nums text-text",
      className,
    )}
    {...props}
  />
));
TableCellNumeric.displayName = "TableCellNumeric";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-xs text-text-muted", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableHeadSortable,
  TableRow,
  TableCell,
  TableCellNumeric,
  TableCaption,
};
