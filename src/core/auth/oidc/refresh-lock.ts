import { randomUUID } from 'crypto';
import type Redis from 'ioredis';

export const REFRESH_LOCK_TTL_MS = 5000;
export const REFRESH_LOCK_POLL_INTERVAL_MS = 100;
export const REFRESH_LOCK_MAX_POLLS = 10;

const RELEASE_LUA = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`;

export type RefreshLock = {
  key: string;
  owner: string;
};

export function refreshLockKey(sessionId: string): string {
  return `alkemio:sid:${sessionId}:refresh-lock`;
}

// FR-022a — single-session refresh mutex. Acquirer mints a UUID owner and
// sets the key with NX + PX 5000. Losers poll ≤ 10 × 100 ms = 1 s. Loser
// timeout surfaces as `temporarily_unavailable` at the caller.
export async function acquireRefreshLock(
  redis: Redis,
  sessionId: string
): Promise<RefreshLock | null> {
  const key = refreshLockKey(sessionId);
  const owner = randomUUID();
  for (let attempt = 0; attempt <= REFRESH_LOCK_MAX_POLLS; attempt += 1) {
    const result = await redis.set(key, owner, 'PX', REFRESH_LOCK_TTL_MS, 'NX');
    if (result === 'OK') {
      return { key, owner };
    }
    if (attempt === REFRESH_LOCK_MAX_POLLS) break;
    await sleep(REFRESH_LOCK_POLL_INTERVAL_MS);
  }
  return null;
}

export async function releaseRefreshLock(
  redis: Redis,
  lock: RefreshLock
): Promise<void> {
  await redis.eval(RELEASE_LUA, 1, lock.key, lock.owner);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
