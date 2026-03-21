import { Router, Response, NextFunction } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import * as db from "../../db";
import { AuthRequest, Book, Chapter } from "../../types";
import { AppError } from "../middleware/error.middleware";
import {
  CreateChapterDto,
  createChapterSchema,
  UpdateChapterDto,
  updateChapterSchema,
} from "../validators/chapter.validator";
import { validate } from "../middleware/validate.middleware";

const router: Router = Router({ mergeParams: true });

router.get("/", authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const bookIdParam = req.params.bookId;
    if (!bookIdParam) {
      throw new AppError(400, "Book ID is required");
    }
    const bookId = parseInt(bookIdParam);

    const bookCheck = await db.query<Book>(
      "SELECT id FROM books WHERE id = $1 AND author_id = $2",
      [bookId, req.user.id]
    );

    if (bookCheck.rows.length === 0) {
      throw new AppError(404, "Book not found");
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
    next(error);
  }
});

router.get(
  "/:chapterId",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.bookId;
      const chapterIdParam = req.params.chapterId;
      if (!bookIdParam || !chapterIdParam) {
        throw new AppError(400, "Book ID and Chapter ID are required");
      }
      const bookId = parseInt(bookIdParam);
      const chapterId = parseInt(chapterIdParam);

      const bookCheck = await db.query<Book>(
        "SELECT id FROM books WHERE id = $1 AND author_id = $2",
        [bookId, req.user.id]
      );

      if (bookCheck.rows.length === 0) {
        throw new AppError(404, "Book not found");
      }

      const result = await db.query<Chapter>(
        `SELECT * FROM chapters
         WHERE book_id = $1 AND id = $2`,
        [bookId, chapterId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, "Chapter not found");
      }

      res.json({
        chapter: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  authenticateToken,
  validate(createChapterSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id || !req.user.username) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.bookId;
      if (!bookIdParam) {
        throw new AppError(400, "Book ID is required");
      }
      const bookId = parseInt(bookIdParam);

      const { title, content, order_index } = req.body as CreateChapterDto;

      const bookCheck = await db.query<Book>(
        "SELECT id FROM books WHERE id = $1 AND author_id = $2",
        [bookId, req.user.id]
      );

      if (bookCheck.rows.length === 0) {
        throw new AppError(404, "Book not found");
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
      next(error);
    }
  }
);

router.put(
  "/:chapterId",
  authenticateToken,
  validate(updateChapterSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.bookId;
      const chapterIdParam = req.params.chapterId;
      if (!bookIdParam || !chapterIdParam) {
        throw new AppError(400, "Book ID and Chapter ID are required");
      }
      const bookId = parseInt(bookIdParam);
      const chapterId = parseInt(chapterIdParam);

      const bookCheck = await db.query<Book>(
        "SELECT id FROM books WHERE id = $1 AND author_id = $2",
        [bookId, req.user.id]
      );

      if (bookCheck.rows.length === 0) {
        throw new AppError(404, "Book not found");
      }

      const { title, content, order_index, status } = req.body as UpdateChapterDto;

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
        throw new AppError(404, "Chapter not found");
      }

      res.json({
        message: "Chapter updated successfully",
        chapter: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:chapterId",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.bookId;
      const chapterIdParam = req.params.chapterId;
      if (!bookIdParam || !chapterIdParam) {
        throw new AppError(400, "Book ID and Chapter ID are required");
      }
      const bookId = parseInt(bookIdParam);
      const chapterId = parseInt(chapterIdParam);

      const bookCheck = await db.query<Book>(
        "SELECT id FROM books WHERE id = $1 AND author_id = $2",
        [bookId, req.user.id]
      );

      if (bookCheck.rows.length === 0) {
        throw new AppError(404, "Book not found");
      }

      const result = await db.query(
        "DELETE FROM chapters WHERE id = $1 AND book_id = $2 RETURNING *",
        [chapterId, bookId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, "Chapter not found");
      }

      res.json({
        message: "Chapter deleted successfully",
        chapter: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
