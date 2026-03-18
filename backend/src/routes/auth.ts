import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { authMiddleware } from "../middleware/auth.js";
import * as authService from "../services/authService.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  client: z.enum(["web", "extension"]).optional(),
});

router.post("/register", validate(authSchema), async (req, res) => {
  try {
    const result = await authService.register(req.body.email, req.body.password, req.body.client);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === "Email already registered") {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.post("/login", validate(authSchema), async (req, res) => {
  try {
    const result = await authService.login(req.body.email, req.body.password, req.body.client);
    res.json(result);
  } catch (err: any) {
    if (err.message === "Invalid email or password") {
      res.status(401).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.post("/refresh", authMiddleware, (req, res) => {
  const { userId, tokenClient } = req as AuthRequest;
  const token = authService.refreshToken(userId!, tokenClient || "web");
  res.json({ token });
});

export default router;
