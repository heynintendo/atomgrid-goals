"use client";

import { useState, useTransition } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { CheckCircle2, Lock, Plus, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { GoalSheetStatus, UomType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { GoalRow } from "@/components/goal-row";
import { SubmitSheetDialog } from "@/components/submit-sheet-dialog";
import { WeightageMeter } from "@/components/weightage-meter";
import {
  acknowledgeReturn,
  saveSheet,
  submitSheet,
} from "@/lib/actions/goals";
import { cn } from "@/lib/utils";

export interface GoalFormValue {
  id?: string;
  title: string;
  description?: string;
  thrustAreaId: string;
  uomType: UomType;
  uomLabel: string;
  target?: number | null;
  targetDate?: string | null;
  weightage: number;
  sharedFromId?: string | null;
}

interface GoalSheetEditorProps {
  cycleName: string;
  initialStatus: GoalSheetStatus;
  initialReturnReason: string | null;
  initialGoals: GoalFormValue[];
  thrustAreas: { id: string; name: string }[];
}

function makeEmptyGoal(): GoalFormValue {
  return {
    title: "",
    description: "",
    thrustAreaId: "",
    uomType: UomType.MIN,
    uomLabel: "",
    target: null,
    targetDate: null,
    weightage: 10,
    sharedFromId: null,
  };
}

// Drops the UI-only sharedFromId before sending to the server (the schema
// is the discriminated union — it doesn't accept that field) and ensures
// description "" becomes undefined since Zod treats both as optional.
function toServerPayload(values: { goals: GoalFormValue[] }) {
  return {
    goals: values.goals.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description?.length ? g.description : undefined,
      thrustAreaId: g.thrustAreaId,
      uomType: g.uomType,
      uomLabel: g.uomLabel,
      target: g.target ?? undefined,
      targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
      weightage: g.weightage,
    })),
  };
}

