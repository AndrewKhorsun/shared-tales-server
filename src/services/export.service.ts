import { query } from "../../db";
import { Book, Chapter } from "../../types";
import { exportToDocx } from "./exporters/docx.exporter";
import type { BookExportFormat, ExportResult } from "../../types/export";
export { BookExportFormat, BookExportData, ExportResult, ExportMimeType } from "../../types/export";

async function getBookExportData(
  bookId: number,
  userId: number
): Promise<{ book: Book; chapters: Chapter[] }> {
  const bookResult = await query<Book>("SELECT * FROM books WHERE id = $1 AND author_id = $2", [
    bookId,
    userId,
  ]);

  const book = bookResult.rows[0];

  if (book === undefined) {
    throw new Error("Book not found");
  }

  const chaptersResult = await query<Chapter>(
    "SELECT * FROM chapters WHERE book_id = $1 ORDER BY order_index",
    [bookId]
  );

  return { book, chapters: chaptersResult.rows };
}

export async function getChapterExportData(
  bookId: number,
  chapterId: number,
  userId: number
): Promise<{ book: Book; chapters: Chapter[] }> {
  const bookResult = await query<Book>("SELECT * FROM books WHERE id = $1 AND author_id = $2", [
    bookId,
    userId,
  ]);

  const book = bookResult.rows[0];

  if (book === undefined) {
    throw new Error("Book not found");
  }

  const chaptersResult = await query<Chapter>(
    "SELECT * FROM chapters WHERE book_id = $1 AND id = $2",
    [bookId, chapterId]
  );

  const chapter = chaptersResult.rows[0];
  if (chapter === undefined) {
    throw new Error("Chapter not found");
  }

  return { book, chapters: [chapter] };
}

export async function exportBook(
  bookId: number,
  userId: number,
  format: BookExportFormat
): Promise<ExportResult> {
  const { book, chapters } = await getBookExportData(bookId, userId);

  if (format === "docx") return exportToDocx(book, chapters);

  throw new Error(`Unsupported format: ${format}`);
}
