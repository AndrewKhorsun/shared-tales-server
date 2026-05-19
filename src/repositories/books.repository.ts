import { PoolClient } from "pg";
import { Book } from "../../types";
import { pool } from "../../db";

export async function findBookByIdAndAuthor(
  bookId: number,
  authorId: number,
  client?: PoolClient
): Promise<Book | null> {
  const executor = client ?? pool;
  const result = await executor.query<Book>(
    "SELECT * FROM books WHERE id = $1 AND author_id = $2",
    [bookId, authorId]
  );
  return result.rows[0] ?? null;
}

export async function findAllAuthorBooks(authorId: number, client?: PoolClient): Promise<Book[]> {
  const executor = client ?? pool;
  const result = await executor.query<Book>(
    `SELECT b.*,
        COUNT(c.id) as total_chapters,
        COUNT(c.id) FILTER (WHERE c.status = 'published') as published_chapters,
        COALESCE(SUM(c.word_count), 0) as total_word_count,
        EXISTS(SELECT 1 FROM chapters WHERE book_id = b.id AND status = 'generating') as has_generating_chapter
       FROM books b
       LEFT JOIN chapters c ON c.book_id = b.id
       WHERE b.author_id = $1
       GROUP BY b.id
       ORDER BY b.updated_at DESC`,
    [authorId]
  );
  return result.rows;
}

export async function createBook(
  title: string,
  description: string,
  authorId: number,
  authorName: string,
  client?: PoolClient
): Promise<Book | null> {
  const executor = client ?? pool;
  const result = await executor.query<Book>(
    `INSERT INTO books (title, description, author_id, author_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
    [title, description, authorId, authorName]
  );
  return result.rows[0] ?? null;
}

export async function updateBook(
  bookId: number,
  authorId: number,
  data: Partial<Pick<Book, "title" | "description">>,
  client?: PoolClient
): Promise<Book | null> {
  const executor = client ?? pool;
  const result = await executor.query<Book>(
    `UPDATE books
       SET title = COALESCE($3, title),
           description = COALESCE($4, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND author_id = $2
       RETURNING *`,
    [bookId, authorId, data.title, data.description]
  );
  return result.rows[0] ?? null;
}

export async function deleteBook(
  bookId: number,
  authorId: number,
  client?: PoolClient
): Promise<Book | null> {
  const executor = client ?? pool;
  const result = await executor.query<Book>(
    "DELETE FROM books WHERE id = $1 AND author_id = $2 RETURNING *",
    [bookId, authorId]
  );
  return result.rows[0] ?? null;
}

export async function updateBookCover(
  bookId: number,
  coverUrl: string | null,
  client?: PoolClient
): Promise<Book | null> {
  const executor = client ?? pool;
  const result = await executor.query<Book>(
    "UPDATE books SET cover_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
    [coverUrl, bookId]
  );
  return result.rows[0] ?? null;
}
