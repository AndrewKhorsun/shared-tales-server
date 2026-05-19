import { PoolClient } from "pg";
import { User } from "../../types";
import { pool } from "../../db";

export async function findUserByEmail(email: string, client?: PoolClient): Promise<User | null> {
  const executor = client ?? pool;
  const result = await executor.query<User>("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(userId: number, client?: PoolClient): Promise<User | null> {
  const executor = client ?? pool;
  const result = await executor.query<User>("SELECT * FROM users WHERE id = $1", [userId]);
  return result.rows[0] ?? null;
}

export async function findUserStatusById(
  userId: number,
  client?: PoolClient
): Promise<Pick<User, "email_verified" | "onboarding_completed_at"> | null> {
  const executor = client ?? pool;
  const result = await executor.query<Pick<User, "email_verified" | "onboarding_completed_at">>(
    "SELECT email_verified, onboarding_completed_at FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function createUser(
  email: string,
  hashedPassword: string,
  firstName: string,
  lastName: string,
  emailVerificationToken: string,
  client?: PoolClient
): Promise<Pick<User, "id" | "email" | "first_name" | "last_name" | "created_at"> | null> {
  const executor = client ?? pool;
  const result = await executor.query<Pick<User, "id" | "email" | "first_name" | "last_name" | "created_at">>(
    `INSERT INTO users (email, password, first_name, last_name, email_verification_token)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, created_at`,
    [email, hashedPassword, firstName, lastName, emailVerificationToken]
  );
  return result.rows[0] ?? null;
}

export async function createVerifiedUser(
  email: string,
  hashedPassword: string,
  firstName: string,
  lastName: string,
  client?: PoolClient
): Promise<User | null> {
  const executor = client ?? pool;
  const result = await executor.query<User>(
    `INSERT INTO users (email, password, first_name, last_name, email_verified)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING *`,
    [email, hashedPassword, firstName, lastName]
  );
  return result.rows[0] ?? null;
}

export async function verifyUserEmail(token: string, client?: PoolClient): Promise<{ id: number } | null> {
  const executor = client ?? pool;
  const result = await executor.query<{ id: number }>(
    "UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id",
    [token]
  );
  return result.rows[0] ?? null;
}

export async function updateEmailVerificationToken(
  userId: number,
  token: string,
  client?: PoolClient
): Promise<void> {
  const executor = client ?? pool;
  await executor.query("UPDATE users SET email_verification_token = $1 WHERE id = $2", [token, userId]);
}

export async function completeOnboarding(userId: number, client?: PoolClient): Promise<void> {
  const executor = client ?? pool;
  await executor.query(
    "UPDATE users SET onboarding_completed_at = NOW() WHERE id = $1 AND onboarding_completed_at IS NULL",
    [userId]
  );
}

export async function createAuthCode(
  code: string,
  userId: number,
  expiresAt: Date,
  client?: PoolClient
): Promise<void> {
  const executor = client ?? pool;
  await executor.query("INSERT INTO auth_codes (code, user_id, expires_at) VALUES ($1, $2, $3)", [
    code,
    userId,
    expiresAt,
  ]);
}

export async function consumeAuthCode(
  code: string,
  client?: PoolClient
): Promise<{ user_id: number; expires_at: Date } | null> {
  const executor = client ?? pool;
  const result = await executor.query<{ user_id: number; expires_at: Date }>(
    "DELETE FROM auth_codes WHERE code = $1 AND expires_at > NOW() RETURNING user_id, expires_at",
    [code]
  );
  return result.rows[0] ?? null;
}
