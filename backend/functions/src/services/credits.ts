import { db, serverTimestamp } from "./firestore.js";
import type { UserProfile } from "./types.js";

const USERS = "users";
const DEFAULT_CREDITS = 10;

export async function ensureUser(uid: string, email?: string | null) {
  const ref = db().collection(USERS).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const profile: UserProfile = {
      id: uid,
      firebase_uid: uid,
      email: email ?? null,
      subscription_status: "free",
      credits: DEFAULT_CREDITS,
      free_plan_used: false,
      created_at: serverTimestamp()
    };
    await ref.set(profile);
    return profile;
  }
  return snap.data() as UserProfile;
}

export async function getUser(uid: string) {
  const snap = await db().collection(USERS).doc(uid).get();
  return snap.exists ? (snap.data() as UserProfile) : null;
}

export async function updateUser(uid: string, data: Partial<UserProfile>) {
  await db().collection(USERS).doc(uid).set(data, { merge: true });
}

export async function canConsumeCredits(uid: string, amount: number) {
  const user = await getUser(uid);
  if (!user) return false;
  if (user.subscription_status === "active") return true;
  return user.credits >= amount;
}

export async function consumeCredits(uid: string, amount: number) {
  const user = await getUser(uid);
  if (!user) throw new Error("User not found");
  if (user.subscription_status === "active") return;
  const next = Math.max(0, user.credits - amount);
  await updateUser(uid, { credits: next });
}

export async function markFreePlanUsed(uid: string) {
  await updateUser(uid, { free_plan_used: true });
}
