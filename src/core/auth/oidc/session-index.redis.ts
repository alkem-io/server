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
 * `SADD` + a non-shortening TTL roll, as ONE atomic server-side step.
 *
 * This has to be atomic, and `EXPIRE … GT` alone cannot do it. Redis treats a
 * key with no expiry as having an infinite TTL, so `GT` never sets the *first*
 * expiry — the exact case that leaks the key forever. The script therefore
 * branches on "no expiry yet" and "candidate is longer" separately.
 *
 * `TTL` returns -1 for "key exists, no expiry" and -2 for "no key"; both are
 * negative, and both mean "there is no expiry to preserve".
 */
const ADD_AND_ROLL_TTL_LUA = `
local added = redis.call('SADD', KEYS[1], ARGV[1])
local candidate = tonumber(ARGV[2])
if candidate < 1 then candidate = 1 end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 or candidate > ttl then
  redis.call('EXPIRE', KEYS[1], candidate)
end
return added
`;

/**
 * Add a session to its subject's index and roll the key's TTL forward.
 *
 * The TTL is NOT optional bookkeeping. A `SADD` without an `EXPIRE` leaks the
 * key permanently — Redis sets have no per-member expiry, so an index that is
 * never revoked and never expires outlives every session it names, forever.
 *
 * The roll **never shortens**: if a second device signs in with a later
 * absolute ceiling, the key must outlive the first device's expiry. Shortening
 * would evict a live member's entry, and an index that under-reports means
 * revocation silently misses a session — the worst failure this feature can
 * have.
 *
 * Both properties are enforced inside a single `EVAL` rather than by a
 * read-modify-write from the client. Three separate round trips could (a) die
 * between the `SADD` and the `EXPIRE`, leaving the key immortal, and (b)
 * interleave with a concurrent login so a device reading an old TTL writes it
 * back over a longer one. One round trip also matters because the self-healing
 * write on the request path (`CookieSessionStrategy.reindexSession`) runs this
 * for every authenticated request, platform-wide.
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

  const nowS = Math.floor(Date.now() / 1000);
  const candidateTtlS = Number.isFinite(absoluteExpiresAtEpochSeconds)
    ? absoluteExpiresAtEpochSeconds - nowS
    : 0;

  await redis.eval(
    ADD_AND_ROLL_TTL_LUA,
    1,
    subIndexKey(sub),
    sessionId,
    String(candidateTtlS)
  );
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

/**
 * Subject-level revocation marker (server#6315).
 *
 * The per-session tombstone is necessary but NOT sufficient, for two reasons
 * that look unrelated and are the same reason — the session payload is not a
 * trustworthy record that a revocation happened:
 *
 * 1. **The tombstone can be overwritten.** express-session owns writes to
 *    `alkemio:sid:<sid>`. A request already in flight when revocation runs has
 *    the live payload loaded in `req.session`; when it later persists (an
 *    explicit `save()` on `/refresh`, or the lazy idle renewal firing at
 *    response end) it writes that payload straight over the tombstone. The
 *    session is then alive again AND has already been removed from the index,
 *    so no retry can find it. The race window is a whole request.
 * 2. **Not every live session is in the index.** Sessions minted before the
 *    index shipped are only added by the self-heal on their next authenticated
 *    request. Delete the user before that request and `revokeAllForSub`
 *    enumerates nothing, so the session survives.
 *
 * The marker is authoritative in both cases because it is keyed by subject and
 * read on every request, so it needs neither an intact payload nor index
 * membership.
 *
 * It stores an epoch-seconds `revoked_at` rather than a bare flag, which is
 * what keeps it from being a permanent ban on the subject: a session whose
 * `created_at` is LATER than `revoked_at` was minted after the revocation and
 * is unaffected. A subject that signs in again therefore needs no marker
 * cleanup, and a stale marker can only ever reject sessions that predate it.
 *
 * TTL is the absolute session ceiling: once no session old enough to be
 * affected can still exist, the marker has nothing left to do.
 */
export const SUB_REVOKED_KEY_PREFIX = 'alkemio:subrevoked:';

export function subRevokedKey(sub: string): string {
  return SUB_REVOKED_KEY_PREFIX + sub;
}

/**
 * Later revocations win. A concurrent pair must not let the earlier timestamp
 * overwrite the later one — that would re-admit sessions the later revocation
 * was meant to kill — so the compare-and-set happens server-side.
 */
const MARK_SUB_REVOKED_LUA = `
local existing = tonumber(redis.call('GET', KEYS[1]))
local candidate = tonumber(ARGV[1])
if existing == nil or candidate > existing then
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
else
  redis.call('EXPIRE', KEYS[1], ARGV[2], 'GT')
end
return 1
`;

export async function markSubRevoked(
  redis: Redis,
  sub: string,
  revokedAtEpochSeconds: number,
  ttlSeconds: number
): Promise<void> {
  if (!sub) return;
  await redis.eval(
    MARK_SUB_REVOKED_LUA,
    1,
    subRevokedKey(sub),
    String(Math.floor(revokedAtEpochSeconds)),
    String(Math.max(1, Math.floor(ttlSeconds)))
  );
}

/**
 * Returns the epoch-seconds at which this subject was last fully revoked, or
 * `null` if there is no marker. Callers compare it against a session's
 * `created_at`.
 */
export async function getSubRevokedAt(
  redis: Redis,
  sub: string
): Promise<number | null> {
  if (!sub) return null;
  const raw = await redis.get(subRevokedKey(sub));
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Operator remediation / test cleanup. Not part of any normal flow — the
 * marker's own TTL is the expiry path.
 */
export async function clearSubRevoked(
  redis: Redis,
  sub: string
): Promise<void> {
  if (!sub) return;
  await redis.del(subRevokedKey(sub));
}
