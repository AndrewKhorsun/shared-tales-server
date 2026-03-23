import { interrupt } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChapterState } from "../state";
import { config } from "../../../config";
import { extractText } from "../utils";

const llm = new ChatAnthropic({
  apiKey: config.llm.anthropicKey,
  model: "claude-haiku-4-5",
});

export async function plannerNode(
  state: typeof ChapterState.State
): Promise<Partial<typeof ChapterState.State>> {
  const { book_context, chapter_number, chapter_plan_hint, user_feedback } = state;

  const { genre, target_audience, writing_style, generation_settings, language } = book_context;

  const previousChapters =
    generation_settings?.chapter_summaries
      ?.map((s) => `Chapter ${s.chapter}: ${s.summary}`)
      .join("\n") ?? "No previous chapters yet";

  const characters =
    generation_settings?.characters
      ?.map((c) => `- ${c.name} (${c.role}): ${c.description}`)
      .join("\n") ?? "No characters defined";

  const worldSection = generation_settings?.setting?.world
    ? `World: ${generation_settings.setting.world}`
    : "World: Not specified — invent an appropriate world setting based on the genre and premise.";

  const atmosphereSection = generation_settings?.setting?.atmosphere
    ? `Atmosphere: ${generation_settings.setting.atmosphere}`
    : "Atmosphere: Not specified — choose an atmosphere that fits the genre and current plot stage.";

  const premiseSection = generation_settings?.plot_arc?.premise
    ? `Premise: ${generation_settings.plot_arc.premise}`
    : "Premise: Not specified — derive a fitting premise from the genre and setting.";

  const conflictSection = generation_settings?.plot_arc?.conflict
    ? `Conflict: ${generation_settings.plot_arc.conflict}`
    : "Conflict: Not specified — introduce an appropriate central conflict for the genre.";

  const resolutionSection = generation_settings?.plot_arc?.resolution
    ? `Resolution direction: ${generation_settings.plot_arc.resolution}`
    : "Resolution direction: Not specified — determine a suitable resolution direction based on the plot.";

  const prompt = `You are a creative writing planner. Create a detailed chapter plan.

BOOK CONTEXT:
Genre: ${genre}
Target audience: ${target_audience}
Writing style: ${writing_style}

WORLD & ATMOSPHERE:
${worldSection}
${atmosphereSection}

PLOT:
${premiseSection}
${conflictSection}
${resolutionSection}

CHARACTERS:
${characters}

PREVIOUS CHAPTERS:
${previousChapters}

CURRENT CHAPTER: ${chapter_number}
${chapter_plan_hint ? `AUTHOR'S HINT: ${chapter_plan_hint}` : ""}
${user_feedback ? `REVISION FEEDBACK: ${user_feedback}` : ""}

Create a detailed plan for chapter ${chapter_number}. The plan must:
- Follow naturally from previous chapters
- Advance the main conflict
- Include specific scenes and character interactions
- Write in ${language}

Respond with the plan only, no additional commentary.`;

  const response = await llm.invoke(prompt);
  const plan = extractText(response);

  // Pause and wait for user approval
  if (!state.plan_approved) {
    interrupt({ plan });
  }

  return {
    plan,
    user_feedback: null, // reset after use
  };
}
