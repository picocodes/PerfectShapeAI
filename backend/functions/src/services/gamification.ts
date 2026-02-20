import { db, serverTimestamp } from "./firestore.js";
import type { XPState } from "./types.js";

const XP_COLLECTION = "xp";

function calculateLevel(total: number) {
  return Math.floor(total / 500) + 1;
}

export async function getXp(uid: string): Promise<XPState> {
  const ref = db().collection(XP_COLLECTION).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const base: XPState = {
      user_id: uid,
      total_xp: 0,
      level: 1,
      streak_count: 0,
      last_active_date: null
    };
    await ref.set(base);
    return base;
  }
  return snap.data() as XPState;
}

export async function addXp(uid: string, amount: number, activityDate: string) {
  const xp = await getXp(uid);
  const total = xp.total_xp + amount;
  const level = calculateLevel(total);
  const streak = updateStreak(xp, activityDate);

  await db().collection(XP_COLLECTION).doc(uid).set(
    {
      total_xp: total,
      level,
      streak_count: streak,
      last_active_date: activityDate,
      updated_at: serverTimestamp()
    },
    { merge: true }
  );

  return { total_xp: total, level, streak_count: streak };
}

function updateStreak(xp: XPState, activityDate: string) {
  if (!xp.last_active_date) return 1;
  const prev = new Date(xp.last_active_date);
  const next = new Date(activityDate);
  const diff = Math.floor((next.getTime() - prev.getTime()) / 86400000);
  if (diff === 1) return xp.streak_count + 1;
  if (diff <= 0) return xp.streak_count;
  return 1;
}
