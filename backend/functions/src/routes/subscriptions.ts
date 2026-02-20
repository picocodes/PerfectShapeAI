import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { updateUser } from "../services/credits.js";
import { db, serverTimestamp } from "../services/firestore.js";

export const subscriptionsRouter = Router();

const mobileSchema = z.object({
  platform: z.enum(["ios", "android"]),
  receipt: z.string().min(10)
});

subscriptionsRouter.post("/verify-mobile", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = mobileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  // TODO: Validate with Apple/Google. For now, assume valid.
  await updateUser(req.user!.uid, { subscription_status: "active" });
  res.json({ status: "active" });
});

const freemiusSchema = z.object({
  license_id: z.string().min(1),
  plan_id: z.string().min(1),
  pricing_id: z.string().min(1),
  user_id: z.string().min(1),
  type: z.enum(["subscription", "lifetime"]),
  expiration: z.string().optional(),
  is_canceled: z.boolean().optional()
});

subscriptionsRouter.post("/verify-freemius", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = freemiusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  await db().collection("freemius_subscriptions").add({
    user_id: req.user!.uid,
    fs_license_id: parsed.data.license_id,
    fs_plan_id: parsed.data.plan_id,
    fs_pricing_id: parsed.data.pricing_id,
    fs_user_id: parsed.data.user_id,
    type: parsed.data.type,
    expiration: parsed.data.expiration ?? null,
    is_canceled: parsed.data.is_canceled ?? false,
    created_at: serverTimestamp()
  });

  await updateUser(req.user!.uid, { subscription_status: "active" });
  res.json({ status: "active" });
});

const activateSchema = z.object({
  credits: z.number().min(1).max(10000)
});

subscriptionsRouter.post("/activate-premium", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  await updateUser(req.user!.uid, { credits: parsed.data.credits });
  res.json({ credits: parsed.data.credits });
});
