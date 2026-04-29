import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app";
import * as db from "../db";
import { authHeader } from "./helpers/auth";
import type { User } from "../types";
import type { QueryResult } from "pg";

const mockQuery = vi.mocked(db.query);

// bcrypt hash of "password"
const HASHED_PASSWORD = "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi";

const dbUser: User = {
  id: 1,
  email: "test@test.com",
  first_name: "Test",
  last_name: "User",
  password: HASHED_PASSWORD,
  created_at: new Date(),
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

describe("POST /api/auth/register", () => {
  it("returns 201 when user is new", async () => {
    mockQuery
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([{ ...dbUser }]));

    const res = await request(app).post("/api/auth/register").send({
      email: "new@test.com",
      password: "Test1234!",
      first_name: "New",
      last_name: "User",
    });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(1);
  });

  it("returns 400 when email already exists", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbUser]));

    const res = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "Test1234!",
      first_name: "Test",
      last_name: "User",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "x@x.com" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns 200 with token on valid credentials", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([dbUser]));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: dbUser.email, password: "password" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
  });

  it("returns 401 when user not found", async () => {
    mockQuery.mockResolvedValueOnce(makeResult([]));

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com", password: "pass" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "x@x.com" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 200 with user for valid token", async () => {
    const res = await request(app).get("/api/auth/me").set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@test.com");
  });

  it("returns 401 when token is missing", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 403 when token is invalid", async () => {
    const res = await request(app).get("/api/auth/me").set(authHeader("bad.token"));
    expect(res.status).toBe(403);
  });
});
