import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  jwtSecret: process.env.JWT_SECRET || "change-me-to-a-random-secret",
  databasePath: process.env.DATABASE_PATH || "./seymour.db",
};
