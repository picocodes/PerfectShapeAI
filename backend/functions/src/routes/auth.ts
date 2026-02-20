import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.get("/verify-token", requireAuth, (req: AuthedRequest, res) => {
  res.json({ uid: req.user?.uid ?? null, email: req.user?.email ?? null });
});
