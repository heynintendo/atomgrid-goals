"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Calendar, ClipboardCheck, Clock, Lock, Save, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  CheckInPeriod,
  GoalStatus,
  UomType,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScorePill } from "@/components/score-pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveCheckIn } from "@/lib/actions/check-ins";
import { computeScore, type ScoreBand } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export type WindowState = "pre" | "active" | "past";

export interface CheckInGoal {
  id: string;
  title: string;
  description: string | null;
  uomType: UomType;
  uomLabel: string;
  target: number | null;
  targetDate: string | null;
  weightage: number;
  sharedFromId: string | null;
  existing: {
    actual: number | null;
    actualDate: string | null;
    zeroAchieved: boolean | null;
    employeeStatus: GoalStatus;
    managerComment: string | null;
  };
}

interface CheckInFormProps {
  period: CheckInPeriod;
  periodLabel: string;
  windowOpensAt: string;
  windowClosesAt: string;
  windowState: WindowState;
  isAdmin: boolean;
  goals: CheckInGoal[];
}

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: GoalStatus.NOT_STARTED, label: "Not started" },
  { value: GoalStatus.ON_TRACK,    label: "On track" },
  { value: GoalStatus.COMPLETED,   label: "Completed" },
];

interface FormShape {
  entries: {
    goalId: string;
    actual: number | null;
    actualDate: string | null;
    zeroAchieved: boolean | null;
    employeeStatus: GoalStatus;
  }[];
}

