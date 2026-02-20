import type { Request, Response, NextFunction } from "express";

const windowMs = 60_000;
const maxRequests = 10;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitAi(req: Request, res: Response, next: NextFunction) {
  const key = (req as { user?: { uid: string } }).user?.uid ?? req.ip;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }

  if (entry.count >= maxRequests) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  entry.count += 1;
  next();
}
