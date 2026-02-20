import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
  ? JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG)
  : null;

export function getFirebaseApp() {
  if (getApps().length) return getApps()[0]!;
  if (!firebaseConfig) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_CONFIG");
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
