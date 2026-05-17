import type { CheckInPeriod, EscalationLevel, EscalationStatus } from "@prisma/client";

// Shared shapes + label maps used by both the server-only engine
// (lib/escalations.ts) and the client-rendered table component.
// Kept in its own module so the client bundle doesn't pull in
// `server-only`, which throws when imported anywhere other than a
// Server Component.

export interface EscalationRow {
  id:              string;
  employeeId:      string;
  employeeName:    string;
  employeeEmail:   string;
  managerName:     string | null;
  period:          CheckInPeriod | null;
  currentLevel:    EscalationLevel;
  status:          EscalationStatus;
  reason:          string | null;
  triggeredAt:     Date;
  resolvedAt:      Date | null;
  daysOutstanding: number;
}

// Human label mapping for the table.  EMPLOYEE/HR/EXECUTIVE are
// scaffolded levels not produced by the engine in this hackathon; they
// still get readable labels so legacy or future rows render cleanly.
export const ESCALATION_LEVEL_LABEL: Record<EscalationLevel, string> = {
  EMPLOYEE:   "Employee reminder",
  MANAGER:    "Manager notified",
  SKIP_LEVEL: "Skip-level escalation",
  HR:         "HR notified",
  EXECUTIVE:  "Executive notified",
};

export const ESCALATION_STATUS_LABEL: Record<EscalationStatus, string> = {
  ACTIVE:    "Active",
  RESOLVED:  "Resolved",
  DISMISSED: "Dismissed",
};
