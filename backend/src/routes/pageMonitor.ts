import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import * as pageMonitorService from "../services/pageMonitorService.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

const addMonitorSchema = z.object({
  url: z.string().url(),
  cssSelector: z.string().min(1),
  checkInterval: z.number().int().min(60).optional().default(3600),
});

const updateMonitorSchema = z.object({
  cssSelector: z.string().min(1).optional(),
  checkInterval: z.number().int().min(60).optional(),
});

router.post("/", validate(addMonitorSchema), (req, res) => {
  const { userId } = req as AuthRequest;
  try {
    const result = pageMonitorService.addMonitor(
      userId!,
      req.body.url,
      req.body.cssSelector,
      req.body.checkInterval
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:feedId", validate(updateMonitorSchema), (req, res) => {
  const { userId } = req as AuthRequest;
  try {
    const result = pageMonitorService.updateMonitor(
      userId!,
      parseInt(req.params.feedId as string),
      req.body.cssSelector,
      req.body.checkInterval
    );
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.delete("/:feedId", (req, res) => {
  const { userId } = req as AuthRequest;
  try {
    const result = pageMonitorService.removeMonitor(
      userId!,
      parseInt(req.params.feedId as string)
    );
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
