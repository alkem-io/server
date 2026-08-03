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

  /** Call on every client 'error'. Records only the first of an outage. */
  reportError(error: unknown): void;

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

`isDown` exists so a second consumer can suppress *its own logging*. It must not
be used to decide whether to attempt an operation.

*Why*: the client already knows whether it is connected, and with
`enable_offline_queue: false` it rejects commands immediately while disconnected
(research R6.4). Gating operations on a second, independently-maintained copy of
that state would create a consistency bug — a stale `isDown === true` would
suppress operations against a Redis that had already recovered — for no benefit.

The fail-soft store wrapper deliberately does **not** read `isDown`. It is
state-free: it catches what it catches and logs nothing per operation.

## Consumer obligations

### `cache.store.factory.ts`

Wires both listeners at construction, before returning:

```ts
client.on('error', err => reporter.reportError(err));
client.on('ready', () => reporter.reportReady());
```

The `'error'` registration is what stops the process dying
(cache-store-factory.md G2). The reporter is the handler, but any handler would
do for survival — the reporter is what makes the handler *useful*.

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
