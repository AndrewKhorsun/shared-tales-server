import { BaseMessageChunk } from "@langchain/core/messages";

export function extractText(response: BaseMessageChunk): string {
  if (typeof response.content === "string") {
    return response.content;
  }
  return response.content.map((block) => ("text" in block ? block.text : "")).join("");
}
