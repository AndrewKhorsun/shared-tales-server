import { vi } from "vitest";

vi.mock("../src/config", () => ({
  config: {
    jwt: { secret: "test-secret" },
    server: { port: 3000 },
    db: { host: "localhost", port: 5432, name: "test", user: "test", password: "test" },
    cors: { allowedOrigins: [] },
    llm: { anthropicKey: "test-key" },
  },
}));

vi.mock("../db", () => ({
  query: vi.fn(),
  pool: { end: vi.fn(), query: vi.fn() },
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
