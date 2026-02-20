import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getXp } from "../services/gamification.js";

export const gamificationRouter = Router();

gamificationRouter.get("/xp", requireAuth, async (req: AuthedRequest, res) => {
  const xp = await getXp(req.user!.uid);
  res.json(xp);
});

gamificationRouter.get("/streak", requireAuth, async (req: AuthedRequest, res) => {
  const xp = await getXp(req.user!.uid);
  res.json({ streak_count: xp.streak_count, last_active_date: xp.last_active_date });
});

gamificationRouter.get("/achievements", requireAuth, async (_req: AuthedRequest, res) => {
  res.json([
    { id: "streak_7", label: "7-day streak", unlocked: false },
    { id: "first_2kg", label: "First 2kg lost", unlocked: false },
    { id: "workouts_30", label: "30 workouts completed", unlocked: false },
    { id: "no_sugar_week", label: "No sugar week", unlocked: false }
  ]);
});