export function CheckInForm({
  period,
  periodLabel,
  windowOpensAt,
  windowClosesAt,
  windowState,
  isAdmin,
  goals,
}: CheckInFormProps) {
  const [pending, start] = useTransition();
  const editable = windowState === "active";
  const opensAt = new Date(windowOpensAt);
  const closesAt = new Date(windowClosesAt);

  const form = useForm<FormShape>({
    defaultValues: {
      entries: goals.map((g) => ({
        goalId: g.id,
        actual: g.existing.actual,
        actualDate: g.existing.actualDate,
        zeroAchieved: g.existing.zeroAchieved,
        employeeStatus: g.existing.employeeStatus,
      })),
    },
    mode: "onChange",
  });

  const watched = form.watch("entries") ?? [];
  const isDirty = form.formState.isDirty;

  // Browser-native confirm dialog when the user navigates away with
  // unsaved edits in flight.  Doesn't fire when programmatic navigation
  // happens after a successful save (form.reset clears isDirty).
  useEffect(() => {
    if (!isDirty || !editable) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, editable]);

  function onSave() {
    start(async () => {
      const r = await saveCheckIn({
        period,
        entries: watched.map((e) => ({
          goalId: e.goalId,
          actual: e.actual ?? null,
          actualDate: e.actualDate ?? null,
          zeroAchieved: e.zeroAchieved ?? null,
          employeeStatus: e.employeeStatus,
        })),
      });
      if (r.ok) {
        toast.success(`${periodLabel} check-in saved`);
        form.reset(form.getValues(), { keepValues: true });
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Check-in · {periodLabel}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Log your {period} actuals
          </h1>
          <WindowPill
            state={windowState}
            opensAt={opensAt}
            closesAt={closesAt}
          />
        </div>
      </header>

      <WindowBanner
        state={windowState}
        opensAt={opensAt}
        closesAt={closesAt}
        period={period}
        periodLabel={periodLabel}
        isAdmin={isAdmin}
      />

      <fieldset disabled={!editable} className="contents">
        <div className="space-y-4">
          {goals.map((goal, idx) => {
            const entry = watched[idx];
            return (
              <CheckInGoalRow
                key={goal.id}
                index={idx}
                goal={goal}
                entry={entry}
                editable={editable}
                register={form.register}
                setValue={form.setValue}
                watch={form.watch}
              />
            );
          })}
        </div>
      </fieldset>

      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="text-xs text-text-muted">
            {isDirty
              ? "Unsaved changes — leaving this page will prompt."
              : "All entries saved."}
          </p>
          <Button
            type="button"
            onClick={onSave}
            disabled={pending || !isDirty}
          >
            <Save size={14} strokeWidth={1.75} />
            {pending ? "Saving…" : "Save check-in"}
          </Button>
        </div>
      )}
    </div>
  );
}

function CheckInGoalRow({
  index,
  goal,
  entry,
  editable,
  register,
  setValue,
  watch,
}: {
  index: number;
  goal: CheckInGoal;
  entry: FormShape["entries"][number] | undefined;
  editable: boolean;
  register: ReturnType<typeof useForm<FormShape>>["register"];
  setValue: ReturnType<typeof useForm<FormShape>>["setValue"];
  watch: ReturnType<typeof useForm<FormShape>>["watch"];
}) {
  const isShared = !!goal.sharedFromId;
  // Shared copies have their actual driven by the source owner — disable
  // the input regardless of the window state.  Status + zeroAchieved
  // still belong to the recipient.
  const actualDisabled = !editable || isShared;

  // Live score preview: compute from current entry values, only if all
  // required fields are present.  Falls back to "Pending" if not.
  const preview = entry ? buildPreview(goal, entry) : null;

  return (
    <article className="space-y-4 rounded-lg border border-border bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-surface-2 font-mono text-[10px] font-medium text-text-secondary">
            {index + 1}
          </span>
          {isShared && (
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
              <Share2 size={10} strokeWidth={1.75} className="text-info" />
              <span className="text-xs text-text-secondary">
                Shared — actual syncs from the primary owner
              </span>
            </span>
          )}
        </div>
        {preview && <ScorePill display={preview.display} band={preview.band} />}
      </div>

      <div className="space-y-1">
        {/* h2 — each goal article is a top-level section under the
            page's H1.  Was H3 which triggered an axe-core heading-
            order skip warning (H1 → H3 with no H2 between). */}
        <h2 className="text-base font-semibold text-text">{goal.title}</h2>
        {goal.description && (
          <p className="text-sm text-text-secondary">{goal.description}</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-3">
        <Meta label="UoM">
          <span className="font-mono">{goal.uomType}</span>
        </Meta>
        {goal.uomType === "TIMELINE" ? (
          <Meta label="Deadline">
            <span className="font-mono">
              {goal.targetDate ? format(new Date(goal.targetDate), "d MMM yyyy") : "—"}
            </span>
          </Meta>
        ) : goal.uomType === "ZERO" ? (
          <Meta label="Target">
            <span className="font-mono">0 {goal.uomLabel}</span>
          </Meta>
        ) : (
          <Meta label="Target">
            <span className="font-mono tabular-nums">
              {goal.target?.toLocaleString("en-IN") ?? "—"} {goal.uomLabel}
            </span>
          </Meta>
        )}
        <Meta label="Weightage">
          <span className="font-mono">{goal.weightage}%</span>
        </Meta>
      </dl>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Actual input — discriminated by UoM */}
        {goal.uomType === "MIN" || goal.uomType === "MAX" ? (
          <div className="space-y-2 md:col-span-7">
            <Label htmlFor={`actual-${index}`}>
              Actual{" "}
              <span className="normal-case text-text-placeholder">
                ({goal.uomLabel})
              </span>
            </Label>
            <Input
              id={`actual-${index}`}
              type="number"
              inputMode="decimal"
              step="any"
              {...register(`entries.${index}.actual`, { valueAsNumber: true })}
              disabled={actualDisabled}
              placeholder="Enter the actual value"
            />
          </div>
        ) : goal.uomType === "TIMELINE" ? (
          <div className="space-y-2 md:col-span-7">
            <Label htmlFor={`actualDate-${index}`}>Date achieved</Label>
            <Input
              id={`actualDate-${index}`}
              type="date"
              {...register(`entries.${index}.actualDate`)}
              disabled={actualDisabled}
            />
          </div>
        ) : (
          <div className="space-y-2 md:col-span-7">
            <Label>Outcome</Label>
            <ZeroToggle
              value={watch(`entries.${index}.zeroAchieved`)}
              onChange={(v) =>
                setValue(`entries.${index}.zeroAchieved`, v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              disabled={actualDisabled}
              uomLabel={goal.uomLabel}
            />
          </div>
        )}

        <div className="space-y-2 md:col-span-5">
          <Label htmlFor={`status-${index}`}>Status</Label>
          <Select
            value={watch(`entries.${index}.employeeStatus`)}
            onValueChange={(v) =>
              setValue(
                `entries.${index}.employeeStatus`,
                v as GoalStatus,
                { shouldDirty: true, shouldValidate: true },
              )
            }
            disabled={!editable}
          >
            <SelectTrigger id={`status-${index}`}>
              <SelectValue placeholder="Pick a status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {goal.existing.managerComment && (
        <div className="rounded-sm border border-border bg-surface-2 px-3 py-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
            Manager comment
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {goal.existing.managerComment}
          </p>
        </div>
      )}
    </article>
  );
}

function ZeroToggle({
  value,
  onChange,
  disabled,
  uomLabel,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
  disabled: boolean;
  uomLabel: string;
}) {
  return (
    <div className="flex gap-2">
      <ToggleOption
        label={`0 ${uomLabel}`}
        sub="Achieved"
        active={value === true}
        disabled={disabled}
        onClick={() => onChange(true)}
      />
      <ToggleOption
        label={`> 0 ${uomLabel}`}
        sub="Missed"
        active={value === false}
        disabled={disabled}
        onClick={() => onChange(false)}
      />
    </div>
  );
}

function ToggleOption({
  label,
  sub,
  active,
  disabled,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 rounded-sm border px-3 py-2 text-left transition-colors duration-[120ms]",
        active
          ? "border-brand bg-brand/5"
          : "border-border bg-surface-1 hover:border-border-hover",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="block text-sm font-medium text-text">{label}</span>
      <span
        className={cn(
          "block text-xs",
          active ? "text-brand-navy" : "text-text-muted",
        )}
      >
        {sub}
      </span>
    </button>
  );
}

function buildPreview(
  goal: CheckInGoal,
  entry: FormShape["entries"][number],
): { display: string; band: ScoreBand } | null {
  switch (goal.uomType) {
    case "MIN":
    case "MAX":
      if (goal.target == null || entry.actual == null) return null;
      return summary(
        computeScore({
          uomType: goal.uomType,
          target: goal.target,
          actual: entry.actual,
        }),
      );
    case "TIMELINE":
      if (!goal.targetDate || !entry.actualDate) return null;
      return summary(
        computeScore({
          uomType: "TIMELINE",
          targetDate: new Date(goal.targetDate),
          actualDate: new Date(entry.actualDate),
        }),
      );
    case "ZERO":
      if (entry.zeroAchieved == null) return null;
      return summary(
        computeScore({ uomType: "ZERO", achieved: entry.zeroAchieved }),
      );
  }
}

function summary(r: { display: string; banded: ScoreBand }) {
  return { display: r.display, band: r.banded };
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
      <dd className="text-text">{children}</dd>
    </div>
  );
}

function WindowPill({
  state,
  opensAt,
  closesAt,
}: {
  state: WindowState;
  opensAt: Date;
  closesAt: Date;
}) {
  const map = {
    active: { dot: "bg-status-on-track", label: "Active window" },
    pre:    { dot: "bg-warning",         label: "Opens later" },
    past:   { dot: "bg-text-muted",      label: "Closed" },
  } as const;
  const { dot, label } = map[state];
  return (
    <span className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5 py-1">
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      <span className="text-xs font-medium text-text-secondary">
        {label} · <span className="font-mono">{format(opensAt, "d MMM")}</span> →{" "}
        <span className="font-mono">{format(closesAt, "d MMM yyyy")}</span>
      </span>
    </span>
  );
}

function WindowBanner({
  state,
  opensAt,
  closesAt,
  period,
  periodLabel,
  isAdmin,
}: {
  state: WindowState;
  opensAt: Date;
  closesAt: Date;
  period: CheckInPeriod;
  periodLabel: string;
  isAdmin: boolean;
}) {
  if (state === "active") return null;

  if (state === "pre") {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
        <div className="flex items-start gap-3">
          <Clock size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text">
              {periodLabel} window opens {format(opensAt, "d MMM yyyy")}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              The form below is read-only until then.
              {isAdmin
                ? " You can jump there via /admin/time-travel to demo the active state."
                : " Admins can time-travel the system clock to test it now."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // past
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-start gap-3">
        <Lock size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-text-muted" />
        <div>
          <p className="text-sm font-medium text-text">
            {periodLabel} check-in closed {format(closesAt, "d MMM yyyy")} · review only
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Submitted actuals stay visible below. New edits go through{" "}
            <span className="font-mono">/admin/unlock</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
