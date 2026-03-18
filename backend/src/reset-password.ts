import bcrypt from "bcrypt";
import Database from "better-sqlite3";

const dbPath = process.env.DATABASE_PATH || "./seymour.db";
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage: node dist/reset-password.js <email> <new-password>");
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters");
  process.exit(1);
}

const sqlite = new Database(dbPath);
const user = sqlite.prepare("SELECT id, email FROM users WHERE email = ?").get(email) as { id: number; email: string } | undefined;

if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(newPassword, 12);
sqlite.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, user.id);
sqlite.close();

console.log(`Password reset for ${email}`);
