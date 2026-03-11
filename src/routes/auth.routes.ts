import { Router, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import * as db from "../../db";
import { AuthRequest, RegisterRequestBody, LoginRequestBody, User } from "../../types";
import { authenticateToken } from "../middleware/auth.middleware";
import { config } from "../config";
import { AppError } from "../middleware/error.middleware";

const router: Router = Router();

router.post("/register", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as RegisterRequestBody;

    if (!username || !password) {
      throw new AppError(400, "Username and password are required");
    }

    const existingUser = await db.query<User>("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (existingUser.rows.length > 0) {
      throw new AppError(400, "User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query<User>(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at",
      [username, hashedPassword]
    );

    const newUser = result.rows[0];

    if (!newUser) {
      throw new AppError(500, "Failed to create user");
    }

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser.id,
      username: newUser.username,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as LoginRequestBody;

    if (!username || !password) {
      throw new AppError(400, "Username and password are required");
    }

    const result = await db.query<User>("SELECT * FROM users WHERE username = $1", [username]);

    if (result.rows.length === 0) {
      throw new AppError(401, "Invalid credentials");
    }

    const user = result.rows[0];

    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid credentials");
    }

    const token = jwt.sign({ id: user.id, username: user.username }, config.jwt.secret, {
      expiresIn: "24h",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
      },
      date: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    user: {
      id: req.user!.id,
      username: req.user!.username,
    },
    date: new Date().toISOString(),
  });
});

export default router;
