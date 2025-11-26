require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware
app.use(express.json());

// In-memory storage (will be replaced with real DB in future)
const users = [
  {
    id: 1,
    username: "demo",
    // password: 'demo123' (hashed)
    password: "$2a$10$Ij.ki.0rObOONYMxGwmul.ahfXzwF2Rh7vdFNJvrZhj55P6rGMsaS",
  },
];

const books = [];
let bookIdCounter = 1;

// === AUTHENTICATION MIDDLEWARE ===
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

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
    const existingUser = users.find((u) => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: users.length + 1,
      username,
      password: hashedPassword,
    };

    users.push(newUser);

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser.id,
      username: newUser.username,
    });
  } catch (error) {
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
    const user = users.find((u) => u.username === username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

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
      users,
    });
  } catch (error) {
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
    users,
  });
});

// === BOOKS ROUTES (CRUD) ===

// Get all books for current user
app.get("/api/books", authenticateToken, (req, res) => {
  const userBooks = books.filter((book) => book.authorId === req.user.id);
  res.json({
    books: userBooks,
    total: userBooks.length,
  });
});

// Get specific book
app.get("/api/books/:id", authenticateToken, (req, res) => {
  const bookId = parseInt(req.params.id);
  const book = books.find((b) => b.id === bookId && b.authorId === req.user.id);

  if (!book) {
    return res.status(404).json({ error: "Book not found" });
  }

  res.json(book);
});

// Create new book
app.post("/api/books", authenticateToken, (req, res) => {
  const { title, description, content } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Book title is required" });
  }

  const newBook = {
    id: bookIdCounter++,
    title,
    description: description || "",
    content: content || "",
    authorId: req.user.id,
    authorName: req.user.username,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  books.push(newBook);

  res.status(201).json({
    message: "Book created successfully",
    book: newBook,
  });
});

// Update book
app.put("/api/books/:id", authenticateToken, (req, res) => {
  const bookId = parseInt(req.params.id);
  const bookIndex = books.findIndex(
    (b) => b.id === bookId && b.authorId === req.user.id
  );

  if (bookIndex === -1) {
    return res.status(404).json({ error: "Book not found" });
  }

  const { title, description, content } = req.body;
  const book = books[bookIndex];

  // Update fields
  if (title !== undefined) book.title = title;
  if (description !== undefined) book.description = description;
  if (content !== undefined) book.content = content;
  book.updatedAt = new Date().toISOString();

  res.json({
    message: "Book updated successfully",
    book,
  });
});

// Delete book
app.delete("/api/books/:id", authenticateToken, (req, res) => {
  const bookId = parseInt(req.params.id);
  const bookIndex = books.findIndex(
    (b) => b.id === bookId && b.authorId === req.user.id
  );

  if (bookIndex === -1) {
    return res.status(404).json({ error: "Book not found" });
  }

  const deletedBook = books.splice(bookIndex, 1)[0];

  res.json({
    message: "Book deleted successfully",
    book: deletedBook,
  });
});

// === BASE ROUTES ===

// Home page
app.get("/", (req, res) => {
  res.json({
    message: "Shared Tails API v1.0",
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
  });
});

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/`);
  console.log(
    `\n👤 Demo user credentials:\n   Username: demo\n   Password: demo123`
  );
});
