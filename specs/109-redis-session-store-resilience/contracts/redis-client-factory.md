# Contract: `ioredis` client factory

**Module**: `src/core/redis/redis.client.factory.ts`
**Consumers**: `src/core/auth/oidc/oidc-core.module.ts` (`OIDC_REDIS_CLIENT`),
`src/main.server.ts` (the express-session store client),
`src/core/health/health.module.ts` (`HEALTH_REDIS_HANDLE`)
**Satisfies**: FR-007 – FR-015, FR-023 – FR-027

An **internal** contract: no HTTP route, no GraphQL field, no routing key. It
defines the single seam through which every `ioredis` client in the system is
constructed, and what that seam owes its callers. It is the `ioredis` counterpart
of `src/core/cache/cache.store.factory.ts` (#6331) and deliberately **not** a
generalisation of it — see research R12.

## Surface

```ts
export type RedisClientPurpose = 'session' | 'oidc' | 'health';

export interface RedisClientOptions {
  /** Which client this is. Used as the reporter label; appears in log records. */
  purpose: RedisClientPurpose;
  /**
   * Defer connecting until the first command. ONLY for the health probe.
   * Combined with `enableOfflineQueue: false` this makes the FIRST command fail
   * unconditionally (research R2) — acceptable for a probe that re-runs, fatal
   * on the request path. Defaults to false.
   */
  lazyConnect?: boolean;
}

export function createRedisClient(
  config: { host: string; port: number | string },
  logger: LoggerService,
  options: RedisClientOptions
): Redis;
```

`config` is the `storage.redis` object read exactly as today. Callers may pass the
whole object; any extra fields on it are structurally ignored.

**On the absent timeout parameter.** `storage.redis` also carries a `timeout` field.
The factory does not accept it, for the same reason the cache factory does not: a
configurable timeout is a configurable way to reintroduce the 42-second hang, and
no deployment has a legitimate reason to want one (FR-015, spec Clarification Q8).
The field is already dead for the cache client; it stays dead here.

### Usage

```ts
// oidc-core.module.ts — OIDC_REDIS_CLIENT
createRedisClient(
  configService.get('storage.redis', { infer: true }),
  logger,
  { purpose: 'oidc' }
);

// main.server.ts — the express-session store client
createRedisClient(redisConfig, logger, { purpose: 'session' });

// health.module.ts — the probe
createRedisClient(
  configService.get('storage.redis', { infer: true }),
  logger,
  { purpose: 'health', lazyConnect: true }
);
```

## Applied options

| Option | Value | Requirement | Why |
|---|---|---|---|
| `host`, `port` | from `storage.redis` | FR-015 | `port` is coerced with `Number()` as today |
| `enableOfflineQueue` | `false` | FR-008 | The load-bearing one. Default `true` queues commands while disconnected; the queue is flushed with an error only every 21st reconnect attempt, a window that grows to 42 s once the backoff saturates (research R1). `false` rejects synchronously — 0 ms — for the whole outage |
| `commandTimeout` | `500` | FR-009 | The only defence against a store that accepts the socket and stops answering; the other three options all key off connection *state* (research R3) |
| `connectTimeout` | `500` | FR-011 | Adopted verbatim from `health.module.ts` |
| `maxRetriesPerRequest` | `1` | FR-010 | Bounds a command already in flight when the connection drops. With offline queueing off, nothing else can be waiting |
| `retryStrategy` | *(ioredis default)* | FR-012 | `times => Math.min(times * 50, 2000)`. Always returns a number, which is what stops `ioredis` entering `end` and abandoning the store permanently (`event_handler.js:188-192`) |
| `lazyConnect` | `false`, or `true` for the probe | FR-013, FR-014 | See G1 and research R2 |

Nothing else is set. In particular `keyPrefix` is **not** set: the session key
prefix `alkemio:sid:` is applied by `connect-redis` and by `buildSessionStore`, and
adding a client-level prefix would double it.

## Guarantees

### G1 — Construction never throws and never blocks on a live connection

`createRedisClient` returns a client regardless of whether Redis is reachable.
`ioredis`'s constructor initiates the connection asynchronously and does not await
it, and the factory adds no `await`.

*Why*: a throw here propagates into Nest's module bootstrap (for `OIDC_REDIS_CLIENT`
and the probe) or into the Express bootstrap (for the session client) and aborts
process startup. FR-013.

### G2 — An `error` listener is attached before the factory returns

Registered between client creation and the return, with no `await` in between, so
there is no turn of the event loop in which an emit could be unobserved.

*Why*: unlike `redis@3.1.2`, `ioredis` does **not** crash on an unobserved `error`
— it routes through `silentEmit` and writes `console.error("[ioredis] Unhandled
error event:", …)` (`built/Redis.js:509-534`). So the current omission is not a
crash; it is every session-client failure bypassing Winston entirely and appearing
as unstructured console output. That is a silent failure path under constitution
§5 and a `noConsole` violation in spirit. FR-027, research R4.

