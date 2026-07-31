import type { Redis } from 'ioredis';

/**
 * Per-subject session index (server#6315).
 *
 * Sessions are stored at `alkemio:sid:<sid>` and there is no way to get from a
 * subject to that subject's sessions — which is why deleting a user could not
 * revoke their sessions, and why the same gap blocks client-web#10070 and
 * server#6073. This module is the missing primitive: a Redis Set per subject
 * whose members are session ids.
 *
 * Deliberately a set of bare sids and nothing else:
 * - `SADD` is idempotent, which is exactly what the self-healing write on the
 *   request path needs (FR-002a) — it can run on every request without
 *   accumulating duplicates.
 * - `SMEMBERS` costs O(that subject's own session count), never O(keyspace)
 *   (FR-005 / SC-007). No `SCAN`, no `KEYS`, no wildcard appears in this file.
 * - Membership is ADVISORY. A member may name a sid whose payload has already
 *   expired or been signed out; the payload, never the index, decides whether a
 *   session is alive. Callers treat a missing payload as `already_absent`.
 *
 * The prefix mirrors the existing `alkemio:sid:` (`session-store.redis.ts`) so
 * both key families are visible in one namespace when an operator debugs by
 * hand.
 */
export const SUB_INDEX_KEY_PREFIX = 'alkemio:sub:';

export function subIndexKey(sub: string): string {
  return SUB_INDEX_KEY_PREFIX + sub;
}

/**
 * Add a session to its subject's index and roll the key's TTL forward.
 *
 * The TTL is NOT optional bookkeeping. A `SADD` without an `EXPIRE` leaks the
 * key permanently — Redis sets have no per-member expiry, so an index that is
 * never revoked and never expires outlives every session it names, forever.
 *
 * The roll is `max(currentTtl, candidate, 1)`:
 * - **never shortens** — if a second device signs in with a later absolute
 *   ceiling, the key must outlive the first device's expiry. Setting rather
 *   than extending would evict a live member's entry, and an index that
 *   under-reports means revocation silently misses a session. That is the worst
 *   failure this feature can have.
 * - floors at 1 s so a non-positive computed value can never be read by Redis
 *   as "delete now".
 *
 * Best-effort by contract: callers must not let a rejection here fail the
 * operation that triggered it (FR-006).
 */
export async function addSessionToSubIndex(
  redis: Redis,
  sub: string,
  sessionId: string,
  absoluteExpiresAtEpochSeconds: number
): Promise<void> {
  if (!sub || !sessionId) return;
  const key = subIndexKey(sub);
  await redis.sadd(key, sessionId);

  const nowS = Math.floor(Date.now() / 1000);
  const candidateTtlS = Number.isFinite(absoluteExpiresAtEpochSeconds)
    ? absoluteExpiresAtEpochSeconds - nowS
    : 0;
  // ioredis returns -1 for "key exists, no expiry" and -2 for "no key". Both
  // are non-positive and must not be treated as a TTL to preserve.
  const currentTtlS = await redis.ttl(key);
  const targetTtlS = Math.max(
    currentTtlS > 0 ? currentTtlS : 0,
    candidateTtlS,
    1
  );
  await redis.expire(key, targetTtlS);
}

/**
 * Remove one session from its subject's index. Redis deletes the set
 * automatically once its last member is removed, so there is no separate
 * cleanup path.
 */
export async function removeSessionFromSubIndex(
  redis: Redis,
  sub: string,
  sessionId: string
): Promise<void> {
  if (!sub || !sessionId) return;
  await redis.srem(subIndexKey(sub), sessionId);
}

/**
 * List one subject's session ids. `SMEMBERS` on a missing key returns an empty
 * array, which is the correct "this subject has no sessions" answer — so the
 * caller needs no existence check.
 */
export async function listSessionsForSub(
  redis: Redis,
  sub: string
): Promise<string[]> {
  if (!sub) return [];
  return redis.smembers(subIndexKey(sub));
}

/**
 * Drop a subject's index entirely. Not used by the normal flows (those prune
 * per-session); available for operator remediation.
 */
export async function dropSubIndex(redis: Redis, sub: string): Promise<void> {
  if (!sub) return;
  await redis.del(subIndexKey(sub));
}
