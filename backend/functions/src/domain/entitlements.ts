export const PRODUCT_MONTHLY = "perfectshape_plus_monthly";
export const PRODUCT_YEARLY = "perfectshape_plus_yearly";
export const PRODUCT_IDS = [PRODUCT_MONTHLY, PRODUCT_YEARLY] as const;

export const FREE_COACH_PER_DAY = 3;
export const PLUS_COACH_PER_DAY = 80;

export type PaidFeature = "coach" | "meal_photo" | "plan_adjust";
export type ShareTheme = "dawn" | "midnight" | "summit";

export function isKnownProduct(productId: string): boolean {
  return (PRODUCT_IDS as readonly string[]).includes(productId);
}

export function coachLimit(premium: boolean): number {
  return premium ? PLUS_COACH_PER_DAY : FREE_COACH_PER_DAY;
}

export interface SubscriptionSnapshot {
  status: string;
  product_id: string | null;
  expires_at: string | null;
}

export function isPremiumActive(sub: SubscriptionSnapshot | null, now: Date): boolean {
  if (!sub?.product_id || !sub.expires_at) return false;
  if (!isKnownProduct(sub.product_id)) return false;
  if (sub.status !== "active" && sub.status !== "grace" && sub.status !== "canceled") return false;
  const expires = Date.parse(sub.expires_at);
  return !Number.isNaN(expires) && expires > now.getTime();
}

export function featureAllowed(
  feature: PaidFeature,
  premium: boolean,
  coachUsed: number
): { allowed: boolean; remaining: number; limit: number; code?: string } {
  if (feature === "meal_photo" || feature === "plan_adjust") {
    return premium
      ? { allowed: true, remaining: PLUS_COACH_PER_DAY, limit: PLUS_COACH_PER_DAY }
      : { allowed: false, remaining: 0, limit: 0, code: "premium_required" };
  }
  const limit = coachLimit(premium);
  const remaining = Math.max(0, limit - coachUsed);
  if (remaining <= 0) {
    return { allowed: false, remaining: 0, limit, code: premium ? "rate_limited" : "quota_exceeded" };
  }
  return { allowed: true, remaining, limit };
}

export function themeAllowed(theme: string, premium: boolean): boolean {
  if (theme === "dawn") return true;
  if (theme === "midnight" || theme === "summit") return premium;
  return false;
}

const INSTALL_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isInstallId(value: string | undefined | null): value is string {
  return typeof value === "string" && INSTALL_RE.test(value);
}
