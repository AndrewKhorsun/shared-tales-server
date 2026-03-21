import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { config } from "../config";

const connectionString = `postgresql://${config.db.user}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.name}`;

export const checkpointer = PostgresSaver.fromConnString(connectionString);

export async function setupCheckpointer() {
  await checkpointer.setup();
  console.log("✅ Checkpointer ready");
}
