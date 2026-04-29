import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../app";
import * as db from "../db";

const mockQuery = vi.mocked(db.query);

describe("GET /", () => {
  it("returns 200 with API info", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toContain("Shared Tales API");
  });
});

describe("GET /health", () => {
  it("returns 200 when db responds", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
      command: "SELECT",
      oid: 0,
      fields: [],
    });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("returns 500 when db throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));
    const res = await request(app).get("/health");
    expect(res.status).toBe(500);
    expect(res.body.status).toBe("error");
  });
});

describe("unknown routes", () => {
  it("returns 404 for undefined route", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
  });
});
