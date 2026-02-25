import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { db, serverTimestamp } from "../services/firestore.js";
export const mealsRouter = Router();
const mealSchema = z.object({
    calories: z.number().min(0).max(3000),
    description: z.string().min(1),
    date: z.string().min(8)
});
mealsRouter.post("/log", requireAuth, async (req, res) => {
    const parsed = mealSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
        return;
    }
    const ref = db().collection("daily_logs").doc();
    await ref.set({
        user_id: req.user.uid,
        calories_consumed: parsed.data.calories,
        description: parsed.data.description,
        date: parsed.data.date,
        created_at: serverTimestamp()
    });
    res.json({ id: ref.id });
});
mealsRouter.get("/summary", requireAuth, async (req, res) => {
    const date = typeof req.query.date === "string" ? req.query.date : null;
    if (!date) {
        res.status(400).json({ error: "missing_date" });
        return;
    }
    const snapshot = await db()
        .collection("daily_logs")
        .where("user_id", "==", req.user.uid)
        .where("date", "==", date)
        .get();
    const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data().calories_consumed ?? 0), 0);
    res.json({ date, calories_consumed: total, entries: snapshot.docs.map((doc) => doc.data()) });
});
