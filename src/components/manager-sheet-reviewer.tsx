"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Check, RotateCcw, Share2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { GoalSheetStatus, UomType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReturnSheetDialog } from "@/components/return-sheet-dialog";
import { WeightageMeter } from "@/components/weightage-meter";
import { approveSheet, returnSheet } from "@/lib/actions/approvals";
import { cn } from "@/lib/utils";

const UOM_LABEL: Record<UomType, string> = {
  MIN: "Higher is better",
  MAX: "Lower is better",
  TIMELINE: "Date-based",
  ZERO: "Zero = success",
};

export interface ReviewerGoal {
  id: string;
  title: string;
  description: string | null;
  thrustAreaName: string;
  uomType: UomType;
  uomLabel: string;
  target: number | null;
  targetDate: string | null;
  weightage: number;
  sharedFromId: string | null;
}

interface ManagerSheetReviewerProps {
  sheetId: string;
  employee: { name: string; email: string; department: string | null };
  submittedAt: Date | null;
  goals: ReviewerGoal[];
}

interface EditFormShape {
  edits: {
    id: string;
    target: number | null;
    targetDate: string | null;
    weightage: number;
    sharedFromId: string | null;
  }[];
}

export function ManagerSheetReviewer({
  sheetId,
  employee,
  submittedAt,
  goals,
}: ManagerSheetReviewerProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [returnOpen, setReturnOpen] = useState(false);

  const form = useForm<EditFormShape>({
    defaultValues: {
      edits: goals.map((g) => ({
        id: g.id,
        target: g.target,
        targetDate: g.targetDate,
        weightage: g.weightage,
        sharedFromId: g.sharedFromId,
      })),
    },
    mode: "onBlur",
  });

  const watched = form.watch("edits") ?? [];
  const sum = watched.reduce(
    (s, e) => s + (Number.isFinite(e?.weightage) ? Number(e.weightage) : 0),
    0,
  );

  function buildPayload() {
    return {
      sheetId,
      edits: watched.map((e, idx) => {
        const original = goals[idx];
        return {
          id: e.id,
          target: original.uomType === UomType.TIMELINE ? null : e.target,
          targetDate: original.uomType === UomType.TIMELINE ? e.targetDate : null,
          weightage: Number(e.weightage),
        };
      }),
    };
  }

  function onApprove() {
    if (sum !== 100) {
      toast.error(`Sum is ${sum}% — adjust to 100% before approving`);
      return;
    }
    start(async () => {
      const result = await approveSheet(buildPayload());
      if (result.ok) {
        toast.success(
          `Sheet approved — ${employee.name} now sees the locked state`,
        );
        router.push("/manager/approvals");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onReturn(reason: string) {
    start(async () => {
      const result = await returnSheet({ ...buildPayload(), reason });
      if (result.ok) {
        toast.success(`Returned to ${employee.name} with your feedback`);
        setReturnOpen(false);
        router.push("/manager/approvals");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Approval review · {employee.department ?? "—"}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              {employee.name}
            </h1>
            <p className="mt-1 text-xs text-text-muted">{employee.email}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5 py-1">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-info" />
            <span className="text-xs font-medium text-text-secondary">
              Submitted
              {submittedAt
                ? ` · ${format(submittedAt, "d MMM yyyy")}`
                : ""}
            </span>
          </span>
        </div>
      </header>

      <WeightageMeter
        sum={sum}
        goalCount={goals.length}
        status={GoalSheetStatus.SUBMITTED}
      />

      <div className="space-y-4">
        {goals.map((g, idx) => (
          <ReviewGoalCard
            key={g.id}
            index={idx}
            goal={g}
            register={form.register}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-6">
        <Button
          type="button"
          variant="destructive"
          onClick={() => setReturnOpen(true)}
          disabled={pending}
        >
          <RotateCcw size={14} strokeWidth={1.75} />
          Return for rework
        </Button>
        <Button
          type="button"
          onClick={onApprove}
          disabled={pending || sum !== 100}
          title={sum !== 100 ? `Sum is ${sum}% — must be 100%` : undefined}
        >
          <Check size={14} strokeWidth={1.75} />
          {pending ? "Working…" : "Approve & lock"}
        </Button>
      </div>

      <ReturnSheetDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        onConfirm={onReturn}
        pending={pending}
        employeeName={employee.name}
      />
    </div>
  );
}

interface ReviewGoalCardProps {
  index: number;
  goal: ReviewerGoal;
  register: ReturnType<typeof useForm<EditFormShape>>["register"];
}

function ReviewGoalCard({ index, goal, register }: ReviewGoalCardProps) {
  const isShared = !!goal.sharedFromId;
  const isTimeline = goal.uomType === UomType.TIMELINE;
  const isZero = goal.uomType === UomType.ZERO;

  return (
    <article className="space-y-4 rounded-lg border border-border bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-surface-2 font-mono text-[10px] font-medium text-text-secondary">
            {index + 1}
          </span>
          {isShared && (
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
              <Share2 size={10} strokeWidth={1.75} className="text-info" />
              <span className="text-xs text-text-secondary">
                Shared — target is read-only
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {/* h2 per goal — matches check-in-form's heading rank so the
            page hierarchy stays consistent: page H1 → goal H2. */}
        <h2 className="text-base font-semibold text-text">{goal.title}</h2>
        {goal.description && (
          <p className="text-sm text-text-secondary">{goal.description}</p>
        )}
      </div>

      {/* Read-only meta */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-3">
        <Meta label="Thrust">{goal.thrustAreaName}</Meta>
        <Meta label="UoM">
          <span className="font-mono">{goal.uomType}</span> ·{" "}
          {UOM_LABEL[goal.uomType]}
        </Meta>
        <Meta label="Unit">{goal.uomLabel}</Meta>
      </dl>

      {/* Editable target + weightage */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {isTimeline ? (
          <div className="space-y-2 md:col-span-7">
            <Label htmlFor={`target-${index}`}>Deadline</Label>
            <Input
              id={`target-${index}`}
              type="date"
              {...register(`edits.${index}.targetDate`)}
              disabled={isShared}
            />
          </div>
        ) : isZero ? (
          <div className="md:col-span-7">
            <p className="rounded-sm border border-dashed border-border bg-surface-2 px-3 py-2 text-xs text-text-muted">
              Zero-success goal — score is 100% if actual is 0, else 0%.
            </p>
          </div>
        ) : (
          <div className="space-y-2 md:col-span-7">
            <Label htmlFor={`target-${index}`}>
              Target value{" "}
              <span className="normal-case text-text-placeholder">
                ({goal.uomLabel})
              </span>
            </Label>
            <Input
              id={`target-${index}`}
              type="number"
              inputMode="decimal"
              step="any"
              {...register(`edits.${index}.target`, { valueAsNumber: true })}
              disabled={isShared}
            />
            {isShared && (
              <p className="text-xs text-text-muted">
                Inherited from the source goal — can&apos;t be changed here.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2 md:col-span-5">
          <Label htmlFor={`weight-${index}`}>Weightage (%)</Label>
          <Input
            id={`weight-${index}`}
            type="number"
            inputMode="numeric"
            min={10}
            max={100}
            step={1}
            {...register(`edits.${index}.weightage`, { valueAsNumber: true })}
          />
        </div>
      </div>
    </article>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="font-mono uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className={cn("text-text")}>{children}</dd>
    </div>
  );
}
