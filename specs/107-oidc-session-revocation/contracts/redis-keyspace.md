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
| `alkemio:sid:<sid>:refresh-lock` | string | `refresh-lock.ts` | no — deleted on revocation |
| **`alkemio:sub:<sub>`** | **set** | `session-index.redis.ts` | **YES** |

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

### TTL roll (the rule that prevents the leak)

```
ttlCandidate = absolute_expires_at − now          // seconds
current      = TTL key                            // −1 = no expiry, −2 = no key
target       = max(current > 0 ? current : 0, ttlCandidate, 1)
EXPIRE key target
```

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
