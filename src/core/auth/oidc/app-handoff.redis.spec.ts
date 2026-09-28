import { describe, expect, it, vi } from 'vitest';
import {
  APP_HANDOFF_KEY_PREFIX,
  APP_HANDOFF_TTL_S,
  type AppHandoffRecord,
  redeemAppHandoff,
  storeAppHandoff,
} from './app-handoff.redis';

const RECORD: AppHandoffRecord = {
  bundle: {
    access_token: 'at',
    id_token: 'idt',
    refresh_token: 'rt',
    expires_at: 1_800_000_600,
    scope: 'openid profile',
    sub: 'sub-1',
    alkemio_actor_id: 'actor-1',
    client_id: 'alkemio-web',
  },
  returnTo: '/spaces/alkemio',
  app_challenge: 'challenge-0123456789abcdefghijklmnopqrstuvwx',
  issued_at: 1_800_000_000,
  correlation_id: 'corr-origin-1',
};

/**
 * Minimal in-memory stand-in for the two commands this module uses.
 * Hand-rolled rather than pulling in `ioredis-mock` for the same reason
 * `session-index.redis.spec.ts` is: the tests below assert the exact command
 * shape, which a black-box mock would hide.
 */
function makeFakeRedis(initial?: Map<string, string>) {
  const data = initial ?? new Map<string, string>();
  const redis = {
    set: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
      return 'OK';
    }),
    getdel: vi.fn(async (key: string) => {
      const value = data.get(key) ?? null;
      data.delete(key);
      return value;
    }),
  } as any;
  return { redis, data };
}

describe('storeAppHandoff (FR-006)', () => {
  it('writes the record under a 43-character base64url code with a 60 s TTL', async () => {
    const { redis, data } = makeFakeRedis();
    const code = await storeAppHandoff(redis, RECORD);

    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(redis.set).toHaveBeenCalledWith(
      APP_HANDOFF_KEY_PREFIX + code,
      JSON.stringify(RECORD),
      'EX',
      APP_HANDOFF_TTL_S,
      'NX'
    );
    expect(APP_HANDOFF_TTL_S).toBeLessThanOrEqual(60);
    expect(data.size).toBe(1);
  });

  it('mints a fresh code per call', async () => {
    const { redis } = makeFakeRedis();
    const first = await storeAppHandoff(redis, RECORD);
    const second = await storeAppHandoff(redis, RECORD);
    expect(first).not.toBe(second);
  });
});

describe('redeemAppHandoff (FR-009)', () => {
  it('returns the stored record', async () => {
    const { redis } = makeFakeRedis();
    const code = await storeAppHandoff(redis, RECORD);
    await expect(redeemAppHandoff(redis, code)).resolves.toEqual(RECORD);
  });

  // The record burns on ANY attempt, before the verifier is so much as looked
  // at, which is what stops a stolen code being worth replaying.
  it('returns null on a second redemption of the same code', async () => {
    const { redis } = makeFakeRedis();
    const code = await storeAppHandoff(redis, RECORD);
    await redeemAppHandoff(redis, code);
    await expect(redeemAppHandoff(redis, code)).resolves.toBeNull();
  });

  it('returns null for a code whose key has expired', async () => {
    const { redis } = makeFakeRedis();
    await expect(redeemAppHandoff(redis, 'long-gone')).resolves.toBeNull();
  });

  // One atomic round trip: a GET followed by a DEL would let two concurrent
  // attempts both read the record before either deleted it.
  it('issues exactly one GETDEL and no other command', async () => {
    const { redis } = makeFakeRedis();
    const code = await storeAppHandoff(redis, RECORD);
    redis.set.mockClear();

    await redeemAppHandoff(redis, code);

    expect(redis.getdel).toHaveBeenCalledOnce();
    expect(redis.getdel).toHaveBeenCalledWith(APP_HANDOFF_KEY_PREFIX + code);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
