import { describe, it, expect } from "vitest";
import express, { Express, Request, Response, NextFunction } from "express";
import request from "supertest";
import { AppError, errorMiddleware } from "../src/middleware/error.middleware";
import { validate } from "../src/middleware/validate.middleware";
import { z } from "zod";

function buildTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());
  return testApp;
}

describe("AppError", () => {
  it("stores statusCode and message", () => {
    const err = new AppError(422, "Unprocessable");
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe("Unprocessable");
    expect(err.name).toBe("AppError");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("errorMiddleware", () => {
  it("returns statusCode and error message for AppError", async () => {
    const testApp = buildTestApp();
    testApp.get("/test", (_req, _res, next) => next(new AppError(422, "Unprocessable")));
    testApp.use(errorMiddleware);

    const res = await request(testApp).get("/test");
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("Unprocessable");
  });

  it("returns 500 for unknown errors", async () => {
    const testApp = buildTestApp();
    testApp.get("/test", (_req, _res, next) => next(new Error("unexpected")));
    testApp.use(errorMiddleware);

    const res = await request(testApp).get("/test");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Server error");
  });
});

describe("validate middleware", () => {
  const schema = z.object({
    name: z.string().min(1, "name is required"),
    age: z.number().int().positive("age must be positive"),
  });

  it("calls next() when body is valid", async () => {
    const testApp = buildTestApp();
    testApp.post("/test", validate(schema), (_req: Request, res: Response) => {
      res.json({ ok: true });
    });
    testApp.use(errorMiddleware);

    const res = await request(testApp).post("/test").send({ name: "Alice", age: 30 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 400 with validation message when body is invalid", async () => {
    const testApp = buildTestApp();
    testApp.post("/test", validate(schema), (_req: Request, res: Response) => {
      res.json({ ok: true });
    });
    testApp.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      errorMiddleware(err, _req, res, _next);
    });

    const res = await request(testApp).post("/test").send({ name: "", age: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("strips unknown fields from body after validation", async () => {
    const testApp = buildTestApp();
    testApp.post("/test", validate(schema), (req: Request, res: Response) => {
      res.json(req.body);
    });
    testApp.use(errorMiddleware);

    const res = await request(testApp)
      .post("/test")
      .send({ name: "Bob", age: 25, extra: "should be stripped" });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("extra");
  });
});
