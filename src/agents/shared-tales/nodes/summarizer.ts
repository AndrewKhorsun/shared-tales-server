import { ChapterState } from "../state";
import { extractText, getBookId, getChapterId, getEmitter } from "../utils";
import { llm } from "../llm";
import { RunnableConfig } from "@langchain/core/runnables";
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

  const prompt = `You are a concise summarizer. Write a brief summary of this chapter.

CHAPTER ${chapter_number}:
${draft}

Requirements:
- 3-5 sentences maximum
- Include: key plot events, character actions, emotional shifts, any new information revealed
- Skip descriptions, atmosphere, and filler — only what matters for story continuity
- Write in ${book_context.language}

Summary:`;

  const response = await llm.invoke(prompt);
  const summary = extractText(response);

  if (bookId && chapterId) {
    await db.query("UPDATE chapters SET content = $1 WHERE id = $2", [draft, chapterId]);

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
