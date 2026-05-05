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
    port: parseInt(process.env.DB_PORT || "5432"),
    name: process.env.DB_NAME || "",
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
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
  email: {
    resendApiKey: process.env.RESEND_API_KEY || "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001",
    apiUrl: process.env.PUBLIC_API_URL || "http://localhost:3000",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl: `${process.env.API_URL || "http://localhost:3000"}/auth/google/callback`,
  },
};

const required = [
  "JWT_SECRET",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
