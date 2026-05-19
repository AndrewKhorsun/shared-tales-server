import { ChapterState } from "../state";
import { extractText, getBookId, getChapterId, getEmitter } from "../utils";
import { llm } from "../llm";
import { RunnableConfig } from "@langchain/core/runnables";
import { CostLoggingCallback } from "../costLogger";
import * as repo from "../../../repositories";
import * as db from "../../../../db";

export async function summarizerNode(
  state: typeof ChapterState.State,
  config?: RunnableConfig
): Promise<Partial<typeof ChapterState.State>> {
  const { draft, chapter_number, book_context } = state;
  const emitter = getEmitter(config);
  const bookId = getBookId(config);
  const chapterId = getChapterId(config);

  console.log(`[summarizer] chapter=${chapter_number}`);

  emitter?.emit("progress", {
    stage: "summarizer",
    message: "Summarizing chapter....",
  });

  const prompt = `You are a precise and conservative story summarizer.

CHAPTER ${chapter_number}:
${draft}

Your job is to summarize ONLY what is explicitly established in the text.
Do NOT interpret, expand, or infer beyond what is clearly shown.

LENGTH:
- 3–5 sentences maximum, one short paragraph

CONTENT — include only:
- key plot events
- important character actions
- emotional shifts (only if clearly shown in the text)
- information explicitly confirmed in the chapter

STRICT RULES:
- Do NOT infer hidden meanings or intentions
- Do NOT upgrade ambiguity into certainty
  (if something is implied or suspected, keep it uncertain in the summary)
- Do NOT reveal more than the chapter explicitly confirms
- If something is unclear in the text, keep it unclear in the summary

UNCERTAINTY HANDLING:
- Reflect ambiguity using phrases like: "seems", "appears", "is unclear", "may indicate"

Write in ${book_context.language}. Do not add commentary.

Summary:`;

  const costCallback = new CostLoggingCallback({
    agentNode: "summarizer",
    bookId,
    chapterNumber: chapter_number,
    model: "claude-haiku-4-5",
  });
  const response = await llm.invoke(prompt, { callbacks: [costCallback] });
  const summary = extractText(response);

  if (bookId && chapterId) {
    await repo.updateChapter(chapterId, bookId, { content: draft ?? undefined, status: "draft" });

    // jsonb_set для масиву chapter_summaries не виражається через updateBookPlan
    await db.query(
      `UPDATE book_plans
       SET generation_settings = jsonb_set(
         generation_settings,
         '{chapter_summaries}',
         generation_settings->'chapter_summaries' || $1::jsonb
       )
       WHERE book_id = $2`,
      [JSON.stringify([{ chapter: chapter_number, summary }]), bookId]
    );

    console.log(`[summarizer] saved chapter=${chapterId} to DB`);
  }

  emitter?.emit("done", {
    summary,
    content: draft,
  });

  return {
    chapter_summary: summary,
  };
}
