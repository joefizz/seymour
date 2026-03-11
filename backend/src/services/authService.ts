import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { users } from "../db/schema.js";
import { config } from "../config.js";

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: "7d" });
}

export async function register(email: string, password: string) {
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

  return { token: generateToken(user.id), user: { id: user.id, email: user.email } };
}

export async function login(email: string, password: string) {
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

  return { token: generateToken(user.id), user: { id: user.id, email: user.email } };
}
