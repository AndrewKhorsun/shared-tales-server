import { ChapterState } from "../state";
import { extractText, getEmitter } from "../utils";
import { writerLlm } from "../llm";
import { RunnableConfig } from "@langchain/core/runnables";

export async function writerNode(
  state: typeof ChapterState.State,
  config?: RunnableConfig
): Promise<Partial<typeof ChapterState.State>> {
  const { book_context, plan, editor_feedback, chapter_number } = state;
  const emitter = getEmitter(config);
  const attempt = (state.write_attempts ?? 0) + 1;

  console.log(
    `[writer] chapter=${chapter_number} attempt=${attempt}${editor_feedback ? " (with editor feedback)" : ""}`
  );

  emitter?.emit("progress", {
    stage: "writer",
    message: "Writing chapter...",
  });

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

  const response = await writerLlm.invoke(prompt);
  const draft = extractText(response);

  console.log(`[writer] draft ready (${draft.length} chars)`);

  return {
    draft,
    all_drafts: [draft],
    write_attempts: 1,
  };
}
