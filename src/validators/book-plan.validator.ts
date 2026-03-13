import { z } from "zod";

export const createBookPlanSchema = z.object({
  genre: z.string().max(100, "Genre is too long").optional(),
  target_audience: z.string().max(100, "Target audience is too long").optional(),
  writing_style: z.string().max(100, "Writing style is too long").optional(),
  generation_settings: z.record(z.string(), z.unknown()).optional(),
});

export const updateBookPlanSchema = createBookPlanSchema;

export type CreateBookPlanDto = z.infer<typeof createBookPlanSchema>;
export type UpdateBookPlanDto = z.infer<typeof updateBookPlanSchema>;
