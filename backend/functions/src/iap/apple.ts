import type { AppleTransactionClaims } from "../domain/iap.js";
import { JwsError, verifyEs256Jws } from "../domain/jws.js";
import { HttpError } from "../http/errors.js";
import { createAppStoreJwt, latestSignedTransactions } from "./appStoreJwt.js";

export interface AppleVerifier {
  verify(jws: string, now: Date): AppleTransactionClaims;
  refresh(originalTransactionId: string, now: Date): Promise<AppleTransactionClaims | null>;
}

export class AppleJwsVerifier implements AppleVerifier {
  constructor(
    private readonly rootsPem: string[],
    private readonly bundleId: string,
    private readonly appStore?: {
      issuerId: string;
      keyId: string;
      privateKey: string;
      fetchImpl?: typeof fetch;
    }
  ) {}

  verify(jws: string, now: Date): AppleTransactionClaims {
    try {
      return verifyEs256Jws<AppleTransactionClaims>(jws, this.rootsPem, now).payload;
    } catch (error) {
      if (error instanceof JwsError) {
        throw new HttpError(400, "invalid_receipt", "The App Store receipt could not be verified.");
      }
      throw error;
    }
  }

  async refresh(originalTransactionId: string, now: Date): Promise<AppleTransactionClaims | null> {
    if (!this.appStore) return null;
    const token = createAppStoreJwt({
      issuerId: this.appStore.issuerId,
      keyId: this.appStore.keyId,
      privateKey: this.appStore.privateKey,
      bundleId: this.bundleId,
      nowSec: Math.floor(now.getTime() / 1000)
    });
    const fetchImpl = this.appStore.fetchImpl ?? fetch;
    const hosts = ["https://api.storekit.itunes.apple.com", "https://api.storekit-sandbox.itunes.apple.com"];
    for (const host of hosts) {
      const response = await fetchImpl(
        `${host}/inApps/v1/subscriptions/${encodeURIComponent(originalTransactionId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.status === 404) continue;
      if (!response.ok) {
        throw new HttpError(502, "apple_refresh_failed", "Could not refresh the subscription with Apple.");
      }
      const signed = latestSignedTransactions(await response.json());
      let best: AppleTransactionClaims | null = null;
      for (const jws of signed) {
        const claims = this.verify(jws, now);
        if (!best || (claims.expiresDate ?? 0) > (best.expiresDate ?? 0)) best = claims;
      }
      return best;
    }
    return null;
  }
}