### G3 — A `ready` listener is attached alongside it

Both feed the same reporter instance.

*Why*: without it there is no recovery record and the reporter never re-arms, so a
second outage in the same process would be reported once and then never again.
FR-024.

*Note the contrast with the cache factory's G2a*: there, a `reconnecting` listener
is **required** because `redis@3.1.2` re-emits socket failures as `error` only when
no `retry_strategy` is configured. `ioredis` has no such quirk — it emits `error`
for connection failures unconditionally (`event_handler.js:216-221`) — so `error` +
`ready` is sufficient here. This is one of the concrete reasons the two factories
are not merged (research R12).

### G4 — Bounded latency, independent of outage duration

| Client state | Ceiling |
|---|---|
| Known-disconnected (`connecting` / `reconnecting`) | **0 ms** — synchronous rejection |
| `ready` but unresponsive | **500 ms**, then the command rejects |
| Connecting | **500 ms** per attempt |

**No ceiling is a function of how long the outage has lasted.** That is precisely
the property `develop` lacks (research R1, invariant I4).

### G5 — Reconnection is automatic, capped and never abandoned

| Property | Value | Requirement |
|---|---|---|
| First retry | 50 ms after loss | FR-012 |
| Interval growth | `attempt × 50 ms` | FR-012 |
| Interval cap | 2000 ms | FR-012, and keeps SC-005 true by construction |
| Give-up | never | FR-012 |
| Operator action to recover | none | SC-005 |

The default `retryStrategy` is kept rather than restated. Overriding it to "the
same thing, written out" would be a place for a future edit to introduce a
non-number return, which is how `ioredis` is told to give up permanently.

### G6 — The returned client is an unwrapped `ioredis` instance

No proxy, no wrapper, no method interception. Callers get `Redis` and can use
`eval`, pipelines, `defineCommand` and everything else.

*Why*: `session-index.redis.ts` issues Lua `EVAL` for the atomic index top-up, and
`connect-redis` sniffs the client's shape (`"scanIterator" in client`) to decide
whether it is talking to `redis` or `ioredis`. A wrapper risks both. Error
*translation* — turning a client rejection into `SessionStoreUnavailableError` —
happens one level up, in the store wrapper that knows a store call just failed
(plan D-4), not here.

### G7 — No new configuration

`storage.redis` is read exactly as today. No key added, changed or made required.
The system starts with no deployment, manifest or environment change. FR-015.

### G8 — One reporter per client

Each call constructs its own `RedisConnectionReporter`, labelled with `purpose`.
Two clients therefore report two independent outages, and neither can mask the
other. Spec Clarification Q9, data-model invariant I5.

## Non-guarantees

Stated so nobody infers them:

- **Not a circuit breaker.** No half-open probing, no request budget.
  `enableOfflineQueue: false` plus the client's own reconnect loop already delivers
  fail-fast-while-down; a breaker on top would add state and buy nothing.
- **Does not make session reads succeed during an outage.** It makes them fail
  *fast and legibly*. There is no cached or degraded answer for "is this session
  valid" — see the spec's Assumptions.
- **Does not swallow failures.** Unlike the cache factory (whose G3 resolves every
  operation), a session-store failure **must** propagate: 503 is the correct
  answer and silently degrading a signed-in user to anonymous would present as
  their data disappearing.
- **Does not unify the connections.** Three clients remain three clients; only
  their construction options are unified. Spec Out of Scope.
- **Does not touch the `redis@3.1.2` cache client.** `src/core/cache/` is not
  modified by this feature.

## Test obligations

| ID | Assertion | Guarantee |
|---|---|---|
| F1 | Construction against an unreachable host returns a client and does not throw | G1 / FR-013 |
| F2 | The returned client has ≥ 1 `error` listener immediately on return | G2 / FR-027 |
| F3 | The returned client has ≥ 1 `ready` listener immediately on return | G3 / FR-024 |
| F4 | Applied options include `enableOfflineQueue: false`, `commandTimeout: 500`, `connectTimeout: 500`, `maxRetriesPerRequest: 1` | G4 / FR-008 – FR-011 |
| F5 | `lazyConnect` is `false` unless the caller asks for it; `{ purpose: 'health', lazyConnect: true }` yields `true` | G1 / FR-014 |
| F6 | `retryStrategy` returns a number for attempts 1…100, monotonic non-decreasing, capped at 2000, never an `Error` | G5 / FR-012 |
| F7 | Emitting `error` on the returned client does not throw and produces exactly one log record | G2 / FR-023 |
| F8 | A second `error` in the same outage produces no further record; a subsequent `ready` produces exactly one | G8 / FR-024, FR-025 |
| F9 | No `keyPrefix` is applied | applied-options table |
| F10 | Grepping the source tree finds no `new Redis(` outside this factory | FR-007 / SC-009 |
