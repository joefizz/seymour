import express from "express";
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

const app = express();

app.use(cors());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
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

app.listen(config.port, () => {
  console.log(`Seymour backend listening on port ${config.port}`);
  startScheduler();
});
