import { interrupt } from "@langchain/langgraph";
import { ChapterState } from "../state";
import { extractText, getEmitter, getBookId } from "../utils";
import { llm } from "../llm";
import { RunnableConfig } from "@langchain/core/runnables";
import { CostLoggingCallback } from "../costLogger";

export async function plannerNode(
  state: typeof ChapterState.State,
  config?: RunnableConfig
): Promise<Partial<typeof ChapterState.State>> {
  const { book_context, chapter_number, chapter_plan_hint, user_feedback } = state;
  const emitter = getEmitter(config);
  const bookId = getBookId(config);
  const costCallback = new CostLoggingCallback({
    agentNode: "planner",
    bookId,
    chapterNumber: chapter_number,
    model: "claude-haiku-4-5",
  });

  console.log(
    `[planner] chapter=${chapter_number} hint=${chapter_plan_hint ? `"${chapter_plan_hint.slice(0, 60)}..."` : "none"} revision=${!!user_feedback}`
  );

  emitter?.emit("progress", {
    stage: "planner",
    message: "Generating chapter plan...",
  });

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
- Leave at least one story question open at the end of the chapter

SCENE DESIGN:
- Each planned scene must have:
  - a clear intention (what the character wants in this scene)
  - friction or resistance (what blocks or complicates it)
  - a small outcome or shift (even partial, ambiguous, or unexpected)

ARC DIVERSITY RULE:
- Identify the dominant emotional pattern of the last 2 chapters
  using EMOTIONAL ARC lines from previous summaries.
- This chapter must resolve through a different emotional shape.
- Valid shapes: escalation, unexpected stillness, misplaced victory,
  cost without clarity, connection that complicates rather than confirms.
- If no different shape is possible, flag it explicitly.

GLOBAL ARC EVOLUTION:
- Review all previous EMOTIONAL ARC lines in order.
- Identify how the POV character's relationship to the central
  conflict has shifted since chapter 1.
- Each chapter must move that relationship forward —
  the same emotional shape may repeat, but its meaning
  must be different from the last time it appeared.
- If no meaningful shift is possible, flag: "STAGNATION RISK"
  and explain what needs to change at story level.

SECONDARY CHARACTER CONSTRAINT:
- Every named character who appears must have a visible want
  that exists independently of the POV character's arc.
- At least one secondary character must complicate or contradict
  the POV character's current belief — not confirm it.

WORLD PRESSURE:
- Each chapter must contain one event that originates outside
  the POV character's head.
- This event must change what is possible, impossible, or
  redirected for the character going forward — not just atmosphere.
- The change may open new options or close existing ones,
  but must be concrete enough to affect the next chapter.

INFORMATION CONTROL RULES:
${
  chapter_number <= 3
    ? "- This is an early chapter: do NOT explain the nature of the central system or antagonist"
    : "- Limit major revelations — do not resolve more than one core mystery per chapter"
}
- Each chapter may confirm at most ONE major suspicion — decide in advance which one
- Prefer partial understanding, conflicting interpretations, or uncertainty over clear answers
- If the author's hint signals a finale or climax, these limits may be relaxed

SCENE CONSTRAINT:
- Scenes must NOT explicitly confirm anything outside the defined "CONFIRMED THIS CHAPTER"
- If a scene risks accidentally revealing more, rewrite it to imply, not confirm

EDITOR_REQUIRED: true/false
REASON: <revelation / turning point / regular chapter>

CRITICAL: Your response is incomplete without these exact three lines at the end.
Do not finish the plan without them.

End your plan with exactly these three lines:
CONFIRMED THIS CHAPTER: <one specific development>
REMAINS UNKNOWN: <comma-separated list of open questions>
SCENE FORBIDDEN: <what the writer must NOT confirm or state in any scene>

CRITICAL: Do not truncate the plan. 
The final three lines are mandatory. 
If you are running low on space, 
shorten scene descriptions — 
but never omit CONFIRMED/REMAINS UNKNOWN/SCENE FORBIDDEN.

Respond with the plan only, no additional commentary.`;

  const response = await llm.invoke(prompt, { callbacks: [costCallback] });
  const plan = extractText(response);

  emitter?.emit("plan_ready", { plan });

  console.log(`[planner] plan generated (${plan.length} chars), waiting for approval`);

  return {
    plan,
    plan_approved: false,
    user_feedback: null,
  };
}

export async function plannerInterruptNode(
  state: typeof ChapterState.State,
  config?: RunnableConfig
): Promise<Partial<typeof ChapterState.State>> {
  const emitter = getEmitter(config);

  interrupt({ plan: state.plan });

  emitter?.emit("progress", {
    stage: "planner",
    message: "Plan approved, starting writing...",
  });

  return {};
}
