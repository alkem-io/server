# Manual test cases — code-review remediation

**Feature**: `108-redis-outage-resilience` · **Story**: [server#6330](https://github.com/alkem-io/server/issues/6330) · **PR**: [server#6331](https://github.com/alkem-io/server/pull/6331)

Companion to [`quickstart.md`](./quickstart.md). That document verifies the
*feature*; this one verifies the **ten defects the xhigh code review found in
it**, most of which the original walk could not have caught because it only
observed the happy outage path.

## Read this first — how to observe anything

The 2026-08-03 walk (`quickstart.md` → Run record) established that **during a
Redis outage every HTTP request returns `401 session_store_unavailable` after
~42 s**. That is the `ioredis`-backed OIDC session store failing closed, it is
pre-existing on `develop`, and it is *not* fixed by this PR.

Consequence for these tests: **HTTP status codes are not usable evidence during
an outage.** The primary evidence is the **server log**, plus `redis-cli` and
the process PID. Every case below is written that way. Do not fail a case
because the request 401'd — that is MT-10's subject, not the case's.

## Setup

```bash
pnpm install && pnpm build
pnpm run start:services
pnpm run migration:run
```

Two terminals: one running the server, one issuing commands. Container is
`alkemio_dev_redis`. Keep a log tail running throughout:

```bash
# terminal 2
tail -f <server log> | grep -i --line-buffered 'cache\|task item'
```

Record the PID before each case (`pgrep -f 'dist/main'`) — "process survived" is
a PID comparison, not a vibe.

---

## MT-1 — Redis down at boot ⇦ **the important one**

**Guards**: Finding 1 — the `reconnecting` listener. **This is the case that
discriminates the fix from the bug**; §2 of `quickstart.md` does not.

**Why this shape.** `redis@3.1.2` has two paths that surface a dead server:

| Path | Source | Emits `'error'`? |
|---|---|---|
| `on_error` — socket failure (ECONNREFUSED, peer close) | `index.js:341` | **Only if no `retry_strategy` is set.** We set one → emits `reconnecting` instead |
| `on_info_cmd` — the post-connect `INFO` ready-check aborts | `index.js:432` | Yes, unconditionally |

The original walk observed a "Cache connection lost" record — via the *second*
path, because `docker stop` happened to catch an `INFO` in flight. That is a
race. Booting against an already-dead Redis never sends an `INFO` at all, so
**only the `reconnecting` listener can produce a record here.**

```bash
docker stop alkemio_dev_redis
node dist/main            # or pnpm start:dev
```

**Pass:**

- Server **completes boot** and listens (US1 scenario 4).
- Exactly **one** `WARN [cache] Cache connection lost; cache reads will miss
  through to the source of truth until it returns.` appears.
- No second record for as long as you leave it (FR-017) — wait ≥ 60 s.

```bash
docker start alkemio_dev_redis
```

- Exactly **one** `Cache connection re-established; caching has resumed.`, same
  PID, within ~5 s.

**Fail signature (the pre-fix bug):** boot succeeds but **no cache record at
all**, then a lone "re-established" on recovery. That is the reporter never
having been invoked. → **Finding 1 · FR-015, FR-016, AC3**

---

## MT-2 — Latency during an outage is sub-second at the cache layer

**Guards**: Finding 11 — the timer is skipped when the signal reports down.

With Redis stopped and the server up (state from MT-1), the cache layer must
return misses in ~0 ms, not after the 1 s ceiling. HTTP can't show you this;
use the log timestamps of any cache-touching operation, or measure a path that
does not traverse the session store.

```bash
docker stop alkemio_dev_redis
curl -s -o /dev/null -w 'total=%{time_total}s\n' http://localhost:4000/graphql \
  -H 'content-type: application/json' -d '{"query":"{ platform { id } }"}'
```

**Pass:** the *cache* contributes nothing measurable. Expect the ~42 s
session-store stall (MT-10) to dominate; what must **not** happen is an
*additional* ~1 s per cache operation stacking on top. Compare against a
matched run with Redis up.

**Fail signature:** request time grows in ~1 s increments proportional to the
number of cache reads on the path.

---

## MT-3 — A **reachable** Redis that refuses writes

**Guards**: Findings 3 and 8 — a silently-swallowed mutation. Previously this
logged **nothing at all** and served stale authorization for the rest of the
TTL.

Redis stays **up** for this one. Force writes to fail without disconnecting:

```bash
docker exec alkemio_dev_redis redis-cli CONFIG SET maxmemory-policy noeviction
docker exec alkemio_dev_redis redis-cli CONFIG SET maxmemory 1
```

Now exercise any cached path (load a space in the client, or run a query that
populates the actor context).

**Pass:** `WARN [cache] Cache write failed while the connection was up; the
cached entry may be stale. Reason: OOM command not allowed when used memory
> 'maxmemory'.` — and the request still succeeds.

Restore:

```bash
docker exec alkemio_dev_redis redis-cli CONFIG SET maxmemory 0
```

**Fail signature:** the request succeeds and **nothing is logged**. That is the
pre-fix behaviour, and it is the shape in which stale authorization data gets
served with no operator signal.

---

## MT-4 — A **connected but silent** Redis (the 1 s ceiling)

**Guards**: FR-009a, plus the invalidation-failure warn from Finding 3.

`CLIENT PAUSE` keeps the socket healthy while the server stops answering — the
exact case `enable_offline_queue: false` cannot catch, because the client
believes it is connected.

```bash
docker exec alkemio_dev_redis redis-cli CLIENT PAUSE 5000
# immediately exercise a cached path
```

**Pass:**

- The request completes in ~1 s, not ~5 s — `guard`'s ceiling fired.
- One `WARN [cache] Cache invalidation failed while the connection was up …
  timed out after 1000ms` (or `Cache write failed …`, depending which mutation
  you hit).
- The process does not crash and the cache resumes when the pause expires.

**Fail signature:** the request blocks for the full 5 s.

---

## MT-5 — No per-item flood from `claimItem`

**Guards**: Finding 2 — the fourth `logger.error` site, missed by the original
fix. It runs **once per item**, so a 50k-item reset emits 50k records per
replica.

```bash
node dist/src/main.worker.js       # auth-reset worker
# trigger authorizationPolicyResetAll from the platform admin surface
docker stop alkemio_dev_redis      # mid-run
```

**Pass:** **zero** `Failed to claim task item '…' on task '…'` lines for the
duration of the outage. Total `[cache]` records for the worker: **one**.

```bash
grep -c "Failed to claim task item" <worker log>   # expect 0
```

**Fail signature:** one line per item. The unit suite cannot catch this — its
outage test calls `updateTaskResults` without an `itemKey`, which short-circuits
before the `SADD`. → **Finding 2 · FR-010a**

Also record here: the worker **process stays alive** and keeps draining the
queue (this is `quickstart.md` §5, never run).

```bash
docker exec alkemio_dev_rabbitmq rabbitmqctl list_queues name messages | grep -i auth
```

---

## MT-6 — `mget` degrades quietly

**Guards**: Finding 6 — `RoleSetCacheService.cacheMget` reaches `store.mget`
directly, which the `...store` spread copied through unwrapped.

With Redis stopped, exercise a membership-heavy query (any space page that
resolves several role sets).

**Pass:** no repeated `cacheMget` warnings — one `[cache]` record for the whole
outage, and the query still resolves from the database.

**Fail signature:** a warn per request per batch (dataloader-driven, so it
scales with page size) — the flood the reporter exists to prevent, arriving via
a path that bypassed the reporter entirely.

---

## MT-7 — No cache key is written without an expiry

**Guards**: Finding 7 — the store's fallback TTL was dropped, so any `set()`
without an explicit TTL wrote a **permanent** key into the same database the
OIDC sessions live in.

Redis up, server up. Exercise the app normally for a minute, then:

```bash
docker exec alkemio_dev_redis redis-cli --scan | while read -r k; do
  ttl=$(docker exec alkemio_dev_redis redis-cli TTL "$k")
  [ "$ttl" = "-1" ] && echo "NO EXPIRY: $k"
done
```

**Pass:** no output. Every key carries a TTL.

**Fail signature:** any `NO EXPIRY:` line. Latent today — all 7 call sites pass
an explicit TTL — so treat a clean run as confirming the *guard*, not the
absence of the bug class.

---

## MT-8 — One registration site (static)

**Guards**: Finding 10 — the duplicated `CacheModule.registerAsync` blocks.

```bash
grep -rn "CacheModule.register" src/
# expect: exactly ONE hit, in src/core/cache/redis.cache.module.ts
grep -rn "redisCacheModule()" src/
# expect: exactly TWO hits — app.module.ts and core/bootstrap/auth-reset.worker.module.ts
```

**Pass:** counts as stated. → **FR-020, SC-005**

---

## MT-9 — Repeated cycles, no leak

Three consecutive `docker stop` / `docker start` cycles.

**Pass:** exactly **2** `[cache]` records per cycle, same PID throughout, and:

```bash
docker exec alkemio_dev_redis redis-cli INFO clients | grep connected_clients
# expect: stable across cycles, not growing
```

→ **SC-004, FR-011 – FR-014**

---

## MT-10 — Known failures to *record*, not to fix here

These are expected to fail. Write down what you see; do not patch them in this
PR.

| # | Observation | Status |
|---|---|---|
| a | Every request returns `401 session_store_unavailable` after ~42 s during an outage | **Pre-existing on `develop`** — `ioredis` session store fails closed. `main.server.ts:105`, `oidc-core.module.ts:46`, `health.module.ts:37` all construct `new Redis(...)` with no `.on('error')`. **SC-009 stays FAILED.** Needs its own story |
| b | An auth-reset task interrupted by even a brief blip may never reach a terminal state | **Accepted** (Clarification Q3) — and see the open question below |
| c | A stray non-connection `'error'` still suppresses the *next* genuine outage's "connection lost" record | **Residual.** The review decoupled `isDown` from the latch, but `reportError` still dedupes on `reportedDown`, which only a `ready` event clears. Low impact; note it if you see a "re-established" with no preceding "lost" |

---

## MT-11 — Open decision: `enable_offline_queue: false`

**Not a pass/fail case — a decision to make.** The review flagged it and it was
deliberately left alone because FR-009 specifies it.

The risk: during a **brief** blip (2 s), commands are rejected instantly rather
than queued and replayed. `incrementCounter` returns `undefined`, the fallback
in-object counter is used, and the write-back `cacheManager.set(task.id, task)`
is *also* swallowed by fail-soft — so the increment vanishes. On recovery
`task:<id>:itemsDone` is short by N, `itemsDone >= itemsCount` never holds, and
the task sits `IN_PROGRESS` forever. That is the #6310 hang the counters exist
to prevent.

To see it:

```bash
# start an auth-reset over a large set
docker stop alkemio_dev_redis && sleep 2 && docker start alkemio_dev_redis
# let the reset finish, then:
docker exec alkemio_dev_redis redis-cli GET "task:<id>:itemsDone"
# compare against itemsCount
```

**If `itemsDone` < `itemsCount` and the task never terminates**, the trade-off
needs revisiting: the offline queue's abort-on-`connection_gone` behaviour is
what FR-009 was avoiding, but losing counter increments outright may be worse
than an aborted command the caller can see fail.

---

## Results log

| # | Case | Guards | Result |
|---|---|---|---|
| 1 | Redis down at boot → one loss record | Finding 1 · FR-015/016 | |
| 2 | Cache adds no ~1 s per op during outage | Finding 11 · FR-009 | |
| 3 | Reachable Redis, failing write → one warn | Findings 3, 8 | |
| 4 | `CLIENT PAUSE` → 1 s ceiling + warn | FR-009a · Finding 3 | |
| 5 | Worker: zero per-item claim errors | Finding 2 · FR-010a · AC2 | |
| 6 | `mget` quiet during outage | Finding 6 | |
| 7 | No key without a TTL | Finding 7 | |
| 8 | One registration site | Finding 10 · SC-005 | |
| 9 | 3 cycles, 2 records each, no leak | SC-004 | |
| 10 | Known failures recorded | — | |
| 11 | Offline-queue decision | Finding 4 · FR-009 | |
