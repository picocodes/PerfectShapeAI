import { db, serverTimestamp } from "./firestore.js";
const USERS = "users";
const DEFAULT_CREDITS = 10;
export async function ensureUser(uid, email) {
    const ref = db().collection(USERS).doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
        const profile = {
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
    return snap.data();
}
export async function getUser(uid) {
    const snap = await db().collection(USERS).doc(uid).get();
    return snap.exists ? snap.data() : null;
}
export async function updateUser(uid, data) {
    await db().collection(USERS).doc(uid).set(data, { merge: true });
}
export async function canConsumeCredits(uid, amount) {
    const user = await getUser(uid);
    if (!user)
        return false;
    if (user.subscription_status === "active")
        return true;
    return user.credits >= amount;
}
export async function consumeCredits(uid, amount) {
    const user = await getUser(uid);
    if (!user)
        throw new Error("User not found");
    if (user.subscription_status === "active")
        return;
    const next = Math.max(0, user.credits - amount);
    await updateUser(uid, { credits: next });
}
export async function markFreePlanUsed(uid) {
    await updateUser(uid, { free_plan_used: true });
}
