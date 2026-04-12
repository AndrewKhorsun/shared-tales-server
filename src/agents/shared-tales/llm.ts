import { ChatAnthropic } from "@langchain/anthropic";
import { config } from "../../config";

export const llm = new ChatAnthropic({
  apiKey: config.llm.anthropicKey,
  model: "claude-haiku-4-5",
  temperature: 0.7,
  maxTokens: 4096,
});

export const writerLlm = new ChatAnthropic({
  apiKey: config.llm.anthropicKey,
  model: "claude-sonnet-4-5",
  temperature: 0.8,
  maxTokens: 8192,
});
