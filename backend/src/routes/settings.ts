import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { db } from "../db/connection.js";
import { settings } from "../db/schema.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

const updateSettingsSchema = z.object({
  retentionDays: z.number().int().min(1).max(365),
});

router.get("/", (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId!;

    let userSettings = db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .get();

    if (!userSettings) {
      userSettings = db
        .insert(settings)
        .values({ userId })
        .returning()
        .get();
    }

    res.json(userSettings);
  } catch (err) {
    next(err);
  }
});

router.patch("/", validate(updateSettingsSchema), (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { retentionDays } = req.body as { retentionDays: number };

    // Ensure settings exist
    let userSettings = db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .get();

    if (!userSettings) {
      userSettings = db
        .insert(settings)
        .values({ userId, retentionDays })
        .returning()
        .get();
    } else {
      db.update(settings)
        .set({ retentionDays, updatedAt: new Date() })
        .where(eq(settings.userId, userId))
        .run();
      userSettings = db
        .select()
        .from(settings)
        .where(eq(settings.userId, userId))
        .get()!;
    }

    res.json(userSettings);
  } catch (err) {
    next(err);
  }
});

export default router;
