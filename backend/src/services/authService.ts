import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { config } from "../config.js";

export type ClientType = "web" | "extension";

export function generateToken(userId: number, client: ClientType = "web"): string {
  const expiresIn = client === "extension" ? 30 * 24 * 60 * 60 : 60 * 60; // 30d or 1h in seconds
  return jwt.sign({ userId, client }, config.jwtSecret, { expiresIn });
}

export function refreshToken(userId: number, currentClient: ClientType): string {
  return generateToken(userId, currentClient);
}

export async function register(email: string, password: string, client: ClientType = "web") {
  const existing = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = db
    .insert(users)
    .values({ email, passwordHash })
    .returning()
    .get();

  return { token: generateToken(user.id, client), user: { id: user.id, email: user.email } };
}

export async function login(email: string, password: string, client: ClientType = "web") {
  const user = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  return { token: generateToken(user.id, client), user: { id: user.id, email: user.email } };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) {
    throw new Error("User not found");
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  db.update(users).set({ passwordHash }).where(eq(users.id, userId)).run();
}
