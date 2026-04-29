import { defineConfig } from "vitest/config";
import path from "path";
import { config as dotenv } from "dotenv";

dotenv({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts", "db/**/*.ts"],
    },
  },
});
