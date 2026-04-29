import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import * as db from "../db";
import { authHeader } from "./helpers/auth";
import type { Book, Chapter } from "../types";
import type { QueryResult } from "pg";

const mockQuery = vi.mocked(db.query);

const dbBook: Pick<Book, "id"> = { id: 5 };

const dbChapter: Chapter = {
  id: 20,
  book_id: 5,
  title: "Chapter One",
  content: "",
  order_index: 1,
  status: "draft",
  plan: "",
  agent_state: {},
  created_at: new Date(),
  updated_at: new Date(),
};

function makeResult<T>(rows: T[]): QueryResult<T & Record<string, unknown>> {
  return {
    rows: rows as (T & Record<string, unknown>)[],
    rowCount: rows.length,
    command: "",
    oid: 0,
    fields: [],
  };
}

beforeEach(() => mockQuery.mockReset());

describe("GET /api/books/:bookId/chapters", () => {
  it("returns 200 with chapters array", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([dbChapter]));

    const res = await request(app).get("/api/books/5/chapters").set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.chapters).toHaveLength(1);
  });

  it("returns 404 when book not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app).get("/api/books/999/chapters").set(authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/books/5/chapters");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/books/:bookId/chapters/:chapterId", () => {
  it("returns 200 with chapter", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([dbChapter]));

    const res = await request(app).get("/api/books/5/chapters/20").set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.chapter.id).toBe(20);
  });

  it("returns 404 when chapter not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbBook])).mockResolvedValueOnce(makeResult([]));

    const res = await request(app).get("/api/books/5/chapters/999").set(authHeader());
    expect(res.status).toBe(404);
  });
});

describe("POST /api/books/:bookId/chapters", () => {
  it("returns 201 with created chapter", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([dbChapter]));

    const res = await request(app)
      .post("/api/books/5/chapters")
      .set(authHeader())
      .send({ title: "Chapter One", content: "", order_index: 1 });

    expect(res.status).toBe(201);
    expect(res.body.chapter.id).toBe(20);
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/books/5/chapters")
      .set(authHeader())
      .send({ content: "no title" });

    expect(res.status).toBe(400);
  });

  it("returns 404 when book not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .post("/api/books/999/chapters")
      .set(authHeader())
      .send({ title: "x" });

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/books/:bookId/chapters/:chapterId", () => {
  it("returns 200 with updated chapter", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([{ ...dbChapter, title: "Updated" }]));

    const res = await request(app)
      .put("/api/books/5/chapters/20")
      .set(authHeader())
      .send({ title: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.chapter.title).toBe("Updated");
  });

  it("returns 404 when chapter not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbBook])).mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .put("/api/books/5/chapters/999")
      .set(authHeader())
      .send({ title: "x" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/books/:bookId/chapters/:chapterId", () => {
  it("returns 200 with deleted chapter", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([dbChapter]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([dbChapter]));

    const res = await request(app).delete("/api/books/5/chapters/20").set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.chapter.id).toBe(20);
  });

  it("returns 404 when chapter not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbBook])).mockResolvedValueOnce(makeResult([]));

    const res = await request(app).delete("/api/books/5/chapters/999").set(authHeader());
    expect(res.status).toBe(404);
  });
});
