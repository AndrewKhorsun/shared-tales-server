import "dotenv/config";
import express, { Response } from "express";
import * as db from "./db";
import { AuthRequest } from "./types";
import { chaptersRouter, booksRouter, authRouter, bookPlansRouter } from "./src/routes";
import { config } from "./src/config";
import { errorMiddleware } from "./src/middleware/error.middleware";

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && config.cors.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);
app.use("/api/books/:bookId/chapters", chaptersRouter);
app.use("/api/books/:bookId/plan", bookPlansRouter);

app.get("/", (_req: AuthRequest, res: Response) => {
  res.json({
    message: "Shared Tails API v3",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me (requires token)",
      },
      books: {
        list: "GET /api/books (requires token)",
        get: "GET /api/books/:id (requires token)",
        create: "POST /api/books (requires token)",
        update: "PUT /api/books/:id (requires token)",
        delete: "DELETE /api/books/:id (requires token)",
      },
      chapters: {
        list: "GET /api/books/:bookId/chapters (requires token)",
        get: "GET /api/books/:bookId/chapters/:id (requires token)",
        create: "POST /api/books/:bookId/chapters (requires token)",
        update: "PUT /api/books/:bookId/chapters/:id (requires token)",
        delete: "DELETE /api/books/:bookId/chapters/:id (requires token)",
      },
    },
    database: "PostgreSQL",
  });
});

app.get("/health", async (_req: AuthRequest, res: Response) => {
  try {
    await db.query("SELECT 1");
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.use((_req: AuthRequest, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});
app.use(errorMiddleware);

app.listen(config.server.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.server.port}`);
  console.log(`📚 API documentation available at http://localhost:${config.server.port}/`);
  console.log("💾 Database: PostgreSQL");
});
