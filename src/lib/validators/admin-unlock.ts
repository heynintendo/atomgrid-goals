import { z } from "zod";

export const unlockSheetSchema = z.object({
  sheetId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason must be at most 500 characters"),
});

export type UnlockSheetInput = z.infer<typeof unlockSheetSchema>;
