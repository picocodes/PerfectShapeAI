import { isKnownProduct } from "./entitlements.js";

export interface AppleTransactionClaims {
  transactionId?: string;
  originalTransactionId?: string;
  bundleId?: string;
  productId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  revocationDate?: number;
  type?: string;
  environment?: string;
  inAppOwnershipType?: string;
}

export interface PlayLineItem {
  productId?: string;
  expiryTime?: string;
}

export interface PlaySubscription {
  subscriptionState?: string;
  acknowledgementState?: string;
  lineItems?: PlayLineItem[];
}

export interface EntitlementGrant {
  ok: true;
  product_id: string;
  expires_at: string;
  status: "active" | "grace" | "canceled";
  original_transaction_id: string | null;
  latest_transaction_id: string | null;
  environment: string | null;
  acknowledge: boolean;
}

export interface EntitlementReject {
  ok: false;
  error: string;
}

export type EntitlementResult = EntitlementGrant | EntitlementReject;

export function entitlementFromAppleClaims(
  claims: AppleTransactionClaims,
  expectedBundleId: string,
  now: Date
): EntitlementResult {
  if (!claims.productId || !isKnownProduct(claims.productId)) return { ok: false, error: "unknown_product" };
  if (claims.bundleId !== expectedBundleId) return { ok: false, error: "bundle_mismatch" };
  if (claims.revocationDate) return { ok: false, error: "revoked" };
  if (claims.type && !/subscription/i.test(claims.type) && !/auto-renewable/i.test(claims.type)) {
    return { ok: false, error: "not_subscription" };
  }
  const ownership = claims.inAppOwnershipType ?? "PURCHASED";
  if (ownership !== "PURCHASED" && ownership !== "FAMILY_SHARED") return { ok: false, error: "not_owned" };
  if (!claims.expiresDate || claims.expiresDate <= now.getTime()) return { ok: false, error: "expired" };
  return {
    ok: true,
    product_id: claims.productId,
    expires_at: new Date(claims.expiresDate).toISOString(),
    status: "active",
    original_transaction_id: claims.originalTransactionId ?? claims.transactionId ?? null,
    latest_transaction_id: claims.transactionId ?? null,
    environment: claims.environment ?? null,
    acknowledge: false
  };
}

export function entitlementFromPlay(subscription: PlaySubscription, now: Date): EntitlementResult {
  const state = subscription.subscriptionState ?? "";
  const known = (subscription.lineItems ?? [])
    .filter((item) => item.productId && item.expiryTime && isKnownProduct(item.productId))
    .map((item) => ({ productId: item.productId as string, expiry: Date.parse(item.expiryTime as string) }))
    .filter((item) => !Number.isNaN(item.expiry))
    .sort((a, b) => b.expiry - a.expiry);

  if (known.length === 0) return { ok: false, error: "unknown_product" };
  const best = known[0];
  if (best.expiry <= now.getTime()) return { ok: false, error: "expired" };

  let status: EntitlementGrant["status"] | null = null;
  if (state === "SUBSCRIPTION_STATE_ACTIVE") status = "active";
  else if (state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") status = "grace";
  else if (state === "SUBSCRIPTION_STATE_CANCELED") status = "canceled";
  else return { ok: false, error: "inactive" };

  return {
    ok: true,
    product_id: best.productId,
    expires_at: new Date(best.expiry).toISOString(),
    status,
    original_transaction_id: null,
    latest_transaction_id: null,
    environment: null,
    acknowledge: subscription.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING"
  };
}
