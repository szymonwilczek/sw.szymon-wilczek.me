interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface SqlCursor<T> {
  toArray(): T[];
  one(): T;
}
interface SqlStorage {
  exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]): SqlCursor<T>;
}
interface DurableObjectStorage {
  sql: SqlStorage;
  getAlarm(): Promise<number | null>;
  setAlarm(time: number): Promise<void>;
  deleteAlarm(): Promise<void>;
  deleteAll(): Promise<void>;
}
interface DurableObjectState {
  storage: DurableObjectStorage;
}
interface DurableObjectId {}
// RPC stub: every method comes back as a promise
type DurableObjectStub<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};
interface DurableObjectNamespace<T> {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub<T>;
}

declare module "cloudflare:workers" {
  export abstract class DurableObject<Env = unknown> {
    protected ctx: DurableObjectState;
    protected env: Env;
    constructor(ctx: DurableObjectState, env: Env);
  }
}
