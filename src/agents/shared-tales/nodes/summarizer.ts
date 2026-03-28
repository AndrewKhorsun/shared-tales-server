import { ChapterState } from "../state";
import { extractText } from "../utils";
import { llm } from "../llm";

export async function summarizerNode(
  state: typeof ChapterState.State
): Promise<Partial<typeof ChapterState.State>> {
  const { draft, chapter_number, book_context } = state;

  console.log(`[summarizer] chapter=${chapter_number}`);

  const prompt = `You are a concise summarizer. Write a brief summary of this chapter.

CHAPTER ${chapter_number}:
${draft}

Requirements:
- 3-5 sentences maximum
- Include: key plot events, character actions, emotional shifts, any new information revealed
- Skip descriptions, atmosphere, and filler — only what matters for story continuity
- Write in ${book_context.language}

Summary:`;

  const response = await llm.invoke(prompt);
  const summary = extractText(response);

  console.log(`[summarizer] done: "${summary.slice(0, 100)}..."`);

  return {
    chapter_summary: summary,
  };
}
