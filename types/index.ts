import { Request } from "express";

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
  onboarding_completed_at: Date | null;
  created_at: Date;
}

export interface Book {
  id: number;
  title: string;
  description: string;
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

export type BookLanguage =
  | "english"
  | "ukrainian"
  | "spanish"
  | "french"
  | "german"
  | "italian"
  | "portuguese"
  | "polish"
  | "dutch"
  | "czech"
  | "swedish"
  | "norwegian"
  | "danish"
  | "finnish"
  | "turkish"
  | "japanese"
  | "korean"
  | "chinese"
  | "arabic"
  | "hindi"
  | "indonesian"
  | "vietnamese"
  | "thai"
  | "romanian"
  | "hungarian"
  | "greek";

export interface GenerationSettingsCharacter {
  name: string;
  role: "protagonist" | "antagonist" | "supporting";
  description: string;
  traits: string[];
}

export interface GenerationSettings {
  characters: GenerationSettingsCharacter[];
  setting: { world: string; atmosphere: string };
  plot_arc: { premise: string; conflict: string; resolution: string };
  chapter_summaries: { chapter: number; summary: string; new_hooks: string[] }[];
}

export interface BookPlan {
  id: number;
  book_id: number;
  genre: string;
  target_audience: string;
  writing_style: string;
  generation_settings: GenerationSettings;
  language: BookLanguage;
  total_chapters?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Chapter {
  id: number;
  book_id: number;
  title: string;
  content: string;
  order_index: number;
  status: "draft" | "published" | "archived" | "generating";
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
