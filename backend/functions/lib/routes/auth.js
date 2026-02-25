import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
export const authRouter = Router();
authRouter.get("/verify-token", requireAuth, (req, res) => {
    res.json({ uid: req.user?.uid ?? null, email: req.user?.email ?? null });
});
