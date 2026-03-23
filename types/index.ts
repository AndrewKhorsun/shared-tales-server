import { Request } from "express";
import { BookLanguage, GenerationSettings } from "../src/validators/book-plan.validator";

export interface User {
  id: number;
  username: string;
  password: string;
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

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
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
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  id: number;
  username: string;
}
