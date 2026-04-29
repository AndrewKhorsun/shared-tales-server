import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import * as db from "../db";
import { authHeader } from "./helpers/auth";
import type { Book } from "../types";
import type { QueryResult } from "pg";

const mockQuery = vi.mocked(db.query);

const dbBook: Book = {
  id: 10,
  title: "Test Book",
  description: "desc",
  content: "",
  author_id: 1,
  author_name: "Test User",
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

describe("GET /api/books", () => {
  it("returns 200 with books array", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbBook]));

    const res = await request(app).get("/api/books").set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.books).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/books");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/books/:id", () => {
  it("returns 200 with book", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbBook]));

    const res = await request(app).get("/api/books/10").set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(10);
  });

  it("returns 404 when book not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app).get("/api/books/999").set(authHeader());
    expect(res.status).toBe(404);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/books/10");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/books", () => {
  it("returns 201 with created book", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbBook]));

    const res = await request(app)
      .post("/api/books")
      .set(authHeader())
      .send({ title: "Test Book", description: "desc", content: "" });

    expect(res.status).toBe(201);
    expect(res.body.book.id).toBe(10);
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/books")
      .set(authHeader())
      .send({ description: "no title" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/api/books").send({ title: "x" });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/books/:id", () => {
  it("returns 200 with updated book", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([dbBook]))
      .mockResolvedValueOnce(makeResult([{ ...dbBook, title: "Updated" }]));

    const res = await request(app)
      .put("/api/books/10")
      .set(authHeader())
      .send({ title: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.book.title).toBe("Updated");
  });

  it("returns 404 when book not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app).put("/api/books/999").set(authHeader()).send({ title: "x" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/books/:id", () => {
  it("returns 200 with deleted book", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbBook]));

    const res = await request(app).delete("/api/books/10").set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.book.id).toBe(10);
  });

  it("returns 404 when book not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app).delete("/api/books/999").set(authHeader());
    expect(res.status).toBe(404);
  });
});
