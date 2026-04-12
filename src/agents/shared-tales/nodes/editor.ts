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

    const bestDraft = await pickBestDraft(all_drafts, plan ?? "", book_context.writing_style ?? "");
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

Evaluate the draft against these criteria:
- Does it follow the chapter plan?
- Is the writing style consistent?
- Are character voices distinct and consistent?
- Is the pacing appropriate?
- Are there plot holes or inconsistencies?
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
