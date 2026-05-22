import { ChapterState } from "../state";
import { llm } from "../llm";
import { z } from "zod";
import { getEmitter, getBookId } from "../utils";
import { RunnableConfig } from "@langchain/core/runnables";
import { CostLoggingCallback } from "../costLogger";
import { withRetry } from "../../../utils/retry";

const EditorOutputSchema = z.object({
  approved: z.boolean().describe("Whether the draft meets quality standards"),
  feedback: z.string().nullable().describe("Specific issues to fix, null if approved"),
});

const BestDraftSchema = z.object({
  best_draft_index: z.number().int().min(1).max(3).describe("1-based index of the best draft"),
});

const editorLlm = llm.withStructuredOutput(EditorOutputSchema);
const pickerLlm = llm.withStructuredOutput(BestDraftSchema);

export async function editorNode(
  state: typeof ChapterState.State,
  config?: RunnableConfig
): Promise<Partial<typeof ChapterState.State>> {
  const { draft, all_drafts, write_attempts, plan, book_context, chapter_number } = state;
  const emitter = getEmitter(config);
  const bookId = getBookId(config);

  // Situation 3: max attempts reached — pick the best draft
  if (write_attempts >= 1) {
    console.log(`[editor] max attempts reached, picking best draft from ${all_drafts.length}`);

    emitter?.emit("progress", {
      stage: "editor",
      message: "Max attempts reached, choosing best draft...",
    });

    const pickerCallback = new CostLoggingCallback({
      agentNode: "editor_picker",
      bookId,
      chapterNumber: chapter_number,
      model: "claude-haiku-4-5",
    });
    const bestDraft = await pickBestDraft(
      all_drafts,
      plan ?? "",
      book_context.writing_style,
      pickerCallback
    );
    console.log("[editor] best draft selected, approved");
    return {
      draft: bestDraft,
      editor_approved: true,
      editor_feedback: null,
    };
  }

  const previous_summaries =
    book_context.generation_settings?.chapter_summaries
      ?.map((s) => `Chapter ${s.chapter}: ${s.summary}`)
      .join("\n") ?? "No previous chapters yet";

  emitter?.emit("progress", {
    stage: "editor",
    message: "Reviewing draft...",
  });

  const prompt = `You are a strict but fair literary editor. Evaluate this chapter draft.

WRITING STYLE EXPECTED: ${book_context.writing_style}
CHAPTER PLAN (what should happen): ${plan}
PREVIOUS CHAPTERS SUMMARIES: ${previous_summaries}

DRAFT TO EVALUATE:
${draft}

Evaluate the draft strictly. Work through each criterion in order.
INFORMATION CONTROL violations always cause REJECT, even if everything else is good.

1. STRUCTURE & PLAN
   - Does it follow the chapter plan?
   - Are there plot holes or inconsistencies?

2. STYLE & PACING
   - Is the writing style consistent with the expected style?
   - Are character voices distinct and consistent?
   - Is sentence rhythm varied? Monotonous short-sentence chains are a flaw.

3. LENGTH (critical)
   - Target: 1500–2500 words.
   - REJECT if below 1500 words.

4. CHARACTER DEPTH
   - Do characters show personal motivation, fear, or cost beyond advancing the plot?

5. INFORMATION CONTROL (critical — REJECT overrides everything)
   - Extract the "CONFIRMED THIS CHAPTER" line from the plan.
   - Extract the "SCENE FORBIDDEN" line from the plan.
   - If the draft confirms anything beyond "CONFIRMED THIS CHAPTER"
     → REJECT, reason: "exceeds allowed revelations".
   - If the draft directly states or confirms anything listed in "SCENE FORBIDDEN"
     → REJECT, reason: "forbidden reveal".
   - Does the chapter end with at least one open question?

6. PACING OVERLOAD
   - If major events happen too rapidly without reflection, reaction, or transition
     between them → REJECT, reason: "pacing overload".

8. STRUCTURAL REPETITION (causes REJECT)
   - Summarize the emotional arc of this chapter in one sentence:
     what did the character attempt, and how did it end?
   - Compare to EMOTIONAL ARC lines from previous summaries.
   - If the pattern matches for the 3rd consecutive chapter → REJECT,
     reason: "arc repetition"
   - Theme repetition is acceptable. Emotional shape repetition is not.

9. SECONDARY CHARACTER DEPTH (flag, not auto-REJECT)
   - For each named secondary character: does the chapter show them
     wanting something beyond serving the POV character's arc?
   - Does at least one secondary character complicate rather than
     confirm the POV character's belief?
   - If all secondary characters only reflect or confirm → note as weakness.

FORBIDDEN PHRASE PATTERN:
Do not write sentences where the POV character 
explicitly states the theme of the chapter as a conclusion.
The character may notice facts, ask questions, feel sensations —
but must never summarize what the story means.

Respond in exactly one of these two formats:

ACCEPT:
<one sentence stating what makes this draft work>

REJECT:
- <specific problem 1>
- <specific problem 2>
Fix:
- Step 1: <concrete action — refer to the specific part of the text if possible>
- Step 2: <concrete action — refer to the specific part of the text if possible>
- Step 3: <concrete action if needed>
`;

  const editorCallback = new CostLoggingCallback({
    agentNode: "editor",
    bookId,
    chapterNumber: chapter_number,
    model: "claude-haiku-4-5",
  });
  const result = await withRetry(() => editorLlm.invoke(prompt, { callbacks: [editorCallback] }), {
    onRetry: (attempt, err) => console.warn(`[editor] retry ${attempt} after error: ${err}`),
  });

  if (result.approved) {
    console.log(`[editor] attempt=${write_attempts} approved`);
  } else {
    console.log(`[editor] attempt=${write_attempts} rejected: ${result.feedback?.slice(0, 120)}`);
  }

  emitter?.emit("progress", {
    stage: "editor",
    message: result.approved
      ? "Approved draft..."
      : `Rejected draft with feedback ${result.feedback}`,
  });

  return {
    editor_approved: result.approved,
    editor_feedback: result.approved ? null : result.feedback,
  };
}

async function pickBestDraft(
  drafts: string[],
  plan: string,
  writingStyle: string,
  callback?: CostLoggingCallback
): Promise<string> {
  const draftsText = drafts.map((d, i) => `DRAFT ${i + 1}:\n${d}`).join("\n\n---\n\n");

  const prompt = `You are a literary editor. You have ${drafts.length} drafts of the same chapter.
Pick the best one based on writing quality, plan adherence, and style consistency.

WRITING STYLE: ${writingStyle}
CHAPTER PLAN: ${plan}

${draftsText}

Respond with only the number of the best draft (1, 2, or 3). Nothing else.`;

  const result = await withRetry(
    () => pickerLlm.invoke(prompt, { callbacks: callback ? [callback] : [] }),
    {
      onRetry: (attempt, err) =>
        console.warn(`[editor/picker] retry ${attempt} after error: ${err}`),
    }
  );
  const index = result.best_draft_index - 1;
  return drafts[index] ?? drafts[drafts.length - 1] ?? "";
}
