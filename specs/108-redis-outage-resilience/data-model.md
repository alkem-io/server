# Phase 1 Data Model: Redis outage resilience

**Feature**: `108-redis-outage-resilience` · **Story**: [server#6330](https://github.com/alkem-io/server/issues/6330)

## Persistence

**None.** This feature introduces no entity, no table, no column, no index and no
migration. `schema.graphql` is unchanged, so no schema diff or contract review is
triggered.

The only durable store involved is Redis itself, and its *contents* are unchanged
by this feature — same keys, same values, same TTLs. That last point is not
incidental: preserving TTL semantics exactly is the constraint that decided the
design (plan.md D1, research R4).

What follows is therefore the **runtime** state model — the in-process state the
feature introduces, which is small, deliberately so, and entirely per-process.

## Runtime state

### `CacheConnectionReporter`

One instance per constructed cache client. Not a Nest provider; it is created by
the factory and captured in the closure of the listeners it registers.

| Field | Type | Lifetime | Purpose |
|---|---|---|---|
| `reportedDown` | `boolean` | Process | Whether the current outage has already been reported. The whole of FR-015 – FR-017 reduces to this one flag. |
| `logger` | `LoggerService` | Process | Winston, injected from the module factory. Never `console`. |

**State machine** — two states, two transitions:

```text
                  client 'error'                (first one only)
   ┌──────────┐ ─────────────────────────────────────▶ ┌────────────┐
   │  HEALTHY │                                        │    DOWN    │
   │ reported │                                        │  reported  │
   │ Down =   │ ◀───────────────────────────────────── │  Down =    │
   │  false   │                  client 'ready'        │   true     │
   └──────────┘                                        └────────────┘
        │                                                    │
        │ subsequent 'ready' → no record                     │ subsequent 'error' → no record
        └────────────────────────────────────────────────────┘
```

- `HEALTHY --error--> DOWN`: emit **exactly one** warning; set `reportedDown = true`.
- `DOWN --error--> DOWN`: emit nothing. This is the branch that prevents the
  ~720-records-per-hour-per-client flood computed in research R8.
- `DOWN --ready--> HEALTHY`: emit **exactly one** record; clear `reportedDown`.
- `HEALTHY --ready--> HEALTHY`: emit nothing. Covers the normal startup
  connect, which is not an event worth a line.

Initial state is `HEALTHY` (`reportedDown = false`). A process that starts while
Redis is already down therefore reports the outage once on its first failed
connection attempt, which is the desired behaviour for the boot-time edge case.

**Invariant** — the one SC-004 asserts: over any outage-and-recovery cycle,
regardless of duration or number of reconnection attempts, the number of emitted
records is exactly **2**.

### `isDown` — the read side

`reportedDown` is exposed read-only so a second consumer can suppress its own
logging without duplicating the state machine.

| Consumer | Why it needs the signal |
|---|---|
| The fail-soft store wrapper | Nothing — it is deliberately state-free. It catches whatever it catches and does not log per operation at all. |
| `TaskService` | It bypasses the store and drives the raw client for server-side atomic counters. Its three error paths (`task.service.ts:96`, `:172`, `:198`) log at **error** level *per failed operation*; the auth-reset worker drives these in a loop, so during an outage they flood independently of the store. FR-010a. |

`TaskService`'s counter *behaviour* is untouched — every callback already
`resolve()`s rather than rejecting, and callers already fall back to in-object
counters when the helper yields `undefined`. Only the log volume changes.

### Client connection state (not ours)

`redis@3.1.2` maintains `client.connected` and `client.ready` internally. The
feature **reads** neither. This is a deliberate simplification worth recording:
with `enable_offline_queue: false`, a command issued while disconnected is
rejected immediately by the client itself (research R6.4), so the wrapper does
not need to consult connection state before deciding whether to attempt an
operation. Duplicating the client's own state would create a
consistency problem for no benefit.

## Data flow

### Healthy — unchanged from today

```text
consumer ──get/set/del──▶ cache-manager v5 ──▶ fail-soft wrapper ──▶ legacy store ──▶ redis@3.1.2 ──▶ Redis
                                                (pass-through)
```

The wrapper adds one `try`/`catch` and one `Promise.race` per call. SC-008 holds:
no observable behaviour change, because on the success path neither branch fires.

### Degraded — the outage path

```text
consumer ──get──▶ cache-manager v5 ──▶ fail-soft wrapper ──▶ legacy store ──▶ client (disconnected)
                                              │                                        │
                                              │                          AbortError NR_CLOSED (immediate)
                                              ◀────────────────────────────────────────┘
                                              │
                                    resolves undefined  ──▶ consumer treats as a MISS
                                                            ──▶ reads from the database
```

And, entirely independently of any request:

```text
client 'error' ──▶ CacheConnectionReporter ──▶ [first time only] logger.warn(…, LogContext.CACHE)
                                          └──▶ reportedDown = true
```

The two flows are decoupled on purpose. The crash comes from the second flow —
an asynchronous emit with no command in flight — which is exactly why a
request-path decorator alone could never have fixed it (research R5-C).

## Key relationships

```text
AppModule ─────────────┐
                       ├──▶ createRedisCacheStore(config, logger) ──▶ store factory fn
AuthResetWorkerModule ─┘                    │
                                            ├──▶ CacheConnectionReporter  (1 per client)
                                            ├──▶ redis client + 'error'/'ready' listeners
                                            └──▶ fail-soft wrapper over the legacy store
                                                          │
                                                          ├──▶ getClient()  (preserved verbatim)
                                                          │         └──▶ TaskService atomic counters
                                                          └──▶ get/set/del/reset  (fail-soft)
                                                                    └──▶ 17 cache consumer services
```

Cardinality: **2 construction sites → 1 factory → 1 client + 1 reporter per
process.** Before this change: 2 construction sites, 2 copies of the
configuration, 0 error listeners, 0 reporters.

`AuthenticationModule`'s third declaration — an in-memory `CacheModule.register()`
with no consumer in its injection scope (research R2) — is deleted, so it does
not appear above.

## Configuration

No new key. No changed key. No key becomes required.

`storage.redis` (`{ host, port, timeout }`) is read exactly as it is today.

One behavioural note, which is a **finding rather than a change**: `timeout` was
never actually applied. It is passed as `redisOptions: { connectTimeout }`, an
`ioredis` spelling that `redis@3.1.2` does not recognise — it reads
`connect_timeout` from the top level and otherwise defaults to one hour
(research R6.1). This feature does not start honouring the configured value,
because in this client `connect_timeout` doubles as the total retry budget, and
honouring 60 s would make the client permanently abandon Redis after a minute —
violating FR-013. The dead key is recorded in plan.md Follow-Up 3 rather than
silently repurposed.

## Volume and scale

| Dimension | Value |
|---|---|
| New in-process state | 1 boolean + 1 logger reference per process |
| New allocations per cache operation | 1 timer (cleared on settle), 1 race promise |
| New records during an hour-long outage | 1 (down) + 1 (recovery) per process |
| Records this replaces | ~720 per client per hour, if every retry were logged |
| Persistent storage impact | Zero |
