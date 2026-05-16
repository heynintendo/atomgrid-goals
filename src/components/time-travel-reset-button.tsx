"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetSystemDate } from "@/lib/actions/system-date";

interface TimeTravelResetButtonProps {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  label?: string;
}

export function TimeTravelResetButton({
  size = "sm",
  variant = "secondary",
  label = "Reset to now",
}: TimeTravelResetButtonProps) {
  const [pending, start] = useTransition();
  function onClick() {
    start(async () => {
      const r = await resetSystemDate();
      if (r.ok) toast.success("System clock back to live");
      else toast.error(r.error);
    });
  }
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={pending}
    >
      <RotateCcw size={14} strokeWidth={1.75} />
      {label}
    </Button>
  );
}
