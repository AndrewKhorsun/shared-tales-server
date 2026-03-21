import { Request } from "express";

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
  generation_settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

export interface RegisterRequestBody {
  username: string;
  password: string;
}

export interface LoginRequestBody {
  username: string;
  password: string;
}

export interface CreateBookRequestBody {
  title: string;
  description?: string;
  content?: string;
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

export interface CreateChapterRequestBody {
  title: string;
  content?: string;
  order_index?: number;
  plan?: string;
}

export interface UpdateChapterRequestBody {
  title?: string;
  content?: string;
  order_index?: number;
  status?: "draft" | "published" | "archived";
  plan?: string;
  agent_state?: Record<string, unknown>;
}

export interface JWTPayload {
  id: number;
  username: string;
}
