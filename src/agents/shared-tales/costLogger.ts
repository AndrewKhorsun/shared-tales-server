import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { LLMResult } from "@langchain/core/outputs";
import { query } from "../../../db";

// Pricing per 1M tokens (USD), as of 2025
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 5.0, output: 25.0 },
  "claude-opus-4-6": { input: 5.0, output: 25.0 },
  "claude-opus-4-5-20251101": { input: 5.0, output: 25.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
  "claude-opus-4-1-20250805": { input: 15.0, output: 75.0 },
  "claude-sonnet-3-7": { input: 3.0, output: 15.0 },
  "claude-haiku-3-5": { input: 0.8, output: 4.0 },
  "claude-haiku-3": { input: 0.25, output: 1.25 },
};

const PER_TOKEN = 1_000_000;

interface CostContext {
  agentNode: string;
  bookId: number | null;
  chapterNumber: number | null;
  model: string;
}

export class CostLoggingCallback extends BaseCallbackHandler {
  name = "CostLoggingCallback";
  private ctx: CostContext;

  constructor(ctx: CostContext) {
    super();
    this.ctx = ctx;
  }

  override async handleLLMEnd(output: LLMResult): Promise<void> {
    const usage = output.llmOutput?.usage;
    if (!usage) return;

    const inputTokens: number = usage.input_tokens ?? usage.prompt_tokens ?? 0;
    const outputTokens: number = usage.output_tokens ?? usage.completion_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;

    const pricing = MODEL_PRICING[this.ctx.model] ?? { input: 0, output: 0 };
    const inputCost = (inputTokens / PER_TOKEN) * pricing.input;
    const outputCost = (outputTokens / PER_TOKEN) * pricing.output;
    const totalCost = inputCost + outputCost;

    console.log(
      `[cost] ${this.ctx.agentNode} | ${this.ctx.model} | in=${inputTokens} out=${outputTokens} | $${totalCost.toFixed(6)}`
    );

    try {
      await query(
        `INSERT INTO agent_cost_logs
          (book_id, chapter_number, agent_node, model,
           input_tokens, output_tokens, total_tokens,
           input_cost_usd, output_cost_usd, total_cost_usd)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          this.ctx.bookId,
          this.ctx.chapterNumber,
          this.ctx.agentNode,
          this.ctx.model,
          inputTokens,
          outputTokens,
          totalTokens,
          inputCost,
          outputCost,
          totalCost,
        ]
      );
    } catch (err) {
      console.error("[cost] failed to log cost:", err);
    }
  }
}
