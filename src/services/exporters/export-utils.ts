import { BorderStyle, HeadingLevel, Paragraph, TextRun } from "docx";
import { marked } from "marked";
import { bookTheme } from "./book-theme";

const { color, blockquote: bqTheme } = bookTheme;

marked.use({
  extensions: [
    {
      name: "mark",
      level: "inline",
      start: (src): number => src.indexOf("=="),
      tokenizer(src): { type: string; raw: string; text: string } | undefined {
        const match = /^==([^=]+)==/.exec(src);
        if (match) {
          return { type: "mark", raw: match[0], text: match[1] ?? "" };
        }
        return undefined;
      },
      renderer(): string {
        return "";
      },
    },
  ],
});

interface RunProps {
  bold: boolean;
  italics: boolean;
  strike: boolean;
  underline: boolean;
  highlight: boolean;
  superScript: boolean;
  subScript: boolean;
}

const defaultProps: RunProps = {
  bold: false,
  italics: false,
  strike: false,
  underline: false,
  highlight: false,
  superScript: false,
  subScript: false,
};

function makeRun(text: string, props: RunProps): TextRun {
  return new TextRun({
    text,
    bold: props.bold,
    italics: props.italics,
    strike: props.strike,
    underline: props.underline ? {} : undefined,
    highlight: props.highlight ? "yellow" : undefined,
    superScript: props.superScript,
    subScript: props.subScript,
  });
}

// Parses <u>, <sup>, <sub> HTML tags recursively and returns TextRun[]
function parseHtmlTag(raw: string, props: RunProps): TextRun[] {
  const tagMatch = /^<(u|sup|sub)>([\s\S]*?)<\/\1>$/.exec(raw.trim());
  if (tagMatch) {
    const tag = tagMatch[1] as "u" | "sup" | "sub";
    const inner = tagMatch[2] ?? "";
    const newProps = {
      ...props,
      underline: tag === "u" ? true : props.underline,
      superScript: tag === "sup" ? true : props.superScript,
      subScript: tag === "sub" ? true : props.subScript,
    };
    // The inner content may itself be markdown, re-lex it
    return inlineTokensToRunsWithProps(inner, newProps);
  }
  // Unknown HTML — render as plain text stripping tags
  const stripped = raw.replace(/<[^>]+>/g, "");
  return stripped ? [makeRun(stripped, props)] : [];
}

function tokenToRuns(
  token: ReturnType<typeof marked.Lexer.lexInline>[number],
  props: RunProps
): TextRun[] {
  const inner = "tokens" in token && token.tokens ? token.tokens : [];

  switch (token.type) {
    case "text":
      return [makeRun(token.raw, props)];
    case "strong":
      return inner.length > 0
        ? inner.flatMap((t) => tokenToRuns(t, { ...props, bold: true }))
        : [makeRun(token.text, { ...props, bold: true })];
    case "em":
      return inner.length > 0
        ? inner.flatMap((t) => tokenToRuns(t, { ...props, italics: true }))
        : [makeRun(token.text, { ...props, italics: true })];
    case "codespan":
      return [new TextRun({ text: token.text, style: "CodeChar" })];
    case "del":
      return inner.length > 0
        ? inner.flatMap((t) => tokenToRuns(t, { ...props, strike: true }))
        : [makeRun(token.text, { ...props, strike: true })];
    case "mark":
      return [makeRun((token as unknown as { text: string }).text, { ...props, highlight: true })];
    case "html":
      return parseHtmlTag(token.raw, props);
    default:
      return [];
  }
}

function inlineTokensToRunsWithProps(text: string, props: RunProps): TextRun[] {
  const tokens = marked.Lexer.lexInline(text);
  return tokens.flatMap((token) => tokenToRuns(token, props));
}

export function inlineTokensToRuns(text: string): TextRun[] {
  return inlineTokensToRunsWithProps(text, defaultProps);
}

export function blockTokensToParagraphs(content: string): Paragraph[] {
  const tokens = marked.lexer(content);
  const paragraphs: Paragraph[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "paragraph":
        paragraphs.push(
          new Paragraph({
            style: "chapterBody",
            children: inlineTokensToRuns(token.text),
          })
        );
        break;
      case "heading":
        paragraphs.push(
          new Paragraph({
            heading:
              token.depth === 1
                ? HeadingLevel.HEADING_1
                : token.depth === 2
                  ? HeadingLevel.HEADING_2
                  : HeadingLevel.HEADING_3,
            children: inlineTokensToRuns(token.text),
          })
        );
        break;
      case "blockquote":
        for (const inner of token.tokens ?? []) {
          if (inner.type === "paragraph") {
            paragraphs.push(
              new Paragraph({
                style: "chapterBody",
                indent: { left: bqTheme.indentLeft, firstLine: 0 },
                border: {
                  left: {
                    style: BorderStyle.SINGLE,
                    size: bqTheme.borderSize,
                    color: color.divider,
                    space: bqTheme.borderSpace,
                  },
                },
                children: inlineTokensToRuns(inner.text.replace(/\n/g, " ")),
              })
            );
          }
        }
        break;
      case "hr":
        paragraphs.push(
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 },
            },
            children: [],
          })
        );
        break;
    }
  }

  return paragraphs;
}
