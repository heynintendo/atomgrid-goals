import { z } from "zod";
import { CheckInPeriod, GoalStatus } from "@prisma/client";

// One entry per goal in the current sheet for the given period.  Different
// UoM types use different fields — the action looks them up on the goal
// row, not in the input.  Optional fields let the user save partial drafts.
export const checkInEntrySchema = z.object({
  goalId: z.string().min(1),
  actual: z.union([z.number(), z.null()]).optional(),
  actualDate: z.union([z.string(), z.null()]).optional(),
  zeroAchieved: z.union([z.boolean(), z.null()]).optional(),
  employeeStatus: z.nativeEnum(GoalStatus),
});

export const saveCheckInSchema = z.object({
  period: z.nativeEnum(CheckInPeriod),
  entries: z.array(checkInEntrySchema).min(1, "Nothing to save"),
});

export type CheckInEntryInput = z.infer<typeof checkInEntrySchema>;
export type SaveCheckInInput = z.infer<typeof saveCheckInSchema>;
