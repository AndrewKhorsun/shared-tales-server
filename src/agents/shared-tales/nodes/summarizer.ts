import { ChapterState } from "../state";
import { getBookId, getChapterId, getEmitter } from "../utils";
import { llm } from "../llm";
import { RunnableConfig } from "@langchain/core/runnables";
import { CostLoggingCallback } from "../costLogger";
import { withRetry } from "../../../utils/retry";
import * as repo from "../../../repositories";
import { SummaryOutputSchema } from "../schemas";

const summarizerLlm = llm.withStructuredOutput(SummaryOutputSchema);

export async function summarizerNode(
  state: typeof ChapterState.State,
  config?: RunnableConfig
): Promise<Partial<typeof ChapterState.State>> {
  const { draft, chapter_number, book_context } = state;
  const emitter = getEmitter(config);
  const bookId = getBookId(config);
  const chapterId = getChapterId(config);

  if (!draft) {
    console.warn(`[summarizer] draft is empty for chapter=${chapter_number}`);
    emitter?.emit("error", {
      stage: "summarizer",
      message: `Chapter ${chapter_number} could not be saved: draft is empty.`,
    });
    return { chapter_summary: "" };
  }

  console.log(`[summarizer] chapter=${chapter_number}`);

  emitter?.emit("progress", {
    stage: "summarizer",
    message: "Summarizing chapter....",
  });

  const openHooksContext = book_context.generation_settings?.chapter_summaries
    ?.flatMap((s) => s.new_hooks ?? [])
    .filter(Boolean)
    .join(", ");

  const prompt = `You are a precise and conservative story summarizer.

CHAPTER ${chapter_number}:
${draft}

Your job is to summarize ONLY what is explicitly established in the text.
Do NOT interpret, expand, or infer beyond what is clearly shown.

RULES FOR summary field:
- 3–5 sentences maximum, one short paragraph
- Include only: key plot events, important character actions, emotional shifts clearly shown
- Do NOT infer hidden meanings or intentions
- Do NOT upgrade ambiguity into certainty — use "seems", "appears", "is unclear", "may indicate"
- Write in ${book_context.language}

RULES FOR emotional_arc field:
- One sentence: what did the POV character attempt, and how did it end emotionally?

RULES FOR secondary_characters field:
- For each named character who appeared: their name and what they visibly wanted in this chapter
- Only include characters who actually appear in this chapter

RULES FOR core_state field:
- 3-5 active story threads that remain genuinely unresolved after this chapter
- Neutral, factual language — no interpretation or inference

RULES FOR hook_status field:
- Check these open questions from previous chapters: ${openHooksContext || "none"}
- For each one touched in this chapter, report its status
- Leave the array empty if none were touched

RULES FOR new_hooks field:
- List new unresolved questions introduced in this chapter that did not exist before
- Leave the array empty if none`;

  const costCallback = new CostLoggingCallback({
    agentNode: "summarizer",
    bookId,
    chapterNumber: chapter_number,
    model: "claude-sonnet-4-5",
  });

  const result = await withRetry(
    () => summarizerLlm.invoke(prompt, { callbacks: [costCallback] }),
    { onRetry: (attempt, err) => console.warn(`[summarizer] retry ${attempt} after error: ${err}`) }
  );

  console.log(`[summarizer] structured output received, summary=${result.summary.length} chars`);

  if (bookId && chapterId) {
    await repo.updateChapter(chapterId, bookId, {
      content: draft,
      status: "published",
    });
    await repo.appendChapterSummary(bookId, {
      chapter: chapter_number,
      summary: result.summary,
      new_hooks: result.new_hooks,
      emotional_arc: result.emotional_arc || undefined,
      core_state: result.core_state.length > 0 ? result.core_state : undefined,
      secondary_characters:
        result.secondary_characters.length > 0 ? result.secondary_characters : undefined,
      hook_status: result.hook_status.length > 0 ? result.hook_status : undefined,
    });

    console.log(`[summarizer] saved chapter=${chapterId} to DB`);
  }

  emitter?.emit("done", {
    summary: result.summary,
    content: draft,
  });

  return {
    chapter_summary: result.summary,
  };
}
