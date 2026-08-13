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

**Fail signature:** one line per item. → **Finding 2 · FR-010a**

**Unit coverage:** the gap this described is now closed.
`src/services/task/task.service.spec.ts` ("does not log per failed item claim
while the connection is down") passes an explicit `itemKey`, so it reaches the
failing `SADD` inside `claimItem` and asserts zero `logger.error` calls. That was
the original miss — without an `itemKey`, `claimItem` short-circuits before the
`SADD` and the path is never exercised.

What the unit test cannot establish is **worker-scale** behaviour: that the
suppression holds across a real auth-reset over a real item set, driven by up to
10 autoscaled replicas against one shared Redis, where the flood would actually
be felt. That is what this live check is for.

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

Executed 2026-08-03 against the local stack, build at `b39a19298`.

| # | Case | Guards | Result |
|---|---|---|---|
| 1 | Redis down at boot → one loss record | Finding 1 · FR-015/016 | **PASS** — see run record |
| 2 | Cache adds no ~1 s per op during outage | Finding 11 · FR-009 | **PASS** (indirect — see MT-4 timings) |
| 3 | Reachable Redis, failing write → one warn | Findings 3, 8 | **PASS** |
| 4 | `CLIENT PAUSE` → 1 s ceiling + warn | FR-009a · Finding 3 | **PASS** |
| 5 | Worker: zero per-item claim errors | Finding 2 · FR-010a · AC2 | *not run* — needs an auth-reset over a real item set |
| 6 | `mget` quiet during outage | Finding 6 | *not run* — needs an authenticated membership query |
| 7 | No key without a TTL | Finding 7 | **INCONCLUSIVE** — cache-manager keyspace was empty; one no-TTL `alkemio:sid:` key found, owned by the session store, not this factory |
| 8 | One registration site | Finding 10 · SC-005 | **PASS** — 1 `registerAsync`, 2 consumers |
| 9 | 3 cycles, 2 records each, no leak | SC-004 | **PASS** |
| 10 | Known failures recorded | — | **CONFIRMED** — 401 after ~42 s reproduced; 279 unhandled ioredis error lines in one outage |
| 11 | Offline-queue decision | Finding 4 · FR-009 | *open* |

### Run record — 2026-08-03

**MT-1, the discriminating case.** Redis pointed at the container's *direct*
published port (not host `:6379`, which is a Traefik TCP route that accepts and
then fails — that accept is what routes through `on_info_cmd` and produced the
misleading evidence in the original walk). Container stopped, nothing listening,
then `node dist/main`:

```
WARN [cache] Cache connection lost; cache reads will miss through to the source of
truth until it returns. Reason: Redis connection to localhost:32845 failed -
connect ECONNREFUSED 127.0.0.1:32845 (code: ECONNREFUSED).
```

`ECONNREFUSED` means no TCP connection was ever accepted, so `on_info_cmd`
cannot have run, and `on_error` (`index.js:341`) does not emit with a
`retry_strategy` configured. **Only the `reconnecting` listener can have
produced this record.** Server booted and listened on `:4000` with Redis absent
(US1 scenario 4). Count held at exactly 1 over a 75 s window (FR-017).

**MT-9.** Three `docker stop`/`start` cycles: **delta exactly 2 `[cache]`
records per cycle**, PID `3243257` unchanged throughout, `connected_clients`
flat at 5. Healthy baseline for comparison: `200` in 30 ms, and **zero** records
at boot when Redis is up — the ordinary startup connect is correctly silent.

*Minor observation*: over the Traefik route the loss record reads `Reason:
unknown.` — `reconnecting` carries no `error` on a clean peer close. Diagnostic
quality is lower than the direct-socket case, which named `ECONNREFUSED`.

**MT-3 / MT-4.** No anonymous GraphQL path writes to the cache-manager store
(`{ spaces { id } }`, `{ platform { … } }` etc. left `DBSIZE` at 27), so these
were driven against the **real compiled factory** (`dist/core/cache/cache.store.factory.js`)
pointed at the live Redis:

```
--- baseline (healthy) ---              set 2ms -> "OK"   get 1ms -> "v1"   del 1ms -> 1
                                        warns: 0

--- MT-3: maxmemory=1 -------------------------------------------------------
WARN [cache] Cache write failed while the connection was up; the cached entry may
be stale. Reason: OOM command not allowed when used memory > 'maxmemory'. (code: OOM).
set 1ms -> undefined     get 1ms -> null          new warns: 1

--- MT-4: CLIENT PAUSE 4000 -------------------------------------------------
WARN [cache] Cache write failed … Reason: timed out after 1000ms.
set 1001ms -> undefined
WARN [cache] Cache invalidation failed … Reason: timed out after 1000ms.
del 1000ms -> undefined
get 1001ms -> undefined                           new warns: 2  (reads stay silent)

--- after pause expiry ---              set 1ms -> "OK"   get 0ms -> "v4"
```

Confirms in one run: the 1 s ceiling fires at 1001/1000/1001 ms against a
connected-but-silent server (FR-009a); mutations report exactly one warn each
and reads report none (Findings 3, 8); failures return `undefined` rather than
throwing; and the store recovers with no intervention. Three records total, no
flood.

**MT-10a, quantified.** During the MT-1 outage the process emitted **279**
`[ioredis] Unhandled error event: connect ECONNREFUSED` lines — against **one**
`[cache]` record. The unhardened `ioredis` clients are both the log flood and
the ~42 s `401 session_store_unavailable` stall (reproduced: 37.9 s / 42.0 s /
42.0 s). Everything this feature owns behaved; everything next to it did not.

**Also noticed, outside scope**: the Redis container runs `--maxmemory-policy
allkeys-lru` (k8s mirrors this at 256 mb), and the OIDC session store shares
database 0. Under memory pressure, LRU eviction can evict **live sessions**.
Worth its own look alongside the ioredis hardening.
