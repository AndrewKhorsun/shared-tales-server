import { Router, Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { randomBytes } from "crypto";
import { config } from "../config";
import * as repo from "../repositories";

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

        const existing = await repo.findUserByEmail(email);
        if (existing) {
          return done(null, existing);
        }

        const firstName = profile.name?.givenName || profile.displayName || "";
        const lastName = profile.name?.familyName || "";

        const newUser = await repo.createVerifiedUser(email, "", firstName, lastName);
        if (!newUser) return done(new Error("Failed to create user"));

        return done(null, newUser);
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
    const user = req.user as { id: number };
    const code = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60_000);

    await repo.createAuthCode(code, user.id, expiresAt);

    res.redirect(`${config.email.siteUrl}/api/auth/callback?code=${code}&next=/books`);
  }
);

export default router;
