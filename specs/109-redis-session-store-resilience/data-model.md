# Data Model: Redis session-store resilience (feature 109 / server#6332)

**Phase**: 1 · **Date**: 2026-08-03 · **Spec**: [spec.md](./spec.md)

## Persistence: none

No entity is added, changed or removed. No migration. No PostgreSQL involvement of
any kind. The Redis keyspaces the OIDC layer owns —
`alkemio:sid:<sid>` (session payloads, written by `express-session` via
`connect-redis`) and `alkemio:sub:<sub>` (the per-subject session index from
`107-oidc-session-revocation`) — keep their existing shapes, TTLs and semantics.
This feature changes *when a key is read* and *what happens when the read fails*,
never what is stored.

The `AlkemioSessionPayload` type (`session-store.redis.ts`) is unchanged.

What follows is therefore a model of **in-process state and transitions**, which is
where all of this feature's complexity lives.

---

## 1. Request authentication state

The state a request occupies when the cookie-session strategy runs, and the
transition D1 corrects.

### Inputs available to the strategy

| Field | Source | Meaning |
|---|---|---|
| `req.cookies[<cookieName>]` | `cookie-parser` (replayed onto WS upgrades) | the **raw signed** cookie the client sent: `s:<sid>.<hmac>`, or absent |
| `req.sessionID` | `express-session` | the unsigned sid **if** the cookie verified; otherwise a freshly generated one, indistinguishable by shape (research R6) |

### States

| # | Raw cookie | `req.sessionID` derives from it | Today | After this feature |
|---|---|---|---|---|
| S0 | absent | — | **store read with a generated sid** → wasted GET when healthy, hang + 401 when down | `null` → anonymous, **zero store commands** |
| S1 | present, signature verifies | yes | store read with the cookie's sid | unchanged — store read with the cookie's sid |
| S2 | present, signature fails | no (middleware generated a fresh sid) | store read with a generated sid | `null` → anonymous, **zero store commands** |
| S3 | present, unsigned/legacy format | no | falls back to using the **raw cookie value** as the lookup key (dead code — never matches a key) | `null` → anonymous, fallback removed |
| S4 | WS upgrade, middleware replay incomplete | — | store read with `undefined`/generated sid | `null` → anonymous |

**Invariant I1**: a session-store command is issued **only** from S1.

**Invariant I2**: the lookup key is **only ever** `req.sessionID` — never a value
derived from client-supplied bytes. S3's removal is the enforcement of this
invariant, not merely the deletion of dead code (research R7).

### Transition after S1 succeeds

Unchanged from `107-oidc-session-revocation`, restated so the boundary is explicit:

```
S1 → store.get(sid)
       ├─ null                       → anonymous                       (FR-024b state a)
       ├─ payload.terminated_at      → CookieSessionInvalidError → 401  (FR-022c state b)
       ├─ subject marker ≥ created_at→ retire + CookieSessionInvalidError → 401
       ├─ absolute TTL exceeded      → CookieSessionInvalidError → 401  (FR-020a)
       └─ otherwise                  → re-index (unawaited) + ActorContext
       └─ throw                      → SessionStoreUnavailableError → 503 (FR-022b)
```

Everything below the first line is untouched by this feature.

---

## 2. Redis client connection state

Owned by `ioredis`; this feature only constrains the transitions' timing and
observes them.

### Client states (`ioredis` `status`)

`wait` → `connecting` → `connect` → `ready` → (`reconnecting` ⇄ `connecting`) →
`end`

| State | Command issued now | Latency |
|---|---|---|
| `ready` | written to the socket | bounded by `commandTimeout` (500 ms) |
| `connecting` / `reconnecting` / `connect` | **rejected immediately** (`enableOfflineQueue: false`) | **0 ms** |
| `wait` (lazy, pre-connect) | connect started, then rejected immediately | 0 ms — see research R2; only the probe is ever in this state |
| `end` | rejected `Connection is closed` | 0 ms — unreachable, because the retry strategy never returns a non-number (FR-012) |

**Invariant I3**: `end` is never entered. `ioredis` transitions to `end` only when
`retryStrategy` returns a non-number (`event_handler.js:188-192`); the factory always
returns a number, so the client reconnects for the whole outage and recovery needs
no restart.

**Invariant I4**: no command's latency is a function of outage *duration*. This is
the property the defect violated: on `develop` a queued command waits for the next
`maxRetriesPerRequest` flush boundary, whose period grows to 42 s as the backoff
saturates (research R1).

---

## 3. Connection reporter state

One instance per client. The whole model is one boolean.

| Field | Type | Meaning |
|---|---|---|
| `label` | `string` | which client this reports on (`'session'`, `'oidc'`, `'health'`) — set at construction, immutable |
| `reportedDown` | `boolean` | whether the *current* outage has already been reported. Initial `false`, so a process that boots into a dead Redis still reports once |

### Transitions

| Event | Guard | Effect | Output |
|---|---|---|---|
| client `error` | `!reportedDown` | `reportedDown = true` | one `warn`: connection lost, with reason (message + code only) |
| client `error` | `reportedDown` | — | **silence** (FR-025) |
| client `ready` | `reportedDown` | `reportedDown = false` | one `warn`: connection re-established |
| client `ready` | `!reportedDown` | — | silence (the ordinary boot connect is not news) |

**Invariant I5**: exactly two records per outage per client — one on loss, one on
recovery (SC-006). The reporter re-arms on recovery, so a second outage is reported
again (FR-024).

**Invariant I6**: the reporter's boolean is a **log-suppression** signal only. It is
never read as a gate on whether to attempt an operation. This is the same hazard the
cache contract's G9 identifies: a one-off non-connection `error` would otherwise
latch the flag for the life of the process. Here it is contained by construction —
nothing reads it — so no `isDown` accessor is published.

**Why one reporter per client and not one shared**: sharing would make the second
connection's outage invisible whenever the first had already reported it, and would
announce recovery when only one of the two had recovered (Clarification Q9).

---

## 4. Store-unreachable condition

The entity whose identity the whole 401-vs-503 distinction depends on.

| Aspect | Value |
|---|---|
| Type | `SessionStoreUnavailableError` (existing, `cookie-session.errors.ts`) |
| Means | "cannot determine whether this session is valid" |
| Does **not** mean | "this session is not valid" — that is `CookieSessionInvalidError` |
| Raised by | the session store wrapper (both the `SessionStoreHandle` path and, newly, the `connect-redis` path — plan D-4) |
| Survives | the passport callback allow-list (D3 fix), the interceptor's error branch, and the express `next(err)` chain |
| Terminates as | 503 + `Retry-After: 5` + full-attribute cookie re-assertion, on every transport |

**Invariant I7**: this type is never converted into `AuthenticationException`. That
conversion is the defect; the allow-list entry is the fix.

---

## 5. Error status vocabulary

One additive entry. Not GraphQL schema surface (research R10).

| Member | Category | Specific | Numeric | Message key |
|---|---|---|---|---|
| `SESSION_STORE_UNAVAILABLE` *(new)* | `SYSTEM` (14) | 119 | **14119** | `userMessages.system.sessionStoreUnavailable` |

Neighbours for orientation: `STORAGE_SERVICE_UNAVAILABLE` is SYSTEM/120; the code
the defect currently emits is `UNAUTHENTICATED`, AUTHORIZATION/101 → 11101. Moving
the condition from band 11 to band 14 is the vocabulary half of the fix — band 11
means "we decided about your identity", band 14 means "our infrastructure failed".

`SessionStoreUnavailableException extends BaseException` carries this status plus
`extensions.http.status = 503`, mirroring how `AuthenticationException` carries 401.
