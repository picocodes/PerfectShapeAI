const windowMs = 60000;
const maxRequests = 10;
const buckets = new Map();
export function rateLimitAi(req, res, next) {
    const key = req.user?.uid ?? req.ip;
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
