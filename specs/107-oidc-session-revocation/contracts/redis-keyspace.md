# Contract — Redis keyspace

**Feature**: `specs/107-oidc-session-revocation`

Redis is a shared runtime surface: the session store, the refresh mutex and now
the per-subject index all live in one keyspace, and operators debug it by hand.
This document is the contract for what may exist there and under what rules.

---

## Key families

| Key | Type | Owner | Added by this feature? |
|---|---|---|---|
| `alkemio:sid:<sid>` | string (JSON) | `express-session` + `connect-redis` | no — read + tombstoned only |
| `alkemio:sid:<sid>:refresh-lock` | string | `refresh-lock.ts` | no — and NOT touched by revocation (see below) |
| **`alkemio:sub:<sub>`** | **set** | `session-index.redis.ts` | **YES** |
| **`alkemio:subrevoked:<sub>`** | **string (epoch seconds)** | `session-index.redis.ts` | **YES** |

`alkemio:sid:<sid>:refresh-lock` is deliberately left alone. The refresh mutex in
production is the in-process `refreshInFlight` Map — `acquireRefreshLock` has no
production caller — so the key is never written and deleting it is a wasted
round trip. It is also unsafe to delete unconditionally: `releaseRefreshLock` is
an owner-checked compare-and-delete specifically so a lock cannot be stolen, and
a blind `DEL` would let two refreshes rotate one grant the moment the Redis mutex
is wired up.

`<sub>` is the Kratos identity UUID, equal to `user.authenticationID`
(research R10). It is an opaque UUID — not an email, not a name — so the key name
itself carries no personal data.

---

## `alkemio:sub:<sub>` operations

| Operation | Commands | Called from |
|---|---|---|
| add | `SADD key sid` then TTL roll | OIDC callback (FR-002); cookie-session strategy (FR-002a) |
| prune one | `SREM key sid` | logout; refresh-failure teardown; revocation |
| list | `SMEMBERS key` | `revokeAllForSub` only |
| drop | `DEL key` | not used in normal flow; available for operator remediation |

### TTL roll (the rule that prevents the leak) — one atomic `EVAL`

```lua
-- KEYS[1] = alkemio:sub:<sub>   ARGV[1] = sid   ARGV[2] = absolute_expires_at − now
local added = redis.call('SADD', KEYS[1], ARGV[1])
local candidate = tonumber(ARGV[2]); if candidate < 1 then candidate = 1 end
local ttl = redis.call('TTL', KEYS[1])          -- -1 = no expiry, -2 = no key
if ttl < 0 or candidate > ttl then
  redis.call('EXPIRE', KEYS[1], candidate)
end
return added
```

**Why a script and not three commands.** A client-side `SADD` / `TTL` / `EXPIRE`
can die between the first and the last, leaving the key with no expiry — the
exact permanent leak this rule exists to prevent — and two concurrent logins can
interleave the read-modify-write so the shorter TTL lands last and truncates the
key, evicting a live member. `EXPIRE … GT` alone does not fix it either: Redis
treats a key with no expiry as having an infinite TTL, so `GT` never sets the
*first* expiry. One round trip also matters because the self-healing write runs
on every authenticated request, platform-wide.

- Floor of **1 second** so a non-positive computed value can never mean
  "delete now".
- **Never shortens.** If a second device signs in with a later ceiling, the key
  outlives the first device's expiry. Shortening would evict a live member's
  entry — the index would then under-report and revocation would silently miss a
  session, which is the worst failure this feature can have.
- Every `SADD` is followed by a TTL roll on the same code path. A `SADD` without
  one leaks the key permanently (trap 9). This is invariant **I1** in
  `data-model.md` and is asserted by a spec.

---

## Invariants

| # | Invariant | Enforced by |
|---|---|---|
| I1 | No `SADD` without an `EXPIRE` | code review + spec asserting both commands |
| I2 | TTL only ever grows | the `max(...)` above + spec |
| I3 | Membership is advisory; the payload is authoritative | `already_absent` outcome (C5) |
| I4 | Never enumerated globally — no `KEYS`, no `SCAN`, no wildcard | spec asserting the issued command list |
| I5 | Tombstoned sessions are never re-indexed | strategy ordering: self-heal runs after the tombstone and absolute-TTL branches |
| I6 | An emptied set self-deletes; `SMEMBERS` on a missing key is `[]` | Redis semantics |

