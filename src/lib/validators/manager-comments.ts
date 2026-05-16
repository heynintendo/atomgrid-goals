import { z } from "zod";

// An empty / whitespace-only comment is interpreted as "clear the comment"
// (the action will null out managerComment/By/At).  Non-empty must be
// 1..1000 chars after trim.
export const saveManagerCommentSchema = z.object({
  checkInId: z.string().min(1),
  comment: z.string().max(1000, "Comment must be at most 1000 characters"),
});

export type SaveManagerCommentInput = z.infer<typeof saveManagerCommentSchema>;
