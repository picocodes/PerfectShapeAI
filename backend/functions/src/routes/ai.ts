import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { rateLimitAi } from "../middleware/rateLimit.js";
import { adjustPlan, coach, generatePlan } from "../services/aiService.js";
import { canConsumeCredits, consumeCredits, getUser, markFreePlanUsed } from "../services/credits.js";
import { db, serverTimestamp } from "../services/firestore.js";

export const aiRouter = Router();

const baseSchema = z.object({
  context: z.record(z.unknown()),
  prompt: z.string().min(1)
});

const planSchema = z.object({
  context: z.record(z.unknown()),
  goal: z.string().min(1),
  preferences: z.array(z.string()).default([])
});

aiRouterPost("/weekly-plan", planSchema, async (req, res) => {
  const user = await getUser(req.user!.uid);
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  const isFree = !user.free_plan_used;
  const canSpend = isFree || (await canConsumeCredits(req.user!.uid, 1));
  if (!canSpend) {
    res.status(402).json({ error: "out_of_credits" });
    return;
  }

  const result = await generatePlan({
    context: req.body.context,
    goal: req.body.goal,
    preferences: req.body.preferences
  });

  if (isFree) {
    await markFreePlanUsed(req.user!.uid);
  } else {
    await consumeCredits(req.user!.uid, creditsFromUsage(result.tokenUsage));
  }

  await db().collection("ai_conversations").add({
    user_id: req.user!.uid,
    context_snapshot: req.body.context,
    prompt: "weekly_plan",
    response: result.text,
    token_usage: result.tokenUsage ?? null,
    created_at: serverTimestamp()
  });

  res.json({ text: result.text });
});

aiRouterPost("/adjust-plan", baseSchema, async (req, res) => {
  const canSpend = await canConsumeCredits(req.user!.uid, 1);
  if (!canSpend) {
    res.status(402).json({ error: "out_of_credits" });
    return;
  }

  const result = await adjustPlan({
    context: req.body.context,
    feedback: req.body.prompt
  });

  await consumeCredits(req.user!.uid, creditsFromUsage(result.tokenUsage));

  await db().collection("ai_conversations").add({
    user_id: req.user!.uid,
    context_snapshot: req.body.context,
    prompt: "adjust_plan",
    response: result.text,
    token_usage: result.tokenUsage ?? null,
    created_at: serverTimestamp()
  });

  res.json({ text: result.text });
});

aiRouterPost("/coach", baseSchema, async (req, res) => {
  const canSpend = await canConsumeCredits(req.user!.uid, 1);
  if (!canSpend) {
    res.status(402).json({ error: "out_of_credits" });
    return;
  }

  const result = await coach({
    context: req.body.context,
    message: req.body.prompt
  });

  await consumeCredits(req.user!.uid, creditsFromUsage(result.tokenUsage));

  await db().collection("ai_conversations").add({
    user_id: req.user!.uid,
    context_snapshot: req.body.context,
    prompt: req.body.prompt,
    response: result.text,
    token_usage: result.tokenUsage ?? null,
    created_at: serverTimestamp()
  });

  res.json({ text: result.text });
});

function aiRouterPost(path: string, schema: z.ZodSchema, handler: (req: AuthedRequest, res: any) => Promise<void>) {
  aiRouter.post(path, requireAuth, rateLimitAi, async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
      return;
    }

    req.body = parsed.data;
    await handler(req as AuthedRequest, res);
  });
}

function creditsFromUsage(usage?: { total_tokens?: number }) {
  if (!usage?.total_tokens) return 1;
  return Math.max(1, Math.ceil(usage.total_tokens / 10000));
}
