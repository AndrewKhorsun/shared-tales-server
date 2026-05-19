import { PoolClient } from "pg";
import { BookPlan } from "../../types";
import { pool } from "../../db";
import { BookLanguage, GenerationSettings } from "../validators/book-plan.validator";

export async function findBookPlanByBookId(
  bookId: number,
  client?: PoolClient
): Promise<BookPlan | null> {
  const executor = client ?? pool;
  const result = await executor.query<BookPlan>("SELECT * FROM book_plans WHERE book_id = $1", [
    bookId,
  ]);
  return result.rows[0] ?? null;
}

export async function bookPlanExists(bookId: number, client?: PoolClient): Promise<boolean> {
  const executor = client ?? pool;
  const result = await executor.query<{ id: number }>(
    "SELECT id FROM book_plans WHERE book_id = $1",
    [bookId]
  );
  return result.rows.length > 0;
}

export interface CreateBookPlanData {
  genre: string;
  target_audience: string;
  writing_style: string;
  language: BookLanguage;
  generation_settings: GenerationSettings;
}

export async function createBookPlan(
  bookId: number,
  data: CreateBookPlanData,
  client?: PoolClient
): Promise<BookPlan | null> {
  const executor = client ?? pool;
  const result = await executor.query<BookPlan>(
    `INSERT INTO book_plans
       (book_id, genre, target_audience, writing_style, language, generation_settings)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
    [
      bookId,
      data.genre,
      data.target_audience,
      data.writing_style,
      data.language,
      JSON.stringify(data.generation_settings ?? {}),
    ]
  );
  return result.rows[0] ?? null;
}

export interface ChapterSummaryEntry {
  chapter: number;
  summary: string;
}

export async function appendChapterSummary(
  bookId: number,
  entry: ChapterSummaryEntry,
  client?: PoolClient
): Promise<BookPlan | null> {
  const executor = client ?? pool;
  const result = await executor.query<BookPlan>(
    `UPDATE book_plans
     SET generation_settings = jsonb_set(
       generation_settings,
       '{chapter_summaries}',
       COALESCE(generation_settings->'chapter_summaries', '[]'::jsonb) || $1::jsonb
     ),
     updated_at = CURRENT_TIMESTAMP
     WHERE book_id = $2
     RETURNING *`,
    [JSON.stringify([entry]), bookId]
  );
  return result.rows[0] ?? null;
}

export async function updateBookPlan(
  bookId: number,
  data: Partial<
    Pick<BookPlan, "genre" | "target_audience" | "writing_style" | "language"> & {
      generation_settings: GenerationSettings;
    }
  >,
  client?: PoolClient
): Promise<BookPlan | null> {
  const executor = client ?? pool;
  const result = await executor.query<BookPlan>(
    `UPDATE book_plans
     SET genre = COALESCE($1, genre),
         target_audience = COALESCE($2, target_audience),
         writing_style = COALESCE($3, writing_style),
         language = COALESCE($4, language),
         generation_settings = COALESCE($5, generation_settings),
         updated_at = CURRENT_TIMESTAMP
     WHERE book_id = $6
     RETURNING *`,
    [
      data.genre ?? null,
      data.target_audience ?? null,
      data.writing_style ?? null,
      data.language ?? null,
      data.generation_settings ? JSON.stringify(data.generation_settings) : null,
      bookId,
    ]
  );
  return result.rows[0] ?? null;
}
