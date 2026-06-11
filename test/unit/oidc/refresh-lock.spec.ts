import {
  acquireRefreshLock,
  REFRESH_LOCK_MAX_POLLS,
  REFRESH_LOCK_POLL_INTERVAL_MS,
  REFRESH_LOCK_TTL_MS,
  refreshLockKey,
  releaseRefreshLock,
} from '@core/auth/oidc/refresh-lock';
import type Redis from 'ioredis';
import { beforeEach, describe, expect, it } from 'vitest';

// Minimal in-memory Redis double. Only the three calls the lock uses are
// implemented; unused methods throw so surprise-calls fail loudly.
type LockEntry = { value: string; expiresAt: number };

class FakeRedis {
  private store = new Map<string, LockEntry>();
  public setCalls: Array<{ key: string; opts: string[] }> = [];
  public evalCalls: Array<{ script: string; keys: string[]; args: string[] }> =
    [];

  async set(
    key: string,
    value: string,
    ...opts: unknown[]
  ): Promise<'OK' | null> {
    const optStrs = opts.map(String);
    this.setCalls.push({ key, opts: optStrs });
    const pxIndex = optStrs.findIndex(o => o.toUpperCase() === 'PX');
    const ttlMs = pxIndex >= 0 ? Number(optStrs[pxIndex + 1]) : undefined;
    const nx = optStrs.some(o => o.toUpperCase() === 'NX');

    const existing = this.store.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      if (nx) return null;
    }
    if (ttlMs === undefined) {
      throw new Error('FakeRedis expects PX <ms>');
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return 'OK';
  }

  async eval(
    script: string,
    _numKeys: number,
    key: string,
    arg: string
  ): Promise<number> {
    this.evalCalls.push({ script, keys: [key], args: [arg] });
    const entry = this.store.get(key);
    if (!entry || entry.value !== arg) return 0;
    this.store.delete(key);
    return 1;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}

const asRedis = (fake: FakeRedis): Redis => fake as unknown as Redis;

describe('refresh-lock (FR-022a)', () => {
  let fake: FakeRedis;
  const sessionId = '01HQZR6WZRZRZRZRZRZRZRZRZR';

  beforeEach(() => {
    fake = new FakeRedis();
  });

  it('key layout matches spec', () => {
    expect(refreshLockKey(sessionId)).toBe(
      `alkemio:sid:${sessionId}:refresh-lock`
    );
  });

  it('acquires via SET NX PX 5000 on uncontended key', async () => {
    const lock = await acquireRefreshLock(asRedis(fake), sessionId);
    expect(lock).not.toBeNull();
    expect(fake.setCalls).toHaveLength(1);
    expect(fake.setCalls[0].opts).toContain('NX');
    expect(fake.setCalls[0].opts).toContain('PX');
    expect(fake.setCalls[0].opts).toContain(String(REFRESH_LOCK_TTL_MS));
  });

  it('release uses Lua CAS and removes the key only if owner matches', async () => {
    const lock = await acquireRefreshLock(asRedis(fake), sessionId);
    expect(lock).not.toBeNull();
    await releaseRefreshLock(asRedis(fake), lock!);
    expect(fake.evalCalls).toHaveLength(1);
    expect(fake.evalCalls[0].keys[0]).toBe(lock!.key);
    expect(fake.evalCalls[0].args[0]).toBe(lock!.owner);
    expect(fake.has(lock!.key)).toBe(false);
  });

  it('release is a no-op when a different owner holds the key', async () => {
    await acquireRefreshLock(asRedis(fake), sessionId);
    await releaseRefreshLock(asRedis(fake), {
      key: refreshLockKey(sessionId),
      owner: 'someone-else',
    });
    expect(fake.has(refreshLockKey(sessionId))).toBe(true);
  });

  it('loser returns null after polling out 10 × 100 ms', async () => {
    // hold the lock from a different owner for the full TTL
    await fake.set(
      refreshLockKey(sessionId),
      'rival',
      'PX',
      REFRESH_LOCK_TTL_MS,
      'NX'
    );
    const start = Date.now();
    const lock = await acquireRefreshLock(asRedis(fake), sessionId);
    const elapsed = Date.now() - start;
    expect(lock).toBeNull();
    // Allow slack around the nominal 1000 ms ceiling; must be ≥ 900 ms.
    expect(elapsed).toBeGreaterThanOrEqual(
      REFRESH_LOCK_MAX_POLLS * REFRESH_LOCK_POLL_INTERVAL_MS - 100
    );
  });
});
