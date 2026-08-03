# Implementation Plan: Redis outage must degrade the platform, not kill it

**Branch**: `story/6330-redis-outage-crash` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/107-redis-outage-resilience/spec.md`

**Story**: [alkem-io/server#6330](https://github.com/alkem-io/server/issues/6330)

## Summary

A Redis outage currently kills the Node process. The cause is narrow and fully
identified: `cache-manager-redis-store@2.0.0` constructs a `redis@3.1.2` client
and never attaches an `error` listener, so the client's `'error'` emit becomes an
uncaught exception and Node terminates. Two processes are affected — the API and
the auth-reset worker — because their cache bootstrap is duplicated by copy.

The fix keeps the existing store and hardens it in place, behind **one shared
factory** that both bootstraps call:

1. attach the `error` listener at construction — the complete and only sufficient
   mitigation (research R1);
2. configure the legacy client's retry and offline-queue behaviour so
   reconnection is automatic, capped and unbounded in duration, and so commands
   issued while disconnected fail instantly instead of queueing (R6);
3. wrap the store so cache failures surface as misses rather than rejecting into
   request handlers — without which the crash merely becomes a 500 on every
   cache-touching request (R7);
4. report connection state **once per transition**, not once per retry, in the
   store and in the one service that talks to the client directly (R8);
5. delete a third, verified-inert cache declaration so "every construction site is
   hardened" is an honest claim (R2).

**The store is deliberately not replaced.** Migrating to an `ioredis`-backed store
was evaluated and rejected — see Decision D1.

## Decision D1 — chosen design and rejected alternatives

The story names three candidates. Full evaluation in [research.md](./research.md)
R5; the decisive evidence is R4.

**Chosen — (a) keep `cache-manager-redis-store@2` and harden the underlying
client**, with the fail-soft wrapper of (c) folded in as a mandatory component.

**Rejected — (b) migrate the cache store to `ioredis`.** This was the *expected*
answer going in, and it is the right long-term destination: `ioredis@5.10.1` is
already a direct dependency with two production uses in this repo (the OIDC
session store and the health probe), and its defaults deliver automatic capped
reconnection as configuration rather than archaeology. It was rejected on an
observed constraint, not a preference. The repository **compiles against
`@types/cache-manager@4.0.6`** — a direct devDependency — while **running
`cache-manager@5.7.6`**, which pnpm's strict layout makes unresolvable from the
repo root. Under v4 types, `set`'s third argument is a `CachingConfig` object
carrying **seconds**; under the v5 runtime it is a bare number of
**milliseconds**. All 7 write call sites use the v4 object form, and it works
only because the legacy store still has the old four-argument signature and reads
`options.ttl`. Any v5-native store — third-party or written here — would receive
an object where it expects a number, silently dropping or corrupting every TTL,
**with no compiler error** (the types in play are v4's, under which the call is
correct) and **no test signal** (a wrong TTL still reads back fine). One call site
already carries `as any`, which would suppress even an accidental catch. That is a
direct, silent violation of SC-008. A production-down availability fix is the
worst possible carrier for a 1000× TTL migration. *(Note: `RedisClientLike`'s
callback style was **not** the obstacle — ioredis accepts err-first callbacks on
every command the interface declares. That hypothesis was tested and disproved.)*

**Rejected — (c) fail-soft decorator alone.** It does not fix the reported
defect. The fatal `error` is emitted by the *client*, asynchronously, with no
command in flight — the reported stack is a ready-check `INFO`, not an
application `GET`. No amount of decorating store methods can observe it. (c) is
necessary but not sufficient, and is therefore included inside (a) rather than
standing as an alternative to it.

**Follow-up, explicitly deferred**: migrate to `ioredis` and align on real
cache-manager v5 types, retiring `cache-manager-redis-store@2.0.0` (2020),
`redis@3.1.2` (2021) and `@types/cache-manager@4.0.6`. The shared factory
introduced here is deliberately the **only** file that names the store, so that
migration becomes one file plus a typed sweep of the 7 call sites.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 22 LTS (Volta-pinned 22.21.1)

**Primary Dependencies**: NestJS 10, `@nestjs/cache-manager@2.3.0` →
`cache-manager@5.7.6` (runtime) / `@types/cache-manager@4.0.6` (compile-time),
`cache-manager-redis-store@2.0.0` → `redis@3.1.2`, Winston via `nest-winston`.
`ioredis@5.10.1` is present and used by other subsystems — **not touched here**.

**Storage**: None. No schema change, no migration, no GraphQL schema change. The
only persistent surface involved is Redis itself, which holds derived state only.

**Testing**: Vitest 4 (`pnpm test:ci:no:coverage`), `*.spec.ts` co-located with
source, `@golevelup/ts-vitest` for mocks. Style references named in the story:
`src/domain/community/user/user.service.delete.spec.ts`, and
`src/services/task/task.service.spec.ts` (already builds a fake store exposing
`getClient()` — direct precedent for the fake this feature needs).

**Target Platform**: Linux containers on Kubernetes; two processes per release
(`main.server.ts` API, `main.worker.ts` auth-reset worker) sharing one Redis.

**Project Type**: Backend service — single repository, no cross-repo coordination.

**Performance Goals**: While Redis is healthy, byte-for-byte identical behaviour
(SC-008). While Redis is down, ≤1 s added latency on a cache-touching path and
0 s once the outage is detected (SC-009).

**Constraints**: No new required configuration (FR-021). No consumer changes. No
TTL semantics change (the constraint that decided D1). The auth-reset worker's
deliberate module omissions must survive untouched.

**Scale/Scope**: ~3k TypeScript files in the repo; this change is 1 new source
file plus a small reporter, 2 new spec files, and edits to 5 existing files.

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design. Both passed.*

| Principle | Assessment |
|---|---|
| **1. Domain-Centric Design First** | PASS — the change is entirely infrastructural. No business logic added, moved, or touched; no domain module modified. |
| **2. Modular NestJS Boundaries** | PASS — the new factory lives in `src/core/`, which the constitution designates for "core, cross-cutting abstractions". It is a plain exported function, not a module, so it adds no provider surface and no dependency edge. It *removes* one import edge (`CacheModule` from `AuthenticationModule`). No circular dependency is introduced. |
| **3. GraphQL Schema as Stable Contract** | PASS — not applicable. No resolver, DTO or schema change; `schema.graphql` is untouched. |
| **4. Explicit Data & Event Flow** | PASS — no write path, no domain event, no repository access is involved. |
| **5. Observability & Operational Readiness** | PASS, and this is the principle the feature most directly serves. Structured Winston logging with an explicit `LogContext` (FR-018). **"Silent failure paths are forbidden"** is honoured precisely: every cache failure mode is reported — but *once per state transition* rather than once per occurrence, which is what makes the signal usable instead of a flood (FR-015 – FR-017). No new health indicator is added; the module exposes no new external surface, and the existing readiness probe already reports cache reachability — documented in the spec's Out of Scope with reasoning, exactly as this principle asks. |
| **6. Code Quality with Pragmatic Testing** | PASS — risk-based. New tests target the resilience factory only, and are constructed to **fail against `develop`** (FR-027). No trivial pass-through coverage, no snapshot tests, no placeholders. |
| **7. API Consistency & Evolution Discipline** | PASS — no public API surface changes. |
| **8. Secure-by-Design Integration** | PASS, and materially advanced. This principle requires every external service integration to have "timeout, retry policy, and circuit-breaker rationale" — the cache integration currently has **none of the three**, which is the defect. This change supplies all three with rationale in research R6/R7. FR-019 forbids credentials in the new records. |
| **9. Container & Deployment Determinism** | PASS — no `process.env` access outside config bootstrap; all values flow through `ConfigService`. No image or manifest change; the fix is inert with respect to deployment. |
| **10. Simplicity & Incremental Hardening** | PASS, and it is the principle that *decided* D1. "Prefer the simplest viable implementation" and "architectural escalation requires a written rationale referencing observed constraints — not speculative scale" both argue **against** the store migration. The observed constraint (research R4) makes the escalation actively riskier than the simple option, not merely larger. |

**Violations requiring justification**: none. Complexity Tracking is therefore
omitted, per the template's instruction to fill it only when violations exist.

**Post-Phase-1 re-check**: the design adds two small files, deletes one dead
import, and introduces no new module, provider, dependency or configuration key.
No gate moved from PASS.

## Project Structure

### Documentation (this feature)

```text
specs/107-redis-outage-resilience/
├── spec.md                      # /speckit-specify + /speckit-clarify
├── plan.md                      # This file
├── research.md                  # Phase 0 — R1..R9, decisions D1..D10
├── data-model.md                # Phase 1 — runtime state (no persistence)
├── quickstart.md                # Phase 1 — manual outage walk (FR-028)
├── contracts/
│   ├── cache-store-factory.md   # The shared factory's contract
│   └── connection-state-reporter.md  # Transition-only reporting contract
├── checklists/
│   └── requirements.md          # Spec quality checklist
└── tasks.md                     # /speckit-tasks — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── cache/                                    # NEW — the single construction point
│   │   ├── cache.connection.reporter.ts          # NEW — transition-only reporting (D7)
│   │   ├── cache.connection.reporter.spec.ts     # NEW — SC-004 is counted here
│   │   ├── cache.store.factory.ts                # NEW — D2..D6 live here
│   │   └── cache.store.factory.spec.ts           # NEW — FR-024..FR-027
│   ├── authentication/
│   │   └── authentication.module.ts              # EDIT — delete inert CacheModule.register()
│   └── bootstrap/
│       └── auth-reset.worker.module.ts           # EDIT — call the shared factory
├── app.module.ts                                 # EDIT — call the shared factory
├── common/
│   ├── enums/logging.context.ts                  # EDIT — add a CACHE context if absent
│   └── interfaces/redis.interfaces.ts            # EDIT — minimal type extension only
└── services/task/
    └── task.service.ts                           # EDIT — suppress per-failure log flood only
