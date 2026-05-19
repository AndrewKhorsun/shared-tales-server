import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { AuthRequest } from "../../types";
import { RegisterDto, LoginDto } from "../validators/auth.validator";
import { authenticateToken } from "../middleware/auth.middleware";
import { config } from "../config";
import { AppError } from "../middleware/error.middleware";
import { sendVerificationEmail } from "../services/email.service";
import * as repo from "../repositories";

const router: Router = Router();

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, first_name, last_name } = req.body as RegisterDto;

    if (!email || !password || !first_name || !last_name) {
      throw new AppError(400, "All fields are required");
    }

    const existingUser = await repo.findUserByEmail(email);
    if (existingUser) {
      throw new AppError(400, "User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = randomBytes(32).toString("hex");

    const newUser = await repo.createUser(email, hashedPassword, first_name, last_name, verificationToken);
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

    const user = await repo.findUserByEmail(email);
    console.log("[login] user:", user);
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
      const row = await repo.findUserStatusById(req.user!.id);

      res.json({
        user: {
          id: req.user!.id,
          email: req.user!.email,
          first_name: req.user!.first_name,
          last_name: req.user!.last_name,
          email_verified: row?.email_verified ?? false,
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
      await repo.completeOnboarding(req.user!.id);
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

    const verified = await repo.verifyUserEmail(token);
    if (!verified) {
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
      const user = await repo.findUserStatusById(req.user!.id);

      if (user?.email_verified) {
        throw new AppError(400, "Email is already verified");
      }

      const verificationToken = randomBytes(32).toString("hex");
      await repo.updateEmailVerificationToken(req.user!.id, verificationToken);
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

    const authCode = await repo.consumeAuthCode(code);
    if (!authCode) throw new AppError(400, "Invalid or expired code");

    const user = await repo.findUserById(authCode.user_id);
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
