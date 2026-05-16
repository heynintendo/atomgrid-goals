import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, ClipboardCheck, Clock, Lock } from "lucide-react";
import { CheckInPeriod } from "@prisma/client";
import { cn } from "@/lib/utils";

export type CardState = "past" | "active" | "pending";

export interface PeriodCard {
  period: CheckInPeriod;
  label: string;
  opensAt: Date;
  closesAt: Date;
  state: CardState;
  completed: number;
  total: number;
}

interface CheckInsIndexProps {
  cards: PeriodCard[];
  cycleName: string;
  sheetState: "missing" | "draft" | "submitted" | "approved";
}

export function CheckInsIndex({
  cards,
  cycleName,
  sheetState,
}: CheckInsIndexProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {cycleName} · Check-ins
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">
          Quarterly check-ins
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Log actuals against each approved goal once per quarter. The active
          period gets a primary action; past periods stay reviewable.
        </p>
      </header>

      {sheetState !== "approved" && <PreApprovalBanner state={sheetState} />}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <PeriodCardView
            key={card.period}
            card={card}
            disabled={sheetState !== "approved"}
          />
        ))}
      </div>
    </div>
  );
}

function PeriodCardView({
  card,
  disabled,
}: {
  card: PeriodCard;
  disabled: boolean;
}) {
  const { period, label, opensAt, closesAt, state, completed, total } = card;

  const stateLabel =
    state === "active" ? "Active window" : state === "past" ? "Closed" : "Pending";
  const stateDot =
    state === "active"
      ? "bg-status-on-track"
      : state === "past"
        ? "bg-text-muted"
        : "bg-warning";

  const StateIcon =
    state === "active" ? ClipboardCheck : state === "past" ? Lock : Clock;

  const ctaLabel =
    disabled
      ? "Approve your sheet first"
      : state === "active"
        ? "Open check-in"
        : state === "past"
          ? "Review submitted"
          : "Preview the form";

  return (
    <Link
      href={disabled ? "/employee/goal-sheet" : `/employee/check-in/${period}`}
      aria-disabled={disabled}
      className={cn(
        "group rounded-lg border border-border bg-surface-1 p-5 transition-colors duration-[120ms] ease-[var(--ease-brand)]",
        "hover:border-border-hover hover:bg-surface-hover",
        state === "active" && !disabled && "ring-1 ring-brand/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-sm",
              state === "active"
                ? "bg-brand/10"
                : state === "past"
                  ? "bg-surface-2"
                  : "bg-warning/10",
            )}
          >
            <StateIcon
              size={16}
              strokeWidth={1.75}
              className={cn(
                state === "active"
                  ? "text-brand"
                  : state === "past"
                    ? "text-text-muted"
                    : "text-warning",
              )}
            />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-text">
              {label}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-text-muted">
              {format(opensAt, "d MMM")} → {format(closesAt, "d MMM yyyy")}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
          <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", stateDot)} />
          <span className="text-xs font-medium text-text-secondary">
            {stateLabel}
          </span>
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="font-mono text-xs text-text-muted tabular-nums">
          {completed}/{total} goals logged
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            state === "active" && !disabled ? "text-brand" : "text-text-muted",
          )}
        >
          {ctaLabel}
          <ArrowRight
            size={12}
            strokeWidth={1.75}
            className="transition-transform duration-[120ms] group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

function PreApprovalBanner({
  state,
}: {
  state: "missing" | "draft" | "submitted";
}) {
  const copy = {
    missing: {
      title: "No goal sheet for this cycle yet",
      body: "Create and submit your goal sheet first — check-ins open once a manager approves it.",
      cta: "Create your sheet",
    },
    draft: {
      title: "Submit your goal sheet to unlock check-ins",
      body: "Your sheet is still a draft. Once you submit and your manager approves, check-ins start opening at each quarterly window.",
      cta: "Open my sheet",
    },
    submitted: {
      title: "Awaiting manager approval",
      body: "Your sheet is in your manager's queue. Check-ins activate as soon as it's approved.",
      cta: "View my sheet",
    },
  }[state];

  return (
    <div className="rounded-lg border border-info/30 bg-info/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Clock size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-info" />
          <div>
            <p className="text-sm font-medium text-text">{copy.title}</p>
            <p className="mt-1 text-xs text-text-secondary">{copy.body}</p>
          </div>
        </div>
        <Link
          href="/employee/goal-sheet"
          className="shrink-0 self-center text-xs font-medium text-text-secondary underline-offset-2 hover:underline"
        >
          {copy.cta} →
        </Link>
      </div>
    </div>
  );
}
