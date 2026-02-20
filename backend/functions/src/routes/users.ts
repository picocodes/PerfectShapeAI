import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { ensureUser, getUser, updateUser } from "../services/credits.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await ensureUser(req.user!.uid, req.user!.email);
  res.json(user);
});

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().min(13).max(90).optional(),
  gender: z.string().min(1).optional(),
  height: z.number().min(80).max(250).optional(),
  current_weight: z.number().min(30).max(300).optional(),
  target_weight: z.number().min(30).max(300).optional(),
  activity_level: z.enum(["sedentary", "light", "moderate", "active"]).optional(),
  country: z.string().min(2).optional(),
  dietary_preferences: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  daily_availability: z.number().min(10).max(90).optional()
});

usersRouter.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    return;
  }

  await ensureUser(req.user!.uid, req.user!.email);
  await updateUser(req.user!.uid, parsed.data);
  const updated = await getUser(req.user!.uid);
  res.json(updated);
});
