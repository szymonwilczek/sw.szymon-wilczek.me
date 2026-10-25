interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}
interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
