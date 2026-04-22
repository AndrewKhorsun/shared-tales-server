import { ChapterState } from "../state";
import { llm } from "../llm";
import { z } from "zod";
import { getEmitter } from "../utils";
import { RunnableConfig } from "@langchain/core/runnables";

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
  const { draft, all_drafts, write_attempts, plan, book_context } = state;
  const emitter = getEmitter(config);

  // Situation 3: max attempts reached — pick the best draft
  if (write_attempts >= 3) {
    console.log(`[editor] max attempts reached, picking best draft from ${all_drafts.length}`);

    emitter?.emit("progress", {
      stage: "editor",
      message: "Max attempts reached, choosing best draft...",
    });

    const bestDraft = await pickBestDraft(all_drafts, plan ?? "", book_context.writing_style);
    console.log("[editor] best draft selected, approved");
    return {
      draft: bestDraft,
      editor_approved: true,
      editor_feedback: null,
    };
  }

  emitter?.emit("progress", {
    stage: "editor",
    message: "Reviewing draft...",
  });

  const prompt = `You are a strict but fair literary editor. Evaluate this chapter draft.

WRITING STYLE EXPECTED: ${book_context.writing_style}
CHAPTER PLAN (what should happen): ${plan}

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
   - If the chapter feels clearly underdeveloped or rushes through events without
     expansion → REJECT, reason: "too short or underdeveloped".

4. CHARACTER DEPTH
   - Do characters show personal motivation, fear, or cost beyond advancing the plot?
   - Is there at least one concrete personal detail (memory, habit, relationship, regret)?

5. INFORMATION CONTROL (critical — REJECT overrides everything)
   - Extract the "CONFIRMED THIS CHAPTER" line from the plan.
   - Extract the "SCENE FORBIDDEN" line from the plan.
   - List every major mystery or truth the draft confirms.
   - If the draft confirms anything beyond "CONFIRMED THIS CHAPTER"
     → REJECT, reason: "exceeds allowed revelations".
   - If the draft directly states or confirms anything listed in "SCENE FORBIDDEN"
     → REJECT, reason: "forbidden reveal".
   - Does the chapter end with at least one open question?
   - Do antagonists or AI characters avoid explicitly naming themselves or their nature?
     Forbidden: "I am the system", "I control the city", "I am the AI" — or equivalents
     → if present, REJECT.

6. PACING OVERLOAD
   - If major events happen too rapidly without reflection, reaction, or transition
     between them → REJECT, reason: "pacing overload".

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

  const result = await editorLlm.invoke(prompt);

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
  writingStyle: string
): Promise<string> {
  const draftsText = drafts.map((d, i) => `DRAFT ${i + 1}:\n${d}`).join("\n\n---\n\n");

  const prompt = `You are a literary editor. You have ${drafts.length} drafts of the same chapter.
Pick the best one based on writing quality, plan adherence, and style consistency.

WRITING STYLE: ${writingStyle}
CHAPTER PLAN: ${plan}

${draftsText}

Respond with only the number of the best draft (1, 2, or 3). Nothing else.`;

  const result = await pickerLlm.invoke(prompt);
  const index = result.best_draft_index - 1;
  return drafts[index] ?? drafts[drafts.length - 1] ?? "";
}
