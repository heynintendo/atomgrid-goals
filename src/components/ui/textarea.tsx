import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full rounded-md border border-border bg-surface-1 p-3 text-sm text-text",
      "placeholder:text-text-placeholder",
      "transition-[border-color,box-shadow] duration-150 ease-[var(--ease-brand)]",
      "hover:border-border-hover",
      "focus-visible:outline-none focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:ring-offset-0",
      "aria-[invalid=true]:border-status-danger aria-[invalid=true]:focus-visible:ring-status-danger/25",
      "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-muted disabled:opacity-70",
      "resize-y",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
