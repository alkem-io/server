# Phase 0 Research: Redis outage resilience

**Feature**: `108-redis-outage-resilience` · **Story**: [server#6330](https://github.com/alkem-io/server/issues/6330)
**Date**: 2026-08-03 · **Base**: `develop` @ `bc8d51a86`

Every claim below was verified against the checked-out tree and the installed
`node_modules`, not inferred from the story text. Where the story's own framing
turned out to be incomplete, that is called out.

---

## R1 — What actually kills the process

**Question**: Which client emits the fatal event, and why does the process exit?

**Finding**: `cache-manager-redis-store@2.0.0` is a ~230-line wrapper whose entire
construction is:

```js
var redisStore = function redisStore() {
  var redisCache = Redis.createClient.apply(Redis, arguments);
  return { name: 'redis', getClient: function () { return redisCache; }, set: ..., get: ... };
};
module.exports = { create: function () { return redisStore.apply(void 0, arguments); } };
```
— `node_modules/cache-manager-redis-store/dist/index.js`

It calls `redis@3.1.2`'s `createClient` and **never attaches an `error`
listener**. In Node, an `EventEmitter` that emits `'error'` with no registered
listener throws the error as an uncaught exception, which terminates the process.
That is the whole mechanism.

`redis@3.1.2` emits `'error'` from **seven** distinct sites (`index.js` lines
156, 246, 326, 342, 432, 575, 594). The one in the reported stack is line 432,
`on_info_cmd`, which fires when the post-connect `INFO` ready-check is aborted by
the connection dropping:

```js
err.message = 'Ready check failed: ' + err.message;
this.emit('error', err);
```

**Consequence for the design**: some of those seven emits are reachable
regardless of any retry configuration. Line 341 shows that setting a
`retry_strategy` suppresses *one* of them (`on_error`) and nothing else:

```js
// Only emit the error if the retry_strategy option is not set
if (!this.options.retry_strategy) { this.emit('error', err); }
```

**Therefore an `error` listener on the client is not one option among several —
it is the only complete mitigation.** Every candidate design below must include
it; retry tuning is an addition, never a substitute.

**Decision**: attach `client.on('error', …)` at construction, before any
connection attempt can complete. Non-negotiable, satisfies FR-003.

---

## R2 — How many construction sites, and are they really identical?

**Question**: Where are caches built, and does a fix have to cover more than one?

**Finding**: three `CacheModule` sites, and they are **not** three of a kind:

| # | Location | Form | Fatal? |
|---|---|---|---|
| 1 | `src/app.module.ts:142` | `registerAsync({ isGlobal: true, … store: redisStore })` | **Yes** — the API process |
| 2 | `src/core/bootstrap/auth-reset.worker.module.ts:58` | `registerAsync({ isGlobal: true, … store: redisStore })` | **Yes** — the worker process |
| 3 | `src/core/authentication/authentication.module.ts:15` | `CacheModule.register()` — no store, in-memory | No |

Sites 1 and 2 are byte-identical configuration, duplicated by copy-paste, with
the worker's file carrying the comment *"Infrastructure blocks below are kept in
sync with AppModule's root setup."* Two copies of a defect is precisely how the
defect survives a partial fix.

**Site 3 — resolution of the orchestrator's open question.** It is a *separate*
module-scoped provider, not shadowed by and not shadowing the global one; a
locally-declared `CACHE_MANAGER` wins for providers declared in that module.
But it is **inert**:

- `AuthenticationModule` declares exactly one provider, `AuthenticationService`.
- `AuthenticationService` does **not** inject `CACHE_MANAGER`. It injects
  `ActorContextCacheService`.
- `ActorContextCacheService` is declared in `ActorContextModule`, which does
  **not** import `CacheModule`. Nest resolves a provider's dependencies in the
  module that *declares* it, so it receives the global (Redis) cache regardless
  of what `AuthenticationModule` imports.

So the in-memory cache at site 3 is constructed at boot and never read or
written by anything. It is in-memory, so it cannot crash — but leaving it would
make "every construction site is hardened" (SC-005) true only by counting a site
that builds something nobody uses.

**Decision**: extract sites 1 and 2 to a single shared factory (FR-020); delete
site 3 as verified-dead configuration (FR-022, Clarification Q4).

---

## R3 — Is the TypeORM `redis` peer a second live client?

**Question**: The dependency tree shows two roots for `redis@3.1.2`. Does the
fix have to cover the TypeORM one too?

**Finding**: **No.** Verified through three independent checks:

1. Both bootstraps set `cache: true` (`app.module.ts:174`,
   `auth-reset.worker.module.ts:90`) — the boolean, not an options object.
2. TypeORM's `QueryResultCacheFactory.create()` selects a Redis-backed cache
   **only** when `cache.type` is `"redis"`, `"ioredis"` or `"ioredis/cluster"`;
   with `cache === true` there is no `.type`, so it falls through to
   `DbQueryResultCache`.
3. `DbQueryResultCache` is corroborated by the schema: the baseline migration
   `src/migrations/1764590884532-baseline.ts:846` creates the
   `"query-result-cache"` **table**.

`pnpm why redis` additionally shows the TypeORM edge is a **peer** dependency —
declared, satisfied, never `require`d on this configuration. And no source file
imports `redis` directly (`grep -rn "from 'redis'" src/` → zero hits); the
top-level `"redis": "3.1.2"` entry in `package.json` exists only to pin the
resolution for the cache store.

**Decision**: blast radius is **one** live legacy client. Do not touch the
TypeORM configuration. Confirms FR-023.

---

## R4 — The decisive constraint: the codebase compiles against cache-manager v4 types and runs on v5

**Question**: Which `cache-manager` major is in play? This constrains which
stores are viable, and it is the finding that decides the whole design.

**Finding**: three different versions are simultaneously in play, and they
disagree.

| Layer | What is actually there |
|---|---|
| Runtime cache engine | `cache-manager@5.7.6` (transitive, via `@nestjs/cache-manager@2.3.0`) |
| **Compile-time types** | **`@types/cache-manager@4.0.6`** (a direct devDependency) |
| Store adapter | `cache-manager-redis-store@2.0.0`, a cache-manager **v3-era** store |

The types are not a detail. `cache-manager@5.7.6` ships its own
`dist/index.d.ts`, but it is **not resolvable from the repository root** —
pnpm's strict layout keeps transitive packages out of the top-level
`node_modules`, and `require.resolve('cache-manager/package.json')` from the repo
root fails outright. Every `import { Cache, Store } from 'cache-manager'` in
`src/` therefore binds to `@types/cache-manager@4.0.6`.

The two APIs differ exactly where it hurts:

| | v4 types (what `src/` compiles against) | v5 runtime (what actually executes) |
|---|---|---|
| `set` third argument | `CachingConfig` object — `{ ttl: number }`, **seconds** | `Milliseconds` — a bare `number` |

And every call site in the repository uses the **v4 object** form:

```ts
// src/services/task/task.service.ts:516 (and 558, 608, 627, 640)
await this.cacheManager.set(task.id, task, { ttl: TTL });          // TTL = 3600

// src/services/adapters/notification-push-adapter/push.throttle.service.ts:39
await this.cacheManager.set(key, count + 1, { ttl: 60 } as any);   // note the `as any`

// src/services/infrastructure/url-generator/url.generator.service.cache.ts:29
cacheOptions: CachingConfig = { ttl: 1000 };
await this.cacheManager.set(this.getUrlIdCacheKey(entityId), url, this.cacheOptions);
```

This works today for exactly one reason: the legacy store's `set` has the old
four-argument signature `set(key, value, options, cb)` and reads `options.ttl`,
then issues `SETEX key <ttl-in-seconds> value`. The v5 engine passes the third
argument straight through without inspecting it, so the object survives the trip.

**This is the crux.** A cache-manager **v5-native** store — whether
`cache-manager-ioredis-yet`, `@tirke/node-cache-manager-ioredis`, or one written
in this repository — declares `set(key, data, ttl?: Milliseconds)`. Handed
`{ ttl: 3600 }` it would receive an **object where it expects a number**, and:

- `PEXPIRE`/`SETEX` would be issued with `NaN` or the TTL would be dropped
  entirely, depending on the store;
- **the compiler would not catch it**, because `src/` is typed by v4's
  definitions, under which passing that object is *correct*;
- the `as any` already sitting on `push.throttle.service.ts:39` would suppress
  even an accidental catch;
- and the failure is invisible in tests — a wrong TTL still reads back
  correctly. It surfaces weeks later as unbounded Redis growth or as throttles
  and task records that expire 1000× too early or too late.

That directly violates **SC-008** — *no change in behaviour observable while the
cache server is healthy* — in the most expensive possible way: silently.

**Decision**: this is the observed constraint that rules out swapping the store.
Recorded as the primary rationale for Decision D1 below.

---

## R5 — Candidate designs, evaluated

The story names three. All were evaluated against the evidence above.

### Option A — Keep `cache-manager-redis-store@2`; harden the underlying client, and wrap the store fail-soft

Attach the mandatory `error` listener (R1), configure `redis@3.1.2`'s retry and
offline-queue behaviour correctly (R6), and wrap the returned store so cache
failures surface as misses. Both construction sites call one shared factory.

- **Fixes the crash?** Yes — the error listener is the complete mitigation (R1).
- **TTL semantics**: unchanged. The store is the same object with the same
  signature. SC-008 holds by construction.
- **`getClient()` contract**: unchanged, so `TaskService`'s atomic-counter path
  and its 600-line spec are untouched.
- **Dependencies**: unchanged.
- **Cost**: we own ~40 lines of `redis@3.1.2` retry configuration, on a client
  unmaintained since 2021, behind a store unmaintained since 2020.

### Option B — Migrate the cache store to `ioredis`

Superficially the most attractive: `ioredis@5.10.1` is already a **direct**
dependency with two existing production uses in this repo — the OIDC session
store (`src/main.server.ts:105`, `src/core/auth/oidc/oidc.module.ts:56`) and the
health probe (`src/core/health/health.module.ts:37`). Its defaults *are* the
desired behaviour: capped exponential `retryStrategy`, unlimited reconnection,
`enableOfflineQueue`, `maxRetriesPerRequest`. FR-011 – FR-014 would be
configuration rather than archaeology. It would also delete two dead
dependencies.

- **Fixes the crash?** Yes. (ioredis also requires an `error` listener — it is
  an `EventEmitter` with the same Node semantics — so R1's conclusion is
  unchanged, but everything around it gets simpler.)
- **Blocked by R4.** Any ioredis-backed store is cache-manager **v5**-shaped.
  Adopting one silently changes the meaning of the third argument at **7 write
  call sites** across three services, with no compiler assistance, no test
  signal, and a 1000× error mode. Fixing that properly means also replacing
  `@types/cache-manager@4` with the real v5 types and re-typing every consumer —
  a `cache-manager` version-alignment project.
- **Verdict**: correct destination, wrong vehicle. A resilience hotfix for a
  production-down defect is the worst possible carrier for a silent TTL
  migration.

*(Worth recording: `RedisClientLike` would **not** have been the obstacle.
ioredis accepts an err-first callback as the final argument on `incr`, `sadd`,
`setnx`, `get`, `expire` and `quit`, so the interface in
`src/common/interfaces/redis.interfaces.ts` is satisfiable by ioredis almost
verbatim. The initial hypothesis that the callback API blocked Option B was
tested and **disproved** — the TTL semantics are the real blocker.)*

### Option C — Fail-soft decorator only

Wrap the store so `get`/`set`/`del` swallow errors.

- **Fixes the crash?** **No.** The fatal `error` event is emitted by the
  *client*, asynchronously, with no command in flight — the observed stack is a
  ready-check `INFO`, not an application `GET`. Decorating store methods cannot
  observe it. This option does not address the reported defect at all.
- **Verdict**: not a candidate on its own. It is, however, **necessary** — the
  error listener alone stops the crash but leaves `store.get()` rejecting into
  callers (see R7), which would convert the crash into a 500 on every
  cache-touching request. Option A therefore *contains* Option C.

### Decision D1 — **Option A**, with Option C folded in

Keep `cache-manager-redis-store@2` and harden it, via a single shared factory
consumed by both construction sites.

**Rationale.** The evidence orders these unambiguously. C is not a fix. B is the
better long-term architecture but is gated on a `cache-manager` v4→v5 type
alignment (R4) whose failure mode is silent, unbounded and undetectable by the
test suite — an unacceptable rider on an availability fix. A fixes the reported
defect completely (R1), changes no observable healthy-path behaviour (SC-008
holds trivially because nothing about the store's contract moves), touches no
consumer, and confines the entire diff to bootstrap wiring plus one new file.
Constitution Principle 10 — *"Prefer the simplest viable implementation"* and
*"Architectural escalation requires a written rationale referencing observed
constraints"* — points the same way: the observed constraint (R4) argues
**against** the escalation, not for it.

**Recorded as follow-up, not done here**: migrate to `ioredis` + real v5 types,
retiring `cache-manager-redis-store@2.0.0` (last published 2020), `redis@3.1.2`
(last of the pre-rewrite v3 line, 2021) and `@types/cache-manager@4.0.6`. The
shared factory introduced here is deliberately the *only* place that names the
store, so that migration becomes a one-file change plus a typed sweep of the 7
call sites. This is noted in `plan.md` under Follow-Up.

---

## R6 — Configuring `redis@3.1.2` correctly (and a latent bug found while doing it)

**Question**: What retry/timeout configuration satisfies FR-009 – FR-014?

### R6.1 — The configured timeout has never taken effect

Both construction sites pass:

```ts
{ store: redisStore, host, port, redisOptions: { connectTimeout: timeout * 1000 } }
```

`redisOptions` is an **ioredis** convention. `redis@3.1.2` knows nothing about
it, and reads snake_case from the top level (`index.js:102`):

```js
this.connect_timeout = +options.connect_timeout || 3600000;   // 60 * 60 * 1000 ms
```

The nested camelCase key is silently ignored. The intended 60-second setting
(`alkemio.yml:438`, `timeout: ${REDIS_TIMEOUT}:60`) has therefore **never been
applied**; the client has always run with the 1-hour default. Pre-existing,
unrelated to the reported crash, and worth fixing while we are here — with care,
because of R6.2.

### R6.2 — `connect_timeout` is a give-up budget, not just a dial

`connect_timeout` in `redis@3.1.2` is *not* only a connect timeout. It is also
the total retry budget (`index.js:580`):

```js
if (this.retry_totaltime >= this.connect_timeout) {
    // ... flush_and_error(CONNECTION_BROKEN) ...
    this.end(false);
    this.emit('error', err);      // permanent give-up
    return;
}
```

So "fixing" the latent bug the obvious way — renaming the key to
`connect_timeout: 60000` — would make the client **permanently abandon Redis
after 60 seconds of outage** and never reconnect, directly violating FR-013 and
FR-011. The naive fix is worse than the bug.

`connect_timeout` does *not* double as an idle timeout on an established
connection: it arms `stream.setTimeout(connect_timeout)` at line 201, and
`on_connect` clears it with `stream.setTimeout(0)` at line 356. It applies only
while connecting.

**Decision**: set `connect_timeout` to `2_147_483_647` ms (~24.8 days — the
largest value Node's timer accepts without overflow warnings) so the retry
budget is effectively unbounded, satisfying FR-013. The per-operation ceiling
that operators actually care about is enforced in the fail-soft wrapper instead
(FR-009a), where it belongs and where it is testable.

### R6.3 — `retry_strategy`

`index.js:542` invokes `options.retry_strategy({ attempt, error, total_retry_time, times_connected })`
and requires a **number** back. Returning anything else — including an `Error` —
triggers `CONNECTION_BROKEN`, `end(false)` and an `emit('error')`
(`index.js:554-577`): another permanent give-up.

**Decision**: `retry_strategy: ({ attempt }) => Math.min(attempt * 250, 5000)`.
First retry at 250 ms, capped at 5 s (FR-012). Always returns a number, so the
give-up branch is unreachable (FR-013). The 5 s cap sits an order of magnitude
inside SC-003's 60-second recovery target, making it true by construction.

Bonus: providing a `retry_strategy` also suppresses the `on_error` emit at
`index.js:341` — one of the seven emit sites closed by configuration. The other
six still require the listener from R1.

### R6.4 — `enable_offline_queue: false`

Default is `true` (`index.js:103`): commands issued while disconnected are
queued, then aborted en masse with `AbortError`/`UNCERTAIN_STATE` on
`connection_gone` — which is the second half of the reported stack.

With `false`, `handle_offline_command` (`index.js:766`) fails the command
**immediately**:

```js
msg = 'Stream not writeable.';
err = new errorClasses.AbortError({ message: command + " can't be processed. " + msg, code: 'NR_CLOSED', command: command });
utils.reply_in_order(self, command_obj.callback, err);
```

This delivers FR-009 — immediate miss while known-disconnected — with **no timer
and no state tracking of our own**. The client already knows it is disconnected;
we just stop asking it to pretend otherwise.

**Decision**: `enable_offline_queue: false`.

### R6.5 — `no_ready_check`

Setting it would skip the `INFO` ready-check that produced the exact reported
stack (`on_info_cmd`, `index.js:432`). Rejected: it removes one symptom while
leaving six other emit sites live, and it degrades a genuine signal — the ready
check is what prevents commands being sent to a replica that is still loading
its dataset. The listener from R1 handles this site properly.

**Decision**: leave at default.

### Final client configuration

```ts
{
  host, port,
  connect_timeout: 2_147_483_647,                             // R6.2 — unbounded retry budget
  enable_offline_queue: false,                                // R6.4 — FR-009
  retry_strategy: ({ attempt }) => Math.min(attempt * 250, 5000),  // R6.3 — FR-012/FR-013
}
```

---

## R7 — Why the error listener alone is not enough

**Question**: With the crash fixed, what does a cache-touching request do during
an outage?

**Finding**: `cache-manager@5.7.6`'s `createCache` passes `get`/`set`/`del`
straight through to the store, unguarded (`dist/caching.js`):

```js
get: async (key) => store.get(key),
set: async (key, value, ttl) => store.set(key, value, ttl),
```

Only `wrap()` catches store errors — and it converts them into an emitted
`'error'` event on the cache's own `EventEmitter`, which has **the same
unhandled-listener hazard** if nobody subscribes. Nothing in `src/` calls
`wrap()`; the 79 `get` / 66 `set` / 32 `del` call sites all use the direct
methods.

So without a wrapper, fixing the crash would convert *process death* into *a 500
on every cache-touching request* — a different outage, not a degradation.

**Decision**: wrap the store's methods. Confirms FR-005 – FR-008 and makes the
Option C component of D1 mandatory, not optional.

Two properties the wrapper must have:

- **Catch broadly, not by error code** (FR-008). The failure vocabulary here is
  `AbortError`/`NR_CLOSED`, `AbortError`/`UNCERTAIN_STATE`, `CONNECTION_BROKEN`,
  raw socket `ECONNREFUSED`, plus `JSON.parse` failures on a truncated reply. An
  allow-list would be a guess; anything the cache layer raises is by definition
  not worth failing a request over, because the source of truth can answer.
- **Bound the wait** (FR-009a). `enable_offline_queue: false` covers
  *known*-disconnected. The nastier case is a server that completes the TCP
  handshake and then goes silent: the client believes it is connected, the
  command sits in `command_queue`, and nothing times it out. A 1-second
  `Promise.race` covers it.

**Surface to wrap**: `get`, `set`, `del` and `reset` are the store contract that
`cache-manager@5` consumes for the ordinary call paths — but they are **not** the
whole exposed surface, and the naive inventory is misleading here. Consumer usage
through the cache interface is `get` 79 / `set` 66 / `del` 32 / `reset` 0.

The correction that matters: **`mget` is reached directly on the store object**,
bypassing `cache-manager` entirely. `RoleSetCacheService`
(`src/domain/access/role-set/role.set.service.cache.ts:57`) reads
`this.cacheManager.store.mget` and calls it on every batched membership lookup.
Counting only `cacheManager.*` call sites misses it, and leaving it unwrapped
would leave one of the hottest authorization paths with its pre-fix behaviour —
a rejection per request during an outage, and no ceiling at all against a
connected-but-silent server.

So the wrapped surface is `get`, `set`, `del`, `reset`, `mget`, `mset`, `keys`
and `ttl`. `mset`, `keys` and `ttl` have **0** consumers today and are wrapped
defensively: they are one `store.` dereference away from being used exactly as
`mget` already is, and FR-020 exists so a later change cannot silently
reintroduce the gap. `mdel` is neither used nor wrapped — no consumer, and it is
not part of the surface driven here; if one appears it must be added to the
wrapper and to this list.

Every fallback is **shape-preserving**, because these callers consume results
positionally or structurally rather than as a single optional value: `mget`
yields an array of `undefined` of the requested arity (a bare `undefined` would
turn a cache miss into a `TypeError` at the call site), `keys` yields `[]`, `ttl`
yields `-1` — node_redis' "no expiry known", the safest claim about a key we
could not reach.

The wrapper preserves every other property of the store object — critically
`name` and `getClient` — by spreading the original.

**`reset()` note**: the legacy store implements `reset()` as `FLUSHDB`
(`dist/index.js:185`). The cache shares database 0 with the OIDC session store
(`src/main.server.ts:105` constructs `new Redis({ host, port })` against the same
`storage.redis` config, no `db` index), so a `FLUSHDB` would destroy every
logged-in session. Nothing calls `reset()` today, so this hazard is currently
unreachable. The wrapper keeps the existing behaviour rather than changing it —
out of scope for this story — but the finding is recorded here and in `plan.md`
Follow-Up, because it is a live foot-gun for the next person who reaches for
`cacheManager.reset()`.

---

## R8 — Log throttling

**Question**: How is "one record per transition" (FR-015 – FR-017) implemented,
and where else does it need to apply?

**Finding**: `redis@3.1.2` with the R6 configuration attempts reconnection every
≤5 s, and each failure re-enters the `error` handler. Over an hour-long outage
that is ~720 records from one client, ×2 processes, ×N replicas. Logging every
one is a second incident.

A single boolean per client — "have I already reported that this connection is
down?" — is sufficient. Set on the first `error` after a healthy period, cleared
on `'ready'`. That is precisely the transition semantics FR-015/FR-016 ask for,
and it makes SC-004 (exactly 2 records per outage cycle) directly countable in a
unit test.

**Second site (Clarification Q3)**: `TaskService`'s direct-client path logs at
**error** level *per failed operation* — `task.service.ts:96` (`incr`),
`:172` (`setnx` terminal), `:198` (`setnx` end). During an outage the auth-reset
worker drives these in a loop, so this floods independently of the store. The
same suppression must apply here (FR-010a).

Note that `TaskService` is otherwise already correct for this scenario: every
callback path `resolve()`s rather than rejecting, and callers fall back to
in-object counters when the helper returns `undefined`. Its behaviour under
"client present but disconnected" is already the documented degraded mode — with
`enable_offline_queue: false` the command fails immediately with `NR_CLOSED`, the
callback receives an error, and the existing fallback engages. Only the logging
volume is wrong.

**Decision**: a small, reusable connection-state reporter owned by the factory;
`TaskService` consults the same suppression signal. No behavioural change to the
counter logic itself.

**Logger conventions** (`CLAUDE.md`, constitution §5): Winston via
`WINSTON_MODULE_NEST_PROVIDER`; `warn(message, context)`, `error(message,
stacktrace, context)`; `LogContext` enum member required; `noConsole` is a Biome
**error**, so `console.*` is not available even as a fallback. The factory runs
during module construction where the Nest logger is available through the
existing `useFactory` injection pattern.

---

## R9 — Test strategy

**Question**: What coverage would actually have caught this (FR-024 – FR-027,
SC-007)?

**Finding**: the repo runs **Vitest 4** with `*.spec.ts` beside the source
(`CLAUDE.md`), `@golevelup/ts-vitest` for mocks, and `test/mocks/` for shared
doubles. `src/domain/community/user/user.service.delete.spec.ts` is the style
reference named in the story; `src/services/task/task.service.spec.ts:585`
already builds a fake store exposing `getClient()`, which is a direct precedent
for the fake this feature needs.

The trap is writing a test that passes against the **broken** code. Consumers
already tolerate a cache miss, so any consumer-level test is green today and
proves nothing. The test must drive the shared factory itself with a substitute
client that fails on demand, and assert the three properties that are false on
`develop`:

1. an `error` emitted by the client is **consumed** — with no listener this is an
   uncaught exception, so the assertion is "the emit did not throw";
2. a rejecting `store.get` surfaces to the caller as `undefined`, and a rejecting
   `store.set`/`del` resolves rather than rejecting;
3. N failures across one outage produce exactly **1** warning, and recovery
   produces exactly **1** more.

Each fails against `develop` and passes after the change — which is what SC-007
asks to be demonstrated rather than asserted.

**Not unit-testable**: that a real process survives a real outage. Redis is not
available in the unit-test environment and starting one would be a
flakiness-generating integration dependency
(`docs/testing-flakiness.md` is explicit about this class of anti-pattern).
That property gets a written manual procedure in `quickstart.md` instead
(FR-028), which doubles as the unblocked server#6315 §6 check (US5).

**Decision**: co-located Vitest unit specs driving the factory with a fake
client; a written manual outage walk for the process-survival property.

---

## Summary of decisions

| ID | Decision | Drivers |
|---|---|---|
| D1 | **Option A** — harden the existing store in place, in one shared factory; do **not** swap the store | R4 (silent 1000× TTL hazard), R1, Constitution §10 |
| D2 | `client.on('error', …)` attached at construction — the complete and only sufficient mitigation | R1 |
| D3 | `enable_offline_queue: false` — immediate miss while disconnected, no timer needed | R6.4, FR-009 |
| D4 | `retry_strategy: attempt ⇒ min(attempt × 250 ms, 5 s)`, always a number | R6.3, FR-012/13 |
| D5 | `connect_timeout: 2_147_483_647` — an unbounded retry budget, *not* the 60 s the config intended | R6.2, FR-013 |
| D6 | Fail-soft wrapper over `get`/`set`/`del`/`reset`, catching broadly, with a 1 s ceiling | R7, FR-005–FR-009a |
| D7 | One boolean per client for transition-only logging; `TaskService` shares it | R8, FR-015–FR-017, FR-010a |
| D8 | Delete the inert `CacheModule.register()` in `AuthenticationModule` | R2, FR-022 |
| D9 | Leave TypeORM's cache configuration alone — its `redis` peer is not a live client | R3, FR-023 |
| D10 | Unit-test the factory with a failing fake client; manual procedure for process survival | R9, FR-024–FR-028 |

## Follow-up work identified but deliberately not done here

1. **Migrate the cache to `ioredis` and align on real cache-manager v5 types**,
   retiring `cache-manager-redis-store@2.0.0`, `redis@3.1.2` and
   `@types/cache-manager@4.0.6`. Requires converting 7 `set` call sites from
   `{ ttl: seconds }` to milliseconds **and** re-typing consumers so the compiler
   can police it. Sized as its own story; the shared factory from D1 is the only
   file that names the store, so the migration is contained. (R4, R5-B)
2. **`cacheManager.reset()` is a `FLUSHDB` against a database shared with the
   OIDC session store.** Unreachable today, destructive if reached. (R7)
3. **`storage.redis.timeout` is dead configuration** — never applied by this
   client, and cannot be applied as a connect timeout without also capping the
   retry budget (R6.2). Either wire it to the wrapper's per-operation ceiling or
   remove it from `alkemio.yml`. (R6.1)
