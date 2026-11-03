/**
 * Bounded cache of unwrapped tenant keys: least-recently-used eviction plus a time-to-live, so a
 * key revoked at the KMS (or a re-wrapped row) stops being served within ttlMs without a restart.
 */
export interface KeyCacheOptions {
  maxEntries?: number;
  ttlMs?: number;
  now?: () => number;
}

export class KeyCache<V> {
  readonly #entries = new Map<string, { value: V; expiresAt: number }>();
  readonly #maxEntries: number;
  readonly #ttlMs: number;
  readonly #now: () => number;

  constructor(options: KeyCacheOptions = {}) {
    this.#maxEntries = options.maxEntries ?? 1000;
    this.#ttlMs = options.ttlMs ?? 10 * 60_000;
    this.#now = options.now ?? Date.now;
  }

  get(key: string): V | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    this.#entries.delete(key);
    if (entry.expiresAt <= this.#now()) return undefined;
    this.#entries.set(key, entry); // most recently used goes last
    return entry.value;
  }

  set(key: string, value: V): void {
    this.#entries.delete(key);
    this.#entries.set(key, { value, expiresAt: this.#now() + this.#ttlMs });
    while (this.#entries.size > this.#maxEntries) {
      const oldest = this.#entries.keys().next();
      if (oldest.done) break;
      this.#entries.delete(oldest.value);
    }
  }

  delete(key: string): void {
    this.#entries.delete(key);
  }

  get size(): number {
    return this.#entries.size;
  }
}
