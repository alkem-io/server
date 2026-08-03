# Contract: Cache store factory

**Module**: `src/core/cache/cache.store.factory.ts`
**Consumers**: `src/app.module.ts`, `src/core/bootstrap/auth-reset.worker.module.ts`
**Satisfies**: FR-003, FR-005 – FR-009a, FR-011 – FR-014, FR-020, FR-021

This is an **internal** contract. It defines no HTTP route, no GraphQL field and
no message-queue routing key — the feature adds no external surface. What it
does define is the single seam through which every cache in the system is now
constructed, and the guarantees that seam owes its callers.

## Surface

```ts
export function createRedisCacheStore(
  config: { host: string; port: number },   // NOTE: `timeout` is deliberately NOT accepted
  logger: LoggerService
): CacheStoreFactory;
```

**On the absent `timeout`.** `storage.redis` also carries a `timeout` field, and
the obvious-looking thing is to accept it and pass it through. The factory
deliberately does **not** accept it, so that nobody can wire it up by reflex. In
`redis@3.1.2`, `connect_timeout` doubles as the *total retry budget*
(`redis/index.js:580`) — honouring the configured 60 s would make the client
permanently abandon Redis after a minute of outage, which is the exact failure
this feature exists to remove (FR-013, research R6.2). The value has in fact never
been applied, because it is currently passed under an `ioredis` key name that
`redis@3.1.2` ignores (research R6.1). Call sites may still pass the whole
`storage.redis` object — TypeScript's structural typing accepts the extra field
on a non-literal — but the factory body cannot see `timeout`, so it cannot be
wired up without a deliberate signature change that a reviewer will notice. The
now-dead configuration key is recorded in plan.md Follow-Up 3 rather than quietly
repurposed here.

`CacheStoreFactory` is the shape `cache-manager@5.7.6` accepts as `store` and
invokes as `await factory(args)` — verified in `cache-manager/dist/caching.js`:

```js
if (typeof factory === 'function') {
  const store = await factory(arguments_);
  return createCache(store, arguments_);
}
```

### Usage — identical at both call sites

```ts
CacheModule.registerAsync({
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
  useFactory: (
    configService: ConfigService<AlkemioConfig, true>,
    logger: LoggerService
  ) => ({
    store: createRedisCacheStore(
      configService.get('storage.redis', { infer: true }),
      logger
    ),
  }),
});
```

`isGlobal: true` and the `storage.redis` config key are unchanged from today.

## Guarantees

### G1 — Construction never throws, and never blocks on a live connection

`createRedisCacheStore` and the factory it returns complete regardless of whether
Redis is reachable. The client connects asynchronously; construction does not
await it.

*Why*: a throw here propagates into Nest's module bootstrap and aborts process
startup — the boot-time half of FR-001/FR-002 (US1 acceptance scenario 4).

### G2 — An `error` listener is attached before the factory returns

Registration happens between client creation and the return, with no `await` in
between, so there is no turn of the event loop in which an emit could be
unobserved.

*Why*: `redis@3.1.2` emits `'error'` from seven sites (research R1); an
unobserved `'error'` on an `EventEmitter` is an uncaught exception, which is the
entire defect. This is the single load-bearing guarantee of the feature (FR-003).

### G3 — No store operation ever rejects

`get`, `set`, `del` and `reset` on the returned store resolve under all
conditions:

| Operation | On failure | Rationale |
|---|---|---|
| `get` | resolves `undefined` | Indistinguishable from a cache miss, which every consumer already handles (FR-005) |
| `set` | resolves | The write is abandoned; the source of truth is authoritative (FR-006) |
| `del` | resolves | Nothing to invalidate if nothing is cached (FR-007) |
| `reset` | resolves | Same (FR-007) |

Failures are caught **broadly**, not matched against an error-code allow-list
(FR-008). The observed vocabulary alone spans `AbortError`/`NR_CLOSED`,
`AbortError`/`UNCERTAIN_STATE`, `CONNECTION_BROKEN`, raw socket errors and
`JSON.parse` failures on truncated replies; an allow-list would be a guess, and
the cost of guessing wrong is a 500 on a request the database could have served.

### G4 — Bounded latency

| Client state | Ceiling |
|---|---|
| Known-disconnected | **0 ms** — `enable_offline_queue: false` makes the client reject the command synchronously (research R6.4) |
| Connected but unresponsive | **1000 ms**, then the operation resolves as a miss / no-op |

*Why*: the only timeout the system configures today is nominally 60 s and in
practice one hour (research R6.1/R6.2). Charging that to a request would replace
a crash with a hang. FR-009, FR-009a, SC-009.

The 1 s ceiling is a fixed behavioural constant of the cache layer, deliberately
**not** derived from `config.timeout` — see G7.

