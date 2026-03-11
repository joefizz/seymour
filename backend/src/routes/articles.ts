import { Router } from "express";
import * as articleService from "../services/articleService.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

router.get("/", (req, res) => {
  const { userId } = req as AuthRequest;
  const { feedId, unread, saved, page, limit, sort } = req.query;

  const result = articleService.getArticles(userId!, {
    feedId: feedId ? parseInt(feedId as string) : undefined,
    unreadOnly: unread === "true",
    savedOnly: saved === "true",
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 30,
    sort: sort === "oldest" ? "oldest" : "newest",
  });

  res.json(result);
});

router.get("/search", async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const q = req.query.q as string;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query required" });
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const results = articleService.searchArticles(userId, q.trim(), page, limit);
    res.json(results);
  } catch (err) { next(err); }
});

router.get("/unread-count", (req, res) => {
  const { userId } = req as AuthRequest;
  const result = articleService.getUnreadCount(userId!);
  res.json(result);
});

router.get("/:id", async (req, res) => {
  const { userId } = req as AuthRequest;
  try {
    const article = await articleService.getArticle(
      userId!,
      parseInt(req.params.id)
    );
    res.json(article);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.patch("/:id/read", (req, res) => {
  const { userId } = req as AuthRequest;
  articleService.markRead(userId!, parseInt(req.params.id));
  res.json({ success: true });
});

router.post("/mark-all-read", (req, res) => {
  const { userId } = req as AuthRequest;
  const { feedId } = req.body;
  articleService.markAllRead(userId!, feedId ? parseInt(feedId) : undefined);
  res.json({ success: true });
});

router.patch("/:id/saved", (req, res) => {
  const { userId } = req as AuthRequest;
  const result = articleService.toggleSaved(userId!, parseInt(req.params.id));
  res.json(result);
});

export default router;
