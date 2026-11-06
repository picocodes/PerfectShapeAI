import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { createGatewayClient } from "./ai/gateway.js";
import { firebaseAuthVerifier } from "./http/auth.js";
import { createApp } from "./http/createApp.js";
import { SlidingWindowLimiter } from "./http/limiter.js";
import { AppleJwsVerifier } from "./iap/apple.js";
import { createGoogleVerifier, loadPlayCredentials, unconfiguredGoogle } from "./iap/google.js";
import { loadAppleRoots } from "./iap/roots.js";
import { FirestoreStore } from "./store/firestore.js";

function initAdmin() {
  if (getApps().length > 0) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return;
  }
  initializeApp();
}

initAdmin();

const packageName = process.env.ANDROID_PACKAGE_NAME || "com.perfectshapeai.app";
const bundleId = process.env.APPLE_BUNDLE_ID || "com.perfectshapeai.app";
const playCredentials = loadPlayCredentials();
const appleKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const appleRefresh =
  process.env.APPLE_ISSUER_ID && process.env.APPLE_KEY_ID && appleKey
    ? { issuerId: process.env.APPLE_ISSUER_ID, keyId: process.env.APPLE_KEY_ID, privateKey: appleKey }
    : undefined;

const app = createApp({
  store: new FirestoreStore(getFirestore()),
  now: () => new Date(),
  ai: createGatewayClient(process.env),
  apple: new AppleJwsVerifier(loadAppleRoots(), bundleId, appleRefresh),
  google: playCredentials ? createGoogleVerifier({ packageName, credentials: playCredentials }) : unconfiguredGoogle(),
  identity: { deleteUser: (uid) => getAuth().deleteUser(uid) },
  bundleId,
  auth: firebaseAuthVerifier(),
  limiter: new SlidingWindowLimiter(30, 60 * 60 * 1000, () => Date.now())
});

export const api = onRequest({ region: "us-central1", memory: "256MiB", timeoutSeconds: 60, cors: false, invoker: "public" }, app);
