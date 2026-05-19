import { PoolClient } from "pg";
import { Chapter } from "../../types";
import { pool } from "../../db";

function computeWordCount(content: string): number {
  const trimmed = content.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export async function findChaptersByBookId(
  bookId: number,
  client?: PoolClient
): Promise<Chapter[]> {
  const executor = client ?? pool;
  const result = await executor.query<Chapter>(
    "SELECT * FROM chapters WHERE book_id = $1 ORDER BY order_index ASC",
    [bookId]
  );
  return result.rows;
}

export async function findChapterByIdAndBookId(
  chapterId: number,
  bookId: number,
  client?: PoolClient
): Promise<Chapter | null> {
  const executor = client ?? pool;
  const result = await executor.query<Chapter>(
    "SELECT * FROM chapters WHERE id = $1 AND book_id = $2",
    [chapterId, bookId]
  );
  return result.rows[0] ?? null;
}

export async function createChapter(
  bookId: number,
  title: string,
  content: string,
  orderIndex: number,
  client?: PoolClient
): Promise<Chapter | null> {
  const executor = client ?? pool;
  const wordCount = computeWordCount(content);
  const result = await executor.query<Chapter>(
    `INSERT INTO chapters (title, content, order_index, book_id, word_count)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [title, content, orderIndex, bookId, wordCount]
  );
  return result.rows[0] ?? null;
}

export async function updateChapter(
  chapterId: number,
  bookId: number,
  data: Partial<Pick<Chapter, "title" | "content" | "order_index" | "status">>,
  client?: PoolClient
): Promise<Chapter | null> {
  const executor = client ?? pool;

  const setClauses: string[] = [
    "title = COALESCE($1, title)",
    "content = COALESCE($2, content)",
    "order_index = COALESCE($3, order_index)",
    "status = COALESCE($4, status)",
  ];
  const params: (string | number | null)[] = [
    data.title ?? null,
    data.content ?? null,
    data.order_index ?? null,
    data.status ?? null,
    chapterId,
    bookId,
  ];

  if (data.content !== undefined) {
    params.push(computeWordCount(data.content));
    setClauses.push(`word_count = $${params.length}`);
  }

  setClauses.push("updated_at = CURRENT_TIMESTAMP");

  const query = `UPDATE chapters SET ${setClauses.join(", ")} WHERE id = $5 AND book_id = $6 RETURNING *`;

  const result = await executor.query<Chapter>(query, params);
  return result.rows[0] ?? null;
}

export async function deleteChapter(
  chapterId: number,
  bookId: number,
  client?: PoolClient
): Promise<Chapter | null> {
  const executor = client ?? pool;
  const result = await executor.query<Chapter>(
    "DELETE FROM chapters WHERE id = $1 AND book_id = $2 RETURNING *",
    [chapterId, bookId]
  );
  return result.rows[0] ?? null;
}

export async function setChapterStatus(
  chapterId: number,
  bookId: number,
  status: Chapter["status"],
  client?: PoolClient
): Promise<void> {
  const executor = client ?? pool;
  await executor.query("UPDATE chapters SET status = $1 WHERE id = $2 AND book_id = $3", [
    status,
    chapterId,
    bookId,
  ]);
}

export async function hasGeneratingChapterAtOrAfter(
  bookId: number,
  orderIndex: number,
  client?: PoolClient
): Promise<boolean> {
  const executor = client ?? pool;
  const result = await executor.query<{ id: number }>(
    `SELECT id FROM chapters
     WHERE book_id = $1 AND order_index >= $2 AND status = 'generating'
     LIMIT 1`,
    [bookId, orderIndex]
  );
  return result.rows.length > 0;
}

export async function hasDependentChaptersWithContent(
  bookId: number,
  orderIndex: number,
  client?: PoolClient
): Promise<boolean> {
  const executor = client ?? pool;
  const result = await executor.query<{ id: number }>(
    `SELECT id FROM chapters
     WHERE book_id = $1 AND order_index > $2 AND content != '' AND content IS NOT NULL
     LIMIT 1`,
    [bookId, orderIndex]
  );
  return result.rows.length > 0;
}
