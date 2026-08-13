# Contract: Cache connection state reporter

**Module**: `src/core/cache/cache.connection.reporter.ts`
**Consumers**: `src/core/cache/cache.store.factory.ts`, `src/services/task/task.service.ts`
**Satisfies**: FR-010a, FR-015 – FR-019

Internal contract. Its entire job is to convert a stream of repeated failures
into a pair of events, so that a Redis outage is *diagnosable* rather than
*deafening*.

## Surface

```ts
export class CacheConnectionReporter {
  constructor(logger: LoggerService);

  /**
   * Call on every client 'error' AND on every 'reconnecting'.
   * Records only the first of an outage.
   */
  reportError(error: unknown): void;

  /**
   * Record ONE operation that failed while the connection was believed up.
   * Deliberately NOT deduplicated — callers gate it on the live signal.
   */
  reportOperationFailure(operation: string, error: unknown): void;

  /** Call on every client 'ready'. Records only the recovery from an outage. */
  reportReady(): void;

  /** True while the connection is known to be down. Read-only signal. */
  get isDown(): boolean;
}
```

## Guarantees

### G1 — Exactly one record per transition

| From | Event | Records emitted | Level |
|---|---|---|---|
| HEALTHY | `reportError` | **1** | `warn` |
| DOWN | `reportError` | **0** | — |
| DOWN | `reportReady` | **1** | `warn` |
| HEALTHY | `reportReady` | **0** | — |

FR-015, FR-016, FR-017. Directly countable — this table *is* SC-004's assertion:
an outage-and-recovery cycle emits exactly 2 records, whatever its duration.

The `HEALTHY → reportReady → 0 records` row matters more than it looks: it
covers the normal startup connect, which happens on every boot of every replica
and is not worth a line.

### G2 — Initial state is HEALTHY

A freshly constructed reporter has `isDown === false`. A process that starts
while Redis is already down therefore reports the outage once, on its first
failed connection attempt, rather than staying silent because it never saw a
"healthy" state to fall from.

### G3 — Records carry no secrets

Only the error's `message` and `code` are recorded. Connection options,
credentials and the full error object are never logged. FR-019, constitution §8
("Secrets and credentials never logged").

The host and port are *not* secrets and may appear, but are omitted anyway —
they are static per deployment and add nothing to a log line that already has
the pod's identity.

### G4 — Winston only

All records go through the injected `LoggerService` with an explicit `LogContext`
member. `console.*` is not used — `noConsole` is a Biome **error** in this
repository, and the constitution requires structured contexts (§5).

Signatures per `CLAUDE.md`:

- `warn(message: string | object, context: string)`
- `error(message: string | object, stacktrace: string, context: string)`

`warn` is the correct level for both transitions: a cache outage is a
degradation the platform is designed to absorb, not a failure of the operation
that observed it. Using `error` would page on something the system is explicitly
handling.

### G5 — `isDown` is a suppression signal, not a control signal

`isDown` exists so a consumer can suppress *its own logging*. It must not be used
to decide whether to attempt an operation.

*Why*: the client already knows whether it is connected, and with
`enable_offline_queue: false` it rejects commands immediately while disconnected
(research R6.4). Gating operations on a second, independently-maintained copy of
that state would create a consistency bug — a stale `isDown === true` would
suppress operations against a Redis that had already recovered — for no benefit.

The fail-soft store wrapper **does** read the connection signal, for two
non-control purposes only, and never to decide whether to attempt an operation:

1. to gate the per-operation mutation record of G6 (so a real outage stays at the
   single transition record of G1); and
2. to skip arming the per-operation timeout timer while the connection is
   already known to be down — the client rejects instantly in that state, so the
   timer would be pure overhead on a hot path for the whole outage.

It reads that state through the read-only `CacheConnectionSignal`, **not** through
the reporter, so no consumer can call `reportReady()` and corrupt the shared
outage state. That signal prefers the client's own authoritative `ready` flag and
falls back to `isDown` only when the client does not expose one — see
[data-model.md](../data-model.md) and G7 of
[cache-store-factory.md](./cache-store-factory.md).

