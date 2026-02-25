import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { db, serverTimestamp } from "../services/firestore.js";
export const weightRouter = Router();
const logSchema = z.object({
    weight: z.number().min(30).max(300)
});
weightRouter.post("/log", requireAuth, async (req, res) => {
    const parsed = logSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
        return;
    }
    const ref = db().collection("weight_logs").doc();
    await ref.set({
        user_id: req.user.uid,
        weight: parsed.data.weight,
        logged_at: serverTimestamp()
    });
    res.json({ id: ref.id });
});
weightRouter.get("/history", requireAuth, async (req, res) => {
    const snapshot = await db()
        .collection("weight_logs")
        .where("user_id", "==", req.user.uid)
        .orderBy("logged_at", "desc")
        .limit(60)
        .get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
});
