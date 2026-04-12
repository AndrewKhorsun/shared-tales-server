import * as db from "../../../db";
import { BookPlan, Chapter } from "../../../types";
import { AppError } from "../../middleware/error.middleware";
import { CreateBookPlanDto } from "../../validators/book-plan.validator";
import { chapterGraph } from "./graph";

export async function runChapterGeneration(bookId: number, chapterId: number, hint?: string) {
  console.log(`[chapter-gen] start bookId=${bookId} chapterId=${chapterId}`);
  const bookResponse = await db.query<BookPlan>("SELECT * FROM book_plans WHERE book_id = $1", [
    bookId,
  ]);

  if (bookResponse.rows.length === 0) {
    throw new AppError(404, "Book plan not found");
  }

  const bookPlan = bookResponse.rows[0] as BookPlan;

  const chapterIndex = (
    await db.query<Pick<Chapter, "order_index">>(
      `SELECT order_index FROM chapters
           WHERE book_id = $1 AND id = $2`,
      [bookId, chapterId]
    )
  ).rows[0]?.order_index;

  if (chapterIndex === undefined) {
    throw new AppError(404, "Chapter not found");
  }

  const { genre, target_audience, writing_style, language, generation_settings } = bookPlan;

  const bookContext: CreateBookPlanDto = {
    genre,
    target_audience,
    writing_style,
    language,
    generation_settings,
  };

  const threadId = `book-${bookId}-chapter-${chapterId}`;

  const existingState = await chapterGraph.getState({
    configurable: { thread_id: threadId },
  });

  if (existingState.next.length > 0) {
    console.log(
      `[chapter-gen] already in progress, rejecting bookId=${bookId} chapterId=${chapterId}`
    );
    throw new AppError(409, "Chapter generation is already in progress");
  }

  const result = await chapterGraph.invoke(
    {
      book_context: bookContext,
      chapter_number: chapterIndex,
      chapter_plan_hint: hint ?? "",
    },
    { configurable: { thread_id: threadId } }
  );

  return {
    status: "waiting_approval",
    plan: result.plan,
  };
}

export async function sendFeedback(
  bookId: number,
  chapterId: number,
  isApprove: boolean,
  feedback?: string
) {
  console.log(
    `[chapter-gen] feedback bookId=${bookId} chapterId=${chapterId} approve=${isApprove}`
  );
  const threadId = `book-${bookId}-chapter-${chapterId}`;

  const result = await chapterGraph.invoke(
    { plan_approved: isApprove, user_feedback: feedback ?? null },
    { configurable: { thread_id: threadId } }
  );

  const state = (await chapterGraph.getState({ configurable: { thread_id: threadId } })).next
    .length;

  if (state === 0) {
    console.log(`[chapter-gen] done, saving chapter=${chapterId}`);
    await db.query("UPDATE chapters SET content = $1 WHERE id = $2", [result.draft, chapterId]);

    await db.query(
      `UPDATE book_plans
   SET generation_settings = jsonb_set(
     generation_settings,
     '{chapter_summaries}',
     generation_settings->'chapter_summaries' || $1::jsonb
   )
   WHERE book_id = $2`,
      [
        JSON.stringify([{ chapter: result.chapter_number, summary: result.chapter_summary }]),
        bookId,
      ]
    );

    return {
      status: "done",
      chapter: result.draft,
    };
  } else {
    return {
      status: "waiting_approval",
      plan: result.plan,
    };
  }
}
export async function getChapterState(bookId: number, chapterId: number) {
  const threadId = `book-${bookId}-chapter-${chapterId}`;

  const { values, next } = await chapterGraph.getState({ configurable: { thread_id: threadId } });

  return {
    status: next.length === 0 ? "done" : "waiting_approval",
    plan: values.plan,
    draft: values.draft,
  };
}
