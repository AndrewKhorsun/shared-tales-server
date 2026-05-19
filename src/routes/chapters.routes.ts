import { Router, Response, NextFunction } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { AuthRequest } from "../../types";
import { AppError } from "../middleware/error.middleware";
import {
  CreateChapterDto,
  createChapterSchema,
  UpdateChapterDto,
  updateChapterSchema,
} from "../validators/chapter.validator";
import { validate } from "../middleware/validate.middleware";
import { runChapterGeneration, sendFeedback, getChapterState } from "../agents/shared-tales";
import {
  ChapterFeedbackDto,
  chapterFeedbackSchema,
} from "../validators/chapter-generation.validator";
import { subscribeToProgress } from "../services/chapter-progress.service";
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

    const chapters = await repo.findChaptersByBookId(bookId);

    res.json({
      chapters,
      total: chapters.length,
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

      const bookId = parseInt(req.params.bookId ?? "");
      const chapterId = parseInt(req.params.chapterId ?? "");
      if (!bookId || !chapterId) throw new AppError(400, "Book ID and Chapter ID are required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      const chapter = await repo.findChapterByIdAndBookId(chapterId, bookId);
      if (!chapter) throw new AppError(404, "Chapter not found");

      res.json({ chapter });
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
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookId = parseInt(req.params.bookId ?? "");
      if (!bookId) throw new AppError(400, "Book ID is required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      const { title, content, order_index } = req.body as CreateChapterDto;

      const chapter = await repo.createChapter(bookId, title, content ?? "", order_index ?? 0);

      res.status(201).json({
        message: "Chapter created successfully",
        chapter,
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

      const bookId = parseInt(req.params.bookId ?? "");
      const chapterId = parseInt(req.params.chapterId ?? "");
      if (!bookId || !chapterId) throw new AppError(400, "Book ID and Chapter ID are required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      const { title, content, order_index, status } = req.body as UpdateChapterDto;

      const chapter = await repo.updateChapter(chapterId, bookId, {
        title,
        content,
        order_index,
        status,
      });
      if (!chapter) throw new AppError(404, "Chapter not found");

      res.json({
        message: "Chapter updated successfully",
        chapter,
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

      const bookId = parseInt(req.params.bookId ?? "");
      const chapterId = parseInt(req.params.chapterId ?? "");
      if (!bookId || !chapterId) throw new AppError(400, "Book ID and Chapter ID are required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      const chapter = await repo.findChapterByIdAndBookId(chapterId, bookId);
      if (!chapter) throw new AppError(404, "Chapter not found");

      const isGenerating = await repo.hasGeneratingChapterAtOrAfter(bookId, chapter.order_index);
      if (isGenerating) {
        throw new AppError(400, "Cannot delete this chapter — generation is currently in progress");
      }

      const hasDependent = await repo.hasDependentChaptersWithContent(bookId, chapter.order_index);
      if (hasDependent) {
        throw new AppError(
          400,
          "Cannot delete this chapter — later chapters already have generated content that depends on it"
        );
      }

      const deleted = await repo.deleteChapter(chapterId, bookId);
      if (!deleted) throw new AppError(404, "Chapter not found");

      res.json({
        message: "Chapter deleted successfully",
        chapter: deleted,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:chapterId/generate",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookId = parseInt(req.params.bookId ?? "");
      const chapterId = parseInt(req.params.chapterId ?? "");
      if (!bookId || !chapterId) throw new AppError(400, "Book ID and Chapter ID are required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      const hint: string | undefined = req.body?.hint;

      await repo.setChapterStatus(chapterId, bookId, "generating");

      try {
        const { status, emitter } = await runChapterGeneration(bookId, chapterId, hint);
        emitter.on("error", async () => {
          await repo.setChapterStatus(chapterId, bookId, "draft");
        });
        emitter.on("complete", async () => {
          await repo.setChapterStatus(chapterId, bookId, "published");
        });
        subscribeToProgress(emitter, req.user.id.toString());
        res.json({ status });
      } catch (genError) {
        await repo.setChapterStatus(chapterId, bookId, "draft");
        throw genError;
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:chapterId/feedback",
  authenticateToken,
  validate(chapterFeedbackSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookId = parseInt(req.params.bookId ?? "");
      const chapterId = parseInt(req.params.chapterId ?? "");
      if (!bookId || !chapterId) throw new AppError(400, "Book ID and Chapter ID are required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      const body = req.body as ChapterFeedbackDto;

      const { status, emitter } = await sendFeedback(
        bookId,
        chapterId,
        body.approved,
        body.approved === false ? body.feedback : undefined
      );
      subscribeToProgress(emitter, req.user.id.toString());
      res.json({ status });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:chapterId/state",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new AppError(401, "Unauthorized");
      }

      const bookId = parseInt(req.params.bookId ?? "");
      const chapterId = parseInt(req.params.chapterId ?? "");
      if (!bookId || !chapterId) throw new AppError(400, "Book ID and Chapter ID are required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      const result = await getChapterState(bookId, chapterId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
