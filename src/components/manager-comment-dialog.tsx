"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { MessageSquare, Save } from "lucide-react";
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
import { ScorePill } from "@/components/score-pill";
import { Textarea } from "@/components/ui/textarea";
import { saveManagerComment } from "@/lib/actions/manager-comments";
import type { ScoreBand } from "@/lib/scoring";

interface ManagerCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkIn: {
    id: string;
    employeeName: string;
    goalTitle: string;
    actualDisplay: string;
    scoreDisplay: string | null;
    scoreBand: ScoreBand | null;
    existingComment: string | null;
    commentBy: string | null;
    commentAt: Date | null;
  };
}

export function ManagerCommentDialog({
  open,
  onOpenChange,
  checkIn,
}: ManagerCommentDialogProps) {
  const [pending, start] = useTransition();
  const [comment, setComment] = useState(checkIn.existingComment ?? "");

  // Reset the textarea when a different check-in opens.
  useEffect(() => {
    setComment(checkIn.existingComment ?? "");
  }, [checkIn.id, checkIn.existingComment]);

  function onSave() {
    start(async () => {
      const r = await saveManagerComment({
        checkInId: checkIn.id,
        comment,
      });
      if (r.ok) {
        toast.success(
          comment.trim().length === 0
            ? "Comment cleared"
            : `Comment saved for ${checkIn.employeeName}`,
        );
        onOpenChange(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manager check-in comment</DialogTitle>
          <DialogDescription>
            {checkIn.employeeName} ·{" "}
            <span className="font-medium text-text">{checkIn.goalTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-sm border border-border bg-surface-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                Reported actual
              </p>
              <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-text">
                {checkIn.actualDisplay}
              </p>
            </div>
            {checkIn.scoreDisplay && checkIn.scoreBand && (
              <ScorePill
                display={checkIn.scoreDisplay}
                band={checkIn.scoreBand}
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mgr-comment">
            Comment{" "}
            <span className="normal-case text-text-placeholder">
              (visible to the employee)
            </span>
          </Label>
          <Textarea
            id="mgr-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Acknowledge progress, flag risks, or point to a 1:1 you'll cover this in."
            rows={5}
          />
          {checkIn.commentAt && (
            <p className="font-mono text-xs text-text-muted">
              Last edited {format(checkIn.commentAt, "d MMM yyyy")}
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
          <Button type="button" onClick={onSave} disabled={pending}>
            {comment.trim().length === 0 ? (
              <>
                <MessageSquare size={14} strokeWidth={1.75} />
                Clear comment
              </>
            ) : (
              <>
                <Save size={14} strokeWidth={1.75} />
                {pending ? "Saving…" : "Save comment"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