---

## Failure semantics

| Failure | Behaviour |
|---|---|
| `SADD`/`EXPIRE` fails at callback | logged at warn; **login still succeeds** (FR-006). The session is unindexed until self-healing catches it |
| `SADD`/`EXPIRE` fails during self-healing | logged at warn; request unaffected — it was never awaited. Retried on the next request |
| `SREM` fails at logout/teardown | logged at warn; the session itself is still gone. The stale member resolves as `already_absent` on a later revocation |
| `SMEMBERS` fails | `revokeAllForSub` **rejects** (C9). This is the one case where we genuinely cannot proceed |

Consistent theme: **index maintenance can never fail a user-facing operation.**
The index is an optimisation over an enumeration we would otherwise be unable to
perform at all; a stale index degrades revocation coverage, it does not break
sessions.

---

## Connection

One `ioredis` client, provided as `OIDC_REDIS_CLIENT` by `OidcCoreModule` and
shared by the session-store handle and the index. Today the store handle
constructs its own client inline (`oidc.module.ts:56`); hoisting it means this
feature adds **zero** new Redis connections.

Host and port come from `ConfigService.get('storage.redis')` — no
`process.env` read outside config bootstrap (constitution principle 9).

---

## Operator notes

```bash
# List a subject's live sessions
redis-cli SMEMBERS alkemio:sub:<kratos-identity-uuid>

# Confirm the index cannot outlive its members
redis-cli TTL alkemio:sub:<kratos-identity-uuid>

# Inspect one session (contains PII — treat accordingly)
redis-cli GET alkemio:sid:<sid>

# Confirm a revocation landed: terminated_at set, request_context_cache null
redis-cli GET alkemio:sid:<sid> | jq '{terminated_at, terminated_reason, request_context_cache}'
```

Emergency manual revocation, should it ever be needed before server#6073 ships a
UI, is `SMEMBERS` followed by per-sid inspection — never a wildcard `DEL`.

---

## `alkemio:subrevoked:<sub>` — the account-level revocation marker

A string holding the epoch-seconds at which the subject was last fully revoked.
Written by `revokeAllForSub` **before** any per-session teardown; read by
`CookieSessionStrategy.validate` on every authenticated request.

```lua
-- KEYS[1] = alkemio:subrevoked:<sub>   ARGV[1] = revoked_at   ARGV[2] = ttl
local existing = tonumber(redis.call('GET', KEYS[1]))
local candidate = tonumber(ARGV[1])
if existing == nil or candidate > existing then
  redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
else
  redis.call('EXPIRE', KEYS[1], ARGV[2], 'GT')
end
return 1
```

**Why it exists.** The per-session tombstone is not a trustworthy record that a
revocation happened, for two reasons that are really one — the session payload
is not owned by this feature:

1. **It can be overwritten.** `express-session` owns writes to
   `alkemio:sid:<sid>`. A request already in flight when revocation runs holds
   the live payload and persists it afterwards (`req.session.save()` on
   `/refresh`, or the lazy idle renewal at response end), erasing the tombstone.
   The sid has already been `SREM`'d, so no retry can find it. The race window is
   a whole request.
2. **Not every live session is indexed.** Sessions minted before the index
   shipped join it only via the self-heal on their next request. Delete the user
   first and `revokeAllForSub` enumerates nothing.

The marker is keyed by subject and read per request, so it needs neither an
intact payload nor index membership.

**Why a timestamp and not a flag.** A session whose `created_at` is later than
`revoked_at` was minted *after* the revocation and is unaffected. That is what
keeps the marker from being a permanent ban on the subject, and why a re-login
needs no cleanup. Later revocations win the compare-and-set, so a straggler
cannot re-admit sessions a later revocation killed.

**TTL** is the absolute session ceiling: past it, no session old enough to be
affected can still exist.

**Not written for `exceptSid` revocations.** The marker rejects by subject and
cannot tell the surviving session apart. Scoped revocations (password change)
rely on the index alone, which is correct for them — their sessions are all
post-index by construction.

**Read failure fails OPEN**, and this is the one judgement call. A hard Redis
outage never reaches the check — the session read raises
`SessionStoreUnavailableError` → 503 first — so a failure here means Redis is up
and one command failed. Failing closed would sign out the whole platform for the
duration of a blip, to defend a window the tombstone already covers for every
indexed session. The failure is logged, never swallowed.
