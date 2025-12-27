import { Pool, QueryResult, QueryResultRow } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
  console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);
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
