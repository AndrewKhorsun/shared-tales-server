import { pool } from "../../db";

export async function pingDatabase(): Promise<void> {
  await pool.query("SELECT 1");
}
