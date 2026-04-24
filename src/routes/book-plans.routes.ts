import { NextFunction, Router, Response } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { AuthRequest, BookPlan } from "../../types";
import { AppError } from "../middleware/error.middleware";
import * as db from "../../db";
import {
  CreateBookPlanDto,
  createBookPlanSchema,
  UpdateBookPlanDto,
  updateBookPlanSchema,
} from "../validators/book-plan.validator";

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

    const bookCheck = await db.query("SELECT id FROM books WHERE id = $1 AND author_id = $2", [
      bookIdParam,
      req.user.id,
    ]);

    if (bookCheck.rows.length === 0) {
      throw new AppError(404, "Book not found");
    }

    const result = await db.query<BookPlan>("SELECT * FROM book_plans WHERE book_id = $1", [
      bookIdParam,
    ]);

    res.json({
      bookPlan: result.rows[0] ?? null,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  authenticateToken,
  validate(createBookPlanSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.bookId;
      if (!bookIdParam) {
        throw new AppError(400, "Book ID is required");
      }

      const bookCheck = await db.query("SELECT id FROM books WHERE id = $1 AND author_id = $2", [
        bookIdParam,
        req.user.id,
      ]);

      if (bookCheck.rows.length === 0) {
        throw new AppError(404, "Book not found");
      }

      const existingPlan = await db.query("SELECT id FROM book_plans WHERE book_id = $1", [
        bookIdParam,
      ]);

      if (existingPlan.rows.length > 0) {
        throw new AppError(409, "Book plan already exists");
      }

      const { genre, target_audience, writing_style, language, generation_settings } =
        req.body as CreateBookPlanDto;

      const result = await db.query<BookPlan>(
        `INSERT INTO book_plans
              (book_id, genre, target_audience, writing_style, language, generation_settings)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING *`,
        [
          bookIdParam,
          genre,
          target_audience,
          writing_style,
          language,
          JSON.stringify(generation_settings ?? {}),
        ]
      );

      res.status(201).json({
        message: "Book plan created successfully",
        bookPlan: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/",
  authenticateToken,
  validate(updateBookPlanSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookIdParam = req.params.bookId;
      if (!bookIdParam) {
        throw new AppError(400, "Book ID is required");
      }

      const bookCheck = await db.query("SELECT id FROM books WHERE id = $1 AND author_id = $2", [
        bookIdParam,
        req.user.id,
      ]);

      if (bookCheck.rows.length === 0) {
        throw new AppError(404, "Book not found");
      }

      const { genre, target_audience, writing_style, language, generation_settings } =
        req.body as UpdateBookPlanDto;

      const result = await db.query<BookPlan>(
        `UPDATE book_plans
         SET genre = COALESCE($1, genre),
             target_audience = COALESCE($2, target_audience),
             writing_style = COALESCE($3, writing_style),
             language = COALESCE($4, language),
             generation_settings = COALESCE($5, generation_settings),
             updated_at = CURRENT_TIMESTAMP
         WHERE book_id = $6
         RETURNING *`,
        [
          genre ?? null,
          target_audience ?? null,
          writing_style ?? null,
          language ?? null,
          generation_settings ? JSON.stringify(generation_settings) : null,
          bookIdParam,
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, "Book plan not found");
      }

      res.json({
        message: "Book plan updated successfully",
        bookPlan: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
