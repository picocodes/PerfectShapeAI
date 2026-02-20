import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : null;

export function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0]!;
  if (!firebaseConfig) throw new Error("Missing FIREBASE_CONFIG");
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
