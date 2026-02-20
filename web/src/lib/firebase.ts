import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG
  ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG)
  : null;

export function getFirebaseApp() {
  if (getApps().length) return getApps()[0]!;
  if (!firebaseConfig) {
    throw new Error("Missing VITE_FIREBASE_CONFIG");
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
