# Tasks: Redis outage must degrade authentication, not reject all traffic

**Input**: Design documents from `/specs/109-redis-session-store-resilience/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: **REQUIRED.** The spec mandates regression coverage as functional
requirements (FR-028 – FR-031), and FR-031 additionally requires each regression
spec to have been *observed failing* against `develop` @ `caa1a0d33`. Test tasks
are therefore first-class here, not optional, and the pre-fix observation is a
task in its own right (T002).

**Organization**: Tasks are grouped by user story. Each story is independently
implementable and independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are given in every task

## Path Conventions

Single NestJS project, existing layout. Sources under `src/`, unit specs
co-located as `*.spec.ts` per `.specify/memory/test-generation-guidelines.md`.

---

## Phase 1: Setup

**Purpose**: Create the one new module directory and capture the pre-fix evidence
FR-031 depends on.

- [ ] T001 Create the new module directory `src/core/redis/` (no barrel file — the repo does not use them under `src/core/*`; consumers import the factory by path)
- [ ] T002 Record the FR-031 pre-fix baseline: follow the procedure in `specs/109-redis-session-store-resilience/quickstart.md` §2 to run the new regression specs against the unfixed code, and capture the observed failure of each into the quickstart results table. This task can only complete *after* the three regression specs exist — **T008** (FR-028, cookie-less → zero store calls), **T029** (FR-029, bounded latency) and **T023** (FR-030, GraphQL 503 not 401). It is listed in Setup because its output is baseline evidence, and it is re-entered and closed at T044. Note the stash pathspec in §2: specs are co-located under `src/`, so the exclusion is what makes the check meaningful

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single `ioredis` construction seam. US2, US3 and US4 all rest on
it. US1 does **not** — see Dependencies.

**⚠️ CRITICAL**: T003–T006 block US2, US3 and US4.

- [ ] T003 [P] Implement `RedisConnectionReporter` in `src/core/redis/redis.connection.reporter.ts` — one immutable `label` (`'session' | 'oidc' | 'health'`) and one `reportedDown` boolean; `recordError(err)` warns exactly once per outage and sets the flag, `recordReady()` warns once and re-arms it. Log through the injected `LoggerService` under `LogContext.AUTH`, recording only `err.message` and `err.code` — never options, credentials or command arguments (FR-023 – FR-026, data-model §3, invariants I5/I6). Publish no `isDown` accessor: the boolean is a log-suppression signal only
- [ ] T004 [P] Write `src/core/redis/redis.connection.reporter.spec.ts` — first `error` warns once; second `error` in the same outage is silent; `ready` after an `error` warns once and re-arms so a second outage warns again; `ready` with no prior `error` is silent; no record contains credentials or connection options (FR-023 – FR-026, SC-006)
- [ ] T005 Implement `createRedisClient(config, logger, options)` in `src/core/redis/redis.client.factory.ts` per `contracts/redis-client-factory.md` — apply `enableOfflineQueue: false`, `commandTimeout: 500`, `connectTimeout: 500`, `maxRetriesPerRequest: 1`, `host`, `Number(port)`, and `lazyConnect` only when the caller asks. Keep ioredis's default `retryStrategy` (never override it — a non-number return is how ioredis is told to abandon the store permanently, invariant I3). Attach `error` and `ready` listeners to a per-client `RedisConnectionReporter` labelled with `purpose`, **before returning and with no intervening `await`** (G2/G3). Set no `keyPrefix`. Return the unwrapped `Redis` instance — no proxy, no wrapper (G6). Never throw, never await a connection (G1). Depends on T003
- [ ] T006 Write `src/core/redis/redis.client.factory.spec.ts` covering contract obligations F1–F9: construction against an unreachable host returns a client without throwing; `error` and `ready` listeners are present immediately on return; the four fail-fast options are applied; `lazyConnect` defaults false and is honoured when requested; `retryStrategy` returns a monotonic non-decreasing number capped at 2000 for attempts 1…100 and never an `Error`; emitting `error` produces exactly one record and a second produces none; no `keyPrefix` is applied. Depends on T005

**Checkpoint**: every `ioredis` client can now be built correctly. Nothing consumes it yet.

---

## Phase 3: User Story 1 - An unauthenticated visitor keeps browsing during a Redis outage (Priority: P1) 🎯 MVP

**Goal**: A request carrying no session cookie issues **zero** session-store
commands and resolves anonymous regardless of Redis health. This is the single
largest blast-radius reduction in the feature and is fully independent of the
factory.

**Independent Test**: With Redis stopped, `{ platform { id } }` sent with no
cookie jar returns 200 promptly. At unit level, the cookie-session strategy
performs zero `sessionStore` calls for a cookie-less request.

### Tests for User Story 1

- [ ] T007 [P] [US1] Write `src/core/auth/oidc/session-id.resolver.spec.ts` covering contract obligations S1–S9 from `contracts/session-id-resolution.md`: no cookies at all → `null`; empty `cookies` object → `null`; `s:<sid>.<sig>` with `sessionID === sid` → `sid`; cookie for a *different* sid → `null`; cookie present but `sessionID` undefined → `null`; cookie with no `s:` prefix → `null`; cookie `s:<sid>` with no `.` separator → `null`; `sessionID` a strict prefix of the cookie's sid → `null` (the trailing dot is load-bearing); `req.cookies` absent but `headers.cookie` carries the signed cookie → `sid`
- [ ] T008 [US1] Extend `src/core/auth/oidc/strategies/cookie-session.strategy.spec.ts` with the FR-028 regression: a request bearing **no** session cookie performs **zero** calls on the session-store mock and resolves anonymous (contract obligation S10). Assert on call count, not on the return value alone — the pre-fix code also returns anonymous, just after a store round trip, so a return-value assertion would pass on `develop` and prove nothing

### Implementation for User Story 1

- [ ] T009 [US1] Implement `resolveCookieSessionId(req, cookieName)` in `src/core/auth/oidc/session-id.resolver.ts` — pure, no I/O, no logging, no Nest dependency. Return `req.sessionID` **only** when the presented raw cookie satisfies `raw.startsWith('s:' + sid + '.')`; otherwise `null`. Read the raw cookie from `req.cookies[cookieName]`, falling back to parsing `req.headers.cookie` so a missing `cookie-parser` fails loudly rather than making every request anonymous (G4). Never derive the returned sid from client-supplied bytes (G2/FR-004)
- [ ] T010 [US1] Rewrite the sid resolution in `src/core/auth/oidc/strategies/cookie-session.strategy.ts` `validate()` to call `resolveCookieSessionId` and return anonymous on `null` **without** touching `this.sessionStore`. Delete the `req.cookies?.[this.sessionCookieName]` fallback entirely (Clarification Q7 — it is dead *and* the wrong shape) and update the now-stale comment block above it. Leave everything after a successful store read untouched: tombstone, subject-revocation marker, absolute-TTL ceiling and the self-healing index write all keep `107-oidc-session-revocation` semantics exactly (FR-006). Depends on T009
- [ ] T011 [P] [US1] Replace the local presence-only guard in `src/core/auth/oidc/forward-auth.resolver.service.ts` with a call to the shared `resolveCookieSessionId`, so the two readers of a session-by-cookie cannot drift and the stricter derivation check applies there too (research R8). Depends on T009
- [ ] T012 [US1] Update the existing harnesses in `src/core/auth/oidc/strategies/cookie-session.strategy.spec.ts` and `src/core/auth/oidc/strategies/cookie-session.strategy.index.spec.ts` so every case that *intends* to exercise session resolution now presents a correctly-signed `s:<sid>.<sig>` cookie alongside `sessionID`. Without this the D1 gate makes those cases resolve anonymous and they would fail for the right reason but the wrong cause. Depends on T010

**Checkpoint**: US1 complete. Anonymous traffic no longer depends on Redis at all — verifiable on its own, with no part of Phase 2 in place.

---

## Phase 4: User Story 2 - A signed-in user gets a fast, honest answer during a Redis outage (Priority: P1)

**Goal**: A cookie-bearing request during an outage is answered in under a second,
as 503 + `Retry-After: 5`, with the session cookie re-asserted rather than cleared —
on GraphQL, on REST, and on the pre-Nest session-middleware path.

**Independent Test**: With Redis stopped, a GraphQL request carrying a session
cookie returns HTTP 503 with `Retry-After` in under 1 s and the response does not
clear the cookie.

### Error vocabulary

- [ ] T013 [P] [US2] Add `SESSION_STORE_UNAVAILABLE = 'SESSION_STORE_UNAVAILABLE'` to `src/common/enums/alkemio.error.status.ts`, adjacent to `STORAGE_SERVICE_UNAVAILABLE`
- [ ] T014 [P] [US2] Register the metadata entry in `src/common/exceptions/error.status.metadata.ts`: `category: ErrorCategory.SYSTEM`, `specificCode: 119` (verified free — the SYSTEM band uses 110–118 and 120), `userMessage: 'userMessages.system.sessionStoreUnavailable'`. Depends on T013
- [ ] T015 [P] [US2] Add the `userMessages.system.sessionStoreUnavailable` translation string to the i18n resource files alongside `storageServiceUnavailable`, worded as transient unavailability ("try again shortly"), never as an authentication failure
- [ ] T016 [US2] Add `SessionStoreUnavailableException extends BaseException` in `src/common/exceptions/session-store-unavailable.exception.ts`, carrying `AlkemioErrorStatus.SESSION_STORE_UNAVAILABLE` and setting `extensions.http.status = 503` so Apollo Server 4 overrides the wire status — without it Apollo emits HTTP 200 with an error envelope (contract G5). Per constitution §5, the exception `message` MUST be an immutable identifier: put no interpolated runtime data in it, and carry any context in the `details` payload so it stays queryable without leaking specifics into user-facing strings. Export it from `src/common/exceptions/index.ts`. Depends on T014

### The shared wire shape

- [ ] T017 [US2] Extract and export `applyStoreUnavailableResponse(req, res, cookie)` in `src/core/auth/oidc/strategies/cookie-session.exception-filter.ts` as the single definition of the store-unavailable wire shape (FR-021): set `Retry-After: 5`, and re-assert the presented raw signed cookie **exactly as received** (no re-signing, so no secret is needed at the response site — G2). It must set neither status nor body; those are the caller's, because they differ by transport (G4). If no cookie was presented, set none
- [ ] T018 [US2] Fix the cookie re-assertion inside that helper to use the **full** configured attribute set — `httpOnly`, `sameSite`, `path`, **`secure`**, **`domain`** and **`maxAge`** — matching what `main.server.ts` issues the cookie with. The shipped `send503` sets only the first three, which in production replaces a Secure, domain-scoped, long-lived cookie with a non-Secure host-only browser-session one: a security downgrade triggered by a Redis blip (research R11, contract G3, FR-020). Depends on T017
- [ ] T019 [US2] Rewire the existing `CookieSessionStoreUnavailableFilter` and `cookieSessionStoreUnavailableMiddleware` in the same file to delegate to `applyStoreUnavailableResponse`, then set their own 503 status and their own `{ "error": "session_store_unavailable" }` body. REST behaviour is otherwise unchanged from `107-oidc-session-revocation` (FR-019). Depends on T017
- [ ] T020 [P] [US2] Write `src/core/auth/oidc/strategies/cookie-session.exception-filter.spec.ts` covering U4, U5, U7 and U8: the presented cookie is re-asserted with `secure`, `domain` and `maxAge` present and is never cleared; the REST filter's shipped behaviour is unchanged; the express middleware answers 503 for a typed store failure and calls `next(err)` for anything else; all paths produce identical status, `Retry-After` and cookie treatment. Depends on T019

### The GraphQL path (D3)

- [ ] T021 [US2] Extend `src/core/interceptors/auth.interceptor.ts` — add `SessionStoreUnavailableError` to the passport-callback allow-list (both occurrences, at the `~line 144` and `~line 345` guards) so it is rejected as itself instead of being wrapped into `AuthenticationException` (FR-016, invariant I7). This is necessary but **not** sufficient: the REST filter reads `host.switchToHttp()`, which on a GraphQL request returns the GraphQL root and args rather than a request/response (research R9)
- [ ] T022 [US2] Add the GraphQL arm in the same interceptor: when the transport is GraphQL and the error is a `SessionStoreUnavailableError`, call `applyStoreUnavailableResponse` with the response obtained from the existing `getResponse(context, isGraphql, req)` helper — necessary because this application's Apollo context factory returns `{ req }` and never `res` — then throw `SessionStoreUnavailableException`. Do **not** special-case the auth entry points: `/callback` and `/logout` genuinely need the store and 503 is the honest answer for all three (contract G6, FR-022). Depends on T016, T017, T021
- [ ] T023 [US2] Extend `src/core/interceptors/auth.interceptor.spec.ts` with U1, U2, U3 and U6: the passport callback rejects with `SessionStoreUnavailableError` itself, not `AuthenticationException`; on a GraphQL context the thrown exception carries `extensions.http.status === 503` and numericCode `14119`, not 401/11101 (FR-030); `Retry-After: 5` is set on the response; and — as a regression guard — `CookieSessionInvalidError` still yields 401 **with** cookie clearance, because "session ended" must keep clearing while "store unreachable" re-asserts. Depends on T022
- [ ] T023a [US2] Add the FR-022 / contract-obligation U9 assertion to `src/core/interceptors/auth.interceptor.spec.ts`: `/api/auth/oidc/login`, `/callback` and `/logout` are **not** special-cased for an unreachable store — each answers 503 + `Retry-After`, unlike the entry-point passthrough they get for a *rejected* session (`isAuthEntryPoint`). Without this, G6 is the only guarantee in the contract with nothing asserting it, and extending the existing exemption to cover this condition is an easy reflex for a future reader. Depends on T022
- [ ] T024 [US2] Delete or correct the two now-inaccurate comments on `develop` that assert `SessionStoreUnavailableError` reaches its own filter. The rethrow they describe is correct; the allow-list two frames earlier was what prevented it, and once T021 lands the comments should describe the mechanism that actually works. Depends on T021

### The session-middleware path (FR-016a)

- [ ] T025 [US2] In `src/core/auth/oidc/session-store.redis.ts`, wrap the store operations built by `buildOidcSessionRedisStore` so a failed store call surfaces as `SessionStoreUnavailableError` rather than a raw ioredis rejection — typed at the one place that knows a store call just failed, rather than by pattern-matching ioredis's error vocabulary in an error handler (plan D-4, Clarification Q14). Keep the `RedisStore` instance itself unwrapped enough that `connect-redis`'s `"scanIterator" in client` client-shape sniff still resolves to ioredis
- [ ] T026 [US2] Register `cookieSessionStoreUnavailableMiddleware` **immediately after** the session middleware in `src/main.server.ts`, giving the shipped middleware its first production caller. Without it a total outage on a cookie-bearing request reaches Express's default error handler and returns an HTML 500 — a third wrong answer nobody measured (research R6, Clarification Q1, FR-016a). Depends on T019, T025

### Fail-fast clients

- [ ] T027 [US2] Replace `new Redis({ host, port: Number(port) })` at `src/core/auth/oidc/oidc-core.module.ts:46` with `createRedisClient(config, logger, { purpose: 'oidc' })`, injecting the existing logger into the provider factory. Depends on T005
- [ ] T028 [US2] Replace `new Redis({ host, port })` at `src/main.server.ts:105` with `createRedisClient(redisConfig, logger, { purpose: 'session' })`, using the logger already available at that point in the Express bootstrap. Depends on T005
- [ ] T029 [P] [US2] Write the FR-029 bounded-latency regression asserting that a command issued against a known-disconnected factory-built client rejects synchronously rather than queueing, and that the applied `commandTimeout` bounds a responsive-then-silent store — the case none of the other three options cover (research R3). Place it in `src/core/redis/redis.client.factory.spec.ts`. Depends on T006

**Checkpoint**: US2 complete. A cookie-bearing request during an outage is fast, is 503 on every transport, and keeps its cookie.

---

## Phase 5: User Story 3 - An operator sees one clear signal per outage transition (Priority: P2)

**Goal**: Each session client reports exactly one structured loss record and one
structured recovery record per outage, through Winston rather than ioredis's raw
console write.

**Independent Test**: Drive a client through loss and recovery; assert exactly one
"lost" and one "recovered" structured record, no per-attempt flood, no credentials.

- [ ] T030 [P] [US3] Assert in `src/core/redis/redis.client.factory.spec.ts` that each `createRedisClient` call constructs its **own** reporter labelled with its `purpose`, so two clients report two independent outages and neither can mask the other (contract G8, Clarification Q9, invariant I5). SC-006's "exactly two records" is per connection, not per process. Depends on T006
- [ ] T031 [P] [US3] Assert that the `error` listener is attached such that no ioredis emit is ever unobserved — ioredis does not crash on an unobserved `error`, it routes through `silentEmit` and writes `console.error("[ioredis] Unhandled error event:", …)`, so the current omission is not a crash but every session-client failure bypassing Winston entirely (research R4, FR-027, constitution §5). Depends on T006
- [ ] T032 [P] [US3] Confirm the reporter's records carry `LogContext.AUTH` and include the failure reason as message and code only — no connection options, no credentials, no command arguments (FR-026). Depends on T004

**Checkpoint**: US3 complete. One incident reads as one incident.

---

## Phase 6: User Story 4 - The next Redis client cannot be built wrong (Priority: P3)

**Goal**: The factory is the only `ioredis` construction site in the tree, and a
caller with a genuinely different need expresses it *through* the factory.

**Independent Test**: Enumerate every `ioredis` construction site; each is the
factory or a call to it.

- [ ] T033 [US4] Replace `new Redis({...})` at `src/core/health/health.module.ts:37` with `createRedisClient(config, logger, { purpose: 'health', lazyConnect: true })`. The probe's lazy-connect behaviour must survive as an explicit factory option rather than by bypassing the factory (FR-014, Clarification Q6) — flattening it would change probe behaviour as a side-effect of a resilience fix. Note the option's real cost: `lazyConnect` + `enableOfflineQueue: false` makes the *first* command fail unconditionally (research R2), which is tolerable for a probe that re-runs and fatal on the request path, which is exactly why it is opt-in. Depends on T005
- [ ] T034 [P] [US4] Confirm the health probe's observable behaviour is unchanged by T033 — extend or add coverage in `src/core/health/` so the probe surface is asserted rather than assumed. Depends on T033
- [ ] T035 [US4] Add the SC-009 guard as contract obligation F10: a test that greps the `src/` tree and asserts no `new Redis(` occurrence exists outside `src/core/redis/redis.client.factory.ts`. Place it in `src/core/redis/redis.client.factory.spec.ts`. This is the task that converts "we fixed two clients" into "this class of defect is closed" — without it, a third bare client lands unremarked. Depends on T027, T028, T033
- [ ] T036 [P] [US4] Update the stale note in `src/core/auth/oidc/oidc.tokens.ts` describing how the session-store handle used to construct its own `new Redis()`, so the comment reflects the factory as the single seam. Depends on T027

**Checkpoint**: All four stories complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T037 Run the repo's full local exit gates in one uninterrupted run, using the repo's real commands (`pnpm@10.17.1`, not npm): `pnpm run lint` (which is `pnpm run typecheck:native && biome check src/`, so it covers typecheck *and* lint), `pnpm run build` (`nest build`), and `pnpm test` (`vitest run`). All three must pass clean, in one run, before the PR opens; any failure means fix and restart from the first gate
- [ ] T038 [P] Verify SC-008 by construction *and* by run: `107-oidc-session-revocation`'s session-resolution suite passes untouched — tombstone → 401, subject-revocation marker → 401, absolute-TTL ceiling → 401, self-healing index write, request-scoped actor-context copy (FR-006)
- [ ] T039 [P] Confirm no GraphQL schema change: `AlkemioErrorStatus` is not a registered GraphQL enum and does not appear in `schema.graphql` (research R10), so no baseline regeneration and no schema-contract event
- [ ] T040 [P] Confirm no new configuration key, no manifest change and no environment change (FR-015, contract G7): `storage.redis` is read exactly as today and the `timeout` field it carries stays deliberately unread
- [ ] T041 [P] Update `CLAUDE.md`'s Active Technologies and Recent Changes entries so the next agent learns the invariant — every `ioredis` client through the factory, fail-fast values are constants not configuration
- [ ] T042 Execute the live outage verification in `specs/109-redis-session-store-resilience/quickstart.md` against the dev stack: `docker stop alkemio_dev_redis`, exercise the cookie-less and cookie-bearing cases, `docker start`, and record measured status codes and timings in the results table for SC-001 – SC-007
- [ ] T043 Re-run `108-redis-outage-resilience` SC-009 and record the result, closing the criterion that PR #6331's verification recorded as **FAILED** (SC-011). Record it honestly — if it does not pass, say so rather than rewording it, which is the discipline #6331 set
- [ ] T044 Complete T002: record in the quickstart results table that the FR-028/029/030 regression specs were each **observed failing** against `caa1a0d33`, with the observed failure mode of each. A regression test that has never been seen failing is an assertion about the test, not about the defect (Clarification Q10, FR-031, SC-010)
- [ ] T045 Note the shared-enum impact in the PR description per constitution §7 — one additive `AlkemioErrorStatus` member in the SYSTEM band — and cross-reference `#6332`, `#6330`/PR #6331 and spec `107-oidc-session-revocation`

---

## Traceability

Every requirement maps to at least one task, and every task to at least one
requirement. Stated explicitly rather than left to prose so an audit is
deterministic — several tasks cite requirements by range, which a naive search
does not resolve.

| Requirement | Tasks |
|---|---|
| FR-001 no store op without a cookie | T008, T009, T010 |
| FR-002 decided from the request as received | T009 |
| FR-003 anonymous resolution unchanged | T010 |
| FR-004 no client-supplied lookup key | T007, T009, T010 |
| FR-005 unaccepted cookie → anonymous | T007, T009 |
| FR-006 accepted cookie → 107 semantics intact | T010, T023, T038 |
| FR-007 one factory for every ioredis client | T005, T027, T028, T033, T035 |
| FR-008 reject immediately while down | T005, T006, T029 |
| FR-009 bounded ceiling when unresponsive | T005, T006, T029 |
| FR-010 bounded retries per command | T005, T006 |
| FR-011 bounded connect timeout | T005, T006 |
| FR-012 never abandon the store | T005, T006 |
| FR-013 construction never throws or blocks | T005, T006 |
| FR-014 factory accommodates a different need | T005, T006, T033 |
| FR-015 no new configuration key | T005, T040 |
| FR-016 preserve the error type | T021, T023 |
| FR-016a middleware path answers 503 | T020, T025, T026 |
| FR-017 GraphQL 503 + `Retry-After` | T016, T022, T023 |
| FR-018 distinct code from `UNAUTHENTICATED` | T013, T014, T015, T016, T023 |
| FR-019 REST 503 unchanged | T019, T020 |
| FR-020 cookie re-asserted, never cleared | T017, T018, T020 |
| FR-021 one shared wire definition | T017, T019, T020, T022 |
| FR-022 auth entry points no worse | T022, T023a |
| FR-023 loss reported once | T003, T004 |
| FR-024 recovery reported once, re-arms | T003, T004 |
| FR-025 repeat attempts stay silent | T003, T004 |
| FR-026 no credentials or args in records | T003, T004, T032 |
| FR-027 `error` always has a listener | T005, T031 |
| FR-028 test: cookie-less → zero store ops | T008 |
| FR-029 test: bounded-latency failure | T029 |
| FR-030 test: GraphQL 503 not 401 | T023 |
| FR-031 each regression observed failing first | T002, T044 |
| SC-001 – SC-007 live outage behaviour | T042 (quickstart §3–§5) |
| SC-008 107's suite untouched | T038 |
| SC-009 zero clients outside the factory | T035, T042 (§6) |
| SC-010 regressions fail before, pass after | T044 |
| SC-011 close 108's FAILED SC-009 | T043 |

`107-oidc-session-revocation` FR-022b is cited by this spec as inherited
behaviour, not restated as a 109 requirement; it is delivered by FR-019/FR-020.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: blocks US2, US3, US4
- **US1 (Phase 3)**: depends on **Setup only**. It touches neither the factory nor the reporter, so it can proceed fully in parallel with Phase 2 — a genuine deviation from the template's default that is worth stating rather than hiding, because US1 is the MVP and the largest blast-radius reduction in the feature
- **US2 (Phase 4)**: depends on Phase 2 (T005 for the fail-fast clients). Its error-vocabulary and wire-shape tasks (T013–T020, T025) depend on neither and can start immediately
- **US3 (Phase 5)**: depends on Phase 2 only
- **US4 (Phase 6)**: depends on Phase 2, and T035 additionally depends on every construction site having migrated (T027, T028, T033)
- **Polish (Phase 7)**: depends on all stories

### Critical path

T003 → T005 → T027/T028 → T035, and independently T009 → T010 → T012.

### Parallel Opportunities

- T003 and T004 together. T007 runs alongside either, but **T008 and T012 both edit `cookie-session.strategy.spec.ts`**, so neither is `[P]` and they are ordered T008 → T012
- T013, T014, T015 together (three different files)
- The whole of US1 in parallel with the whole of Phase 2
- T030, T031, T032 together once T006 lands
- T038, T039, T040, T041 together

---

## Parallel Example: opening moves

```bash
# Foundational and the MVP story, concurrently:
Task: "T003 RedisConnectionReporter in src/core/redis/redis.connection.reporter.ts"
Task: "T007 session-id.resolver.spec.ts covering S1-S9"
Task: "T009 resolveCookieSessionId in src/core/auth/oidc/session-id.resolver.ts"
Task: "T013 SESSION_STORE_UNAVAILABLE in src/common/enums/alkemio.error.status.ts"
# NOT T008 alongside T012 — same file.
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

US1 alone converts a total outage into a degradation: the entire anonymous surface
keeps serving with Redis stopped. It requires no new module, no factory and no
error-vocabulary change — four files and two specs. If everything else slipped,
this is the slice worth shipping.

### Incremental Delivery

1. US1 → anonymous traffic survives a Redis outage entirely
2. Phase 2 + US2 → cookie-bearing traffic fails in under a second, as 503, cookie intact
3. US3 → one legible incident per outage per client
4. US4 → the seam is the only way in, so the class of defect closes

### Notes

- The three defects are genuinely independent: each story fixes one and none
  depends on another's fix being present to be verifiable
- FR-031 is the discipline that keeps the regression suite honest — write each
  regression spec, watch it fail on `caa1a0d33`, then make it pass
- Commit in logical slices; keep the tree green between tasks
