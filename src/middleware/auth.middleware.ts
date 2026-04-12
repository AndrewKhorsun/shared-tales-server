import { AuthRequest, JWTPayload } from "../../types";
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Token not provided" });
    return;
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: "Invalid or expired token" });
      return;
    }
    req.user = decoded as JWTPayload;
    next();
  });
};
