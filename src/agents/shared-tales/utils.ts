import { BaseMessageChunk } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import EventEmitter from "events";

export function extractText(response: BaseMessageChunk): string {
  if (typeof response.content === "string") {
    return response.content;
  }
  return response.content.map((block) => ("text" in block ? block.text : "")).join("");
}

export function getEmitter(config?: RunnableConfig): EventEmitter | null {
  return (config?.configurable?.emitter as EventEmitter) ?? null;
}

export function getBookId(config?: RunnableConfig): number | null {
  return (config?.configurable?.bookId as number) ?? null;
}

export function getChapterId(config?: RunnableConfig): number | null {
  return (config?.configurable?.chapterId as number) ?? null;
}
