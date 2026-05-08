import { Router, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import * as db from "../../db";
import { AuthRequest, Book } from "../../types";
import { authenticateToken } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  CreateBookDto,
  createBookSchema,
  UpdateBookDto,
  updateBookSchema,
} from "../validators/book.validators";
import { uploadCover } from "../middleware/upload.middleware";

const router: Router = Router();

function deleteCoverFile(coverUrl: string | null): void {
  if (!coverUrl) return;
  const filename = path.basename(coverUrl);
  const filePath = path.join(process.cwd(), "uploads/covers", filename);
  fs.unlink(filePath, () => {});
}

router.get("/", authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const result = await db.query<Book>(
      `SELECT b.*,
        COUNT(c.id) as total_chapters,
        COUNT(c.id) FILTER (WHERE c.status = 'published') as published_chapters,
        COALESCE(SUM(c.word_count), 0) as total_word_count,
        EXISTS(SELECT 1 FROM chapters WHERE book_id = b.id AND status = 'generating') as has_generating_chapter
       FROM books b
       LEFT JOIN chapters c ON c.book_id = b.id
       WHERE b.author_id = $1
       GROUP BY b.id
       ORDER BY b.updated_at DESC`,
      [req.user.id]
    );

    res.json({
      books: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.id;
      if (!bookIdParam) {
        throw new AppError(400, "Book ID is required");
      }

      const bookId = parseInt(bookIdParam);
      const result = await db.query<Book>("SELECT * FROM books WHERE id = $1 AND author_id = $2", [
        bookId,
        req.user.id,
      ]);

      if (result.rows.length === 0) {
        throw new AppError(404, "Book not found");
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  authenticateToken,
  validate(createBookSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const { title, description, content } = req.body as CreateBookDto;
      const authorName = `${req.user.first_name} ${req.user.last_name}`;

      const result = await db.query<Book>(
        `INSERT INTO books (title, description, content, author_id, author_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
        [title, description || "", content || "", req.user.id, authorName]
      );

      res.status(201).json({
        message: "Book created successfully",
        book: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  authenticateToken,
  validate(updateBookSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.id;
      if (!bookIdParam) {
        throw new AppError(400, "Book ID is required");
      }

      const bookId = parseInt(bookIdParam);
      const { title, description, content } = req.body as UpdateBookDto;

      const checkResult = await db.query<Book>(
        "SELECT * FROM books WHERE id = $1 AND author_id = $2",
        [bookId, req.user.id]
      );

      if (checkResult.rows.length === 0) {
        throw new AppError(404, "Book not found");
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
      next(error);
    }
  }
);

router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.id;
      if (!bookIdParam) {
        throw new AppError(400, "Book ID is required");
      }

      const bookId = parseInt(bookIdParam);

      const result = await db.query<Book>(
        "DELETE FROM books WHERE id = $1 AND author_id = $2 RETURNING *",
        [bookId, req.user.id]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, "Book not found");
      }

      const deletedBook = result.rows[0];
      if (deletedBook) deleteCoverFile(deletedBook.cover_image_url);

      res.json({
        message: "Book deleted successfully",
        book: deletedBook,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/cover",
  authenticateToken,
  (req, res, next) => {
    uploadCover.single("cover")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }
      if (!req.file) {
        throw new AppError(400, "No file uploaded");
      }

      const bookIdParam = req.params.id;
      if (!bookIdParam) throw new AppError(400, "Book ID is required");
      const bookId = parseInt(bookIdParam);
      const coverUrl = `/uploads/covers/${req.file.filename}`;

      const checkResult = await db.query<Book>(
        "SELECT * FROM books WHERE id = $1 AND author_id = $2",
        [bookId, req.user.id]
      );

      if (checkResult.rows.length === 0) {
        fs.unlink(req.file.path, () => {});
        throw new AppError(404, "Book not found");
      }

      const existingBook = checkResult.rows[0];
      if (existingBook) deleteCoverFile(existingBook.cover_image_url);

      const result = await db.query<Book>(
        "UPDATE books SET cover_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [coverUrl, bookId]
      );

      res.json({
        message: "Cover uploaded successfully",
        book: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id/cover",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.id;
      if (!bookIdParam) throw new AppError(400, "Book ID is required");
      const bookId = parseInt(bookIdParam);

      const checkResult = await db.query<Book>(
        "SELECT * FROM books WHERE id = $1 AND author_id = $2",
        [bookId, req.user.id]
      );

      if (checkResult.rows.length === 0) {
        throw new AppError(404, "Book not found");
      }

      const existingBook = checkResult.rows[0];
      if (existingBook) deleteCoverFile(existingBook.cover_image_url);

      const result = await db.query<Book>(
        "UPDATE books SET cover_image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
        [bookId]
      );

      res.json({
        message: "Cover deleted successfully",
        book: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