export function GoalSheetEditor({
  cycleName,
  initialStatus,
  initialReturnReason,
  initialGoals,
  thrustAreas,
}: GoalSheetEditorProps) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(initialStatus);
  const [submitOpen, setSubmitOpen] = useState(false);

  const form = useForm<{ goals: GoalFormValue[] }>({
    defaultValues: { goals: initialGoals },
    mode: "onBlur",
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "goals",
    keyName: "_rowId",
  });

  const watched = form.watch("goals") ?? [];
  const sum = watched.reduce(
    (s, g) => s + (Number.isFinite(g?.weightage) ? Number(g.weightage) : 0),
    0,
  );

  const editable =
    status === GoalSheetStatus.DRAFT || status === GoalSheetStatus.RETURNED;

  async function onSaveDraft() {
    start(async () => {
      const result = await saveSheet(toServerPayload(form.getValues()));
      if (result.ok) toast.success("Draft saved");
      else toast.error(result.error);
    });
  }

  function onSubmit() {
    if (sum !== 100) {
      toast.error("Total weightage must equal 100% before submitting");
      return;
    }
    if (fields.length === 0) {
      toast.error("Add at least one goal before submitting");
      return;
    }
    setSubmitOpen(true);
  }

  function confirmSubmit() {
    start(async () => {
      const result = await submitSheet(toServerPayload(form.getValues()));
      if (result.ok) {
        toast.success("Submitted for manager approval");
        setStatus(GoalSheetStatus.SUBMITTED);
        setSubmitOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function onAcknowledge() {
    start(async () => {
      const result = await acknowledgeReturn();
      if (result.ok) {
        toast.success("Sheet re-opened — go ahead and edit");
        setStatus(GoalSheetStatus.DRAFT);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <FormProvider {...form}>
      <div className="mx-auto max-w-4xl space-y-6 p-8">
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            {cycleName} · Goal sheet
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              Your goals
            </h1>
            <StatusPill status={status} />
          </div>
        </header>

        {status === GoalSheetStatus.RETURNED && (
          <ReturnBanner
            reason={initialReturnReason}
            onAcknowledge={onAcknowledge}
            pending={pending}
          />
        )}
        {status === GoalSheetStatus.SUBMITTED && <SubmittedBanner />}
        {status === GoalSheetStatus.APPROVED && <LockedBanner approved />}
        {status === GoalSheetStatus.LOCKED && <LockedBanner approved={false} />}

        <WeightageMeter sum={sum} goalCount={fields.length} status={status} />

        <fieldset disabled={!editable} className="contents">
          <div className="space-y-4">
            {fields.length === 0 ? (
              <EmptyGoalsState onAdd={() => append(makeEmptyGoal())} editable={editable} />
            ) : (
              fields.map((field, idx) => (
                <GoalRow
                  key={field._rowId}
                  index={idx}
                  thrustAreas={thrustAreas}
                  onRemove={() => remove(idx)}
                  isShared={!!field.sharedFromId}
                  editable={editable}
                />
              ))
            )}
          </div>
        </fieldset>

        {editable && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => append(makeEmptyGoal())}
              disabled={fields.length >= 8 || pending}
            >
              <Plus size={14} strokeWidth={1.75} />
              {fields.length === 0 ? "Add your first goal" : "Add another goal"}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onSaveDraft}
                disabled={pending}
              >
                Save draft
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={pending || sum !== 100 || fields.length === 0}
                title={
                  sum !== 100
                    ? "Total weightage must equal 100%"
                    : fields.length === 0
                      ? "Add at least one goal first"
                      : undefined
                }
              >
                <Send size={14} strokeWidth={1.75} />
                Submit for approval
              </Button>
            </div>
          </div>
        )}

        <SubmitSheetDialog
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          goalCount={fields.length}
          sum={sum}
          onConfirm={confirmSubmit}
          pending={pending}
        />
      </div>
    </FormProvider>
  );
}

function StatusPill({ status }: { status: GoalSheetStatus }) {
  const map: Record<GoalSheetStatus, { dot: string; label: string }> = {
    DRAFT:     { dot: "bg-text-muted",      label: "Draft" },
    SUBMITTED: { dot: "bg-info",            label: "Pending approval" },
    APPROVED:  { dot: "bg-status-on-track", label: "Approved" },
    RETURNED:  { dot: "bg-warning",         label: "Returned" },
    LOCKED:    { dot: "bg-status-on-track", label: "Approved & locked" },
  };
  const { dot, label } = map[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5 py-1">
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      <span className="text-xs font-medium text-text-secondary">{label}</span>
    </span>
  );
}

function ReturnBanner({
  reason,
  onAcknowledge,
  pending,
}: {
  reason: string | null;
  onAcknowledge: () => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <RotateCcw size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warning" />
        <div className="flex-1">
          <p className="text-sm font-medium text-text">Manager returned this sheet for rework</p>
          {reason && (
            <p className="mt-1.5 text-sm text-text-secondary">{reason}</p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onAcknowledge}
          disabled={pending}
        >
          Acknowledge &amp; re-edit
        </Button>
      </div>
    </div>
  );
}

function SubmittedBanner() {
  return (
    <div className="rounded-lg border border-info/30 bg-info/5 p-4">
      <div className="flex items-start gap-3">
        <Send size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-info" />
        <div>
          <p className="text-sm font-medium text-text">Pending manager approval</p>
          <p className="mt-1 text-xs text-text-secondary">
            Your manager can edit weightages and targets during review. You&apos;ll be notified once they approve or return for rework.
          </p>
        </div>
      </div>
    </div>
  );
}

function LockedBanner({ approved }: { approved: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-start gap-3">
        {approved ? (
          <CheckCircle2 size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-status-on-track" />
        ) : (
          <Lock size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-text-muted" />
        )}
        <div>
          <p className="text-sm font-medium text-text">
            {approved
              ? "Approved — sheet is locked"
              : "Sheet is locked"}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Edits now require an admin to unlock the sheet and will appear in the audit log.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyGoalsState({
  onAdd,
  editable,
}: {
  onAdd: () => void;
  editable: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        No goals yet
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-text">
        Build out your goal sheet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
        Add up to 8 goals across the org&apos;s thrust areas. Each goal needs
        a weightage; the total must equal 100% before you can submit.
      </p>
      {editable && (
        <Button onClick={onAdd} className="mt-6">
          <Plus size={14} strokeWidth={1.75} />
          Add your first goal
        </Button>
      )}
    </div>
  );
}
