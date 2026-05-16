import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import * as db from "../../db";
import { AuthRequest, User } from "../../types";
import { RegisterDto, LoginDto } from "../validators/auth.validator";
import { authenticateToken } from "../middleware/auth.middleware";
import { config } from "../config";
import { AppError } from "../middleware/error.middleware";
import { sendVerificationEmail } from "../services/email.service";

const router: Router = Router();

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
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
    const verificationToken = randomBytes(32).toString("hex");

    const result = await db.query<User>(
      "INSERT INTO users (email, password, first_name, last_name, email_verification_token) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, created_at",
      [email, hashedPassword, first_name, last_name, verificationToken]
    );

    const newUser = result.rows[0];

    if (!newUser) {
      throw new AppError(500, "Failed to create user");
    }

    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser.id,
      email: newUser.email,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as LoginDto;

    if (!email || !password) {
      throw new AppError(400, "Email and password are required");
    }

    const result = await db.query<User>("SELECT * FROM users WHERE email = $1", [email]);
    console.log("[login] result:", result.rows);
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

router.get(
  "/me",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await db.query<User>(
        "SELECT email_verified, onboarding_completed_at FROM users WHERE id = $1",
        [req.user!.id]
      );
      const row = result.rows[0];
      const emailVerified = row?.email_verified ?? false;

      res.json({
        user: {
          id: req.user!.id,
          email: req.user!.email,
          first_name: req.user!.first_name,
          last_name: req.user!.last_name,
          email_verified: emailVerified,
          onboarding_completed_at: row?.onboarding_completed_at ?? null,
        },
        date: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/complete-onboarding",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await db.query(
        "UPDATE users SET onboarding_completed_at = NOW() WHERE id = $1 AND onboarding_completed_at IS NULL",
        [req.user!.id]
      );
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/verify-email", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token: string };

    if (!token) {
      throw new AppError(400, "Verification token is required");
    }

    const result = await db.query<User>(
      "UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id",
      [token]
    );

    if (result.rows.length === 0) {
      throw new AppError(400, "Invalid or expired verification token");
    }

    res.redirect(`${config.email.siteUrl}/en/login?verified=true`);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/resend-verification",
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await db.query<User>("SELECT email, email_verified FROM users WHERE id = $1", [
        req.user!.id,
      ]);
      const user = result.rows[0];

      if (user?.email_verified) {
        throw new AppError(400, "Email is already verified");
      }

      const verificationToken = randomBytes(32).toString("hex");
      await db.query("UPDATE users SET email_verification_token = $1 WHERE id = $2", [
        verificationToken,
        req.user!.id,
      ]);
      await sendVerificationEmail(req.user!.email, verificationToken);

      res.json({ message: "Verification email sent" });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/exchange-code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body as { code: string };

    if (!code) throw new AppError(400, "Code is required");

    const result = await db.query<{ user_id: number; expires_at: Date }>(
      "DELETE FROM auth_codes WHERE code = $1 AND expires_at > NOW() RETURNING user_id, expires_at",
      [code]
    );

    if (result.rows.length === 0) throw new AppError(400, "Invalid or expired code");

    const userId = result.rows[0]!.user_id;
    const userResult = await db.query<User>("SELECT * FROM users WHERE id = $1", [userId]);
    const user = userResult.rows[0];

    if (!user) throw new AppError(404, "User not found");

    const token = jwt.sign(
      { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
      config.jwt.secret,
      { expiresIn: "24h" }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

export default router;
