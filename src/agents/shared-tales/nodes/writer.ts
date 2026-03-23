import { ChatAnthropic } from "@langchain/anthropic";
import { ChapterState } from "../state";
import { config } from "../../../config";
import { extractText } from "../utils";

const llm = new ChatAnthropic({
  apiKey: config.llm.anthropicKey,
  model: "claude-haiku-4-5",
});

export async function writerNode(
  state: typeof ChapterState.State
): Promise<Partial<typeof ChapterState.State>> {
  const { book_context, plan, editor_feedback, chapter_number } = state;

  const { genre, writing_style, language, generation_settings } = book_context;

  const previousChapters =
    generation_settings?.chapter_summaries
      ?.map((s) => `Chapter ${s.chapter}: ${s.summary}`)
      .join("\n") ?? "No previous chapters yet";

  const characters =
    generation_settings?.characters
      ?.map((c) => `- ${c.name} (${c.role}): ${c.description}. Traits: ${c.traits.join(", ")}`)
      .join("\n") ?? "No characters defined";

  const worldSection = generation_settings?.setting?.world ?? "";
  const atmosphereSection = generation_settings?.setting?.atmosphere ?? "";

  const prompt = `You are a skilled creative writer. Write a full chapter based on the provided plan.

WRITING GUIDELINES:
Genre: ${genre}
Writing style: ${writing_style}
Language: ${language}

WORLD & ATMOSPHERE:
${worldSection}
${atmosphereSection}

STORY SO FAR:
${previousChapters || "This is the first chapter."}

CHARACTERS:
${characters}

CHAPTER ${chapter_number} PLAN:
${plan}

${
  editor_feedback
    ? `EDITOR FEEDBACK (previous draft was rejected — fix these issues):
${editor_feedback}`
    : ""
}

Write the full chapter text. Requirements:
- Follow the plan as a guide, adding natural transitions, sensory details, and internal monologue where appropriate
- Stay consistent with character personalities and traits
- Match the writing style
- Write in ${language}
- Target length: approximately 1000-1500 words
- No chapter title, just the text

Write the chapter now:`;

  const response = await llm.invoke(prompt);
  const draft = extractText(response);

  return {
    draft,
    all_drafts: [draft],
    write_attempts: 1,
  };
}
