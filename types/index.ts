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

export interface CreateChapterRequestBody {
  title: string;
  content?: string;
  order_index?: number;
}

export interface UpdateChapterRequestBody {
  title?: string;
  content?: string;
  order_index?: number;
  status?: "draft" | "published";
}

export interface JWTPayload {
  id: number;
  username: string;
}
