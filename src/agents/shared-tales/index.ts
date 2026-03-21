import * as db from "../../../db";
import { BookPlan, Chapter } from "../../../types";
import { AppError } from "../../middleware/error.middleware";
import { CreateBookPlanDto } from "../../validators/book-plan.validator";
import { chapterGraph } from "./graph";

export async function runChapterGeneration(bookId: number, chapterId: number, hint?: string) {
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

// export async function sendFeedback(...) { }
// export async function getChapterState(...) { }
