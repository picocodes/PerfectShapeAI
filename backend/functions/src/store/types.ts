export interface StoreTx {
  get<T>(collection: string, id: string): Promise<T | null>;
  set<T>(collection: string, id: string, value: T): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  list<T>(collection: string, field: string, value: string): Promise<T[]>;
}

export interface DocStore extends StoreTx {
  transaction<T>(fn: (tx: StoreTx) => Promise<T>): Promise<T>;
  deleteUserCascade(uid: string): Promise<void>;
}
