import "server-only";

import { cache } from "react";
import { CyclePhase } from "@prisma/client";
import { prisma } from "@/lib/db";

// Single source of truth for "what does the app think today is?".  Every
// cycle-window check across the app should call getSystemDate() rather
// than `new Date()`.  React `cache()` memoises per request, so multiple
// callers in the same request share a single DB read.
export const getSystemDate = cache(async (): Promise<Date> => {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 1 },
  });
  return settings?.systemDate ?? new Date();
});

// Convenience for UI surfaces (header pill, banner, time-travel editor)
// that need to know whether the system clock is real-now or overridden.
export const getSystemDateState = cache(
  async (): Promise<{ date: Date; isTraveled: boolean; realNow: Date }> => {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 1 },
    });
    const traveled = settings?.systemDate ?? null;
    const realNow = new Date();
    return {
      date: traveled ?? realNow,
      isTraveled: traveled !== null,
      realNow,
    };
  },
);

// Pure phase classifier — given the cycle's five window dates and an
// effective date, returns the active phase.  Used by the time-travel
// preview table and by the check-in window guards in H10.
export function phaseForDate(
  date: Date,
  cycle: {
    goalSettingOpensAt: Date;
    q1OpensAt: Date;
    q2OpensAt: Date;
    q3OpensAt: Date;
    annualOpensAt: Date;
    endDate: Date;
  },
): CyclePhase {
  if (date >= cycle.endDate) return CyclePhase.CLOSED;
  if (date >= cycle.annualOpensAt) return CyclePhase.ANNUAL;
  if (date >= cycle.q3OpensAt) return CyclePhase.Q3;
  if (date >= cycle.q2OpensAt) return CyclePhase.Q2;
  if (date >= cycle.q1OpensAt) return CyclePhase.Q1;
  return CyclePhase.GOAL_SETTING;
}
