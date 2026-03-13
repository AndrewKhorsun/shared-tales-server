import { Router, Response, NextFunction } from "express";
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

const router: Router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
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
      if (!req.user?.id || !req.user.username) {
        throw new AppError(401, "Unauthorized");
      }

      const { title, description, content } = req.body as CreateBookDto;

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

      res.json({
        message: "Book deleted successfully",
        book: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
