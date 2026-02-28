import "dotenv/config";
import express, { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import * as db from "./db";
import {
  AuthRequest,
  RegisterRequestBody,
  LoginRequestBody,
  CreateBookRequestBody,
  UpdateBookRequestBody,
  User,
  Book,
  JWTPayload,
} from "./types";

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://andrewkhorsun.github.io",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
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

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Token not provided" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: "Invalid or expired token" });
      return;
    }
    req.user = decoded as JWTPayload;
    next();
  });
};

app.post("/api/auth/register", async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body as RegisterRequestBody;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const existingUser = await db.query<User>("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (existingUser.rows.length > 0) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query<User>(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at",
      [username, hashedPassword]
    );

    const newUser = result.rows[0];

    if (!newUser) {
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser.id,
      username: newUser.username,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequestBody;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const result = await db.query<User>("SELECT * FROM users WHERE username = $1", [username]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
      },
      date: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/auth/me", authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    user: {
      id: req.user!.id,
      username: req.user!.username,
    },
    date: new Date().toISOString(),
  });
});

app.get("/api/books", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await db.query<Book>(
      "SELECT * FROM books WHERE author_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );

    res.json({
      books: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/books/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const bookIdParam = req.params.id;
    if (!bookIdParam) {
      res.status(400).json({ error: "Book ID is required" });
      return;
    }

    const bookId = parseInt(bookIdParam);
    const result = await db.query<Book>("SELECT * FROM books WHERE id = $1 AND author_id = $2", [
      bookId,
      req.user.id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/books", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id || !req.user.username) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { title, description, content } = req.body as CreateBookRequestBody;

    if (!title) {
      res.status(400).json({ error: "Book title is required" });
      return;
    }

    const result = await db.query<Book>(
      `INSERT INTO books (title, description, content, author_id, author_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description || "", content || "", req.user.id, req.user.username]
    );

    res.status(201).json({
      message: "Book created successfully",
      book: result.rows[0],
    });
  } catch (error) {
    console.error("Create book error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/books/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const bookIdParam = req.params.id;
    if (!bookIdParam) {
      res.status(400).json({ error: "Book ID is required" });
      return;
    }

    const bookId = parseInt(bookIdParam);
    const { title, description, content } = req.body as UpdateBookRequestBody;

    const checkResult = await db.query<Book>(
      "SELECT * FROM books WHERE id = $1 AND author_id = $2",
      [bookId, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const result = await db.query<Book>(
      `UPDATE books
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           content = COALESCE($3, content),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND author_id = $5
       RETURNING *`,
      [title ?? null, description ?? null, content ?? null, bookId, req.user.id]
    );

    res.json({
      message: "Book updated successfully",
      book: result.rows[0],
    });
  } catch (error) {
    console.error("Update book error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/books/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const bookIdParam = req.params.id;
    if (!bookIdParam) {
      res.status(400).json({ error: "Book ID is required" });
      return;
    }

    const bookId = parseInt(bookIdParam);

    const result = await db.query<Book>(
      "DELETE FROM books WHERE id = $1 AND author_id = $2 RETURNING *",
      [bookId, req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    res.json({
      message: "Book deleted successfully",
      book: result.rows[0],
    });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/", (_req: AuthRequest, res: Response) => {
  res.json({
    message: "Shared Tails API v2.1 - PostgreSQL Edition",
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/`);
  console.log("💾 Database: PostgreSQL");
  console.log("\n👤 Demo user credentials:\n   Username: demo\n   Password: demo123");
});
