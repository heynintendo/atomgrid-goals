"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/40", className)}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: "left" | "right";
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, side = "left", ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed top-0 z-50 flex h-full w-72 flex-col bg-surface-1 shadow-popover focus:outline-none",
        side === "left" && "left-0 border-r border-border",
        side === "right" && "right-0 border-l border-border",
        className,
      )}
      {...props}
    >
      <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">
        App navigation links grouped by role.
      </DialogPrimitive.Description>
      <DialogPrimitive.Close
        aria-label="Close menu"
        className="absolute right-3 top-3 rounded-sm p-1 text-text-muted transition-colors duration-[120ms] hover:text-text focus:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/15"
      >
        <X size={16} strokeWidth={1.75} />
      </DialogPrimitive.Close>
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

export { Sheet, SheetTrigger, SheetClose, SheetContent };
