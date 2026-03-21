import { ChatAnthropic } from "@langchain/anthropic";
import { ChapterState } from "../state";
import { config } from "../../../config";
import { extractText } from "../utils";

const llm = new ChatAnthropic({
  apiKey: config.llm.anthropicKey,
  model: "claude-haiku-4-5",
});

export async function editorNode(
  state: typeof ChapterState.State
): Promise<Partial<typeof ChapterState.State>> {
  const { draft, all_drafts, write_attempts, plan, book_context } = state;

  // Situation 3: max attempts reached — pick the best draft
  if (write_attempts >= 3) {
    const bestDraft = await pickBestDraft(all_drafts, plan ?? "", book_context.writing_style ?? "");
    return {
      draft: bestDraft,
      editor_approved: true,
      editor_feedback: null,
    };
  }

  // Situations 1 & 2: evaluate current draft
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

Respond in this exact format:
APPROVED: yes/no
FEEDBACK: (if no — specific issues to fix, if yes — write "none")`;

  const response = await llm.invoke(prompt);
  const text = extractText(response);

  // Parse response
  const approved = /APPROVED:\s*yes/i.test(text);
  const feedbackMatch = text.match(/FEEDBACK:\s*([\s\S]+)/);
  const feedback = feedbackMatch?.[1]?.trim() ?? null;

  return {
    editor_approved: approved,
    editor_feedback: approved ? null : feedback,
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

  const response = await llm.invoke(prompt);
  const text = extractText(response).trim();
  const bestIndex = parseInt(text) - 1;
  return drafts[bestIndex] ?? drafts[drafts.length - 1] ?? "";
}
