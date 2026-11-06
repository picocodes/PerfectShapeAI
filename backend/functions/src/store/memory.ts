import type { DocStore, StoreTx } from "./types.js";

export class MemoryStore implements DocStore {
  private tables = new Map<string, Map<string, unknown>>();
  private queue: Promise<void> = Promise.resolve();

  private bucket(collection: string): Map<string, unknown> {
    let table = this.tables.get(collection);
    if (!table) {
      table = new Map();
      this.tables.set(collection, table);
    }
    return table;
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const value = this.bucket(collection).get(id);
    return value === undefined ? null : (structuredClone(value) as T);
  }

  async set<T>(collection: string, id: string, value: T): Promise<void> {
    this.bucket(collection).set(id, structuredClone(value));
  }

  async delete(collection: string, id: string): Promise<void> {
    this.bucket(collection).delete(id);
  }

  async list<T>(collection: string, field: string, value: string): Promise<T[]> {
    const matches: T[] = [];
    for (const doc of this.bucket(collection).values()) {
      if ((doc as Record<string, unknown>)[field] === value) matches.push(structuredClone(doc) as T);
    }
    return matches;
  }

  async transaction<T>(fn: (tx: StoreTx) => Promise<T>): Promise<T> {
    const run = async () => {
      const tx = new MemoryTx(this);
      const result = await fn(tx);
      tx.commit();
      return result;
    };
    const pending = this.queue.then(run, run);
    this.queue = pending.then(
      () => undefined,
      () => undefined
    );
    return pending;
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
      const table = this.bucket(collection);
      for (const [id, value] of [...table.entries()]) {
        const doc = value as { user_id?: string };
        if (doc.user_id === uid || id.startsWith(`uid:${uid}:`)) table.delete(id);
      }
    }
  }
}

class MemoryTx implements StoreTx {
  private writes = new Map<string, { collection: string; id: string; value: unknown | null }>();
  private wrote = false;

  constructor(private readonly store: MemoryStore) {}

  async get<T>(collection: string, id: string): Promise<T | null> {
    if (this.wrote) throw new Error("read_after_write");
    return this.store.get<T>(collection, id);
  }

  async list<T>(collection: string, field: string, value: string): Promise<T[]> {
    if (this.wrote) throw new Error("read_after_write");
    return this.store.list<T>(collection, field, value);
  }

  async set<T>(collection: string, id: string, value: T): Promise<void> {
    this.wrote = true;
    this.writes.set(`${collection}\0${id}`, { collection, id, value: structuredClone(value) });
  }

  async delete(collection: string, id: string): Promise<void> {
    this.wrote = true;
    this.writes.set(`${collection}\0${id}`, { collection, id, value: null });
  }

  commit(): void {
    for (const write of this.writes.values()) {
      if (write.value === null) void this.store.delete(write.collection, write.id);
      else void this.store.set(write.collection, write.id, write.value);
    }
  }
}
