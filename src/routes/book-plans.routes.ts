import { NextFunction, Router, Response } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { AuthRequest } from "../../types";
import { AppError } from "../middleware/error.middleware";
import {
  CreateBookPlanDto,
  createBookPlanSchema,
  UpdateBookPlanDto,
  updateBookPlanSchema,
  GenerationSettings,
} from "../validators/book-plan.validator";
import * as repo from "../repositories";

const router: Router = Router({ mergeParams: true });

router.get("/", authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError(401, "Unauthorized");
    }

    const bookId = parseInt(req.params.bookId ?? "");
    if (!bookId) throw new AppError(400, "Book ID is required");

    const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
    if (!book) throw new AppError(404, "Book not found");

    const bookPlan = await repo.findBookPlanByBookId(bookId);

    res.json({ bookPlan });
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

      const bookId = parseInt(req.params.bookId ?? "");
      if (!bookId) throw new AppError(400, "Book ID is required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      const exists = await repo.bookPlanExists(bookId);
      if (exists) throw new AppError(409, "Book plan already exists");

      const { genre, target_audience, writing_style, language, generation_settings, total_chapters } =
        req.body as CreateBookPlanDto;

      const bookPlan = await repo.createBookPlan(bookId, {
        genre,
        target_audience,
        writing_style,
        language,
        generation_settings: generation_settings ?? ({} as GenerationSettings),
        total_chapters,
      });

      res.status(201).json({
        message: "Book plan created successfully",
        bookPlan,
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

      const bookId = parseInt(req.params.bookId ?? "");
      if (!bookId) throw new AppError(400, "Book ID is required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      const { genre, target_audience, writing_style, language, generation_settings, total_chapters } =
        req.body as UpdateBookPlanDto;

      const bookPlan = await repo.updateBookPlan(bookId, {
        genre,
        target_audience,
        writing_style,
        language,
        generation_settings,
        total_chapters,
      });

      if (!bookPlan) throw new AppError(404, "Book plan not found");

      res.json({
        message: "Book plan updated successfully",
        bookPlan,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