### G6 — Connected-state operation failures are recorded per occurrence

`reportOperationFailure(operation, error)` is **not** deduplicated, and that is
deliberate: it is not the outage path. It exists for the one case the single
transition record of G1 cannot cover — a *reachable* Redis that refuses or
overruns an individual mutation, where a swallowed `del` leaves an authorization
entry stale and no other signal exists.

| Property | Rule |
|---|---|
| Cardinality | One record per failed mutation. No suppression, no dedup. |
| Gating | Callers **must** check the live connection signal first and skip the call while it reports down (FR-017). During a real outage this method is therefore never reached. |
| Scope | Mutations only (`set`, `del`, `reset`, `mset`) and their timeouts. Failed **reads** are silent — a failed read is indistinguishable from a cold cache, which every consumer already handles. |
| Level | `warn`, for the same reason as G1: a degradation the platform absorbs. |
| Content | Message and `code` only, exactly as G3. The `operation` label is a fixed vocabulary (`write`, `invalidation`, `reset`) — never a key, value or user-supplied string, so record cardinality stays bounded and no cached content can leak. |

## Consumer obligations

### `cache.store.factory.ts`

Wires all three listeners at construction, before returning:

```ts
client.on('error', err => reporter.reportError(err));
client.on('reconnecting', params => reporter.reportError(params?.error));
client.on('ready', () => reporter.reportReady());
```

The `'error'` registration is what stops the process dying
(cache-store-factory.md G2). The reporter is the handler, but any handler would
do for survival — the reporter is what makes the handler *useful*.

The `'reconnecting'` registration is **not** redundant with it, and omitting it
makes the ordinary outage completely silent. `redis@3.1.2` re-emits a socket
failure as `'error'` only when **no** `retry_strategy` is configured
(`index.js:341`) — and the factory configures one, precisely so the client never
gives up (FR-012, FR-013). So the common outage (ECONNREFUSED, peer close,
`docker stop redis`) arrives as `reconnecting` and never as `error`. Without this
listener nothing would be logged and `isDown` would never flip, which is the
signal FR-010a and FR-015 – FR-019 are built on.

Both are routed to `reportError`, so G1's dedup makes a reconnect storm — one
event per retry, ~1 every 5 s at the capped backoff — still cost exactly one
record.

### `task.service.ts`

Consults `isDown` before its three existing `logger.error` calls on the
direct-client path — `task.service.ts:96` (`INCR`), `:172` (terminal `SETNX`),
`:198` (end `SETNX`). During an outage the auth-reset worker drives these in a
loop across up to 10 autoscaled replicas, so unsuppressed they flood
independently of the store. FR-010a.

**Behaviour is otherwise unchanged.** Every callback on that path already
`resolve()`s rather than rejecting, and callers already fall back to in-object
counters when the helper yields `undefined`. Only the log volume changes — the
counter logic, the fallback and their existing coverage in
`task.service.spec.ts` are untouched.

## Test obligations

| ID | Assertion | Guarantee |
|---|---|---|
| T1 | 1 error → exactly 1 record | G1 |
| T2 | 50 consecutive errors → still exactly 1 record | G1 — the flood-suppression case |
| T3 | errors → ready → errors → exactly 3 records total | G1 — recovery re-arms reporting |
| T4 | `ready` from the initial state → 0 records | G1, G2 — the startup case |
| T5 | `isDown` is `false` initially, `true` after an error, `false` after ready | G2, G5 |
| T6 | No record contains anything beyond the error's message and code | G3 |
| T7 | Every record goes through the injected logger with a `LogContext` | G4 |
| T8 | A `reconnecting` event with no preceding `error` still produces exactly 1 record, and 50 consecutive `reconnecting` events still produce exactly 1 | G1 — the ordinary outage, which never emits `error` at all |
| T9 | `reportOperationFailure` called N times produces N records — it is not deduplicated | G6 |
| T10 | A mutation failing while the signal reports **up** produces a record; the same failure while it reports **down** produces none | G6 — the gating obligation, FR-017 |
| T11 | No `reportOperationFailure` record contains anything beyond the operation label, message and code | G6, G3 |
