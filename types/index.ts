import { Request } from "express";
import { BookLanguage, GenerationSettings } from "../src/validators/book-plan.validator";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    }
  }
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  email_verified: boolean;
  email_verification_token: string | null;
  created_at: Date;
}

export interface Book {
  id: number;
  title: string;
  description: string;
  content: string;
  author_id: number;
  author_name: string;
  created_at: Date;
  updated_at: Date;
  cover_image_url: string | null;
  total_chapters?: number;
  published_chapters?: number;
  total_word_count?: number;
  has_generating_chapter?: boolean;
}

export interface BookPlan {
  id: number;
  book_id: number;
  genre: string;
  target_audience: string;
  writing_style: string;
  generation_settings: GenerationSettings;
  language: BookLanguage;
  created_at: Date;
  updated_at: Date;
}

export interface Chapter {
  id: number;
  book_id: number;
  title: string;
  content: string;
  order_index: number;
  status: "draft" | "published" | "archived";
  plan: string;
  agent_state: Record<string, unknown>;
  word_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}
