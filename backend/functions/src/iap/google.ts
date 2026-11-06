import { readFileSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";
import type { PlaySubscription } from "../domain/iap.js";
import { HttpError } from "../http/errors.js";

export interface GoogleVerifier {
  verifyToken(token: string): Promise<PlaySubscription>;
  acknowledge(token: string, productId: string): Promise<void>;
}

export function loadPlayCredentials(env: NodeJS.ProcessEnv = process.env): Record<string, unknown> | null {
  if (env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) as Record<string, unknown>;
  }
  if (env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE) {
    return JSON.parse(readFileSync(env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE, "utf8")) as Record<string, unknown>;
  }
  return null;
}

export function unconfiguredGoogle(): GoogleVerifier {
  return {
    async verifyToken() {
      throw new HttpError(503, "play_not_configured", "Google Play verification is not configured on the server yet.");
    },
    async acknowledge() {
      return undefined;
    }
  };
}

export function createGoogleVerifier(input: {
  packageName: string;
  credentials: Record<string, unknown>;
  fetchImpl?: typeof fetch;
}): GoogleVerifier {
  const auth = new GoogleAuth({
    credentials: input.credentials as never,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"]
  });
  const fetchImpl = input.fetchImpl ?? fetch;

  async function bearer(): Promise<string> {
    const client = await auth.getClient();
    const access = await client.getAccessToken();
    if (!access.token) {
      throw new HttpError(503, "play_not_configured", "Google Play credentials could not mint an access token.");
    }
    return access.token;
  }

  return {
    async verifyToken(token) {
      const access = await bearer();
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(input.packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`;
      const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${access}` } });
      if (response.status === 404 || response.status === 400) {
        throw new HttpError(400, "invalid_receipt", "Google Play did not recognize that purchase.");
      }
      if (!response.ok) throw new HttpError(502, "play_verify_failed", "Could not verify the purchase with Google Play.");
      return (await response.json()) as PlaySubscription;
    },
    async acknowledge(token, productId) {
      const access = await bearer();
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(input.packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`;
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!response.ok && response.status !== 409) {
        throw new HttpError(502, "play_ack_failed", "The purchase was verified but not acknowledged yet.");
      }
    }
  };
}
