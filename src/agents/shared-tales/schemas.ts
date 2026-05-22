import { z } from "zod";

export const SummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      "3-5 sentence prose summary of key plot events, character actions, and emotional shifts explicitly shown in the chapter. Write in the book's language."
    ),
  emotional_arc: z
    .string()
    .describe("One sentence: what the POV character attempted and how it ended emotionally."),
  secondary_characters: z
    .array(
      z.object({
        name: z.string().describe("Character name"),
        visible_want: z.string().describe("What this character visibly wanted in this chapter"),
      })
    )
    .describe("Each named character who appeared and what they visibly wanted."),
  core_state: z
    .array(z.string())
    .describe(
      "3-5 active unresolved story threads that remain genuinely open after this chapter. Neutral language, no interpretation."
    ),
  hook_status: z
    .array(
      z.object({
        hook: z.string().describe("The open question or hook from a previous chapter"),
        status: z
          .enum(["advanced", "partially_revealed", "still_open"])
          .describe(
            "Whether this hook was advanced, partially revealed, or still open in this chapter"
          ),
        note: z.string().describe("One sentence on what changed, if anything"),
      })
    )
    .describe(
      "Status of hooks from previous chapters that were touched in this chapter. Empty array if none were touched."
    ),
  new_hooks: z
    .array(z.string())
    .describe(
      "New unresolved questions or plot threads introduced in this chapter. Empty array if none."
    ),
});

export type SummaryOutput = z.infer<typeof SummaryOutputSchema>;
