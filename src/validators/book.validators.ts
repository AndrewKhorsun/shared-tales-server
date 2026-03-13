import { z } from "zod";

export const createBookSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().max(150, "Description is too long").optional(),
  content: z.string().optional(),
});

export const updateBookSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(150).optional(),
  content: z.string().optional(),
});

export type CreateBookDto = z.infer<typeof createBookSchema>;
export type UpdateBookDto = z.infer<typeof updateBookSchema>;
