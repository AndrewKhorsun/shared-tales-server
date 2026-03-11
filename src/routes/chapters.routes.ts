import { Router, Response } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import * as db from "../../db";
import { AuthRequest, Book, CreateChapterRequestBody, UpdateChapterRequestBody } from "../../types";

const router: Router = Router({ mergeParams: true });

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const bookIdParam = req.params.bookId;
    if (!bookIdParam) {
      res.status(400).json({ error: "Book ID is required" });
      return;
    }
    const bookId = parseInt(bookIdParam);

    const bookCheck = await db.query<Book>(
      "SELECT id FROM books WHERE id = $1 AND author_id = $2",
      [bookId, req.user.id]
    );

    if (bookCheck.rows.length === 0) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const result = await db.query(
      `SELECT * FROM chapters 
         WHERE book_id = $1 
         ORDER BY order_index ASC`,
      [bookId]
    );

    res.json({
      chapters: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Get chapters error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id || !req.user.username) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const bookIdParam = req.params.bookId;
    if (!bookIdParam) {
      res.status(400).json({ error: "Book ID is required" });
      return;
    }
    const bookId = parseInt(bookIdParam);

    const { title, content, order_index } = req.body as CreateChapterRequestBody;

    if (!title) {
      res.status(400).json({ error: "Chapter title is required" });
      return;
    }

    const bookCheck = await db.query<Book>(
      "SELECT id FROM books WHERE id = $1 AND author_id = $2",
      [bookId, req.user.id]
    );

    if (bookCheck.rows.length === 0) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const result = await db.query<Book>(
      `INSERT INTO chapters (title, content,order_index,book_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, content ?? "", order_index ?? 0, bookId]
    );

    res.status(201).json({
      message: "Chapter created successfully",
      chapter: result.rows[0],
    });
  } catch (error) {
    console.error("Create chapter error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/:chapterId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const bookIdParam = req.params.bookId;
    const chapterIdParam = req.params.chapterId;
    if (!bookIdParam || !chapterIdParam) {
      res.status(400).json({ error: "Book ID and Chapter ID are required" });
      return;
    }
    const bookId = parseInt(bookIdParam);
    const chapterId = parseInt(chapterIdParam);

    const bookCheck = await db.query<Book>(
      "SELECT id FROM books WHERE id = $1 AND author_id = $2",
      [bookId, req.user.id]
    );

    if (bookCheck.rows.length === 0) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const { title, content, order_index, status } = req.body as UpdateChapterRequestBody;

    const result = await db.query(
      `UPDATE chapters
         SET title = COALESCE($1, title),
             content = COALESCE($2, content),
             order_index = COALESCE($3, order_index),
             status = COALESCE($4, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND book_id = $6
         RETURNING *`,
      [title ?? null, content ?? null, order_index ?? null, status ?? null, chapterId, bookId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }

    res.json({
      message: "Chapter updated successfully",
      chapter: result.rows[0],
    });
  } catch (error) {
    console.error("Update chapter error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:chapterId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const bookIdParam = req.params.bookId;
    const chapterIdParam = req.params.chapterId;
    if (!bookIdParam || !chapterIdParam) {
      res.status(400).json({ error: "Book ID and Chapter ID are required" });
      return;
    }
    const bookId = parseInt(bookIdParam);
    const chapterId = parseInt(chapterIdParam);

    const bookCheck = await db.query<Book>(
      "SELECT id FROM books WHERE id = $1 AND author_id = $2",
      [bookId, req.user.id]
    );

    if (bookCheck.rows.length === 0) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const result = await db.query(
      "DELETE FROM chapters WHERE id = $1 AND book_id = $2 RETURNING *",
      [chapterId, bookId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }

    res.json({
      message: "Chapter deleted successfully",
      chapter: result.rows[0],
    });
  } catch (error) {
    console.error("Delete chapter error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:chapterId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const bookIdParam = req.params.bookId;
    const chapterIdParam = req.params.chapterId;
    if (!bookIdParam || !chapterIdParam) {
      res.status(400).json({ error: "Book ID and Chapter ID are required" });
      return;
    }
    const bookId = parseInt(bookIdParam);
    const chapterId = parseInt(chapterIdParam);

    const bookCheck = await db.query<Book>(
      "SELECT id FROM books WHERE id = $1 AND author_id = $2",
      [bookId, req.user.id]
    );

    if (bookCheck.rows.length === 0) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    const result = await db.query(
      `SELECT * FROM chapters 
         WHERE book_id = $1 AND id = $2`,
      [bookId, chapterId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }

    res.json({
      chapter: result.rows[0],
    });
  } catch (error) {
    console.error("Get chapters error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
