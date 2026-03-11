import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import feedRoutes from "./routes/feeds.js";
import articleRoutes from "./routes/articles.js";
import pageMonitorRoutes from "./routes/pageMonitor.js";
import { startScheduler } from "./services/scheduler.js";

// Ensure database tables exist
import "./db/connection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));
app.use(express.json());

// Public routes
app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/feeds", authMiddleware, feedRoutes);
app.use("/api/articles", authMiddleware, articleRoutes);
app.use("/api/page-monitors", authMiddleware, pageMonitorRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handler
app.use(errorHandler);

// Serve frontend static files (if built frontend exists)
const publicDir = path.join(__dirname, "public");
const indexHtml = path.join(publicDir, "index.html");
if (fs.existsSync(indexHtml)) {
  app.use(express.static(publicDir));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(indexHtml);
  });
}

app.listen(config.port, () => {
  console.log(`Seymour listening on port ${config.port}`);
  startScheduler();
});
