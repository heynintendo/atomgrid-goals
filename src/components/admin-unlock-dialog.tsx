"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
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
import { unlockSheet } from "@/lib/actions/admin-unlock";

interface AdminUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: {
    id: string;
    employeeName: string;
    status: string;
    cycleName: string;
  };
}

export function AdminUnlockDialog({
  open,
  onOpenChange,
  sheet,
}: AdminUnlockDialogProps) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 5;

  function onUnlock() {
    start(async () => {
      const r = await unlockSheet({ sheetId: sheet.id, reason: trimmed });
      if (r.ok) {
        toast.success(
          `Unlocked ${sheet.employeeName}'s sheet — audit row written`,
        );
        setReason("");
        onOpenChange(false);
      } else {
        toast.error(r.error);
      }
    });
  }

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
          <DialogTitle>Unlock {sheet.employeeName}&apos;s sheet?</DialogTitle>
          <DialogDescription>
            The {sheet.cycleName} sheet is currently{" "}
            <span className="font-medium text-text">{sheet.status}</span>.
            Unlocking flips it back to DRAFT so the owner can re-edit. Your
            reason is captured in the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="unlock-reason">
            Reason{" "}
            <span className="normal-case text-text-placeholder">
              (recorded in the audit log)
            </span>
          </Label>
          <Textarea
            id="unlock-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Q1 pipeline review surfaced a larger opportunity — opening to raise the target."
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
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onUnlock}
            disabled={pending || trimmed.length < 5}
          >
            <KeyRound size={14} strokeWidth={1.75} />
            {pending ? "Unlocking…" : "Unlock & log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
