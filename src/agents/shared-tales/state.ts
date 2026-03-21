import { Annotation } from "@langchain/langgraph";
import { CreateBookPlanDto } from "../../validators/book-plan.validator";

export const ChapterState = Annotation.Root({
  // --- Input (set once at the start, never changes) ---
  book_context: Annotation<CreateBookPlanDto>({
    reducer: (_, next) => next,
    default: () => ({}),
  }),
  chapter_number: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  chapter_plan_hint: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // --- Planner ---
  plan: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  plan_approved: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  user_feedback: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  // --- Writer + Editor ---
  draft: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  all_drafts: Annotation<string[]>({
    reducer: (existing, next) => [...existing, ...next],
    default: () => [],
  }),
  editor_approved: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  editor_feedback: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  write_attempts: Annotation<number>({
    reducer: (current, next) => current + next,
    default: () => 0,
  }),

  // --- Summarizer ---
  chapter_summary: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});
