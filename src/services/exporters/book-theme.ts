// Central design tokens for book exports (DOCX, PDF, EPUB).
// Change values here — all exporters pick them up automatically.

export const bookTheme = {
  font: {
    body: "Georgia",
    heading: "Georgia",
  },

  color: {
    textPrimary: "1A1A1A",
    textHeading: "111111",
    textSecondary: "444444",
    textMuted: "555555",
    heading2: "222222",
    divider: "CCCCCC",
  },

  // Font sizes in half-points (1pt = 2 units)
  fontSize: {
    bookTitle: 64, // 32pt
    chapterTitle: 40, // 20pt
    heading1: 48, // 24pt
    heading2: 36, // 18pt
    author: 28, // 14pt
    description: 24, // 12pt
    body: 24, // 12pt
  },

  // Spacing in twips (20 twips = 1pt)
  spacing: {
    lineHeightBody: 360, // 1.5x line spacing
    afterBody: 200,
    afterBookTitle: 320,
    afterChapterTitle: 480,
    beforeDescription: 320,
    beforeAuthor: 1200,
    beforeCoverImage: 600,
    afterCoverImage: 600,
    placeholderNoCover: 2400, // vertical gap when no cover image
  },

  // Page margins in inches
  margin: {
    cover: { top: 1.5, bottom: 1.5, side: 0.4 },
    chapter: { top: 0.4, bottom: 0.6, side: 0.3 },
  },

  // Text indents in inches
  indent: {
    descriptionSide: 0.25,
    bodyFirstLine: 0.3,
  },

  // Cover image dimensions in pixels
  coverImage: {
    width: 380,
    height: 530,
  },

  // Chapter title bottom border
  divider: {
    size: 4, // border width in eighths of a point
    space: 8, // space between border and text (pt)
  },

  // Blockquote styling
  blockquote: {
    indentLeft: 720, // twips (0.5 inch)
    borderSize: 12, // eighths of a point (~1.5pt)
    borderSpace: 12, // space between border and text (pt)
  },
};
