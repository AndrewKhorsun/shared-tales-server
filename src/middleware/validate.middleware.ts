import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { AppError } from "./error.middleware";

export const validate = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues.map((e) => e.message).join(", ");
      throw new AppError(400, message);
    }

    req.body = result.data;
    next();
  };
};
