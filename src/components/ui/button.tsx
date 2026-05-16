import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm select-none",
    "transition-[background-color,border-color] duration-[120ms] ease-[var(--ease-brand)]",
    "active:translate-y-[0.5px]",
    "disabled:pointer-events-none disabled:opacity-50 disabled:active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/15 focus-visible:ring-offset-0",
  ),
  {
    variants: {
      variant: {
        primary: cn(
          "bg-brand text-white border border-brand-pressed",
          "shadow-button-primary active:shadow-button-primary-active",
          "hover:bg-brand-hover active:bg-brand-pressed",
        ),
        secondary: cn(
          "bg-surface-1 text-text border border-border",
          "shadow-button-secondary",
          "hover:bg-surface-hover hover:border-border-hover",
          "active:bg-border",
        ),
        ghost: cn(
          "bg-transparent text-text",
          "hover:bg-surface-hover",
        ),
        destructive: cn(
          "bg-transparent text-danger border border-danger/30",
          "hover:bg-danger/6 hover:border-danger/40",
        ),
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-3",
        lg: "h-10 px-4",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
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
