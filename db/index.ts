import { Pool, QueryResult, QueryResultRow } from "pg";
import { config } from "../src/config";

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
  console.log(`   Host: ${config.db.host}:${config.db.port}`);
  console.log(`   Database: ${config.db.name}`);
  console.log(`   User: ${config.db.user}`);
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
  console.error(
    "   This usually happens when PostgreSQL server is restarted or connection is lost"
  );
  process.exit(-1);
});

pool.on("remove", () => {
  console.log("🔌 Client removed from pool");
});

export const query = <T extends QueryResultRow>(
  text: string,
  params?: (string | number | boolean | null | Date)[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

export { pool };
