import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./db/connection.js";
import { users } from "./db/schema.js";

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage: tsx src/reset-password.ts <email> <new-password>");
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters");
  process.exit(1);
}

const user = db.select().from(users).where(eq(users.email, email)).get();

if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(newPassword, 12);
db.update(users).set({ passwordHash }).where(eq(users.id, user.id)).run();

console.log(`Password reset for ${email}`);