```

**Structure Decision**: the factory goes in **`src/core/cache/`**. The
constitution assigns `src/core/*` to "core, cross-cutting abstractions (auth,
error-handling, microservices, pagination, filtering)" — cache bootstrap is
exactly that, and it sits beside the existing `src/core/health/` and
`src/core/auth/` peers. `src/common/` was rejected: the constitution scopes it to
things "lacking depth (exceptions, utils, constants, enums)", and this carries
real behaviour. `src/library/` was rejected because it forbids Nest DI reliance
and the factory consumes config and the Winston logger.

Exporting a **plain function** rather than a Nest module is deliberate: both call
sites are already inside a `CacheModule.registerAsync({ useFactory })`, so a
function drops straight into the existing shape with no new provider, no new
module import, and no change to how `CACHE_MANAGER` resolves anywhere.

## Phase 1 — Design

### The shared factory

`createRedisCacheStore(config, logger)` returns the value that
`CacheModule.registerAsync`'s `useFactory` must place on `store` — a store
factory function, which `cache-manager@5.7.6` invokes (`caching(factory, args)`
→ `await factory(args)`, verified in `dist/caching.js`). Inside it:

1. `redisStore.create({ host, port, ...hardened client options })` — the same
   store as today, so TTL semantics and the `getClient()` contract are unchanged;
2. `client.on('error', …)` and `client.on('ready', …)` wired to the connection
   reporter **before returning**, so no window exists in which an emit is
   unobserved (FR-003);
3. the store returned wrapped in the fail-soft proxy.

Both bootstraps then read identically — and this is the only place in the
codebase that names the store package:

```ts
CacheModule.registerAsync({
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
  useFactory: (configService, logger) => ({
    store: createRedisCacheStore(
      configService.get('storage.redis', { infer: true }),
      logger
    ),
  }),
});
```

### The fail-soft wrapper

Spreads the original store — preserving `name`, `getClient`, and every method not
overridden — and replaces `get`, `set`, `del`, `reset`:

- `get` → resolves `undefined` on any rejection (a miss; FR-005);
- `set` / `del` / `reset` → resolve on any rejection (a no-op; FR-006, FR-007);
- every call raced against a **1 s** ceiling (FR-009a), which also covers the
  connected-but-silent server that `enable_offline_queue: false` cannot catch;
- catches **broadly**, not by error code (FR-008) — the vocabulary spans
  `AbortError`/`NR_CLOSED`, `AbortError`/`UNCERTAIN_STATE`, `CONNECTION_BROKEN`,
  raw socket errors and `JSON.parse` failures on truncated replies, and an
  allow-list would be a guess.

`reset()`'s existing `FLUSHDB` behaviour is preserved unchanged, not "fixed" —
see Follow-Up 2.

### The connection reporter

One boolean per client: *have I already reported this connection down?* Set on
the first `error` after a healthy period, cleared on `'ready'`. That is exactly
the transition semantics of FR-015/FR-016, and it makes SC-004 a countable
assertion. It also exposes a read-only `isDown` that `TaskService` consults to
suppress its own per-operation error logging (FR-010a) without any change to the
counter logic itself.

### Client configuration (research R6)

```ts
{
  host, port,
  connect_timeout: 2_147_483_647,                                   // R6.2
  enable_offline_queue: false,                                      // R6.4 → FR-009
  retry_strategy: ({ attempt }) => Math.min(attempt * 250, 5_000),  // R6.3 → FR-012/13
}
```

Two traps documented in R6 and encoded here: the existing
`redisOptions: { connectTimeout }` is an **ioredis** spelling that `redis@3.1.2`
silently ignores (so the configured 60 s has never applied), and `connect_timeout`
doubles as the **total retry budget** — so "fixing" it to 60 s would make the
client permanently abandon Redis after a minute, violating FR-013. Hence the
deliberately enormous value, with the per-operation ceiling enforced in the
wrapper instead.

### Constitution Check — post-design

Re-evaluated in the table above. No gate moved; no violations.

## Verification strategy

| Property | How |
|---|---|
| FR-024 — client `error` does not reach the unhandled path | Unit: emit `'error'` on the fake client; assert the emit does not throw. Fails on `develop`. |
| FR-025 — read→miss, write→no-op | Unit: fake store rejects; assert `get` resolves `undefined`, `set`/`del` resolve. Fails on `develop`. |
| FR-026 / SC-004 — one record per transition | Unit: N errors, then `'ready'`, then N more; assert exactly 1 + 1 + 1 records. |
| FR-009a — 1 s ceiling | Unit with fake timers: store method never settles; assert resolution at the ceiling. |
| FR-012/13 — backoff shape | Unit: call `retry_strategy` across attempts; assert always numeric, monotonic to the 5 s cap, never an `Error`. |
| FR-022 — the inert declaration is gone | Existing suite stays green; `AuthenticationService` resolves unchanged. |
| FR-001/FR-002, US1/US2/US3/US5 — real processes survive a real outage | **Manual**, per [quickstart.md](./quickstart.md). Not unit-testable without a live Redis; `docs/testing-flakiness.md` is explicit that adding one is an anti-pattern here. |
| SC-008 — no healthy-path change | Existing suite must stay green; TTL semantics unchanged **by construction**, since the store object is the same one. |

## Exit gates

Per `CLAUDE.md`, run in order, all green before the PR:

1. `pnpm test:ci:no:coverage`
2. `pnpm build`
3. `pnpm lint` (`tsc --noEmit` + `biome check src/`)

Baseline on `develop` @ `bc8d51a86` captured before any edit: `pnpm lint` exit 0,
"Checked 3096 files … No fixes applied." No `schema:diff` run is required — no
GraphQL surface changes.

## Follow-Up (identified, deliberately not done here)

1. **Migrate to `ioredis` + real cache-manager v5 types**, retiring
   `cache-manager-redis-store@2.0.0`, `redis@3.1.2` and
   `@types/cache-manager@4.0.6`. Requires converting 7 `set` call sites from
   `{ ttl: seconds }` to milliseconds *and* re-typing consumers so the compiler
   can police it. (research R4, R5-B)
2. **`cacheManager.reset()` is a `FLUSHDB` against database 0, which the OIDC
   session store shares** — it would destroy every logged-in session. Unreachable
   today (zero call sites), destructive if reached. (research R7)
3. **`storage.redis.timeout` is dead configuration** — never applied by this
   client, and cannot be applied as a connect timeout without also capping the
   retry budget. Either wire it to the wrapper's ceiling or delete it from
   `alkemio.yml`. (research R6.1)
