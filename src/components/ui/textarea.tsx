import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[72px] w-full rounded-sm border border-border bg-surface-1 px-3 py-2 text-sm text-text shadow-input",
      "placeholder:text-text-placeholder",
      "transition-[border-color,box-shadow] duration-[120ms] ease-[var(--ease-brand)]",
      "hover:border-border-hover",
      "focus-visible:outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/15 focus-visible:ring-offset-0",
      "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-muted disabled:opacity-70",
      "resize-y",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
