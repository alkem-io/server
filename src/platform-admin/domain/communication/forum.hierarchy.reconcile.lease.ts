import { randomUUID } from 'crypto';
import type Redis from 'ioredis';

/**
 * Cross-replica ownership of the forum-hierarchy reconcile pass.
 *
 * A reconcile pass authorizes removals from confirmations it gathered earlier
 * in the same pass. Those confirmations are historical observations, not live
 * guarantees: a second pass running concurrently can invalidate one before it
 * is consumed, and then both passes remove each other's confirmed destination
 * and the room is left attached to nothing — with both passes reporting a
 * clean result. A process-local flag cannot prevent that, because the second
 * pass runs in a different API replica with its own flag.
 *
 * Ownership is therefore held in Redis, following the same NX + PX + owner
 * token idiom as the OIDC refresh mutex (`core/auth/oidc/refresh-lock.ts`).
 *
 * Execution fencing comes from pairing the lease with the request expiry the
 * adapter already enforces. Every request carries an expiry no later than the
 * lease's own, and the adapter rejects an expired request before performing
 * any read or write. Because a new owner can only acquire after the previous
 * lease has fully expired, every request the previous owner authorized has
 * expired too — so no waiting period or hand-off protocol is needed.
 */

/**
 * Lease lifetime. Renewed before every destructive call, so this bounds how
 * long a *stalled* owner can keep the pass locked out — not how long a healthy
 * pass may run. It is also the outer bound on the request expiry derived from
 * it, which is what makes the fencing argument above hold.
 */
export const RECONCILE_LEASE_TTL_MS = 60_000;

/**
 * There is exactly one forum, so one key. Kept as a constant rather than
 * derived from the forum id because ownership must be acquired before the
 * pass reads the forum — a second pass must be refused without first doing
 * the work the first pass is already doing.
 */
export const RECONCILE_LEASE_KEY = 'alkemio:forum-hierarchy-reconcile:lease';

const RENEW_LUA = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) else return 0 end`;
const RELEASE_LUA = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`;

export type ReconcileLease = {
  key: string;
  owner: string;
  /**
   * Absolute wall-clock instant this lease currently expires, in Unix
   * milliseconds. Moves forward on every successful renewal, and is what each
   * request's `expires_at_unix_ms` is set to.
   */
  expiresAt: number;
};

/**
 * Take ownership, or return null if another pass already holds it.
 *
 * Deliberately does not poll or wait, unlike the refresh mutex: a second
 * concurrent reconcile is an operator mistake to report, not contention to
 * queue behind.
 */
export async function acquireReconcileLease(
  redis: Redis
): Promise<ReconcileLease | null> {
  const owner = randomUUID();
  const result = await redis.set(
    RECONCILE_LEASE_KEY,
    owner,
    'PX',
    RECONCILE_LEASE_TTL_MS,
    'NX'
  );
  if (result !== 'OK') return null;
  return {
    key: RECONCILE_LEASE_KEY,
    owner,
    expiresAt: Date.now() + RECONCILE_LEASE_TTL_MS,
  };
}

/**
 * Confirm this pass still owns the lease and push its expiry out, in one
 * atomic step. Returns false when ownership has been lost — which the caller
 * must treat as a hard stop for destructive work, because another pass may
 * already be acting on state this pass believes it confirmed.
 *
 * Mutating `lease.expiresAt` in place keeps the request expiry derived from it
 * in step with the renewal, so a long pass does not keep stamping requests
 * with an expiry from the moment it started.
 */
export async function renewReconcileLease(
  redis: Redis,
  lease: ReconcileLease
): Promise<boolean> {
  const result = await redis.eval(
    RENEW_LUA,
    1,
    lease.key,
    lease.owner,
    String(RECONCILE_LEASE_TTL_MS)
  );
  if (result !== 1) return false;
  lease.expiresAt = Date.now() + RECONCILE_LEASE_TTL_MS;
  return true;
}

/**
 * Release ownership, but only if we still hold it — a compare-and-delete, so
 * a pass whose lease already expired and was taken over cannot delete the new
 * owner's lease on its way out.
 */
export async function releaseReconcileLease(
  redis: Redis,
  lease: ReconcileLease
): Promise<void> {
  await redis.eval(RELEASE_LUA, 1, lease.key, lease.owner);
}
