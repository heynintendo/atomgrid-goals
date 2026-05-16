"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReturnSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  pending: boolean;
  employeeName: string;
}

export function ReturnSheetDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
  employeeName,
}: ReturnSheetDialogProps) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 5;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setReason("");
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return sheet for rework?</DialogTitle>
          <DialogDescription>
            {employeeName} will see this reason on their goal sheet and can
            re-edit once they acknowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="return-reason">Return reason</Label>
          <Textarea
            id="return-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Goal 2 target is too aggressive for Q1 — let's discuss before resubmitting."
            rows={4}
          />
          {tooShort && (
            <p className="text-xs text-danger">
              Reason must be at least 5 characters.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Keep reviewing
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(trimmed)}
            disabled={pending || trimmed.length < 5}
          >
            <RotateCcw size={14} strokeWidth={1.75} />
            {pending ? "Returning…" : "Return for rework"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
