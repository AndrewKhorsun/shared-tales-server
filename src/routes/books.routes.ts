import { Router, Response } from "express";
import * as db from "../../db";
import { AuthRequest, Book, CreateBookRequestBody, UpdateBookRequestBody } from "../../types";
import { authenticateToken } from "../middleware/auth.middleware";

const router: Router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
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

router.get("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
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

router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
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

router.put("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
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

router.delete("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
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

export default router;
