import { Router, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import * as db from "../../db";
import { AuthRequest, User } from "../../types";
import { RegisterDto, LoginDto } from "../validators/auth.validator";
import { authenticateToken } from "../middleware/auth.middleware";
import { config } from "../config";
import { AppError } from "../middleware/error.middleware";

const router: Router = Router();

router.post("/register", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, first_name, last_name } = req.body as RegisterDto;

    if (!email || !password || !first_name || !last_name) {
      throw new AppError(400, "All fields are required");
    }

    const existingUser = await db.query<User>("SELECT * FROM users WHERE email = $1", [email]);

    if (existingUser.rows.length > 0) {
      throw new AppError(400, "User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query<User>(
      "INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, created_at",
      [email, hashedPassword, first_name, last_name]
    );

    const newUser = result.rows[0];

    if (!newUser) {
      throw new AppError(500, "Failed to create user");
    }

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser.id,
      email: newUser.email,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as LoginDto;

    if (!email || !password) {
      throw new AppError(400, "Email and password are required");
    }

    const result = await db.query<User>("SELECT * FROM users WHERE email = $1", [email]);

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

    const token = jwt.sign(
      { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
      config.jwt.secret,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
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
      email: req.user!.email,
      first_name: req.user!.first_name,
      last_name: req.user!.last_name,
    },
    date: new Date().toISOString(),
  });
});

export default router;
