export type BookExportFormat = "epub" | "pdf" | "docx";

export enum ExportMimeType {
  Docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  Pdf = "application/pdf",
  Epub = "application/epub+zip",
}

export interface BookExportData {
  format: BookExportFormat;
  bookId: number;
  chapters: number[] | null;
}

export interface ExportResult {
  fileName: string;
  fileType: ExportMimeType;
  fileContent: Buffer;
}
