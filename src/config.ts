export const config = {
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "a3f8c2e1d4b7a9f0e2c5d8b1a4f7c0e3d6b9a2f5c8e1d4b7a0f3c6e9d2b5a8f1c4e7d0b3a6f9c2e5d8b1a4f7",
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
    allowedOrigins: ["http://localhost:5173", "https://andrewkhorsun.github.io"],
  },
};

const required = ["JWT_SECRET", "DB_NAME", "DB_USER", "DB_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
