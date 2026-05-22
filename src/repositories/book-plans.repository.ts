import { PoolClient } from "pg";
import { BookPlan, BookLanguage, GenerationSettings } from "../../types";
import { pool } from "../../db";

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
  total_chapters?: number;
}

export async function createBookPlan(
  bookId: number,
  data: CreateBookPlanData,
  client?: PoolClient
): Promise<BookPlan | null> {
  const executor = client ?? pool;
  const result = await executor.query<BookPlan>(
    `INSERT INTO book_plans
       (book_id, genre, target_audience, writing_style, language, generation_settings,
        total_chapters)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
    [
      bookId,
      data.genre,
      data.target_audience,
      data.writing_style,
      data.language,
      JSON.stringify(data.generation_settings ?? {}),
      data.total_chapters ?? null,
    ]
  );
  return result.rows[0] ?? null;
}

export interface ChapterSummaryEntry {
  chapter: number;
  summary: string;
  new_hooks?: string[];
  emotional_arc?: string;
  core_state?: string[];
  secondary_characters?: { name: string; visible_want: string }[];
  hook_status?: { hook: string; status: "advanced" | "partially_revealed" | "still_open"; note: string }[];
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
    Pick<
      BookPlan,
      "genre" | "target_audience" | "writing_style" | "language" | "total_chapters"
    > & {
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
         total_chapters = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE book_id = $7
     RETURNING *`,
    [
      data.genre ?? null,
      data.target_audience ?? null,
      data.writing_style ?? null,
      data.language ?? null,
      data.generation_settings ? JSON.stringify(data.generation_settings) : null,
      data.total_chapters ?? null,
      bookId,
    ]
  );
  return result.rows[0] ?? null;
}
