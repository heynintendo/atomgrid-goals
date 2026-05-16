"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeTravelResetButton } from "@/components/time-travel-reset-button";
import { setSystemDate } from "@/lib/actions/system-date";
import { cn } from "@/lib/utils";

interface CycleProp {
  name: string;
  startDate: string;
  endDate: string;
  goalSettingOpensAt: string;
  q1OpensAt: string;
  q2OpensAt: string;
  q3OpensAt: string;
  annualOpensAt: string;
}

interface TimeTravelEditorProps {
  systemDateISO: string | null;
  realNowISO: string;
  cycle: CycleProp;
}

interface PhaseWindow {
  phase: string;
  label: string;
  startsAt: Date;
  endsAt: Date;
  checkInRoute: string | null;
}

function toYmd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function TimeTravelEditor({
  systemDateISO,
  realNowISO,
  cycle,
}: TimeTravelEditorProps) {
  const [pending, start] = useTransition();
  const systemDate = systemDateISO ? new Date(systemDateISO) : null;
  const realNow = new Date(realNowISO);

  const [pickerValue, setPickerValue] = useState<string>(
    toYmd(systemDate ?? realNow),
  );

  const isTraveled = systemDate !== null;
  // Picker is YYYY-MM-DD → parse as UTC midnight so window comparisons stay
  // timezone-agnostic in the demo.
  const effectiveDate = new Date(`${pickerValue}T00:00:00Z`);

  const windows: PhaseWindow[] = [
    {
      phase: "GOAL_SETTING",
      label: "Goal Setting",
      startsAt: new Date(cycle.goalSettingOpensAt),
      endsAt: new Date(cycle.q1OpensAt),
      checkInRoute: null,
    },
    {
      phase: "Q1",
      label: "Q1 Check-in",
      startsAt: new Date(cycle.q1OpensAt),
      endsAt: new Date(cycle.q2OpensAt),
      checkInRoute: "/employee/check-in/Q1",
    },
    {
      phase: "Q2",
      label: "Q2 Check-in",
      startsAt: new Date(cycle.q2OpensAt),
      endsAt: new Date(cycle.q3OpensAt),
      checkInRoute: "/employee/check-in/Q2",
    },
    {
      phase: "Q3",
      label: "Q3 Check-in",
      startsAt: new Date(cycle.q3OpensAt),
      endsAt: new Date(cycle.annualOpensAt),
      checkInRoute: "/employee/check-in/Q3",
    },
    {
      phase: "ANNUAL",
      label: "Annual / Q4",
      startsAt: new Date(cycle.annualOpensAt),
      endsAt: new Date(cycle.endDate),
      checkInRoute: "/employee/check-in/ANNUAL",
    },
  ];

  function onApply() {
    start(async () => {
      const r = await setSystemDate({ date: pickerValue });
      if (r.ok) {
        toast.success(
          `Time-travelled to ${format(new Date(`${pickerValue}T00:00:00Z`), "d MMM yyyy")}`,
        );
      } else {
        toast.error(r.error);
      }
    });
  }

  function preset(date: Date) {
    setPickerValue(toYmd(date));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Admin · Governance
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">
          Time-travel
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Override the system clock to demo cycle windows. Every check-in
          guard, score window, and dashboard read across the app calls{" "}
          <code className="font-mono text-text">getSystemDate()</code> — this
          is the single dial that drives all of them.
        </p>
      </header>

      {/* Current state card */}
      <div className="rounded-lg border border-border bg-surface-1 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-sm",
                isTraveled ? "bg-warning/10" : "bg-status-on-track/10",
              )}
            >
              {isTraveled ? (
                <Clock
                  size={16}
                  strokeWidth={1.75}
                  className="text-warning"
                />
              ) : (
                <Calendar
                  size={16}
                  strokeWidth={1.75}
                  className="text-status-on-track"
                />
              )}
            </span>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                System clock
              </p>
              <p className="text-base font-medium text-text">
                {isTraveled ? "Time-travel" : "Live"} ·{" "}
                <span className="font-mono">
                  {format(systemDate ?? realNow, "d MMM yyyy")}
                </span>
              </p>
            </div>
          </div>
          {isTraveled && <TimeTravelResetButton />}
        </div>
      </div>

      {/* Set custom date */}
      <div className="space-y-4 rounded-lg border border-border bg-surface-1 p-5">
        <div>
          <h2 className="text-base font-semibold text-text">
            Set a custom date
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            All cycle-window logic reads from this date until you reset.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="travel-date">Date</Label>
            <Input
              id="travel-date"
              type="date"
              value={pickerValue}
              onChange={(e) => setPickerValue(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={onApply} disabled={pending}>
            <Clock size={14} strokeWidth={1.75} />
            {pending ? "Travelling…" : "Travel"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="mr-2 font-mono text-xs uppercase tracking-wider text-text-muted">
            Quick jumps:
          </span>
          {[
            { label: "Goal Setting", date: new Date(cycle.goalSettingOpensAt) },
            { label: "Q1", date: new Date(cycle.q1OpensAt) },
            { label: "Q2", date: new Date(cycle.q2OpensAt) },
            { label: "Q3", date: new Date(cycle.q3OpensAt) },
            { label: "Annual", date: new Date(cycle.annualOpensAt) },
          ].map((p) => (
            <Button
              key={p.label}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => preset(p.date)}
            >
              <span>{p.label}</span>
              <span className="font-mono text-xs text-text-muted">
                {format(p.date, "d MMM")}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Window preview */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-text">
            Window preview · {cycle.name}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Status reflects the date currently in the picker (
            <span className="font-mono">
              {format(effectiveDate, "d MMM yyyy")}
            </span>
            ).
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phase</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Check-in route</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {windows.map((w) => {
              const status: "past" | "active" | "pending" =
                effectiveDate >= w.endsAt
                  ? "past"
                  : effectiveDate >= w.startsAt
                    ? "active"
                    : "pending";
              return (
                <TableRow key={w.phase}>
                  <TableCell>
                    <span className="font-medium text-text">{w.label}</span>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    <span className="font-mono">
                      {format(w.startsAt, "d MMM")} →{" "}
                      {format(w.endsAt, "d MMM yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-text-muted">
                      {w.checkInRoute ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <PhaseStatusPill state={status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PhaseStatusPill({
  state,
}: {
  state: "past" | "active" | "pending";
}) {
  const MAP = {
    past:    { dot: "bg-text-muted",      label: "Past" },
    active:  { dot: "bg-status-on-track", label: "Active" },
    pending: { dot: "bg-warning",         label: "Pending" },
  } as const;
  const { dot, label } = MAP[state];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-2 py-0.5">
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      <span className="text-xs text-text-secondary">{label}</span>
    </span>
  );
}
