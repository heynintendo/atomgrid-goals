import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Button variants — Atomberg brand identity.
//
// Primary: lime-green (`--color-brand-primary`) bg with dark navy text
// (`--color-text-on-primary`).  Flat — no shadow, matching atomberg.in's
// Contact Us pattern (verified via Phase A recon).  The 1px navy edge
// is a subtle inset that anchors the button without elevation.
//
// Secondary: white bg with a default-grey border.  The everyday workhorse.
//
// Navy: dark-navy bg + white text.  Reserved for emphasis CTAs that
// need maximum contrast (e.g. critical confirm-dialog primary action).
//
// Ghost / Outline / Destructive: as before, retuned to new tokens.
const buttonVariants = cva(
  cn(
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium select-none",
    "transition-[background-color,border-color,color] duration-150 ease-[var(--ease-brand)]",
    "active:translate-y-[0.5px]",
    "disabled:pointer-events-none disabled:opacity-50 disabled:active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  ),
  {
    variants: {
      variant: {
        primary: cn(
          "bg-brand-primary text-text-on-primary border border-brand-primary-active",
          "hover:bg-brand-primary-hover active:bg-brand-primary-active",
        ),
        secondary: cn(
          "bg-surface-1 text-text border border-border",
          "shadow-xs",
          "hover:bg-surface-hover hover:border-border-hover",
          "active:bg-surface-2",
        ),
        navy: cn(
          "bg-brand-navy text-text-on-navy border border-brand-navy",
          "hover:bg-brand-navy-hover",
        ),
        outline: cn(
          "bg-transparent text-text border border-border",
          "hover:bg-surface-hover hover:border-border-hover",
        ),
        ghost: cn(
          "bg-transparent text-text",
          "hover:bg-surface-hover",
        ),
        destructive: cn(
          "bg-transparent text-status-danger border border-status-danger/30",
          "hover:bg-status-danger-subtle hover:border-status-danger/50",
        ),
      },
      size: {
        sm:   "h-8  px-3  text-sm",
        md:   "h-9  px-4  text-sm",
        lg:   "h-11 px-6  text-base",
        // Corporate CTA — matches the 52px Contact Us button on
        // atomberg.in.  Reserved for landing-page-style emphasis.
        cta:  "h-13 px-7  text-base rounded-[10px]",
        icon: "h-9  w-9   p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size:    "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
