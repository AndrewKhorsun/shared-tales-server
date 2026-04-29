import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import * as db from "../db";
import { authHeader } from "./helpers/auth";
import type { BookPlan } from "../types";
import type { QueryResult } from "pg";

const mockQuery = vi.mocked(db.query);

const dbBook = { id: 5 };

const dbPlan: BookPlan = {
  id: 1,
  book_id: 5,
  genre: "Fantasy",
  target_audience: "Young adults",
  writing_style: "Descriptive",
  language: "english",
  generation_settings: {
    characters: [],
    setting: { world: "", atmosphere: "" },
    plot_arc: { premise: "", conflict: "", resolution: "" },
    chapter_summaries: [],
  },
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

describe("GET /api/books/:bookId/plan", () => {
  it("returns 200 with plan", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([dbPlan]));

    const res = await request(app).get("/api/books/5/plan").set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.bookPlan.genre).toBe("Fantasy");
  });

  it("returns 200 with null when no plan exists", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbBook])).mockResolvedValueOnce(makeResult([]));

    const res = await request(app).get("/api/books/5/plan").set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.bookPlan).toBeNull();
  });

  it("returns 404 when book not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app).get("/api/books/999/plan").set(authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/books/5/plan");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/books/:bookId/plan", () => {
  const validBody = {
    genre: "Fantasy",
    target_audience: "Young adults",
    writing_style: "Descriptive and immersive",
    language: "english",
  };

  it("returns 201 with created plan", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([dbPlan]));

    const res = await request(app).post("/api/books/5/plan").set(authHeader()).send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.bookPlan.genre).toBe("Fantasy");
  });

  it("returns 409 when plan already exists", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([dbPlan]));

    const res = await request(app).post("/api/books/5/plan").set(authHeader()).send(validBody);
    expect(res.status).toBe(409);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/books/5/plan")
      .set(authHeader())
      .send({ genre: "Fantasy" });

    expect(res.status).toBe(400);
  });
});

describe("PUT /api/books/:bookId/plan", () => {
  it("returns 200 with updated plan", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([{ ...dbPlan, genre: "Sci-Fi" }]));

    const res = await request(app)
      .put("/api/books/5/plan")
      .set(authHeader())
      .send({ genre: "Sci-Fi" });

    expect(res.status).toBe(200);
    expect(res.body.bookPlan.genre).toBe("Sci-Fi");
  });

  it("returns 404 when book not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .put("/api/books/999/plan")
      .set(authHeader())
      .send({ genre: "x" });
    expect(res.status).toBe(404);
  });
});
