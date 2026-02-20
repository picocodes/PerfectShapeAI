import { Router } from "express";
import { z } from "zod";
import { db, serverTimestamp } from "../services/firestore.js";
import { updateUser } from "../services/credits.js";

export const freemiusWebhookRouter = Router();

const webhookSchema = z.object({
  event: z.string(),
  data: z.object({
    user_id: z.string(),
    license_id: z.string(),
    plan_id: z.string(),
    pricing_id: z.string(),
    type: z.string(),
    expiration: z.string().optional(),
    is_canceled: z.boolean().optional()
  })
});

freemiusWebhookRouter.post("/", async (req, res) => {
  const secret = req.headers["x-freemius-secret"];
  if (secret !== process.env.FREEMIUS_SECRET_KEY) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const payload = parsed.data.data;
  await db().collection("freemius_subscriptions").add({
    user_id: payload.user_id,
    fs_license_id: payload.license_id,
    fs_plan_id: payload.plan_id,
    fs_pricing_id: payload.pricing_id,
    fs_user_id: payload.user_id,
    type: payload.type,
    expiration: payload.expiration ?? null,
    is_canceled: payload.is_canceled ?? false,
    created_at: serverTimestamp()
  });

  await updateUser(payload.user_id, {
    subscription_status: payload.is_canceled ? "canceled" : "active"
  });

  res.json({ ok: true });
});
