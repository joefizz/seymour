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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
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

router.post("/change-password", authMiddleware, validate(changePasswordSchema), async (req, res) => {
  const { userId } = req as AuthRequest;
  try {
    await authService.changePassword(userId!, req.body.currentPassword, req.body.newPassword);
    res.json({ message: "Password changed" });
  } catch (err: any) {
    if (err.message === "Current password is incorrect") {
      res.status(400).json({ error: err.message });
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
