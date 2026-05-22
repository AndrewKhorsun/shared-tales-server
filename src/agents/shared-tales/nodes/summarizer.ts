import { ChapterState } from "../state";
import { extractText, getBookId, getChapterId, getEmitter } from "../utils";
import { llm } from "../llm";
import { RunnableConfig } from "@langchain/core/runnables";
import { CostLoggingCallback } from "../costLogger";
import { withRetry } from "../../../utils/retry";
import * as repo from "../../../repositories";

export async function summarizerNode(
  state: typeof ChapterState.State,
  config?: RunnableConfig
): Promise<Partial<typeof ChapterState.State>> {
  const { draft, chapter_number, book_context } = state;
  const emitter = getEmitter(config);
  const bookId = getBookId(config);
  const chapterId = getChapterId(config);

  if (!draft) {
    console.warn(`[summarizer] draft is empty for chapter=${chapter_number}`);
    emitter?.emit("error", {
      stage: "summarizer",
      message: `Chapter ${chapter_number} could not be saved: draft is empty.`,
    });
    return { chapter_summary: "" };
  }

  console.log(`[summarizer] chapter=${chapter_number}`);

  emitter?.emit("progress", {
    stage: "summarizer",
    message: "Summarizing chapter....",
  });

  const prompt = `You are a precise and conservative story summarizer.

CHAPTER ${chapter_number}:
${draft}

Your job is to summarize ONLY what is explicitly established in the text.
Do NOT interpret, expand, or infer beyond what is clearly shown.

LENGTH:
- 3–5 sentences maximum, one short paragraph

CONTENT — include only:
- key plot events
- important character actions
- emotional shifts (only if clearly shown in the text)
- information explicitly confirmed in the chapter

STRICT RULES:
- Do NOT infer hidden meanings or intentions
- Do NOT upgrade ambiguity into certainty
  (if something is implied or suspected, keep it uncertain in the summary)
- Do NOT reveal more than the chapter explicitly confirms
- If something is unclear in the text, keep it unclear in the summary

UNCERTAINTY HANDLING:
- Reflect ambiguity using phrases like: "seems", "appears", "is unclear", "may indicate"

Write in ${book_context.language}. Do not add commentary.

Summary:

After the summary, add exactly these three lines:

EMOTIONAL ARC: <what the POV character attempted and how it ended emotionally — one sentence>

SECONDARY CHARACTERS: <for each named character who appeared: name + what they visibly wanted in this chapter>

CORE STATE: <list of active unresolved story engines, max 3–5 items — only what remains genuinely open after this chapter, using neutral language without interpretation>

HOOK STATUS: <for each item in REMAINS UNKNOWN from previous chapters — 
  state whether it was advanced, partially revealed, or still open in this chapter.
  Format: "hook name: status". 
  Only include hooks that were touched in this chapter.
  If none were touched, write "none advanced">

NEW HOOKS: <list any new unresolved questions or plot threads 
  introduced in this chapter that did not exist before.
  If none, write "none">
`;

  const costCallback = new CostLoggingCallback({
    agentNode: "summarizer",
    bookId,
    chapterNumber: chapter_number,
    model: "claude-haiku-4-5",
  });
  const response = await withRetry(() => llm.invoke(prompt, { callbacks: [costCallback] }), {
    onRetry: (attempt, err) => console.warn(`[summarizer] retry ${attempt} after error: ${err}`),
  });
  const fullOutput = extractText(response);

  const newHooksMatch = fullOutput.match(/NEW HOOKS:\s*([\s\S]+?)(?:\n\n|$)/);
  const newHooksRaw = newHooksMatch?.[1]?.trim() ?? "none";
  const newHooks =
    newHooksRaw === "none"
      ? []
      : newHooksRaw
          .split("\n")
          .map((h) => h.replace(/^[-*•]\s*/, "").trim())
          .filter(Boolean);

  const summary = fullOutput.split(/\nEMOTIONAL ARC:/)[0]?.trim() ?? "";

  if (bookId && chapterId) {
    await repo.updateChapter(chapterId, bookId, {
      content: draft,
      status: "published",
    });
    await repo.appendChapterSummary(bookId, {
      chapter: chapter_number,
      summary,
      new_hooks: newHooks,
    });

    console.log(`[summarizer] saved chapter=${chapterId} to DB`);
  }

  emitter?.emit("done", {
    summary,
    content: draft,
  });

  return {
    chapter_summary: summary,
  };
}
