import { PoolClient } from "pg";
import { pool } from "../../db";

interface AgentCostLogData {
  bookId: number | null;
  chapterNumber: number | null;
  agentNode: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
}

export async function insertAgentCostLog(
  data: AgentCostLogData,
  client?: PoolClient
): Promise<void> {
  const executor = client ?? pool;
  await executor.query(
    `INSERT INTO agent_cost_logs
      (book_id, chapter_number, agent_node, model,
       input_tokens, output_tokens, total_tokens,
       input_cost_usd, output_cost_usd, total_cost_usd)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      data.bookId,
      data.chapterNumber,
      data.agentNode,
      data.model,
      data.inputTokens,
      data.outputTokens,
      data.totalTokens,
      data.inputCostUsd,
      data.outputCostUsd,
      data.totalCostUsd,
    ]
  );
}
