import { Router, Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { randomBytes } from "crypto";
import * as db from "../../db";
import { User } from "../../types";
import { config } from "../config";

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email from Google"));

        const existing = await db.query<User>("SELECT * FROM users WHERE email = $1", [email]);

        if (existing.rows.length > 0) {
          return done(null, existing.rows[0]);
        }

        const firstName = profile.name?.givenName || profile.displayName || "";
        const lastName = profile.name?.familyName || "";

        const result = await db.query<User>(
          "INSERT INTO users (email, password, first_name, last_name, email_verified) VALUES ($1, $2, $3, $4, TRUE) RETURNING *",
          [email, "", firstName, lastName]
        );

        return done(null, result.rows[0]);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

const router: Router = Router();

router.get("/", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get(
  "/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${config.email.siteUrl}/en/login`,
  }),
  async (req: Request, res: Response) => {
    const user = req.user as User;
    const code = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60_000);

    await db.query("INSERT INTO auth_codes (code, user_id, expires_at) VALUES ($1, $2, $3)", [
      code,
      user.id,
      expiresAt,
    ]);

    res.redirect(`${config.email.siteUrl}/api/auth/callback?code=${code}&next=/books`);
  }
);

export default router;
