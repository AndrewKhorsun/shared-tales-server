import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import * as db from "../../db";
import { AuthRequest, RegisterRequestBody, LoginRequestBody, User } from "../../types";
import { authenticateToken } from "../middleware/auth.middleware";
import { config } from "../config";

const router: Router = Router();

router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body as RegisterRequestBody;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const existingUser = await db.query<User>("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (existingUser.rows.length > 0) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query<User>(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at",
      [username, hashedPassword]
    );

    const newUser = result.rows[0];

    if (!newUser) {
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser.id,
      username: newUser.username,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequestBody;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const result = await db.query<User>("SELECT * FROM users WHERE username = $1", [username]);

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
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
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
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
