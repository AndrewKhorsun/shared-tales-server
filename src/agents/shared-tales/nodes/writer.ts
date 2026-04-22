import { ChapterState } from "../state";
import { extractText, getEmitter } from "../utils";
import { writerLlm } from "../llm";
import { RunnableConfig } from "@langchain/core/runnables";

export async function writerNode(
  state: typeof ChapterState.State,
  config?: RunnableConfig
): Promise<Partial<typeof ChapterState.State>> {
  const { book_context, plan, editor_feedback, chapter_number, chapter_plan_hint } = state;
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

  const hintOverride = chapter_plan_hint
    ? `AUTHOR INSTRUCTIONS FOR THIS CHAPTER (override defaults if they conflict):
${chapter_plan_hint}`
    : "";

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
    ? `EDITOR FEEDBACK (previous draft was rejected — address every point below):
${editor_feedback}`
    : ""
}

${hintOverride}

REQUIREMENTS:
- Use the plan as a structural guide — do NOT mirror it rigidly or list events mechanically
- Write naturally flowing prose: expand scenes with internal thought, tension, and sensory detail
- Stay consistent with character personalities and traits
- Match the writing style exactly
- Write in ${language}
- Target length: 800–2500 words — never go below 800 words
- No chapter title, just the text

CHARACTER DEPTH:
- Every POV character must have a visible personal want or fear beyond the plot —
  show it through small actions, memories, or reactions, not exposition
- Include at least one concrete personal detail (a memory, habit, relationship, or regret)
- Show the emotional cost of any discovery — not just the information itself
- Avoid the "lone chosen hero" archetype: give characters flaws, doubts, or conflicting loyalties

PACING & RHYTHM:
- Mix sentence lengths deliberately: longer sentences for atmosphere and reflection,
  short sentences for impact and shock
- Do not cluster more than 4 short sentences in a row without a longer one to break the rhythm

MYSTERY & REVELATION:
- Confirm at most ONE major suspicion per chapter — leave everything else ambiguous
- Prefer showing consequences over stating causes
- Leave at least one meaningful question unanswered by the end

AI / ANTAGONIST DIALOGUE:
- Must NOT explicitly name or describe itself
  (forbidden: "I am the system", "I am the city", "I control you")
- Must speak indirectly, ambiguously, or manipulatively
- May imply awareness but must never confirm the full scope of its control
- Its words should increase the reader's uncertainty, not resolve it

PLAN CONSTRAINTS:
- The plan ends with a "SCENE FORBIDDEN" line — extract it and treat it as a hard rule
- Do NOT explicitly confirm or state anything listed there under any circumstances
- If a scene approaches that boundary, imply it indirectly instead of stating it outright

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
