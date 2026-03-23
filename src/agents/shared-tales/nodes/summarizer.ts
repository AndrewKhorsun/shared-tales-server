import { ChatAnthropic } from "@langchain/anthropic";
import { ChapterState } from "../state";
import { config } from "../../../config";
import { extractText } from "../utils";

const llm = new ChatAnthropic({
  apiKey: config.llm.anthropicKey,
  model: "claude-haiku-4-5",
});

export async function summarizerNode(
  state: typeof ChapterState.State
): Promise<Partial<typeof ChapterState.State>> {
  const { draft, chapter_number, book_context } = state;

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

  return {
    chapter_summary: extractText(response),
  };
}
