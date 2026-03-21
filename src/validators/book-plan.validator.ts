import { z } from "zod";

const characterSchema = z.object({
  name: z.string().min(1),
  role: z.enum(["protagonist", "antagonist", "supporting"]),
  description: z.string().min(1),
  traits: z.array(z.string()),
});

const generationSettingsSchema = z.object({
  characters: z.array(characterSchema).default([]),
  setting: z.object({
    world: z.string().min(1),
    atmosphere: z.string().min(1),
  }),
  plot_arc: z.object({
    premise: z.string().min(1),
    conflict: z.string().min(1),
    resolution: z.string().min(1),
  }),
  chapter_summaries: z
    .array(
      z.object({
        chapter: z.number().int().positive(),
        summary: z.string().min(1),
      })
    )
    .default([]),
});

export const createBookPlanSchema = z.object({
  genre: z.string().max(100, "Genre is too long").optional(),
  target_audience: z.string().max(100, "Target audience is too long").optional(),
  writing_style: z.string().max(100, "Writing style is too long").optional(),
  language: z
    .enum([
      "english",
      "ukrainian",
      "spanish",
      "french",
      "german",
      "italian",
      "portuguese",
      "polish",
      "dutch",
      "czech",
      "swedish",
      "norwegian",
      "danish",
      "finnish",
      "turkish",
      "japanese",
      "korean",
      "chinese",
      "arabic",
      "hindi",
      "indonesian",
      "vietnamese",
      "thai",
      "romanian",
      "hungarian",
      "greek",
    ])
    .optional(),
  generation_settings: generationSettingsSchema.optional(),
});

export const updateBookPlanSchema = createBookPlanSchema;

export type CreateBookPlanDto = z.infer<typeof createBookPlanSchema>;
export type UpdateBookPlanDto = z.infer<typeof updateBookPlanSchema>;
export type GenerationSettings = z.infer<typeof generationSettingsSchema>;
export type BookLanguage = z.infer<typeof createBookPlanSchema>["language"];
export type Character = z.infer<typeof characterSchema>;
