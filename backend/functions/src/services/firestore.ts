import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export function initializeAdmin() {
  if (getApps().length > 0) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error("Missing Firebase admin credentials.");
  }

  initializeApp({
    credential: cert({
      projectId,
      privateKey,
      clientEmail
    })
  });
}

export function db() {
  initializeAdmin();
  return getFirestore();
}

export const serverTimestamp = () => FieldValue.serverTimestamp();
