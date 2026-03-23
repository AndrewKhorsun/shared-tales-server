import { z } from "zod";

export const chapterFeedbackSchema = z.discriminatedUnion("approved", [
  z.object({ approved: z.literal(true) }),
  z.object({ approved: z.literal(false), feedback: z.string().min(1) }),
]);

export type ChapterFeedbackDto = z.infer<typeof chapterFeedbackSchema>;
