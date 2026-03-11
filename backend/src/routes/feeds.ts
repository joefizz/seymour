import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import * as feedService from "../services/feedService.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

const addFeedSchema = z.object({
  url: z.string().url(),
});

const bulkAddFeedsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(100),
});

const updateFeedSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().min(1).optional(),
  contentMode: z.enum(["extract", "summary", "webpage"]).optional(),
});

router.get("/", (req, res) => {
  const { userId } = req as AuthRequest;
  const result = feedService.listFeeds(userId!);
  res.json(result);
});

router.post("/", validate(addFeedSchema), async (req, res) => {
  const { userId } = req as AuthRequest;
  try {
    const feed = await feedService.addFeed(userId!, req.body.url);
    res.status(201).json(feed);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/bulk", validate(bulkAddFeedsSchema), async (req, res) => {
  const { userId } = req as AuthRequest;
  const { urls } = req.body as { urls: string[] };

  const results = await Promise.allSettled(
    urls.map((url) => feedService.addFeed(userId!, url))
  );

  const feeds = results.map((result, i) => ({
    url: urls[i],
    ...(result.status === "fulfilled"
      ? { success: true, feed: result.value }
      : { success: false, error: result.reason?.message || "Failed to add feed" }),
  }));

  res.status(201).json({ results: feeds });
});

router.patch("/:id", validate(updateFeedSchema), (req, res) => {
  const { userId } = req as AuthRequest;
  try {
    const result = feedService.updateFeed(userId!, parseInt(req.params.id as string), req.body as { url?: string; title?: string; contentMode?: string });
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  const { userId } = req as AuthRequest;
  try {
    const result = feedService.removeFeed(userId!, parseInt(req.params.id));
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.post("/:id/refresh", async (req, res) => {
  const { userId } = req as AuthRequest;
  try {
    const result = await feedService.refreshFeed(parseInt(req.params.id));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
