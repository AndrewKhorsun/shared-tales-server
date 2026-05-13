import { Router, Response, NextFunction } from "express";
import { AuthRequest } from "../../types";
import { authenticateToken } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { exportBook } from "../services/export.service";
import { BookExportFormat } from "../services/export.service";

const router: Router = Router({ mergeParams: true });

router.get(
  "/:format",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) throw new AppError(401, "Unauthorized");

      const bookId = parseInt(req.params.bookId ?? "0");
      const format = req.params.format as BookExportFormat;

      if (!["docx", "pdf", "epub"].includes(format)) {
        throw new AppError(400, `Unsupported format: ${format}`);
      }

      const result = await exportBook(bookId, req.user.id, format);

      const safeFileName = result.fileName.replace(/[^\w.\-]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}"`);
      res.setHeader("Content-Type", result.fileType);
      res.send(result.fileContent);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
