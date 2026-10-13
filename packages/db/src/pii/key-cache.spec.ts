import { describe, expect, it } from 'vitest';

import { KeyCache } from './key-cache.js';

describe('KeyCache', () => {
  it('expires entries after the TTL so revoked keys stop being served', () => {
    let now = 0;
    const cache = new KeyCache<string>({ ttlMs: 1000, now: () => now });
    cache.set('k', 'dek');

    now = 999;
    expect(cache.get('k')).toBe('dek');
    now = 1000;
    expect(cache.get('k')).toBeUndefined();
  });

  it('evicts the least recently used entry beyond maxEntries', () => {
    const cache = new KeyCache<string>({ maxEntries: 2 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.get('a'); // a is now most recent
    cache.set('c', '3');

    expect([cache.get('a'), cache.get('b'), cache.get('c')]).toEqual(['1', undefined, '3']);
    expect(cache.size).toBe(2);
  });
});
