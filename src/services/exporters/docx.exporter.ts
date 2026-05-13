import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  Packer,
  AlignmentType,
  BorderStyle,
  SectionType,
  IStylesOptions,
  convertInchesToTwip,
} from "docx";
import { readFile } from "fs/promises";
import path from "path";
import { Book, Chapter } from "../../../types";
import { ExportMimeType, ExportResult } from "../../../types/export";
import { bookTheme } from "./book-theme";
import { blockTokensToParagraphs } from "./export-utils";

const { font, color, fontSize, spacing, margin, indent, coverImage, divider } = bookTheme;

const styles: IStylesOptions = {
  default: {
    document: {
      run: { font: font.body, size: fontSize.body, color: color.textPrimary },
      paragraph: { spacing: { line: spacing.lineHeightBody, after: spacing.afterBody } },
    },
    heading1: {
      run: { font: font.heading, size: fontSize.heading1, bold: true, color: color.textHeading },
      paragraph: { spacing: { before: 0, after: 240 }, alignment: AlignmentType.CENTER },
    },
    heading2: {
      run: { font: font.heading, size: fontSize.heading2, bold: true, color: color.heading2 },
      paragraph: { spacing: { before: 480, after: 240 } },
    },
  },
  paragraphStyles: [
    {
      id: "bookTitle",
      name: "Book Title",
      basedOn: "Normal",
      run: { font: font.heading, size: fontSize.bookTitle, bold: true, color: color.textHeading },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: spacing.afterBookTitle },
      },
    },
    {
      id: "bookAuthor",
      name: "Book Author",
      basedOn: "Normal",
      run: { font: font.heading, size: fontSize.author, italics: true, color: color.textMuted },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: { before: spacing.beforeAuthor, after: 0 },
      },
    },
    {
      id: "bookDescription",
      name: "Book Description",
      basedOn: "Normal",
      run: {
        font: font.body,
        size: fontSize.description,
        color: color.textSecondary,
        italics: true,
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: { before: spacing.beforeDescription, after: 0 },
        indent: {
          left: convertInchesToTwip(indent.descriptionSide),
          right: convertInchesToTwip(indent.descriptionSide),
        },
      },
    },
    {
      id: "chapterTitle",
      name: "Chapter Title",
      basedOn: "Normal",
      run: {
        font: font.heading,
        size: fontSize.chapterTitle,
        bold: true,
        color: color.textHeading,
      },
      paragraph: {
        spacing: { before: 0, after: spacing.afterChapterTitle },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: divider.size,
            color: color.divider,
            space: divider.space,
          },
        },
      },
    },
    {
      id: "chapterBody",
      name: "Chapter Body",
      basedOn: "Normal",
      run: { font: font.body, size: fontSize.body, color: color.textPrimary },
      paragraph: {
        spacing: { line: spacing.lineHeightBody, after: spacing.afterBody },
        indent: { firstLine: convertInchesToTwip(indent.bodyFirstLine) },
      },
    },
  ],
};

type ImageType = "jpg" | "png";

function detectImageType(url: string): ImageType {
  const ext = url.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (ext === "png") return "png";
  return "jpg"; // jpeg and webp both render fine as jpg in docx
}

async function loadCoverImage(url: string): Promise<{ data: Buffer; type: ImageType } | null> {
  try {
    const filePath = url.startsWith("/") ? path.join(process.cwd(), url) : url;
    const data = await readFile(filePath);
    const type = detectImageType(url);
    return { data, type };
  } catch (err) {
    console.error("[docx] cover image error:", err);
    return null;
  }
}

function coverSection(
  book: Book,
  cover: { data: Buffer; type: ImageType } | null
): ConstructorParameters<typeof Document>[0]["sections"][number] {
  const children: Paragraph[] = [];

  children.push(new Paragraph({ style: "bookTitle", children: [new TextRun(book.title)] }));

  if (book.description) {
    children.push(
      new Paragraph({ style: "bookDescription", children: [new TextRun(book.description)] })
    );
  }

  if (cover) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: spacing.beforeCoverImage, after: spacing.afterCoverImage },
        children: [
          new ImageRun({
            data: cover.data,
            transformation: { width: coverImage.width, height: coverImage.height },
            type: cover.type,
          }),
        ],
      })
    );
  } else {
    children.push(
      new Paragraph({
        spacing: { before: spacing.placeholderNoCover, after: spacing.placeholderNoCover },
        children: [],
      })
    );
  }

  children.push(new Paragraph({ style: "bookAuthor", children: [new TextRun(book.author_name)] }));

  return {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        margin: {
          top: convertInchesToTwip(margin.cover.top),
          bottom: convertInchesToTwip(margin.cover.bottom),
          left: convertInchesToTwip(margin.cover.side),
          right: convertInchesToTwip(margin.cover.side),
        },
      },
    },
    children,
  };
}

function chaptersSection(
  chapters: Chapter[]
): ConstructorParameters<typeof Document>[0]["sections"][number] {
  const children: Paragraph[] = [];

  chapters.forEach((chapter, index) => {
    children.push(
      new Paragraph({
        style: "chapterTitle",
        pageBreakBefore: index > 0,
        children: [new TextRun(chapter.title)],
      })
    );

    children.push(...blockTokensToParagraphs(chapter.content));
  });

  return {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        margin: {
          top: convertInchesToTwip(margin.chapter.top),
          bottom: convertInchesToTwip(margin.chapter.bottom),
          left: convertInchesToTwip(margin.chapter.side),
          right: convertInchesToTwip(margin.chapter.side),
        },
      },
    },
    children,
  };
}

export async function exportToDocx(book: Book, chapters: Chapter[]): Promise<ExportResult> {
  const cover = book.cover_image_url ? await loadCoverImage(book.cover_image_url) : null;

  const doc = new Document({
    styles,
    sections: [coverSection(book, cover), chaptersSection(chapters)],
  });

  const buffer = await Packer.toBuffer(doc);
  return {
    fileName: `${book.title}.docx`,
    fileType: ExportMimeType.Docx,
    fileContent: buffer,
  };
}
