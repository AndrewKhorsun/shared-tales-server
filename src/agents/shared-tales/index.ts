import EventEmitter from "events";
import * as db from "../../../db";
import { BookPlan, Chapter } from "../../../types";
import { AppError } from "../../middleware/error.middleware";
import { createBookPlanSchema, CreateBookPlanDto } from "../../validators/book-plan.validator";
import { chapterGraph } from "./graph";

export async function runChapterGeneration(bookId: number, chapterId: number, hint?: string) {
  console.log(`[chapter-gen] start bookId=${bookId} chapterId=${chapterId}`);
  const emitter = new EventEmitter();

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

  const validation = createBookPlanSchema.safeParse({
    genre,
    target_audience,
    writing_style,
    language,
    generation_settings,
  });

  if (!validation.success) {
    throw new AppError(
      400,
      "Book plan is incomplete. Fill in genre, target audience, writing style and language before generating."
    );
  }

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

  setImmediate(() => {
    chapterGraph
      .invoke(
        {
          book_context: bookContext,
          chapter_number: chapterIndex,
          chapter_plan_hint: hint ?? "",
          plan_approved: false,
          plan: null,
        },
        { configurable: { thread_id: threadId, emitter, bookId, chapterId } }
      )
      .catch((err) => {
        console.error(`[chapter-gen] error bookId=${bookId} chapterId=${chapterId}`, err);
        emitter.emit("error", { message: err.message });
      });
  });

  return { status: "started", emitter };
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
  const emitter = new EventEmitter();
  const threadId = `book-${bookId}-chapter-${chapterId}`;

  const currentState = await chapterGraph.getState({
    configurable: { thread_id: threadId },
  });
  console.log("[feedback] next nodes:", currentState.next);

  await chapterGraph.updateState(
    { configurable: { thread_id: threadId } },
    { plan_approved: isApprove, user_feedback: feedback ?? null },
    "planner_interrupt"
  );

  chapterGraph
    .invoke(null, { configurable: { thread_id: threadId, emitter, bookId, chapterId } })
    .catch((err) => {
      console.error(`[feedback] error bookId=${bookId} chapterId=${chapterId}`, err);
      emitter.emit("error", { message: err.message });
    });

  return { status: "started", emitter };
}

export async function getChapterState(bookId: number, chapterId: number) {
  const threadId = `book-${bookId}-chapter-${chapterId}`;

  const { values, next } = await chapterGraph.getState({
    configurable: { thread_id: threadId },
  });

  let status: string;
  if (!values || Object.keys(values).length === 0) {
    status = "idle";
  } else if (next.includes("planner_interrupt")) {
    status = "waiting_approval";
  } else if (next.length > 0) {
    status = "generating";
  } else {
    status = "done";
  }

  return {
    status,
    plan: values?.plan ?? null,
    draft: values?.draft ?? null,
  };
}
