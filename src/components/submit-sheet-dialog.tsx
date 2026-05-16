"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubmitSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalCount: number;
  sum: number;
  onConfirm: () => void;
  pending: boolean;
}

export function SubmitSheetDialog({
  open,
  onOpenChange,
  goalCount,
  sum,
  onConfirm,
  pending,
}: SubmitSheetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit goal sheet for approval?</DialogTitle>
          <DialogDescription>
            You&apos;re sending <span className="font-medium text-text">{goalCount}</span>{" "}
            goal{goalCount === 1 ? "" : "s"} totalling{" "}
            <span className="font-medium text-text">{sum}%</span> weightage to
            your manager.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-sm border border-border bg-surface-2 px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-warning"
            />
            <p className="text-xs text-text-secondary">
              Once approved your sheet locks. Further edits require an admin
              to unlock the sheet and will appear in the audit log.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Keep editing
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Submitting…" : "Submit for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
