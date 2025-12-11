require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware
app.use(express.json());

// === AUTHENTICATION MIDDLEWARE ===
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token not provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// === AUTHENTICATION ROUTES ===

// Register new user
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Check if user exists
    const existingUser = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const result = await db.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at",
      [username, hashedPassword]
    );

    const newUser = result.rows[0];

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

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Find user
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

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

// Get current user info
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
    },
    date: new Date().toISOString(),
  });
});

// === BOOKS ROUTES (CRUD) ===

// Get all books for current user
app.get("/api/books", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
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

// Get specific book
app.get("/api/books/:id", authenticateToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const result = await db.query(
      "SELECT * FROM books WHERE id = $1 AND author_id = $2",
      [bookId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new book
app.post("/api/books", authenticateToken, async (req, res) => {
  try {
    const { title, description, content } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Book title is required" });
    }

    const result = await db.query(
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

// Update book
app.put("/api/books/:id", authenticateToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const { title, description, content } = req.body;

    // Check if book exists and belongs to user
    const checkResult = await db.query(
      "SELECT * FROM books WHERE id = $1 AND author_id = $2",
      [bookId, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Update book
    const result = await db.query(
      `UPDATE books 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           content = COALESCE($3, content),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND author_id = $5
       RETURNING *`,
      [title, description, content, bookId, req.user.id]
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

// Delete book
app.delete("/api/books/:id", authenticateToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);

    const result = await db.query(
      "DELETE FROM books WHERE id = $1 AND author_id = $2 RETURNING *",
      [bookId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
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

// === BASE ROUTES ===

// Home page
app.get("/", (req, res) => {
  res.json({
    message: "Shared Tails API v2.0 - PostgreSQL Edition",
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

// Health check
app.get("/health", async (req, res) => {
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
      error: error.message,
    });
  }
});

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/`);
  console.log(`💾 Database: PostgreSQL`);
  console.log(
    `\n👤 Demo user credentials:\n   Username: demo\n   Password: demo123`
  );
});
