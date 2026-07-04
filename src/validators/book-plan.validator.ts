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
        new_hooks: z.array(z.string()).default([]),
        emotional_arc: z.string().optional(),
        core_state: z.array(z.string()).optional(),
        secondary_characters: z
          .array(z.object({ name: z.string(), visible_want: z.string() }))
          .optional(),
        hook_status: z
          .array(
            z.object({
              hook: z.string(),
              status: z.enum(["advanced", "partially_revealed", "still_open"]),
              note: z.string(),
            })
          )
          .optional(),
      })
    )
    .default([]),
});

export const createBookPlanSchema = z.object({
  genre: z.string().min(1, "Genre is required").max(100, "Genre is too long"),
  target_audience: z
    .string()
    .min(1, "Target audience is required")
    .max(100, "Target audience is too long"),
  writing_style: z
    .string()
    .min(1, "Writing style is required")
    .max(300, "Writing style is too long"),
  language: z.enum([
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
  ]),
  generation_settings: generationSettingsSchema.optional(),
  total_chapters: z.number().int().min(1).max(50).optional(),
});

export const updateBookPlanSchema = createBookPlanSchema.partial();

export type CreateBookPlanDto = z.infer<typeof createBookPlanSchema>;
export type UpdateBookPlanDto = z.infer<typeof updateBookPlanSchema>;
export type {
  GenerationSettings,
  BookLanguage,
  GenerationSettingsCharacter as Character,
} from "../../types";
