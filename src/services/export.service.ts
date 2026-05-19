import { Book, Chapter } from "../../types";
import { exportToDocx } from "./exporters/docx.exporter";
import type { BookExportFormat, ExportResult } from "../../types/export";
import * as repo from "../repositories";
export { BookExportFormat, BookExportData, ExportResult, ExportMimeType } from "../../types/export";

async function getBookExportData(
  bookId: number,
  userId: number
): Promise<{ book: Book; chapters: Chapter[] }> {
  const book = await repo.findBookByIdAndAuthor(bookId, userId);
  if (!book) throw new Error("Book not found");

  const chapters = await repo.findChaptersByBookId(bookId);

  return { book, chapters };
}

export async function getChapterExportData(
  bookId: number,
  chapterId: number,
  userId: number
): Promise<{ book: Book; chapters: Chapter[] }> {
  const book = await repo.findBookByIdAndAuthor(bookId, userId);
  if (!book) throw new Error("Book not found");

  const chapter = await repo.findChapterByIdAndBookId(chapterId, bookId);
  if (!chapter) throw new Error("Chapter not found");

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
