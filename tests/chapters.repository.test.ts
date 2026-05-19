import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "../db";
import { createChapter, updateChapter } from "../src/repositories/chapters.repository";
import type { Chapter } from "../types";
import type { QueryResult } from "pg";

const mockQuery = vi.mocked(db.pool.query);

function makeResult<T>(rows: T[]): QueryResult<T & Record<string, unknown>> {
  return {
    rows: rows as (T & Record<string, unknown>)[],
    rowCount: rows.length,
    command: "",
    oid: 0,
    fields: [],
  };
}

const baseChapter: Chapter = {
  id: 1,
  book_id: 5,
  title: "Chapter One",
  content: "hello world",
  order_index: 0,
  status: "draft",
  plan: "",
  agent_state: {},
  word_count: 2,
  created_at: new Date(),
  updated_at: new Date(),
};

beforeEach(() => mockQuery.mockReset());

describe("createChapter — word_count via computeWordCount", () => {
  it("counts normal words", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([baseChapter]));
    await createChapter(5, "title", "hello world", 0);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([2])
    );
  });

  it("counts 0 for empty string", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ ...baseChapter, word_count: 0 }]));
    await createChapter(5, "title", "", 0);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([0])
    );
  });

  it("counts 0 for whitespace-only string", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ ...baseChapter, word_count: 0 }]));
    await createChapter(5, "title", "   ", 0);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([0])
    );
  });

  it("handles multiple spaces between words", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ ...baseChapter, word_count: 2 }]));
    await createChapter(5, "title", "hello  world", 0);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([2])
    );
  });

  it("handles tabs and newlines", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([{ ...baseChapter, word_count: 3 }]));
    await createChapter(5, "title", "one\ttwo\nthree", 0);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([3])
    );
  });
});

describe("updateChapter — dynamic SET", () => {
  it("includes word_count in query when content is provided", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([baseChapter]));
    await updateChapter(1, 5, { content: "hello world" });
    const [sql, params] = mockQuery.mock.calls[0]!;
    expect(sql).toContain("word_count");
    expect(params).toContain(2);
  });

  it("omits word_count from query when content is not provided", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([baseChapter]));
    await updateChapter(1, 5, { title: "New Title" });
    const [sql] = mockQuery.mock.calls[0]!;
    expect(sql).not.toContain("word_count");
  });

  it("recalculates word_count correctly when content changes", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([baseChapter]));
    await updateChapter(1, 5, { content: "one two three four" });
    const [, params] = mockQuery.mock.calls[0]!;
    expect(params).toContain(4);
  });

  it("sets word_count to 0 when content becomes empty", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([baseChapter]));
    await updateChapter(1, 5, { content: "" });
    const [, params] = mockQuery.mock.calls[0]!;
    expect(params).toContain(0);
  });
});