### G5 — Reconnection is automatic, capped, and never abandoned

| Property | Value | Requirement |
|---|---|---|
| First retry | ≤ 250 ms after loss | FR-012 |
| Interval growth | `attempt × 250 ms` | FR-012 |
| Interval cap | 5000 ms | FR-012, and keeps SC-003's 60 s target true by construction |
| Give-up | never | FR-013 |
| Operator action to recover | none | FR-011, SC-002 |

`retry_strategy` returns a `number` on **every** call. Returning anything else —
including an `Error` — makes `redis@3.1.2` flush the command queue with
`CONNECTION_BROKEN`, call `end(false)` and emit a terminal `'error'`
(`redis/index.js:554-577`): a permanent give-up, i.e. the exact failure mode this
feature exists to remove.

`connect_timeout` is set to `2_147_483_647` ms. This is **not** a connect timeout
in the usual sense: in this client it also serves as the total retry budget
(`redis/index.js:580`), so any small value silently caps how long reconnection is
attempted. The large value makes the budget effectively unbounded. It does not
act as an idle timeout on an established connection — `on_connect` clears it with
`stream.setTimeout(0)` (`redis/index.js:356`).

### G6 — The store's identity and escape hatch are preserved

The returned store keeps `name === 'redis'` and a working `getClient()` returning
the same `redis@3.1.2` client instance. The wrapper spreads the original store, so
any property not explicitly overridden passes through untouched.

*Why*: `TaskService` reaches through `store.getClient()` for server-side atomic
counters (`INCR`, `SADD`, `SETNX`, `EXPIRE`) that cannot be expressed through the
cache-manager interface, and guards on `typeof store?.getClient === 'function'`
(`task.service.ts:56-67`). Breaking this would reintroduce server#6310's lost-update
hang. FR-010.

### G7 — TTL semantics are untouched

The wrapper delegates to the **same** legacy store object, whose `set` has the
four-argument signature `set(key, value, options, cb)` and reads `options.ttl` as
**seconds**. Every existing call site passes `{ ttl: <seconds> }` and continues to
mean exactly what it meant before.

*Why*: this is the guarantee that decided the whole design. The repository
compiles against `@types/cache-manager@4.0.6` while running `cache-manager@5.7.6`,
whose native `set` third argument is a bare number of **milliseconds**. A
v5-native store would reinterpret every TTL by a factor of 1000 or drop it — with
no compiler error, because the types in play are v4's, and no test signal, because
a wrong TTL still reads back correctly. See plan.md D1 and research R4. SC-008.

### G8 — No new configuration

`storage.redis` is read exactly as today. No key is added, changed or made
required. The system starts with no deployment, manifest or environment change.
FR-021.

## Non-guarantees

Stated so nobody infers them:

- **Not a circuit breaker.** There is no half-open probing state and no request
  budget. The client's own reconnection loop plus `enable_offline_queue: false`
  already deliver fail-fast-while-down; a breaker on top would add state to
  reason about and buy nothing.
- **Does not make cache reads correct during an outage.** It makes them *misses*.
  Correctness comes from the source of truth, which is the spec's load-bearing
  assumption.
- **Does not preserve atomicity of the direct-client counters during an outage.**
  Those degrade to process-local counting — the documented, pre-existing degraded
  mode, accepted in Clarification Q3 and recorded as a limitation in the spec's
  Edge Cases.
- **Does not change `reset()`'s `FLUSHDB` behaviour.** Preserved as-is; it is a
  live foot-gun against a database shared with the OIDC session store, recorded
  in plan.md Follow-Up 2 rather than fixed here.
- **Does not touch any other Redis connection.** The OIDC session store and the
  health probe own their own `ioredis` clients and handle their own failures.
  FR-023.

## Test obligations

Each of these must **fail against `develop`** — that is the point (FR-027, SC-007).

| ID | Assertion | Guarantee |
|---|---|---|
| T1 | Emitting `'error'` on the client does not throw | G2 / FR-024 |
| T2 | `get` resolves `undefined` when the underlying store rejects | G3 / FR-025 |
| T3 | `set` and `del` resolve when the underlying store rejects | G3 / FR-025 |
| T4 | An operation that never settles resolves at the 1 s ceiling | G4 / FR-009a |
| T5 | `retry_strategy` returns a number for attempts 1…100, monotonic, capped at 5000, never an `Error` | G5 / FR-012, FR-013 |
| T6 | `getClient()` and `name` survive wrapping | G6 / FR-010 |
| T7 | Construction succeeds and does not throw with an unreachable host | G1 / FR-001, FR-002 |
| T8 | `set` forwards its third argument to the underlying store unmodified | G7 / SC-008 |
