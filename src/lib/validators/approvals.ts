import { z } from "zod";

// Manager-only inline edits applied during the approve/return action.
// Manager can change a goal's target (number for MIN/MAX, date for TIMELINE,
// none for ZERO) and weightage.  Title/UoM/thrust are never editable here —
// those belong to the employee's draft.
//
// For shared-copy goals the source goal owns the target, so the server
// drops any target edit and only honours the weightage change.
export const managerGoalEditSchema = z.object({
  id: z.string().min(1),
  target: z.number().nullable().optional(),
  targetDate: z
    .union([z.string(), z.date()])
    .optional()
    .nullable(),
  weightage: z
    .number({ message: "Weightage required" })
    .int("Whole numbers only")
    .min(10, "Min 10%")
    .max(100, "Max 100%"),
});

export const approveSheetInputSchema = z.object({
  sheetId: z.string().min(1),
  edits: z.array(managerGoalEditSchema),
});

export const returnSheetInputSchema = approveSheetInputSchema.extend({
  reason: z
    .string()
    .trim()
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason must be at most 500 characters"),
});

export type ManagerGoalEdit = z.infer<typeof managerGoalEditSchema>;
export type ApproveSheetInput = z.infer<typeof approveSheetInputSchema>;
export type ReturnSheetInput = z.infer<typeof returnSheetInputSchema>;
