// the little of Cloudflare's D1 the inbox uses, so it needs no packages
interface D1Result<T> {
  results: T[];
}
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(sql: string): D1Statement;
}
