import { Router, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { AuthRequest } from "../../types";
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
import * as repo from "../repositories";

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

    const books = await repo.findAllAuthorBooks(req.user.id);

    res.json({
      books,
      total: books.length,
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

      const bookId = parseInt(req.params.id ?? "");
      if (!bookId) throw new AppError(400, "Book ID is required");

      const book = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      res.json(book);
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

      const { title, description } = req.body as CreateBookDto;
      const authorName = `${req.user.first_name} ${req.user.last_name}`;

      const book = await repo.createBook(title, description || "", req.user.id, authorName);

      res.status(201).json({
        message: "Book created successfully",
        book,
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

      const bookId = parseInt(req.params.id ?? "");
      if (!bookId) throw new AppError(400, "Book ID is required");

      const existing = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!existing) throw new AppError(404, "Book not found");

      const { title, description } = req.body as UpdateBookDto;

      const book = await repo.updateBook(bookId, req.user.id, { title, description });

      res.json({
        message: "Book updated successfully",
        book,
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

      const bookId = parseInt(req.params.id ?? "");
      if (!bookId) throw new AppError(400, "Book ID is required");

      const book = await repo.deleteBook(bookId, req.user.id);
      if (!book) throw new AppError(404, "Book not found");

      deleteCoverFile(book.cover_image_url);

      res.json({
        message: "Book deleted successfully",
        book,
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

      const bookId = parseInt(req.params.id ?? "");
      if (!bookId) throw new AppError(400, "Book ID is required");

      const existing = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!existing) {
        fs.unlink(req.file.path, () => {});
        throw new AppError(404, "Book not found");
      }

      deleteCoverFile(existing.cover_image_url);

      const coverUrl = `/uploads/covers/${req.file.filename}`;
      const book = await repo.updateBookCover(bookId, coverUrl);

      res.json({
        message: "Cover uploaded successfully",
        book,
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

      const bookId = parseInt(req.params.id ?? "");
      if (!bookId) throw new AppError(400, "Book ID is required");

      const existing = await repo.findBookByIdAndAuthor(bookId, req.user.id);
      if (!existing) throw new AppError(404, "Book not found");

      deleteCoverFile(existing.cover_image_url);

      const book = await repo.updateBookCover(bookId, null);

      res.json({
        message: "Cover deleted successfully",
        book,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
