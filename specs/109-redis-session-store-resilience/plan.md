# Implementation Plan: Redis outage must degrade authentication, not reject all traffic

**Branch**: `story/6332-redis-session-store-resilience` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/109-redis-session-store-resilience/spec.md`

## Summary

Three pre-existing defects make a Redis outage reject **all** API traffic after a
multi-second hang. The fix is three narrow changes plus two shared seams so the
class of defect closes with it:

1. **Gate the session-store lookup on cookie presence** (D1) — extract the guard
   that `forward-auth.resolver.service.ts` already implements, strengthen it so the
   sid must demonstrably derive from the presented cookie, and call it from both
   sites. Anonymous traffic then issues zero store commands and is unaffected by
   Redis health.
2. **Build every `ioredis` client through one factory** (D2) — fail-fast options
   (`enableOfflineQueue: false`, `commandTimeout: 500`, `connectTimeout: 500`,
   `maxRetriesPerRequest: 1`), a mandatory `error` listener, and a transition-only
   connection reporter. Three construction sites move onto it, including the health
   probe, which keeps its lazy-connect behaviour as an explicit factory option.
3. **Answer store-unreachable as 503 on every transport** (D3) — preserve
   `SessionStoreUnavailableError` through the passport callback, add the GraphQL
   arm in the interceptor (where the transport branch and the response lookup
   already live), type the error the session middleware emits so the shipped
   express error middleware finally has a production caller, and drive all three
   answers from one shared wire-shape helper.

No schema change, no migration, no new configuration, no new dependency.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 22 LTS (Volta-pinned 22.21.1)

**Primary Dependencies**: NestJS 10, Apollo Server 4 / GraphQL 16, `ioredis@5.10.1`
(the client this feature governs), `express-session@1.19`, `connect-redis@7.1`,
`passport` + `passport-custom`, Winston via `nest-winston`. No dependency is added,
removed or upgraded.

**Storage**: Redis only, and only for connection behaviour — the keyspaces
(`alkemio:sid:<sid>`, `alkemio:sub:<sub>`) are untouched. PostgreSQL is not
involved: no entity, no migration.

**Testing**: Vitest 4.0.17, unit specs (`*.spec.ts`) co-located with the code, per
`.specify/memory/test-generation-guidelines.md`. Live outage verification is manual
and scripted in `quickstart.md`.

**Target Platform**: Linux server (containerised, Kubernetes)

**Project Type**: Single NestJS web service

**Performance Goals**: a cookie-less request is unaffected by store health
(≤ 250 ms against a measured 25 ms baseline); a cookie-bearing request is answered
in < 1 s during an outage, against a measured 42.04 s.

**Constraints**: no new configuration key; no deployment, manifest or environment
change; no GraphQL schema change; `107-oidc-session-revocation`'s session-resolution
semantics unchanged; the `redis@3.1.2` cache layer delivered by #6331 not modified.

**Scale/Scope**: 13 existing source files modified, 3 new source modules (the
`ioredis` factory, its connection reporter, the sid resolver), 1 new exception
class, 1 new error-status entry, 6 new/extended spec files. Estimated ~450 LOC
production + ~500 LOC test. Task breakdown: 46 tasks across 7 phases.

## Constitution Check

*GATE: passed before Phase 0 research; re-checked after Phase 1 design.*

| Principle | Assessment |
|---|---|
| **1. Domain-Centric Design First** | No domain logic involved. Everything lands in `src/core/*`, which the constitution designates for auth, middleware and cross-cutting flows. **Pass.** |
| **2. Modular NestJS Boundaries** | Adds one module directory, `src/core/redis/`, with a stated purpose (single `ioredis` construction seam), an explicit public surface (`createRedisClient`, `RedisConnectionReporter`), and exactly one dependency direction (consumers → factory). No cycle: the factory imports only `ioredis`, `LogContext` and Nest's `LoggerService` type. **Pass.** |
| **3. GraphQL Schema as Stable Contract** | No schema change. `AlkemioErrorStatus` is not a registered GraphQL enum and does not appear in `schema.graphql` (R10). No baseline regeneration. **Pass.** |
| **4. Explicit Data & Event Flow** | No state change, no persistence write, no event. **N/A.** |
| **5. Observability & Operational Readiness** | This is the principle the feature most directly serves: it converts a silent failure path (`ioredis`'s `console.error` via `silentEmit`, R4) into structured Winston records under `LogContext.AUTH`, deduplicated to one per transition so the signal is usable. No orphaned metrics added — the signal is a log record the existing stack already ingests. No new health indicator: the probe surface already exists and is unchanged. **Pass, and advances.** |
| **6. Code Quality with Pragmatic Testing** | Risk-based: unit specs for the factory, the reporter, the sid resolver, the strategy gate and the interceptor branch — each defends a specific defect that has been observed in production-shaped conditions. No snapshot tests, no pass-through coverage. FR-031 requires each regression spec to have been observed failing against `caa1a0d33`. **Pass.** |
| **7. API Consistency & Evolution Discipline** | Adds one `AlkemioErrorStatus` member in the correct category band with a message key matching the neighbouring convention. Shared-enum change → impact note required in the PR description (noted in tasks). **Pass.** |
| **8. Secure-by-Design Integration** | Strengthens: FR-004 removes a lookup key derived from client-supplied bytes (R7), and R11's full-attribute cookie re-assertion removes a `Secure`-downgrade triggered by a Redis blip. Timeout, retry and give-up policy for the external service are stated explicitly in the client-factory contract, which is what this principle asks of a new integration — here applied retroactively to an existing one. No secret is logged; the reporter records message and code only. **Pass, and advances.** |
| **9. Container & Deployment Determinism** | No image, no env var, no config key. Values are behavioural constants, deliberately not deployment surface (FR-015). **Pass.** |
| **10. Simplicity & Incremental Hardening** | The simplest change that fixes all three defects would be six lines edited in place. The factory and the sid resolver are the only escalation, and each is justified by an observed constraint rather than a speculative one: three correct implementations of these two ideas already exist in this repository and none was reachable from the site that needed it (R8). A common abstraction over the `ioredis` and `redis@3.1.2` factories is explicitly rejected as an abstraction over a coincidence (R12). **Pass.** |

No violations. Complexity Tracking table is therefore empty.

## Project Structure

### Documentation (this feature)

```text
specs/109-redis-session-store-resilience/
├── spec.md                        # feature specification (+ 3 clarification iterations)
├── plan.md                        # this file
├── research.md                    # Phase 0 — R1..R13, all verified against pinned deps
├── data-model.md                  # Phase 1 — state and transitions (no persistence)
├── quickstart.md                  # Phase 1 — live outage verification + FR-031 procedure
├── contracts/
│   ├── redis-client-factory.md    # the ioredis construction seam
│   ├── session-id-resolution.md   # cookie → sid, and when the store may be read
│   └── store-unavailable-response.md  # the shared 503 wire shape
├── checklists/
│   └── requirements.md            # spec quality audit
└── tasks.md                       # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── redis/                                   # NEW — the ioredis construction seam
│   │   ├── redis.client.factory.ts              # NEW
│   │   ├── redis.client.factory.spec.ts         # NEW
│   │   ├── redis.connection.reporter.ts         # NEW
│   │   └── redis.connection.reporter.spec.ts    # NEW
│   ├── auth/oidc/
│   │   ├── session-id.resolver.ts               # NEW — cookie-presence + derivation gate
│   │   ├── session-id.resolver.spec.ts          # NEW
│   │   ├── oidc-core.module.ts                  # MOD — OIDC_REDIS_CLIENT via factory
│   │   ├── session-store.redis.ts               # MOD — type store failures (FR-016a)
│   │   ├── oidc.tokens.ts                       # MOD — stale `new Redis()` note
│   │   ├── forward-auth.resolver.service.ts     # MOD — use the shared resolver
│   │   └── strategies/
│   │       ├── cookie-session.strategy.ts       # MOD — D1 gate, drop the raw-cookie fallback
│   │       ├── cookie-session.strategy.spec.ts  # MOD — harness now presents a cookie
│   │       ├── cookie-session.strategy.index.spec.ts # MOD — same
│   │       ├── cookie-session.exception-filter.ts    # MOD — full cookie attributes, shared shape
│   │       └── cookie-session.exception-filter.spec.ts # NEW
│   ├── interceptors/
│   │   ├── auth.interceptor.ts                  # MOD — D3 allow-list + GraphQL 503 arm
│   │   └── auth.interceptor.spec.ts             # MOD
│   └── health/health.module.ts                  # MOD — probe client via factory (lazy option)
├── common/
│   ├── enums/alkemio.error.status.ts            # MOD — + SESSION_STORE_UNAVAILABLE
│   └── exceptions/
│       ├── error.status.metadata.ts             # MOD — SYSTEM/119 → 14119
│       ├── session-store-unavailable.exception.ts # NEW
│       └── index.ts                             # MOD — export
├── <i18n resources>                             # MOD — userMessages.system.sessionStoreUnavailable
└── main.server.ts                               # MOD — session client via factory,
                                                 #       error middleware after session
```

**Structure Decision**: single NestJS project, existing layout. Two new units are
introduced and both sit in `src/core/*` per Architecture Standards §1: the
`ioredis` factory as a sibling of the existing `src/core/cache/` (deliberately not
merged with it — R12), and the sid resolver inside the OIDC auth directory that
owns the session cookie's semantics. Nothing is added under `src/domain`,
`src/services` or `src/platform`.

## Design decisions

### D-1 — The sid gate is "cookie present **and** sid derived from it", not "cookie present"

`forward-auth.resolver.service.ts` checks only presence. That closes the anonymous
case (FR-001) but still reads the store for a request whose cookie failed signature
verification, because `express-session` will have generated a fresh sid and the
presence check passes. The shared resolver additionally requires
`raw.startsWith('s:' + sid + '.')`, which proves the middleware derived this sid
from this cookie (R7) — using no secret and no new dependency.

Rejected: parsing the sid out of the raw cookie. It looks equivalent and is a
session-forgery vector (R7). FR-004 forbids the shape.

### D-2 — Request-path clients connect eagerly; only the probe is lazy

`lazyConnect` + `enableOfflineQueue: false` rejects the first command
unconditionally (R2). Tolerable for a probe, not for the request path. The factory
takes `lazyConnect` as an explicit per-caller option (FR-014) instead of shipping
one profile.

### D-3 — The 503 is produced in three places and defined in one

| Path | Who answers | When it is reached |
|---|---|---|
| Session middleware (pre-Nest, any transport) | shipped `cookieSessionStoreUnavailableMiddleware`, newly registered in `main.server.ts` | total outage, cookie-bearing request — the store read that happens first |
| Nest REST | shipped `CookieSessionStoreUnavailableFilter` | store failure inside the strategy on a REST route |
| Nest GraphQL | `AuthInterceptor`, new arm | store failure inside the strategy on a GraphQL route |

All three call one exported helper for status, `Retry-After` and the cookie
re-assertion (FR-021). Bodies differ by transport by design (Clarification Q16).

### D-4 — Type the error at the store, not at the error handler

`connect-redis` hands `express-session` whatever the client rejected with. Rather
than pattern-matching `ioredis`'s error vocabulary in the error middleware — the
guess the cache contract explicitly refused to make (G3) — `buildOidcSessionRedisStore`
wraps the client so a failed store operation surfaces as
`SessionStoreUnavailableError`. One place knows a store call just failed; that is
where the typing belongs.

### D-5 — The interceptor owns the GraphQL arm, the filter keeps REST

Justified in R9. The consequence worth stating: `107-oidc-session-revocation`'s
shipped REST behaviour and its tests are untouched, so SC-008 is satisfied by
construction rather than by regression-hunting.

## Follow-ups (deliberately not done here)

1. **Converge `RedisConnectionReporter` and `CacheConnectionReporter`.** Two ~40-line
   siblings differing only in log context and client-event vocabulary. Worth one
   pass once both have lived through an incident; not worth editing a file merged
   the same day (R12).
2. **Merge the two session `ioredis` connections.** #6324 went three → two. Going
   two → one means constructing the express-session store's client from the Nest
   container, which is a bootstrap-ordering change, not a resilience change
   (spec Out of Scope, Clarification Q12).
3. **`forward-auth.resolver.service.ts` throws a bare `SessionStoreUnavailableError()`
   with no cause** (`:78`), discarding the underlying failure. Harmless today
   because nothing reads the cause; worth passing through when that path is next
   touched.
