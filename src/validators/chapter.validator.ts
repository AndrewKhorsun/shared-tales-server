import { z } from "zod";

export const createChapterSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  content: z.string().optional(),
  order_index: z.number().min(0, "Order index must be positive").optional(),
});

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  order_index: z.number().min(0, "Order index must be positive").optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export type CreateChapterDto = z.infer<typeof createChapterSchema>;
export type UpdateChapterDto = z.infer<typeof updateChapterSchema>;
