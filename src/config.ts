import "dotenv/config";

export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || "",
  },
  server: {
    port: parseInt(process.env.PORT || "3000"),
  },
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5433"),
    name: process.env.DB_NAME || "sharedtails",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },
  cors: {
    allowedOrigins: [
      "http://localhost:3001",
      "https://andrewkhorsun.github.io",
      "https://shared-t.online",
    ],
  },
  llm: {
    anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  },
};

const required = ["JWT_SECRET", "DB_NAME", "DB_USER", "DB_PASSWORD", "ANTHROPIC_API_KEY"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
