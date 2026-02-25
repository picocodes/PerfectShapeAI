import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { db, serverTimestamp } from "../services/firestore.js";
export const workoutsRouter = Router();
workoutsRouter.get("/weekly", requireAuth, async (req, res) => {
    const snapshot = await db()
        .collection("workout_plans")
        .where("user_id", "==", req.user.uid)
        .orderBy("created_at", "desc")
        .limit(1)
        .get();
    const plan = snapshot.docs[0]?.data() ?? null;
    res.json(plan);
});
workoutsRouter.get("/today", requireAuth, async (req, res) => {
    const snapshot = await db()
        .collection("workout_plans")
        .where("user_id", "==", req.user.uid)
        .orderBy("created_at", "desc")
        .limit(1)
        .get();
    const plan = snapshot.docs[0]?.data();
    if (!plan?.json_plan?.days) {
        res.json({ workout: null });
        return;
    }
    const todayIndex = new Date().getDay();
    const workout = plan.json_plan.days[todayIndex] ?? plan.json_plan.days[0];
    res.json({ workout });
});
const completeSchema = z.object({
    workout_id: z.string().min(1),
    date: z.string().min(8)
});
workoutsRouter.post("/complete", requireAuth, async (req, res) => {
    const parsed = completeSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
        return;
    }
    const ref = db().collection("workout_logs").doc();
    await ref.set({
        user_id: req.user.uid,
        workout_id: parsed.data.workout_id,
        completed_at: serverTimestamp(),
        date: parsed.data.date
    });
    res.json({ id: ref.id });
});
