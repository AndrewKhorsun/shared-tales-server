import { vi } from "vitest";

vi.mock("../src/config", () => ({
  config: {
    jwt: { secret: "test-secret" },
    server: { port: 3000 },
    db: { host: "localhost", port: 5432, name: "test", user: "test", password: "test" },
    cors: { allowedOrigins: [] },
    llm: { anthropicKey: "test-key" },
    email: { resendApiKey: "test-key", siteUrl: "http://localhost:3001", apiUrl: "http://localhost:3000" },
    google: { clientId: "test-client-id", clientSecret: "test-client-secret", callbackUrl: "http://localhost:3000/auth/google/callback" },
  },
}));

const mockQueryFn = vi.fn();

vi.mock("../db", () => ({
  query: mockQueryFn,
  pool: { end: vi.fn(), query: mockQueryFn },
}));

vi.mock("../src/middleware/auth.middleware", () => ({
  authenticateToken: vi.fn((req, res, next) => {
    const header = req.headers["authorization"] as string | undefined;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token not provided" });
    }
    const token = header.split(" ")[1];
    if (token !== "valid.test.token") {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = { id: 1, email: "test@test.com", first_name: "Test", last_name: "User" };
    next();
  }),
}));

vi.mock("../src/socket", () => ({
  getIO: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })) })),
  initSocket: vi.fn(),
}));

vi.mock("../src/agents/shared-tales", () => ({
  runChapterGeneration: vi.fn(),
  sendFeedback: vi.fn(),
  getChapterState: vi.fn(),
}));

vi.mock("../src/agents/checkpointer", () => ({
  setupCheckpointer: vi.fn(),
}));
