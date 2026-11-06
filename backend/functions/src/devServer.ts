import { createServer } from "node:http";
import { createGatewayClient } from "./ai/gateway.js";
import { devAuthAllowed, devAuthVerifier, firebaseAuthVerifier, type AuthVerifier } from "./http/auth.js";
import { createApp } from "./http/createApp.js";
import { SlidingWindowLimiter } from "./http/limiter.js";
import { AppleJwsVerifier } from "./iap/apple.js";
import { createGoogleVerifier, loadPlayCredentials, unconfiguredGoogle } from "./iap/google.js";
import { loadAppleRoots } from "./iap/roots.js";
import { MemoryStore } from "./store/memory.js";

const bundleId = process.env.APPLE_BUNDLE_ID || "com.perfectshapeai.app";
const packageName = process.env.ANDROID_PACKAGE_NAME || "com.perfectshapeai.app";
const playCredentials = loadPlayCredentials();
const appleKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const allowDev = devAuthAllowed();
const auth: AuthVerifier = allowDev ? devAuthVerifier() : firebaseAuthVerifier();

const app = createApp({
  store: new MemoryStore(),
  now: () => new Date(),
  ai: createGatewayClient(process.env),
  apple: new AppleJwsVerifier(
    loadAppleRoots(),
    bundleId,
    process.env.APPLE_ISSUER_ID && process.env.APPLE_KEY_ID && appleKey
      ? { issuerId: process.env.APPLE_ISSUER_ID, keyId: process.env.APPLE_KEY_ID, privateKey: appleKey }
      : undefined
  ),
  google: playCredentials ? createGoogleVerifier({ packageName, credentials: playCredentials }) : unconfiguredGoogle(),
  identity: { async deleteUser() { return undefined; } },
  bundleId,
  auth,
  limiter: new SlidingWindowLimiter(30, 60 * 60 * 1000, () => Date.now())
});

const port = Number(process.env.PORT || 8787);
createServer(app).listen(port, () => {
  console.log(`PerfectShape API listening on ${port}. Dev auth ${allowDev ? "on" : "off"}.`);
});
