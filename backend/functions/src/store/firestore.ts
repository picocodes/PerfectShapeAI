import { type Firestore, type Transaction } from "firebase-admin/firestore";
import type { DocStore, StoreTx } from "./types.js";

export class FirestoreStore implements DocStore {
  constructor(private readonly db: Firestore) {}

  async get<T>(collection: string, id: string): Promise<T | null> {
    const snap = await this.db.collection(collection).doc(id).get();
    return snap.exists ? (snap.data() as T) : null;
  }

  async set<T>(collection: string, id: string, value: T): Promise<void> {
    await this.db.collection(collection).doc(id).set(value as Record<string, unknown>);
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.db.collection(collection).doc(id).delete();
  }

  async list<T>(collection: string, field: string, value: string): Promise<T[]> {
    const snap = await this.db.collection(collection).where(field, "==", value).get();
    return snap.docs.map((doc) => doc.data() as T);
  }

  async transaction<T>(fn: (tx: StoreTx) => Promise<T>): Promise<T> {
    return this.db.runTransaction(async (native) => {
      const buffered = new FirestoreTx(this.db, native);
      const result = await fn(buffered);
      buffered.flush();
      return result;
    });
  }

  async deleteUserCascade(uid: string): Promise<void> {
    await this.delete("users", uid);
    await this.delete("xp", uid);
    await this.delete("subscriptions", uid);
    const collections = [
      "weight_logs",
      "meal_logs",
      "workout_logs",
      "daily",
      "achievements",
      "plans",
      "conversations",
      "ai_quota",
      "receipt_claims"
    ];
    for (const collection of collections) {
      const snap = await this.db.collection(collection).where("user_id", "==", uid).get();
      for (let index = 0; index < snap.docs.length; index += 400) {
        const batch = this.db.batch();
        for (const doc of snap.docs.slice(index, index + 400)) batch.delete(doc.ref);
        await batch.commit();
      }
    }
  }
}

class FirestoreTx implements StoreTx {
  private writes: { collection: string; id: string; value: unknown | null }[] = [];
  private wrote = false;

  constructor(
    private readonly db: Firestore,
    private readonly tx: Transaction
  ) {}

  async get<T>(collection: string, id: string): Promise<T | null> {
    if (this.wrote) throw new Error("read_after_write");
    const snap = await this.tx.get(this.db.collection(collection).doc(id));
    return snap.exists ? (snap.data() as T) : null;
  }

  async list<T>(collection: string, field: string, value: string): Promise<T[]> {
    if (this.wrote) throw new Error("read_after_write");
    const snap = await this.tx.get(this.db.collection(collection).where(field, "==", value));
    return snap.docs.map((doc) => doc.data() as T);
  }

  async set<T>(collection: string, id: string, value: T): Promise<void> {
    this.wrote = true;
    this.writes.push({ collection, id, value });
  }

  async delete(collection: string, id: string): Promise<void> {
    this.wrote = true;
    this.writes.push({ collection, id, value: null });
  }

  flush(): void {
    for (const write of this.writes) {
      const ref = this.db.collection(write.collection).doc(write.id);
      if (write.value === null) this.tx.delete(ref);
      else this.tx.set(ref, write.value as Record<string, unknown>);
    }
  }
}
