import { z } from "zod";
import { UomType } from "@prisma/client";

// Goal input schema — discriminated by uomType so each variant carries
// only the fields it actually needs.  Used by both the client form
// (zodResolver) and every server action top-level safeParse.

const baseFields = {
  id: z.string().min(1).optional(), // present for update, absent for insert
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be at most 120 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  thrustAreaId: z.string().min(1, "Pick a thrust area"),
  uomLabel: z
    .string()
    .trim()
    .min(1, "Unit label is required")
    .max(40, "Unit label is too long"),
  weightage: z
    .number({ message: "Weightage is required" })
    .int("Weightage must be a whole number")
    .min(10, "Min 10% per goal")
    .max(100, "Max 100% per goal"),
};

const minGoal = z.object({
  ...baseFields,
  uomType: z.literal(UomType.MIN),
  target: z.coerce
    .number({ message: "Target is required" })
    .positive("Target must be positive"),
  targetDate: z.null().optional(),
});

const maxGoal = z.object({
  ...baseFields,
  uomType: z.literal(UomType.MAX),
  target: z.coerce
    .number({ message: "Target is required" })
    .positive("Target must be positive"),
  targetDate: z.null().optional(),
});

const timelineGoal = z.object({
  ...baseFields,
  uomType: z.literal(UomType.TIMELINE),
  target: z.null().optional(),
  targetDate: z.coerce.date({ message: "Deadline is required" }),
});

const zeroGoal = z.object({
  ...baseFields,
  uomType: z.literal(UomType.ZERO),
  target: z.null().optional(),
  targetDate: z.null().optional(),
});

export const goalInputSchema = z.discriminatedUnion("uomType", [
  minGoal,
  maxGoal,
  timelineGoal,
  zeroGoal,
]);

export type GoalInput = z.infer<typeof goalInputSchema>;

// Saving a draft: any number of goals 0..8, weightage sum can be anything.
export const saveSheetInputSchema = z.object({
  goals: z
    .array(goalInputSchema)
    .max(8, "Maximum 8 goals per sheet"),
});

export type SaveSheetInput = z.infer<typeof saveSheetInputSchema>;

// Submitting for approval: strict BRD rules.
export const submitSheetInputSchema = z
  .object({
    goals: z
      .array(goalInputSchema)
      .min(1, "Add at least one goal before submitting")
      .max(8, "Maximum 8 goals per sheet"),
  })
  .refine(
    (data) => data.goals.reduce((sum, g) => sum + g.weightage, 0) === 100,
    {
      message: "Total weightage across all goals must equal exactly 100%",
      path: ["goals"],
    },
  );

export type SubmitSheetInput = z.infer<typeof submitSheetInputSchema>;
